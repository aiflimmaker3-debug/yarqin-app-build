import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold,
  CheckSquare,
  ChevronDown,
  Code2,
  Columns2,
  Download,
  Eye,
  FilePlus2,
  FolderOpen,
  Heading2,
  ImagePlus,
  Italic,
  Languages,
  LayoutTemplate,
  Link2,
  List,
  PenLine,
  Pin,
  Printer,
  Quote,
  Table2,
  Trash2,
} from 'lucide-react';
import { EditorViewMode, FolderItem, FontStyleId, NoteItem } from '../types/vault';
import { computeNoteStats, formatRelativeTimeUg } from '../utils/markdown';
import { convertUeyToUly, convertUlyToUey } from '../utils/uyghurScript';
import { MarkdownPreview } from './MarkdownPreview';

interface MarkdownEditorProps {
  note: NoteItem;
  allNotes: NoteItem[];
  folders: FolderItem[];
  noteByNormalizedTitle: Map<string, NoteItem>;
  editorMode: EditorViewMode;
  fontStyle: FontStyleId;
  fontSize: number;
  onChangeMode: (mode: EditorViewMode) => void;
  onUpdateContent: (noteId: string, content: string) => void;
  onRenameNote: (noteId: string, newTitle: string) => void;
  onMoveNoteFolder: (noteId: string, folderId: string | null) => void;
  onTogglePin: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onExportNoteMarkdown: (note: NoteItem) => void;
  onExportNoteWord: (note: NoteItem) => void;
  onExportNoteTxt: (note: NoteItem) => void;
  onExportNotePdf: () => void;
  onAttachImageFile: (file: File) => Promise<string | null>;
  onOpenWikilink: (targetTitle: string) => void;
  onClickTag: (tag: string) => void;
  onOpenTemplates: () => void;
  onNotify: (msg: string) => void;
  scrollToHeadingId?: string | null;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  note,
  allNotes,
  folders,
  noteByNormalizedTitle,
  editorMode,
  fontStyle,
  fontSize,
  onChangeMode,
  onUpdateContent,
  onRenameNote,
  onMoveNoteFolder,
  onTogglePin,
  onDeleteNote,
  onExportNoteMarkdown,
  onExportNoteWord,
  onExportNoteTxt,
  onExportNotePdf,
  onAttachImageFile,
  onOpenWikilink,
  onClickTag,
  onOpenTemplates,
  onNotify,
  scrollToHeadingId,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [titleDraft, setTitleDraft] = useState(note.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [scriptMenuOpen, setScriptMenuOpen] = useState(false);

  // Wikilink [[ autocomplete state
  const [wikiQuery, setWikiQuery] = useState<string | null>(null);
  const [wikiStartPos, setWikiStartPos] = useState<number>(0);
  const [wikiSelectedIdx, setWikiSelectedIdx] = useState<number>(0);

  useEffect(() => {
    setTitleDraft(note.title);
    setConfirmDelete(false);
    setWikiQuery(null);
    setExportMenuOpen(false);
    setScriptMenuOpen(false);
  }, [note.id, note.title]);

  // Scroll to heading when clicked in Outline
  useEffect(() => {
    if (!scrollToHeadingId) return;
    if (previewContainerRef.current) {
      const target = previewContainerRef.current.querySelector(`#${CSS.escape(scrollToHeadingId)}`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [scrollToHeadingId]);

  const stats = useMemo(() => computeNoteStats(note.content), [note.content]);
  const fontClass = fontStyle === 'naskh' ? 'font-uyghur-prose' : 'font-uyghur-sans';

  const wikiSuggestions = useMemo(() => {
    if (wikiQuery === null) return [];
    const q = wikiQuery.trim().toLowerCase();
    return allNotes
      .filter((n) => n.id !== note.id && (!q || n.title.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [wikiQuery, allNotes, note.id]);

  const commitTitle = () => {
    const cleaned = titleDraft.trim();
    if (cleaned && cleaned !== note.title) {
      onRenameNote(note.id, cleaned);
    } else {
      setTitleDraft(note.title);
    }
  };

  const detectWikilinkTrigger = (value: string, caretPos: number) => {
    const before = value.slice(0, caretPos);
    const lastOpen = before.lastIndexOf('[[');
    if (lastOpen === -1) {
      setWikiQuery(null);
      return;
    }
    const between = before.slice(lastOpen + 2);
    if (between.includes(']]') || between.includes('\n')) {
      setWikiQuery(null);
      return;
    }
    setWikiStartPos(lastOpen);
    setWikiQuery(between);
    setWikiSelectedIdx(0);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onUpdateContent(note.id, val);
    detectWikilinkTrigger(val, e.target.selectionStart ?? val.length);
  };

  const insertWikilinkSuggestion = (targetTitle: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const caret = ta.selectionStart ?? note.content.length;
    const before = note.content.slice(0, wikiStartPos);
    const after = note.content.slice(caret);
    const closingNeeded = after.startsWith(']]') ? '' : ']]';
    const nextContent = `${before}[[${targetTitle}${closingNeeded}${after}`;
    onUpdateContent(note.id, nextContent);
    setWikiQuery(null);

    requestAnimationFrame(() => {
      const nextCaret = before.length + targetTitle.length + 4;
      ta.focus();
      ta.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (wikiQuery !== null && wikiSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setWikiSelectedIdx((prev) => (prev + 1) % wikiSuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setWikiSelectedIdx((prev) => (prev - 1 + wikiSuggestions.length) % wikiSuggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertWikilinkSuggestion(wikiSuggestions[wikiSelectedIdx].title);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setWikiQuery(null);
        return;
      }
    }
  };

  const wrapSelection = (before: string, after = '', placeholder = '') => {
    const ta = textareaRef.current;
    if (!ta) {
      onUpdateContent(note.id, `${note.content}\n${before}${placeholder}${after}`);
      return;
    }
    const start = ta.selectionStart ?? note.content.length;
    const end = ta.selectionEnd ?? note.content.length;
    const selected = note.content.slice(start, end) || placeholder;
    const nextContent = note.content.slice(0, start) + before + selected + after + note.content.slice(end);
    onUpdateContent(note.id, nextContent);

    requestAnimationFrame(() => {
      ta.focus();
      const selStart = start + before.length;
      ta.setSelectionRange(selStart, selStart + selected.length);
    });
  };

  const handleInsertImageFile = async (file: File) => {
    const markdownSnippet = await onAttachImageFile(file);
    if (!markdownSnippet) return;
    wrapSelection(`\n${markdownSnippet}\n`, '', '');
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          void handleInsertImageFile(file);
          return;
        }
      }
    }
  };

  const handleScriptConvert = (direction: 'uey-to-uly' | 'uly-to-uey') => {
    const ta = textareaRef.current;
    const converter = direction === 'uey-to-uly' ? convertUeyToUly : convertUlyToUey;
    const label = direction === 'uey-to-uly' ? 'لاتىن يېزىقىغا' : 'ئۇيغۇر ئەرەب يېزىقىغا';

    if (ta && ta.selectionStart !== ta.selectionEnd) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = note.content.slice(start, end);
      const converted = converter(selected);
      const next = note.content.slice(0, start) + converted + note.content.slice(end);
      onUpdateContent(note.id, next);
      onNotify(`تاللانغان تېكىست ${label} ئايلاندۇرۇلدى`);
    } else {
      const converted = converter(note.content);
      onUpdateContent(note.id, converted);
      onNotify(`پۈتۈن خاتىرە ${label} ئايلاندۇرۇلدى`);
    }
    setScriptMenuOpen(false);
  };

  const handleToggleCheckbox = (lineIndex: number) => {
    const lines = note.content.split('\n');
    const line = lines[lineIndex];
    if (!line) return;
    if (/^(\s*[-*+]\s+)\[ \]/.test(line)) {
      lines[lineIndex] = line.replace(/^(\s*[-*+]\s+)\[ \]/, '$1[x]');
    } else if (/^(\s*[-*+]\s+)\[[xX]\]/.test(line)) {
      lines[lineIndex] = line.replace(/^(\s*[-*+]\s+)\[[xX]\]/, '$1[ ]');
    }
    onUpdateContent(note.id, lines.join('\n'));
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Formatting & View Mode Toolbar */}
      <div
        className="no-print flex items-center justify-between gap-3 px-4 py-2 border-b shrink-0 flex-wrap"
        style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-canvas)' }}
      >
        {/* Formatting buttons */}
        <div className="flex items-center gap-0.5 flex-wrap">
          {editorMode !== 'preview' && (
            <>
              <button
                type="button"
                title="قېلىن خەت"
                onClick={() => wrapSelection('**', '**', 'قېلىن تېكىست')}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="قىيپاش خەت"
                onClick={() => wrapSelection('*', '*', 'قىيپاش تېكىست')}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="ماۋزۇ قوشۇش"
                onClick={() => wrapSelection('\n## ', '', 'تارماق ماۋزۇ')}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Heading2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="تىزىملىك"
                onClick={() => wrapSelection('\n- ', '', 'تۈر')}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="ۋەزىپە كاتەكچىسى"
                onClick={() => wrapSelection('\n- [ ] ', '', 'يېڭى ۋەزىپە')}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                <CheckSquare className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="نەقىل"
                onClick={() => wrapSelection('\n> ', '', 'نەقىل جۈملىسى')}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Quote className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="كود بۆلىكى (LTR)"
                onClick={() => wrapSelection('\n```text\n', '\n```\n', 'code')}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Code2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="جەدۋەل قىستۇرۇش"
                onClick={() =>
                  wrapSelection(
                    '\n| تۈر | چۈشەندۈرۈش |\n| --- | --- |\n| 1 | مەزمۇن |\n',
                    '',
                    ''
                  )
                }
                className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Table2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="ئۇلانما [[خاتىرە]]"
                onClick={() => wrapSelection('[[', ']]', 'خاتىرە نامى')}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                style={{ color: 'var(--link-color)' }}
              >
                <Link2 className="w-4 h-4" />
              </button>

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleInsertImageFile(file);
                    e.target.value = '';
                  }
                }}
              />
              <button
                type="button"
                title="رەسىم قىستۇرۇش (ياكى Ctrl+V)"
                onClick={() => imageInputRef.current?.click()}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                <ImagePlus className="w-4 h-4" />
              </button>

              <span className="mx-1 h-4 w-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
            </>
          )}

          {/* Uyghur Script Converter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setScriptMenuOpen((v) => !v);
                setExportMenuOpen(false);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium hover:bg-[var(--bg-hover)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Languages className="w-3.5 h-3.5" />
              <span>يېزىق ئالماشتۇرۇش</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {scriptMenuOpen && (
              <div
                className="absolute right-0 mt-1 w-52 rounded-lg border shadow-xl z-30 py-1"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-strong)' }}
              >
                <button
                  type="button"
                  onClick={() => handleScriptConvert('uey-to-uly')}
                  className="w-full text-right px-3 py-2 text-xs hover:bg-[var(--bg-hover)] cursor-pointer"
                  style={{ color: 'var(--text-primary)' }}
                >
                  ئۇيغۇر ئەرەب ⟵ لاتىن (UEY → ULY)
                </button>
                <button
                  type="button"
                  onClick={() => handleScriptConvert('uly-to-uey')}
                  className="w-full text-right px-3 py-2 text-xs hover:bg-[var(--bg-hover)] cursor-pointer"
                  style={{ color: 'var(--text-primary)' }}
                >
                  لاتىن ⟵ ئۇيغۇر ئەرەب (ULY → UEY)
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenTemplates}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium hover:bg-[var(--bg-hover)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            style={{ color: 'var(--text-secondary)' }}
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            <span>قېلىپ</span>
          </button>
        </div>

        {/* View Mode Switcher + Multi-Format Export + Note Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="flex items-center p-0.5 rounded-lg border"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <button
              type="button"
              onClick={() => onChangeMode('edit')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
              style={{
                backgroundColor: editorMode === 'edit' ? 'var(--bg-elevated)' : 'transparent',
                color: editorMode === 'edit' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              <PenLine className="w-3.5 h-3.5" />
              <span>تەھرىرلەش</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('split')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
              style={{
                backgroundColor: editorMode === 'split' ? 'var(--bg-elevated)' : 'transparent',
                color: editorMode === 'split' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>بۆلۈپ كۆرۈش</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('preview')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
              style={{
                backgroundColor: editorMode === 'preview' ? 'var(--bg-elevated)' : 'transparent',
                color: editorMode === 'preview' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>ئوقۇش</span>
            </button>
          </div>

          <button
            type="button"
            title={note.isPinned ? 'چوققىلاشنى بىكار قىلىش' : 'چوققىلاش'}
            onClick={() => onTogglePin(note.id)}
            className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            style={{ color: note.isPinned ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            <Pin className="w-4 h-4" />
          </button>

          {/* Multi-Format Export Menu (MD / Word / TXT / PDF) */}
          <div className="relative">
            <button
              type="button"
              title="چىقىرىش (MD / Word / TXT / PDF)"
              onClick={() => {
                setExportMenuOpen((v) => !v);
                setScriptMenuOpen(false);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">چىقىرىش</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {exportMenuOpen && (
              <div
                className="absolute left-0 mt-1 w-48 rounded-lg border shadow-xl z-30 py-1"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-strong)' }}
              >
                <button
                  type="button"
                  onClick={() => {
                    onExportNoteMarkdown(note);
                    setExportMenuOpen(false);
                  }}
                  className="w-full text-right px-3 py-2 text-xs hover:bg-[var(--bg-hover)] cursor-pointer"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Markdown (.md) چۈشۈرۈش
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onExportNoteWord(note);
                    setExportMenuOpen(false);
                  }}
                  className="w-full text-right px-3 py-2 text-xs hover:bg-[var(--bg-hover)] cursor-pointer"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Word ھۆججىتى (.docx)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onExportNoteTxt(note);
                    setExportMenuOpen(false);
                  }}
                  className="w-full text-right px-3 py-2 text-xs hover:bg-[var(--bg-hover)] cursor-pointer"
                  style={{ color: 'var(--text-primary)' }}
                >
                  ساپ تېكىست (.txt)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExportMenuOpen(false);
                    onExportNotePdf();
                  }}
                  className="w-full text-right px-3 py-2 text-xs hover:bg-[var(--bg-hover)] cursor-pointer inline-flex items-center justify-between"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span>PDF قىلىپ بېسىش / ساقلاش</span>
                  <Printer className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onDeleteNote(note.id)}
                className="px-2 py-1 rounded text-xs font-medium cursor-pointer whitespace-nowrap"
                style={{ backgroundColor: 'var(--danger)', color: '#ffffff' }}
              >
                ئۆچۈرۈشنى جەزملەش
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 rounded text-xs cursor-pointer whitespace-nowrap"
                style={{ color: 'var(--text-muted)' }}
              >
                بىكار قىلىش
              </button>
            </div>
          ) : (
            <button
              type="button"
              title="خاتىرىنى ئۆچۈرۈش"
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Note Title & Quiet Unboxed Metadata Row */}
      <div
        className="no-print px-6 pt-5 pb-3 border-b shrink-0"
        style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-canvas)' }}
      >
        <input
          type="text"
          dir="rtl"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitTitle();
              textareaRef.current?.focus();
            }
          }}
          placeholder="خاتىرە ماۋزۇسى..."
          className={`${fontClass} w-full bg-transparent text-2xl font-bold outline-none`}
          style={{ color: 'var(--text-primary)' }}
        />

        <div
          className="mt-2 flex items-center flex-wrap gap-x-2.5 gap-y-1 text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          <label className="inline-flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5" />
            <select
              value={note.folderId ?? ''}
              onChange={(e) => onMoveNoteFolder(note.id, e.target.value || null)}
              className="bg-transparent text-xs cursor-pointer outline-none"
              style={{ color: 'var(--text-secondary)' }}
            >
              <option value="" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
                قىسقۇچسىز (ئاساسىي قاتلام)
              </option>
              {folders.map((f) => (
                <option
                  key={f.id}
                  value={f.id}
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                >
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{stats.words} سۆز</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">تەخمىنەن {stats.readMinutes} مىنۇت ئوقۇش</span>
          <span aria-hidden="true">·</span>
          <span>يېڭىلانغىنى: {formatRelativeTimeUg(note.updatedAt)}</span>
        </div>
      </div>

      {/* Main Editor / Split / Reading Viewport */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* Raw RTL Markdown Editor Pane */}
        {(editorMode === 'edit' || editorMode === 'split') && (
          <div
            className={`no-print relative flex flex-col min-h-0 ${
              editorMode === 'split' ? 'w-1/2 border-l' : 'w-full'
            }`}
            style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-canvas)' }}
          >
            {/* Wikilink [[ Autocomplete Floating Bar */}
            {wikiQuery !== null && (
              <div
                className="mx-6 mt-2 rounded-lg border overflow-hidden shadow-lg z-20"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-strong)',
                }}
              >
                <div
                  className="px-3 py-1.5 text-[11px] border-b flex items-center justify-between"
                  style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
                >
                  <span>ئۇلانما تاللاڭ ([[{wikiQuery}...)</span>
                  <span>Enter بىلەن قىستۇرۇش</span>
                </div>
                {wikiSuggestions.length > 0 ? (
                  <ul className="max-h-48 overflow-y-auto py-1">
                    {wikiSuggestions.map((item, idx) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            insertWikilinkSuggestion(item.title);
                          }}
                          className="w-full text-right px-3 py-1.5 text-sm flex items-center justify-between transition-colors cursor-pointer"
                          style={{
                            backgroundColor: idx === wikiSelectedIdx ? 'var(--bg-active)' : 'transparent',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <span className="truncate">{item.title}</span>
                          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            [[ئۇلاش]]
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (wikiQuery.trim()) {
                        insertWikilinkSuggestion(wikiQuery.trim());
                      }
                    }}
                    className="w-full text-right px-3 py-2 text-xs flex items-center gap-2 cursor-pointer hover:bg-[var(--bg-hover)]"
                    style={{ color: 'var(--accent-text)' }}
                  >
                    <FilePlus2 className="w-3.5 h-3.5" />
                    <span>يېڭى ئۇلانما قويۇش: [[{wikiQuery.trim() || '...'}]]</span>
                  </button>
                )}
              </div>
            )}

            <textarea
              ref={textareaRef}
              dir="rtl"
              value={note.content}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onClick={(e) => detectWikilinkTrigger(e.currentTarget.value, e.currentTarget.selectionStart)}
              placeholder="بۇ يەرگە ئۇيغۇرچە Markdown خاتىرىڭىزنى يېزىڭ... [[ئۇلانما]]، #خەتكۈچ ياكى Ctrl+V بىلەن رەسىم چاپلىيالايسىز."
              className={`${fontClass} flex-1 w-full resize-none bg-transparent outline-none px-6 py-5 overflow-y-auto`}
              style={{
                color: 'var(--text-primary)',
                fontSize: `${fontSize}px`,
                lineHeight: 1.85,
              }}
            />
          </div>
        )}

        {/* Live Rendered Reading Pane */}
        {(editorMode === 'preview' || editorMode === 'split') && (
          <div
            ref={previewContainerRef}
            className={`print-only-content min-h-0 overflow-y-auto px-7 py-5 ${editorMode === 'split' ? 'w-1/2' : 'w-full'}`}
            style={{ backgroundColor: 'var(--bg-canvas)' }}
          >
            <MarkdownPreview
              content={note.content}
              noteByNormalizedTitle={noteByNormalizedTitle}
              fontClass={fontClass}
              fontSize={fontSize}
              onOpenWikilink={onOpenWikilink}
              onClickTag={onClickTag}
              onToggleCheckbox={handleToggleCheckbox}
            />
          </div>
        )}
      </div>
    </div>
  );
};
