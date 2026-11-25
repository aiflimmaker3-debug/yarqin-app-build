import { BUILT_IN_TEMPLATES, createStarterVault } from '../data/starterVault';
import { NoteItem, VaultState, WorkspacePreferences } from '../types/vault';
import { getTodayDateString } from './markdown';

const VAULT_STORAGE_KEY = 'tepekkur_buliqi_vault_v1';
const PREFS_STORAGE_KEY = 'tepekkur_buliqi_prefs_v1';

export const DEFAULT_PREFS: WorkspacePreferences = {
  theme: 'obsidian-dark',
  fontStyle: 'naskh',
  fontSize: 16,
  editorMode: 'split',
  rightSidebarOpen: true,
  leftInspectorOpen: true,
  openTabIds: ['note-welcome'],
  activeNoteId: 'note-welcome',
};

export function normalizeVaultState(parsed: Partial<VaultState>): VaultState {
  const starter = createStarterVault();
  const savedTemplates = Array.isArray(parsed.templates) ? parsed.templates : [];
  const customTemplates = savedTemplates.filter((t) => !t.isBuiltIn);
  return {
    version: 2,
    notes: Array.isArray(parsed.notes) ? parsed.notes : starter.notes,
    folders: Array.isArray(parsed.folders) ? parsed.folders : starter.folders,
    templates: [...BUILT_IN_TEMPLATES, ...customTemplates],
    attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
    canvasCards: Array.isArray(parsed.canvasCards) ? parsed.canvasCards : starter.canvasCards,
    canvasEdges: Array.isArray(parsed.canvasEdges) ? parsed.canvasEdges : starter.canvasEdges,
    customFlashcards: Array.isArray(parsed.customFlashcards) ? parsed.customFlashcards : [],
    flashcardProgress:
      parsed.flashcardProgress && typeof parsed.flashcardProgress === 'object' ? parsed.flashcardProgress : {},
  };
}

export function loadVaultFromLocal(): VaultState {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) {
      return createStarterVault();
    }
    const parsed = JSON.parse(raw) as Partial<VaultState>;
    if (!Array.isArray(parsed.notes) || !Array.isArray(parsed.folders)) {
      return createStarterVault();
    }
    return normalizeVaultState(parsed);
  } catch {
    return createStarterVault();
  }
}

export function saveVaultToLocal(vault: VaultState): boolean {
  try {
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
    return true;
  } catch (err) {
    console.error('Local vault save failed:', err);
    return false;
  }
}

export function loadPrefsFromLocal(): WorkspacePreferences {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<WorkspacePreferences>;
    return {
      ...DEFAULT_PREFS,
      ...parsed,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefsToLocal(prefs: WorkspacePreferences): void {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota issues for preferences
  }
}

export function downloadTextFile(filename: string, content: string, mime = 'text/markdown;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportSingleNoteAsMarkdown(note: NoteItem): void {
  const safeName = note.title.replace(/[\\/:*?"<>|]/g, '_').trim() || 'note';
  downloadTextFile(`${safeName}.md`, note.content, 'text/markdown;charset=utf-8');
}

export function exportVaultBackupJson(vault: VaultState): void {
  const filename = `tepekkur-buliqi-backup-${getTodayDateString()}.json`;
  downloadTextFile(filename, JSON.stringify(vault, null, 2), 'application/json;charset=utf-8');
}

export function parseImportedMarkdownFile(fileName: string, content: string): { title: string; content: string } {
  const baseName = fileName.replace(/\.(md|markdown|txt)$/i, '').trim();
  const h1Match = /^#\s+(.+)$/m.exec(content);
  const title = baseName || h1Match?.[1]?.trim() || 'ئەكىرىلگەن خاتىرە';
  return { title, content };
}

export function parseVaultBackupJson(rawText: string): VaultState | null {
  try {
    const parsed = JSON.parse(rawText) as Partial<VaultState>;
    if (!Array.isArray(parsed.notes) || !Array.isArray(parsed.folders)) {
      return null;
    }
    const validNotes = parsed.notes.filter(
      (n): n is NoteItem =>
        typeof n?.id === 'string' && typeof n?.title === 'string' && typeof n?.content === 'string'
    );
    return normalizeVaultState({ ...parsed, notes: validNotes });
  } catch {
    return null;
  }
}

interface DirectoryHandleLike {
  getDirectoryHandle: (name: string, opts?: { create?: boolean }) => Promise<DirectoryHandleLike>;
  getFileHandle: (name: string, opts?: { create?: boolean }) => Promise<{
    createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }>;
  }>;
}

/**
 * Exports all vault notes as real .md files into a user-chosen local folder
 * using the File System Access API when supported (Chrome/Edge desktop).
 */
export async function exportVaultToLocalFolder(vault: VaultState): Promise<{ supported: boolean; count: number }> {
  const win = window as unknown as { showDirectoryPicker?: () => Promise<DirectoryHandleLike> };
  if (typeof win.showDirectoryPicker !== 'function') {
    return { supported: false, count: 0 };
  }

  const rootDir = await win.showDirectoryPicker();
  const folderNameMap = new Map<string, string>();
  for (const f of vault.folders) {
    folderNameMap.set(f.id, f.name.replace(/[\\/:*?"<>|]/g, '_'));
  }

  let count = 0;
  for (const note of vault.notes) {
    let targetDir = rootDir;
    if (note.folderId && folderNameMap.has(note.folderId)) {
      targetDir = await rootDir.getDirectoryHandle(folderNameMap.get(note.folderId)!, { create: true });
    }
    const safeTitle = note.title.replace(/[\\/:*?"<>|]/g, '_').trim() || note.id;
    const fileHandle = await targetDir.getFileHandle(`${safeTitle}.md`, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(note.content);
    await writable.close();
    count++;
  }

  return { supported: true, count };
}
