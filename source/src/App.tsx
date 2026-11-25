/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  FilePlus2,
  FileText,
  Info,
  Layers,
  LayoutGrid,
  Lock,
  Network,
  Palette,
  PanelLeft,
  PanelRight,
  Search,
  Settings,
  X,
} from 'lucide-react';
import { AboutPage } from './components/AboutPage';
import { BrandLogo } from './components/BrandLogo';
import { CanvasBoardView } from './components/CanvasBoardView';
import { CommandPalette } from './components/CommandPalette';
import { FlashcardsView } from './components/FlashcardsView';
import { GraphView } from './components/GraphView';
import { InspectorPanel } from './components/InspectorPanel';
import { MarkdownEditor } from './components/MarkdownEditor';
import { PdfReaderView } from './components/PdfReaderView';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import { SettingsModal } from './components/SettingsModal';
import { TemplatesModal } from './components/TemplatesModal';
import { VaultLockOverlay } from './components/VaultLockOverlay';
import { VaultSidebar } from './components/VaultSidebar';
import { createStarterVault } from './data/starterVault';
import {
  AttachmentMeta,
  CanvasCard,
  CanvasEdge,
  EditorViewMode,
  FlashcardProgress,
  FontStyleId,
  InspectorTab,
  MainSurface,
  NoteItem,
  NoteTemplate,
  SidebarTab,
  ThemeId,
  VaultLockConfig,
  VaultState,
  WorkspacePreferences,
} from './types/vault';
import {
  exportNoteAsDocx,
  exportNoteAsTxt,
  importDocxFileToMarkdown,
} from './utils/documents';
import {
  deleteAttachmentBlob,
  loadVaultFromIndexedDb,
  saveAttachmentBlob,
  saveVaultToIndexedDb,
} from './utils/indexedDb';
import {
  applyTemplateVariables,
  buildVaultGraphIndex,
  getTodayDateString,
  normalizeTitle,
  replaceWikilinkTitleInContent,
} from './utils/markdown';
import {
  exportSingleNoteAsMarkdown,
  exportVaultBackupJson,
  exportVaultToLocalFolder,
  loadPrefsFromLocal,
  loadVaultFromLocal,
  normalizeVaultState,
  parseImportedMarkdownFile,
  parseVaultBackupJson,
  savePrefsToLocal,
  saveVaultToLocal,
} from './utils/storage';
import {
  clearVaultLockPassword,
  loadVaultLockConfig,
  setVaultLockPassword,
} from './utils/vaultCrypto';

const THEME_ORDER: ThemeId[] = ['obsidian-dark', 'modern-dark', 'modern-light', 'paper-light'];

const THEME_LABELS: Record<ThemeId, string> = {
  'obsidian-dark': 'ئوبسىدىيان قاراڭغۇ',
  'modern-dark': 'زامانىۋى قاراڭغۇ',
  'modern-light': 'زامانىۋى يورۇق',
  'paper-light': 'ئىللىق قەغەز',
};

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function App() {
  const [vault, setVault] = useState<VaultState>(() => loadVaultFromLocal());
  const [prefs, setPrefs] = useState<WorkspacePreferences>(() => loadPrefsFromLocal());
  const dbHydratedRef = useRef(false);

  const [lockConfig, setLockConfig] = useState<VaultLockConfig | null>(() => loadVaultLockConfig());
  const [isLocked, setIsLocked] = useState<boolean>(() => Boolean(loadVaultLockConfig()?.enabled));

  const [mainSurface, setMainSurface] = useState<MainSurface>('editor');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('files');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('links');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [scrollToHeadingId, setScrollToHeadingId] = useState<string | null>(null);

  const [commandOpen, setCommandOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Hydrate high-capacity IndexedDB vault state on mount
  useEffect(() => {
    let active = true;
    loadVaultFromIndexedDb().then((dbVault) => {
      if (!active) return;
      if (dbVault && Array.isArray(dbVault.notes) && dbVault.notes.length > 0) {
        setVault(normalizeVaultState(dbVault));
      } else {
        void saveVaultToIndexedDb(vault);
      }
      dbHydratedRef.current = true;
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply theme to <html> root cleanly (Tailwind v4 .dark + data-theme semantic tokens)
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', prefs.theme);
    const isDark = prefs.theme === 'obsidian-dark' || prefs.theme === 'modern-dark';
    root.classList.toggle('dark', isDark);
    savePrefsToLocal(prefs);
  }, [prefs]);

  // Persist vault locally to both IndexedDB and localStorage on every change
  useEffect(() => {
    saveVaultToLocal(vault);
    if (dbHydratedRef.current) {
      void saveVaultToIndexedDb(vault);
    }
  }, [vault]);

  // Real-time knowledge graph, wikilinks, backlinks, and tags index
  const vaultIndex = useMemo(() => buildVaultGraphIndex(vault.notes), [vault.notes]);

  const pdfAttachments = useMemo(
    () => (vault.attachments ?? []).filter((a) => a.kind === 'pdf'),
    [vault.attachments]
  );

  const totalAttachmentBytes = useMemo(
    () => (vault.attachments ?? []).reduce((sum, a) => sum + (a.size || 0), 0),
    [vault.attachments]
  );

  // Ensure activeNoteId & openTabIds stay valid
  const activeNote = useMemo(() => {
    if (prefs.activeNoteId && vaultIndex.noteById.has(prefs.activeNoteId)) {
      return vaultIndex.noteById.get(prefs.activeNoteId)!;
    }
    return vault.notes[0] ?? null;
  }, [prefs.activeNoteId, vaultIndex.noteById, vault.notes]);

  const openTabs = useMemo(() => {
    const valid = prefs.openTabIds
      .map((id) => vaultIndex.noteById.get(id))
      .filter((n): n is NoteItem => Boolean(n));
    if (activeNote && !valid.some((n) => n.id === activeNote.id)) {
      return [...valid, activeNote];
    }
    return valid;
  }, [prefs.openTabIds, vaultIndex.noteById, activeNote]);

  // Global keyboard shortcuts: Ctrl+K (Command Palette), Ctrl+Shift+G (Graph View)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isLocked) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setMainSurface((prev) => (prev === 'graph' ? 'editor' : 'graph'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isLocked]);

  // Navigation helpers
  const openNote = useCallback((noteId: string) => {
    setPrefs((prev) => ({
      ...prev,
      activeNoteId: noteId,
      openTabIds: prev.openTabIds.includes(noteId) ? prev.openTabIds : [...prev.openTabIds, noteId],
    }));
    setMainSurface('editor');
  }, []);

  const closeTab = useCallback(
    (noteId: string) => {
      setPrefs((prev) => {
        const remaining = prev.openTabIds.filter((id) => id !== noteId);
        const nextActive =
          prev.activeNoteId === noteId
            ? remaining[remaining.length - 1] ?? vault.notes.find((n) => n.id !== noteId)?.id ?? null
            : prev.activeNoteId;
        return {
          ...prev,
          openTabIds: remaining,
          activeNoteId: nextActive,
        };
      });
    },
    [vault.notes]
  );

  // CRUD Notes & Folders
  const createNote = useCallback(
    (options?: { title?: string; folderId?: string | null; content?: string; switchToEditor?: boolean }) => {
      const baseTitle = options?.title?.trim() || 'يېڭى خاتىرە';
      let uniqueTitle = baseTitle;
      let counter = 2;
      while (vaultIndex.noteByNormalizedTitle.has(normalizeTitle(uniqueTitle))) {
        uniqueTitle = `${baseTitle} (${counter++})`;
      }

      const now = Date.now();
      const newNote: NoteItem = {
        id: generateId('note'),
        title: uniqueTitle,
        folderId: options?.folderId ?? null,
        content: options?.content ?? `# ${uniqueTitle}\n\n`,
        createdAt: now,
        updatedAt: now,
      };

      setVault((prev) => ({ ...prev, notes: [newNote, ...prev.notes] }));
      if (options?.switchToEditor !== false) {
        openNote(newNote.id);
      }
      return newNote;
    },
    [vaultIndex.noteByNormalizedTitle, openNote]
  );

  const handleUpdateContent = useCallback((noteId: string, content: string) => {
    setVault((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => (n.id === noteId ? { ...n, content, updatedAt: Date.now() } : n)),
    }));
  }, []);

  const handleRenameNote = useCallback(
    (noteId: string, newTitle: string) => {
      const current = vaultIndex.noteById.get(noteId);
      if (!current) return;
      const oldTitle = current.title;
      const cleaned = newTitle.trim();
      if (!cleaned || cleaned === oldTitle) return;

      setVault((prev) => ({
        ...prev,
        notes: prev.notes.map((n) => {
          const updatedContent = replaceWikilinkTitleInContent(n.content, oldTitle, cleaned);
          if (n.id === noteId) {
            return { ...n, title: cleaned, content: updatedContent, updatedAt: Date.now() };
          }
          if (updatedContent !== n.content) {
            return { ...n, content: updatedContent, updatedAt: Date.now() };
          }
          return n;
        }),
      }));
      showToast(`خاتىرە نامى «${cleaned}» قىلىپ يېڭىلاندى ۋە ئۇلانمىلار ماسلاشتۇرۇلدى`);
    },
    [vaultIndex.noteById, showToast]
  );

  const handleMoveNoteFolder = useCallback((noteId: string, folderId: string | null) => {
    setVault((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => (n.id === noteId ? { ...n, folderId, updatedAt: Date.now() } : n)),
    }));
  }, []);

  const handleTogglePin = useCallback((noteId: string) => {
    setVault((prev) => ({
      ...prev,
      notes: prev.notes.map((n) => (n.id === noteId ? { ...n, isPinned: !n.isPinned } : n)),
    }));
  }, []);

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      setVault((prev) => ({
        ...prev,
        notes: prev.notes.filter((n) => n.id !== noteId),
      }));
      closeTab(noteId);
      showToast('خاتىرە ئۆچۈرۈلدى');
    },
    [closeTab, showToast]
  );

  const handleCreateFolder = useCallback(
    (name: string) => {
      const folder = { id: generateId('folder'), name, parentId: null, isOpen: true };
      setVault((prev) => ({ ...prev, folders: [...prev.folders, folder] }));
      showToast(`«${name}» قىسقۇچى قۇرۇلدى`);
    },
    [showToast]
  );

  const handleToggleFolder = useCallback((folderId: string) => {
    setVault((prev) => ({
      ...prev,
      folders: prev.folders.map((f) => (f.id === folderId ? { ...f, isOpen: !f.isOpen } : f)),
    }));
  }, []);

  const handleDeleteFolder = useCallback(
    (folderId: string) => {
      setVault((prev) => ({
        ...prev,
        folders: prev.folders.filter((f) => f.id !== folderId),
        notes: prev.notes.map((n) => (n.folderId === folderId ? { ...n, folderId: null } : n)),
      }));
      showToast('قىسقۇچ ئۆچۈرۈلدى، ئىچىدىكى خاتىرىلەر ساقلاپ قېلىندى');
    },
    [showToast]
  );

  // Wikilink click: open existing note or auto-create missing note
  const handleOpenWikilink = useCallback(
    (targetTitle: string) => {
      const existing = vaultIndex.noteByNormalizedTitle.get(normalizeTitle(targetTitle));
      if (existing) {
        openNote(existing.id);
      } else {
        createNote({ title: targetTitle });
        showToast(`«${targetTitle}» ناملىق يېڭى خاتىرە قۇرۇلدى`);
      }
    },
    [vaultIndex.noteByNormalizedTitle, openNote, createNote, showToast]
  );

  // Tag click: jump to Tags sidebar filtered by tag
  const handleClickTag = useCallback((tag: string) => {
    setPrefs((prev) => ({ ...prev, rightSidebarOpen: true }));
    setSidebarTab('tags');
    setSelectedTagFilter(tag);
  }, []);

  // Daily Note: open today's note or create from Daily Note template
  const handleOpenDailyNote = useCallback(() => {
    const today = getTodayDateString();
    const existing = vaultIndex.noteByNormalizedTitle.get(normalizeTitle(today));
    if (existing) {
      openNote(existing.id);
      return;
    }

    const dailyFolder = vault.folders.find((f) => f.name.includes('كۈندىلىك')) ?? null;
    const dailyTpl = vault.templates.find((t) => t.id === 'tpl-daily');
    const content = dailyTpl
      ? applyTemplateVariables(dailyTpl.content, today)
      : `# ${today} — كۈندىلىك خاتىرە\n\n#كۈندىلىك\n\n## بۈگۈنكى پىلانلار\n- [ ] \n`;

    createNote({
      title: today,
      folderId: dailyFolder?.id ?? null,
      content,
    });
    showToast(`بۈگۈنكى كۈندىلىك خاتىرە (${today}) قۇرۇلدى`);
  }, [vaultIndex.noteByNormalizedTitle, vault.folders, vault.templates, openNote, createNote, showToast]);

  // Templates handlers
  const handleInsertTemplate = useCallback(
    (template: NoteTemplate) => {
      if (!activeNote) return;
      const rendered = applyTemplateVariables(template.content, activeNote.title);
      const next = activeNote.content.trim() ? `${activeNote.content}\n\n${rendered}` : rendered;
      handleUpdateContent(activeNote.id, next);
      showToast(`«${template.name}» قېلىپى قىستۇرۇلدى`);
    },
    [activeNote, handleUpdateContent, showToast]
  );

  const handleCreateNoteFromTemplate = useCallback(
    (template: NoteTemplate) => {
      const today = getTodayDateString();
      const baseTitle = template.id === 'tpl-daily' ? today : `${template.name} — ${today}`;
      const matchedFolder = template.defaultFolderName
        ? vault.folders.find((f) => f.name === template.defaultFolderName)
        : undefined;
      const content = applyTemplateVariables(template.content, baseTitle);
      createNote({
        title: baseTitle,
        folderId: matchedFolder?.id ?? null,
        content,
      });
      showToast(`«${template.name}» قېلىپى بىلەن يېڭى خاتىرە قۇرۇلدى`);
    },
    [vault.folders, createNote, showToast]
  );

  const handleAddCustomTemplate = useCallback(
    (name: string, description: string, content: string) => {
      const tpl: NoteTemplate = {
        id: generateId('tpl'),
        name,
        description,
        content,
        isBuiltIn: false,
      };
      setVault((prev) => ({ ...prev, templates: [...prev.templates, tpl] }));
      showToast(`«${name}» قېلىپى ساقلاندى`);
    },
    [showToast]
  );

  const handleDeleteCustomTemplate = useCallback((templateId: string) => {
    setVault((prev) => ({
      ...prev,
      templates: prev.templates.filter((t) => t.id !== templateId || t.isBuiltIn),
    }));
  }, []);

  // Attachments (PDF & Images in IndexedDB)
  const handleAttachImageFile = useCallback(
    async (file: File): Promise<string | null> => {
      try {
        const id = generateId('img');
        await saveAttachmentBlob(id, file);
        const meta: AttachmentMeta = {
          id,
          name: file.name || `رەسىم-${Date.now()}.png`,
          mimeType: file.type || 'image/png',
          size: file.size,
          kind: 'image',
          createdAt: Date.now(),
        };
        setVault((prev) => ({
          ...prev,
          attachments: [meta, ...(prev.attachments ?? [])],
        }));
        showToast('رەسىم يەرلىك ئامبارغا ساقلاندى');
        return `![${meta.name}](local-img://${id})`;
      } catch {
        showToast('رەسىمنى ساقلاش مەغلۇپ بولدى');
        return null;
      }
    },
    [showToast]
  );

  const handleDeleteAttachment = useCallback(
    async (attachmentId: string) => {
      await deleteAttachmentBlob(attachmentId);
      setVault((prev) => ({
        ...prev,
        attachments: (prev.attachments ?? []).filter((a) => a.id !== attachmentId),
      }));
      setPrefs((prev) => ({
        ...prev,
        activePdfId: prev.activePdfId === attachmentId ? null : prev.activePdfId,
      }));
      showToast('قوشۇمچە ھۆججەت يەرلىك ساقلىغۇچتىن ئۆچۈرۈلدى');
    },
    [showToast]
  );

  const handleOpenPdfAttachment = useCallback((attachmentId: string) => {
    setPrefs((prev) => ({ ...prev, activePdfId: attachmentId }));
    setMainSurface('pdf');
  }, []);

  const handleCreateLinkedNoteForPdf = useCallback(
    (pdf: AttachmentMeta, initialContent?: string) => {
      const cleanName = pdf.name.replace(/\.pdf$/i, '').trim() || 'PDF خاتىرىسى';
      const booksFolder = vault.folders.find((f) => f.name.includes('كىتاب')) ?? null;
      const content =
        initialContent ??
        `# ${cleanName}\n\n#كىتاب #PDF\n\n> بۇ خاتىرە «${pdf.name}» ناملىق يەرلىك PDF كىتاب بىلەن باغلانغان.\n\n## ئاساسلىق ئىدىيەلەر\n- \n\n## مۇھىم نەقىللەر\n> \n`;
      const created = createNote({
        title: cleanName,
        folderId: booksFolder?.id ?? null,
        content,
        switchToEditor: false,
      });

      setVault((prev) => ({
        ...prev,
        attachments: (prev.attachments ?? []).map((a) =>
          a.id === pdf.id ? { ...a, linkedNoteId: created.id } : a
        ),
      }));
      showToast(`«${created.title}» ناملىق باغلانما خاتىرە قۇرۇلدى`);
    },
    [vault.folders, createNote, showToast]
  );

  // Multi-format file importer: .md, .txt, .docx, .pdf, images, .json
  const handleImportFiles = useCallback(
    async (fileList: FileList) => {
      const files = Array.from(fileList);
      let importedNotes = 0;
      let importedPdfs = 0;
      let importedImages = 0;

      for (const file of files) {
        const lower = file.name.toLowerCase();

        if (lower.endsWith('.json')) {
          const text = await file.text();
          const restored = parseVaultBackupJson(text);
          if (restored) {
            setVault(restored);
            if (restored.notes[0]) {
              setPrefs((prev) => ({
                ...prev,
                activeNoteId: restored.notes[0].id,
                openTabIds: [restored.notes[0].id],
              }));
            }
            showToast(`زاپاس ھۆججەتتىن ${restored.notes.length} خاتىرە ئەسلىگە كەلتۈرۈلدى`);
            return;
          }
          continue;
        }

        if (lower.endsWith('.docx')) {
          try {
            const parsed = await importDocxFileToMarkdown(file);
            createNote({ title: parsed.title, content: parsed.content });
            importedNotes++;
          } catch {
            showToast(`«${file.name}» Word ھۆججىتىنى ئوقۇشتا خاتالىق كۆرۈلدى`);
          }
          continue;
        }

        if (lower.endsWith('.pdf') || file.type === 'application/pdf') {
          const id = generateId('pdf');
          await saveAttachmentBlob(id, file);
          const meta: AttachmentMeta = {
            id,
            name: file.name,
            mimeType: 'application/pdf',
            size: file.size,
            kind: 'pdf',
            createdAt: Date.now(),
          };
          setVault((prev) => ({
            ...prev,
            attachments: [meta, ...(prev.attachments ?? [])],
          }));
          setPrefs((prev) => ({ ...prev, activePdfId: id }));
          setMainSurface('pdf');
          importedPdfs++;
          continue;
        }

        if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(lower)) {
          const mdImg = await handleAttachImageFile(file);
          if (mdImg && activeNote) {
            handleUpdateContent(activeNote.id, `${activeNote.content.trimEnd()}\n\n${mdImg}\n`);
          }
          importedImages++;
          continue;
        }

        // Default: .md, .markdown, .txt
        const text = await file.text();
        const parsed = parseImportedMarkdownFile(file.name, text);
        createNote({ title: parsed.title, content: parsed.content });
        importedNotes++;
      }

      const parts: string[] = [];
      if (importedNotes > 0) parts.push(`${importedNotes} خاتىرە`);
      if (importedPdfs > 0) parts.push(`${importedPdfs} PDF كىتاب`);
      if (importedImages > 0) parts.push(`${importedImages} رەسىم`);
      if (parts.length > 0) {
        showToast(`${parts.join('، ')} يەرلىك ئامبارغا مۇۋەپپەقىيەتلىك ئەكىرىلدى`);
      }
    },
    [activeNote, createNote, handleAttachImageFile, handleUpdateContent, showToast]
  );

  const handleRestoreBackupFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      const restored = parseVaultBackupJson(text);
      if (!restored) {
        showToast('زاپاس ھۆججەت فورماتى توغرا ئەمەس');
        return;
      }
      setVault(restored);
      if (restored.notes[0]) {
        setPrefs((prev) => ({
          ...prev,
          activeNoteId: restored.notes[0].id,
          openTabIds: [restored.notes[0].id],
        }));
      }
      showToast(`${restored.notes.length} خاتىرە زاپاستىن ئەسلىگە كەلتۈرۈلدى`);
    },
    [showToast]
  );

  const handleExportToLocalFolder = useCallback(async () => {
    try {
      const res = await exportVaultToLocalFolder(vault);
      if (!res.supported) {
        exportVaultBackupJson(vault);
        showToast('تور كۆرگۈچ قىسقۇچقا بىۋاسىتە يېزىشنى قوللىمىدى — ئورنىغا تولۇق زاپاس (.json) چۈشۈرۈلدى');
      } else {
        showToast(`${res.count} پارچە .md ھۆججەت تاللىغان قىسقۇچىڭىزغا ساقلاندى`);
      }
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : '';
      if (name !== 'AbortError') {
        exportVaultBackupJson(vault);
        showToast('تولۇق زاپاس ھۆججىتى چۈشۈرۈلدى');
      }
    }
  }, [vault, showToast]);

  const handleResetStarterVault = useCallback(() => {
    const fresh = createStarterVault();
    setVault(fresh);
    setPrefs((prev) => ({
      ...prev,
      activeNoteId: fresh.notes[0].id,
      openTabIds: [fresh.notes[0].id],
      activePdfId: null,
    }));
    setMainSurface('editor');
    showToast('باشلانغۇچ ئۈلگە بىلىم ئامبىرى قايتا يۈكلەندى');
  }, [showToast]);

  // Multi-format Export Handlers for Active Note
  const handleExportNoteWord = useCallback(
    async (note: NoteItem) => {
      try {
        await exportNoteAsDocx(note);
        showToast(`«${note.title}.docx» Word ھۆججىتى چۈشۈرۈلدى`);
      } catch {
        showToast('Word ھۆججىتى چىقىرىشتا خاتالىق كۆرۈلدى');
      }
    },
    [showToast]
  );

  const handleExportNotePdf = useCallback(() => {
    if (prefs.editorMode === 'edit') {
      setPrefs((p) => ({ ...p, editorMode: 'preview' }));
      setTimeout(() => window.print(), 180);
    } else {
      window.print();
    }
  }, [prefs.editorMode]);

  // Canvas Board Handlers
  const handleChangeCanvas = useCallback((cards: CanvasCard[], edges: CanvasEdge[]) => {
    setVault((prev) => ({
      ...prev,
      canvasCards: cards,
      canvasEdges: edges,
    }));
  }, []);

  // Flashcards Handlers
  const handleUpdateFlashcardProgress = useCallback((cardId: string, next: FlashcardProgress) => {
    setVault((prev) => ({
      ...prev,
      flashcardProgress: {
        ...(prev.flashcardProgress ?? {}),
        [cardId]: next,
      },
    }));
  }, []);

  const handleAddCustomFlashcard = useCallback(
    (question: string, answer: string) => {
      const card = {
        id: generateId('fc'),
        question,
        answer,
        createdAt: Date.now(),
      };
      setVault((prev) => ({
        ...prev,
        customFlashcards: [card, ...(prev.customFlashcards ?? [])],
      }));
      showToast('يېڭى ئەسلەش كارتىسى قوشۇلدى');
    },
    [showToast]
  );

  const handleDeleteCustomFlashcard = useCallback(
    (cardId: string) => {
      setVault((prev) => ({
        ...prev,
        customFlashcards: (prev.customFlashcards ?? []).filter((c) => c.id !== cardId),
      }));
      showToast('كارتا ئۆچۈرۈلدى');
    },
    [showToast]
  );

  // Local Vault Lock Handlers
  const handleSetVaultLock = useCallback(
    async (password: string) => {
      const cfg = await setVaultLockPassword(password);
      setLockConfig(cfg);
      showToast('يەرلىك ئامبار قۇلۇپى قوزغىتىلدى');
    },
    [showToast]
  );

  const handleRemoveVaultLock = useCallback(() => {
    clearVaultLockPassword();
    setLockConfig(null);
    setIsLocked(false);
    showToast('ئامبار قۇلۇپى بىكار قىلىندى');
  }, [showToast]);

  // AI Output handlers
  const handleAppendAiToNote = useCallback(
    (text: string) => {
      if (!activeNote) return;
      const next = `${activeNote.content.trimEnd()}\n\n---\n\n${text}`;
      handleUpdateContent(activeNote.id, next);
      showToast('سۈنئىي ئەقىل نەتىجىسى خاتىرە ئاخىرىغا قوشۇلدى');
    },
    [activeNote, handleUpdateContent, showToast]
  );

  const handleReplaceAiContent = useCallback(
    (text: string) => {
      if (!activeNote) return;
      handleUpdateContent(activeNote.id, text);
      showToast('خاتىرە مەزمۇنى يېڭىلاندى');
    },
    [activeNote, handleUpdateContent, showToast]
  );

  const cycleTheme = useCallback(() => {
    setPrefs((prev) => {
      const idx = THEME_ORDER.indexOf(prev.theme);
      const nextTheme = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
      showToast(`تېما ئۆزگەردى: ${THEME_LABELS[nextTheme]}`);
      return { ...prev, theme: nextTheme };
    });
  }, [showToast]);

  const showInspector = mainSurface === 'editor' && prefs.leftInspectorOpen;

  return (
    <div
      dir="rtl"
      className="h-screen w-screen overflow-hidden flex flex-col"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingFile(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setIsDraggingFile(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingFile(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          void handleImportFiles(e.dataTransfer.files);
        }
      }}
    >
      {/* Local Vault Lock Gate */}
      {isLocked && lockConfig && (
        <VaultLockOverlay lockConfig={lockConfig} onUnlock={() => setIsLocked(false)} />
      )}

      {/* Clean 3-Zone Top Bar */}
      <header
        className="no-print h-12 px-5 border-b flex items-center justify-between gap-6 shrink-0"
        style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}
      >
        {/* Zone 1: Single-line Brand Wordmark with Logo */}
        <button
          type="button"
          onClick={() => setMainSurface('editor')}
          className="inline-flex items-center gap-2.5 text-base font-bold tracking-tight whitespace-nowrap shrink-0 cursor-pointer"
          style={{ color: 'var(--text-primary)' }}
        >
          <BrandLogo size={26} />
          <span>تەپەككۇر بۇلىقى</span>
        </button>

        {/* Zone 2: 5 Concise Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium">
          <button
            type="button"
            onClick={() => setMainSurface('editor')}
            className="py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2"
            style={{
              color: mainSurface === 'editor' ? 'var(--text-primary)' : 'var(--text-muted)',
              borderColor: mainSurface === 'editor' ? 'var(--accent)' : 'transparent',
            }}
          >
            خاتىرىلەر
          </button>
          <button
            type="button"
            onClick={() => setMainSurface('graph')}
            className="py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2"
            style={{
              color: mainSurface === 'graph' ? 'var(--text-primary)' : 'var(--text-muted)',
              borderColor: mainSurface === 'graph' ? 'var(--accent)' : 'transparent',
            }}
          >
            بىلىم گرافىكى
          </button>
          <button
            type="button"
            onClick={() => setMainSurface('canvas')}
            className="py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2"
            style={{
              color: mainSurface === 'canvas' ? 'var(--text-primary)' : 'var(--text-muted)',
              borderColor: mainSurface === 'canvas' ? 'var(--accent)' : 'transparent',
            }}
          >
            تەپەككۇر تاختىسى
          </button>
          <button
            type="button"
            onClick={() => setMainSurface('flashcards')}
            className="py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2"
            style={{
              color: mainSurface === 'flashcards' ? 'var(--text-primary)' : 'var(--text-muted)',
              borderColor: mainSurface === 'flashcards' ? 'var(--accent)' : 'transparent',
            }}
          >
            ئەسلەش كارتىسى
          </button>
          <button
            type="button"
            onClick={() => setMainSurface('about')}
            className="py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2"
            style={{
              color: mainSurface === 'about' ? 'var(--text-primary)' : 'var(--text-muted)',
              borderColor: mainSurface === 'about' ? 'var(--accent)' : 'transparent',
            }}
          >
            بىز ھەققىدە
          </button>
        </nav>

        {/* Zone 3: Single Primary Action */}
        <button
          type="button"
          onClick={() => createNote({ folderId: activeNote?.folderId ?? null })}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
        >
          <FilePlus2 className="w-3.5 h-3.5" />
          <span>يېڭى خاتىرە</span>
        </button>
      </header>

      {/* Workspace Body: Right Sidebar + Center Viewport + Left Inspector */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Right Sidebar (Files, Search, Tags, PDF/Images Library) */}
        {prefs.rightSidebarOpen && (
          <VaultSidebar
            notes={vault.notes}
            folders={vault.folders}
            attachments={vault.attachments ?? []}
            activeNoteId={activeNote?.id ?? null}
            activeTab={sidebarTab}
            selectedTagFilter={selectedTagFilter}
            vaultIndex={vaultIndex}
            onChangeTab={setSidebarTab}
            onSelectNote={openNote}
            onOpenPdfAttachment={handleOpenPdfAttachment}
            onDeleteAttachment={(id) => void handleDeleteAttachment(id)}
            onCreateNote={(folderId) => createNote({ folderId })}
            onCreateFolder={handleCreateFolder}
            onToggleFolder={handleToggleFolder}
            onDeleteFolder={handleDeleteFolder}
            onOpenDailyNote={handleOpenDailyNote}
            onOpenTemplates={() => setTemplatesOpen(true)}
            onSelectTagFilter={setSelectedTagFilter}
            onImportFiles={(files) => void handleImportFiles(files)}
            onExportBackup={() => {
              exportVaultBackupJson(vault);
              showToast('تولۇق بىلىم ئامبىرى زاپىسى چۈشۈرۈلدى');
            }}
          />
        )}

        {/* Center Main Workspace */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Tab Strip & Workspace Controls */}
          <div
            className="no-print h-10 px-2.5 border-b flex items-center justify-between gap-2 shrink-0"
            style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto">
              <button
                type="button"
                title={prefs.rightSidebarOpen ? 'ئوڭ تاختىنى يوشۇرۇش' : 'ئوڭ تاختىنى ئېچىش'}
                onClick={() => setPrefs((p) => ({ ...p, rightSidebarOpen: !p.rightSidebarOpen }))}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors shrink-0 cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                <PanelRight className="w-4 h-4" />
              </button>

              {/* Open Note Tabs & Active Surface Indicator */}
              <div className="flex items-center gap-1 min-w-0">
                {openTabs.map((tabNote) => {
                  const isActive = mainSurface === 'editor' && activeNote?.id === tabNote.id;
                  return (
                    <div
                      key={tabNote.id}
                      className="group flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs max-w-[170px] shrink-0 transition-colors"
                      style={{
                        backgroundColor: isActive ? 'var(--bg-canvas)' : 'transparent',
                        borderColor: isActive ? 'var(--border-subtle)' : 'transparent',
                        color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => openNote(tabNote.id)}
                        className="flex items-center gap-1.5 min-w-0 cursor-pointer"
                      >
                        <FileText className="w-3 h-3 shrink-0" />
                        <span className="truncate">{tabNote.title}</span>
                      </button>
                      {openTabs.length > 1 && (
                        <button
                          type="button"
                          title="بەتنى يېپىش"
                          onClick={(e) => {
                            e.stopPropagation();
                            closeTab(tabNote.id);
                          }}
                          className="opacity-60 hover:opacity-100 p-0.5 rounded cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {mainSurface === 'graph' && (
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs shrink-0 whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <Network className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                    <span>بىلىم گرافىكى</span>
                  </div>
                )}

                {mainSurface === 'pdf' && (
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs shrink-0 whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <BookOpen className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                    <span>PDF ئوقۇغۇچ</span>
                  </div>
                )}

                {mainSurface === 'canvas' && (
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs shrink-0 whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <LayoutGrid className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                    <span>تەپەككۇر تاختىسى</span>
                  </div>
                )}

                {mainSurface === 'flashcards' && (
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs shrink-0 whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <Layers className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                    <span>ئەسلەش كارتىسى</span>
                  </div>
                )}

                {mainSurface === 'about' && (
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs shrink-0 whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <Info className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                    <span>بىز ھەققىدە</span>
                  </div>
                )}
              </div>
            </div>

            {/* Utility Controls */}
            <div className="flex items-center gap-1 shrink-0">
              <PWAInstallButton
                onInstalled={() => showToast('«تەپەككۇر بۇلىقى» ئۈستەلئۈستى پىروگراممىسى بولۇپ قاچىلاندى')}
              />

              <button
                type="button"
                title="PDF كىتاب ئوقۇغۇچ"
                onClick={() => setMainSurface('pdf')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs hover:bg-[var(--bg-hover)] transition-colors cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: mainSurface === 'pdf' ? 'var(--bg-active)' : 'transparent',
                  color: mainSurface === 'pdf' ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">PDF كىتاب</span>
              </button>

              <button
                type="button"
                title="بۈگۈنكى كۈندىلىك خاتىرە"
                onClick={handleOpenDailyNote}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                <CalendarDays className="w-4 h-4" />
              </button>

              <button
                type="button"
                title="تېز ئىزدەش ۋە بۇيرۇق تاختىسى (Ctrl+K)"
                onClick={() => setCommandOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs hover:bg-[var(--bg-hover)] transition-colors cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">تېز ئىزدەش</span>
                <span className="font-code text-[10px] opacity-70 hidden xl:inline" dir="ltr">
                  Ctrl+K
                </span>
              </button>

              <button
                type="button"
                title={`تېما ئالماشتۇرۇش (${THEME_LABELS[prefs.theme]})`}
                onClick={cycleTheme}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Palette className="w-4 h-4" />
              </button>

              {lockConfig?.enabled && (
                <button
                  type="button"
                  title="ئامبارنى دەرھال قۇلۇپلاش"
                  onClick={() => setIsLocked(true)}
                  className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                  style={{ color: 'var(--accent)' }}
                >
                  <Lock className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                title="تەڭشەكلەر ۋە بىخەتەرلىك"
                onClick={() => setSettingsOpen(true)}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Settings className="w-4 h-4" />
              </button>

              {mainSurface === 'editor' && (
                <button
                  type="button"
                  title={prefs.leftInspectorOpen ? 'سول تەكشۈرۈش تاختىسىنى يوشۇرۇش' : 'سول تەكشۈرۈش تاختىسىنى ئېچىش'}
                  onClick={() => setPrefs((p) => ({ ...p, leftInspectorOpen: !p.leftInspectorOpen }))}
                  className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <PanelLeft className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Active Center Surface */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {mainSurface === 'graph' ? (
              <GraphView
                mode="global"
                nodes={vaultIndex.graphNodes}
                edges={vaultIndex.graphEdges}
                allTags={vaultIndex.allTags}
                activeNoteId={activeNote?.id ?? null}
                theme={prefs.theme}
                onSelectNote={openNote}
                onCreateUnresolvedNote={handleOpenWikilink}
              />
            ) : mainSurface === 'pdf' ? (
              <PdfReaderView
                pdfAttachments={pdfAttachments}
                activePdfId={prefs.activePdfId ?? null}
                notes={vault.notes}
                onSelectPdf={(id) => setPrefs((p) => ({ ...p, activePdfId: id }))}
                onUploadPdfFiles={(files) => void handleImportFiles(files)}
                onDeletePdf={(id) => void handleDeleteAttachment(id)}
                onOpenNote={openNote}
                onCreateLinkedNoteForPdf={handleCreateLinkedNoteForPdf}
                onUpdateNoteContent={handleUpdateContent}
                onNotify={showToast}
              />
            ) : mainSurface === 'canvas' ? (
              <CanvasBoardView
                cards={vault.canvasCards ?? []}
                edges={vault.canvasEdges ?? []}
                notes={vault.notes}
                onChangeCanvas={handleChangeCanvas}
                onOpenNote={openNote}
              />
            ) : mainSurface === 'flashcards' ? (
              <FlashcardsView
                notes={vault.notes}
                customFlashcards={vault.customFlashcards ?? []}
                flashcardProgress={vault.flashcardProgress ?? {}}
                onUpdateProgress={handleUpdateFlashcardProgress}
                onAddCustomCard={handleAddCustomFlashcard}
                onDeleteCustomCard={handleDeleteCustomFlashcard}
                onOpenNote={openNote}
              />
            ) : mainSurface === 'about' ? (
              <AboutPage
                noteCount={vault.notes.length}
                folderCount={vault.folders.length}
                attachmentCount={(vault.attachments ?? []).length}
                onStartWriting={() => setMainSurface('editor')}
              />
            ) : activeNote ? (
              <MarkdownEditor
                note={activeNote}
                allNotes={vault.notes}
                folders={vault.folders}
                noteByNormalizedTitle={vaultIndex.noteByNormalizedTitle}
                editorMode={prefs.editorMode}
                fontStyle={prefs.fontStyle}
                fontSize={prefs.fontSize}
                onChangeMode={(editorMode: EditorViewMode) => setPrefs((p) => ({ ...p, editorMode }))}
                onUpdateContent={handleUpdateContent}
                onRenameNote={handleRenameNote}
                onMoveNoteFolder={handleMoveNoteFolder}
                onTogglePin={handleTogglePin}
                onDeleteNote={handleDeleteNote}
                onExportNoteMarkdown={(n) => {
                  exportSingleNoteAsMarkdown(n);
                  showToast(`«${n.title}.md» چۈشۈرۈلدى`);
                }}
                onExportNoteWord={(n) => void handleExportNoteWord(n)}
                onExportNoteTxt={(n) => {
                  exportNoteAsTxt(n);
                  showToast(`«${n.title}.txt» چۈشۈرۈلدى`);
                }}
                onExportNotePdf={handleExportNotePdf}
                onAttachImageFile={handleAttachImageFile}
                onOpenWikilink={handleOpenWikilink}
                onClickTag={handleClickTag}
                onOpenTemplates={() => setTemplatesOpen(true)}
                onNotify={showToast}
                scrollToHeadingId={scrollToHeadingId}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-4">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  ھازىرچە ئوچۇق خاتىرە يوق. تۇنجى خاتىرىڭىزنى قۇرۇپ تەپەككۇر بۇلىقىنى باشلاڭ.
                </p>
                <button
                  type="button"
                  onClick={() => createNote()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                >
                  <FilePlus2 className="w-4 h-4" />
                  <span>يېڭى خاتىرە قۇرۇش</span>
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Left Inspector Panel (Backlinks, Outline, Local Graph, AI Assistant) */}
        {showInspector && (
          <InspectorPanel
            activeTab={inspectorTab}
            activeNote={activeNote}
            allNotes={vault.notes}
            vaultIndex={vaultIndex}
            theme={prefs.theme}
            onChangeTab={setInspectorTab}
            onSelectNote={openNote}
            onOpenWikilink={handleOpenWikilink}
            onClickTag={handleClickTag}
            onSelectHeading={(id) => {
              if (prefs.editorMode === 'edit') {
                setPrefs((p) => ({ ...p, editorMode: 'split' }));
              }
              setScrollToHeadingId(null);
              requestAnimationFrame(() => setScrollToHeadingId(id));
            }}
            onExpandGlobalGraph={() => setMainSurface('graph')}
            onAppendAiToNote={handleAppendAiToNote}
            onReplaceAiContent={handleReplaceAiContent}
            onCreateNoteFromAi={(title, content) => {
              createNote({ title, content, folderId: activeNote?.folderId ?? null });
              showToast(`«${title}» نامىدا يېڭى خاتىرە قۇرۇلدى`);
            }}
          />
        )}
      </div>

      {/* Modals */}
      <CommandPalette
        isOpen={commandOpen}
        notes={vault.notes}
        onClose={() => setCommandOpen(false)}
        onSelectNote={openNote}
        onCreateNoteWithTitle={(title) => createNote({ title })}
        onOpenDailyNote={handleOpenDailyNote}
        onOpenGraph={() => setMainSurface('graph')}
        onOpenPdfReader={() => setMainSurface('pdf')}
        onOpenCanvas={() => setMainSurface('canvas')}
        onOpenFlashcards={() => setMainSurface('flashcards')}
        onOpenAbout={() => setMainSurface('about')}
        onOpenTemplates={() => setTemplatesOpen(true)}
        onOpenAi={() => {
          setMainSurface('editor');
          setPrefs((p) => ({ ...p, leftInspectorOpen: true }));
          setInspectorTab('ai');
        }}
        onChangeTheme={(theme) => {
          setPrefs((p) => ({ ...p, theme }));
          showToast(`تېما ئۆزگەردى: ${THEME_LABELS[theme]}`);
        }}
      />

      <TemplatesModal
        isOpen={templatesOpen}
        templates={vault.templates}
        hasActiveNote={Boolean(activeNote)}
        onClose={() => setTemplatesOpen(false)}
        onInsertTemplate={handleInsertTemplate}
        onCreateNoteFromTemplate={handleCreateNoteFromTemplate}
        onAddCustomTemplate={handleAddCustomTemplate}
        onDeleteCustomTemplate={handleDeleteCustomTemplate}
      />

      <SettingsModal
        isOpen={settingsOpen}
        theme={prefs.theme}
        fontStyle={prefs.fontStyle}
        fontSize={prefs.fontSize}
        noteCount={vault.notes.length}
        folderCount={vault.folders.length}
        attachmentCount={(vault.attachments ?? []).length}
        attachmentBytes={totalAttachmentBytes}
        lockConfig={lockConfig}
        onClose={() => setSettingsOpen(false)}
        onChangeTheme={(theme) => {
          setPrefs((p) => ({ ...p, theme }));
          showToast(`تېما ئۆزگەردى: ${THEME_LABELS[theme]}`);
        }}
        onChangeFontStyle={(fontStyle: FontStyleId) => setPrefs((p) => ({ ...p, fontStyle }))}
        onChangeFontSize={(fontSize) => setPrefs((p) => ({ ...p, fontSize }))}
        onSetVaultLock={handleSetVaultLock}
        onRemoveVaultLock={handleRemoveVaultLock}
        onLockNow={() => {
          setSettingsOpen(false);
          setIsLocked(true);
        }}
        onExportBackup={() => {
          exportVaultBackupJson(vault);
          showToast('تولۇق بىلىم ئامبىرى زاپىسى چۈشۈرۈلدى');
        }}
        onExportToLocalFolder={handleExportToLocalFolder}
        onRestoreBackupFile={handleRestoreBackupFile}
        onResetStarterVault={handleResetStarterVault}
      />

      {/* Drag & Drop Multi-Format File Import Overlay */}
      {isDraggingFile && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/50 backdrop-blur-[2px]"
        >
          <div
            className="px-8 py-6 rounded-xl border-2 border-dashed text-center"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--accent)',
              color: 'var(--text-primary)',
            }}
          >
            <div className="text-base font-semibold">
              Markdown (.md)، Word (.docx)، PDF، TXT، رەسىم ياكى زاپاس (.json) ھۆججىتىنى تاشلاڭ
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              بارلىق ھۆججەتلەر پەقەت ئۆز كومپيۇتېرىڭىزدىكى يەرلىك ئامبارغا ئەكىرىلىدۇ
            </div>
          </div>
        </div>
      )}

      {/* Offline Mode Indicator */}
      <OfflineIndicator />

      {/* Subtle Transient Action Toast */}
      {toastMessage && (
        <div
          role="status"
          className="no-print fixed bottom-4 left-4 z-50 px-4 py-2.5 rounded-lg border text-xs font-medium shadow-lg"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-strong)',
            color: 'var(--text-primary)',
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
