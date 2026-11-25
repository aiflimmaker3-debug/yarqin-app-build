import React, { useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  Download,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Hash,
  ImageIcon,
  LayoutTemplate,
  Pin,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { AttachmentMeta, FolderItem, NoteItem, SidebarTab, VaultGraphIndex } from '../types/vault';
import { formatBytesUg } from '../utils/indexedDb';

interface VaultSidebarProps {
  notes: NoteItem[];
  folders: FolderItem[];
  attachments: AttachmentMeta[];
  activeNoteId: string | null;
  activeTab: SidebarTab;
  selectedTagFilter: string | null;
  vaultIndex: VaultGraphIndex;
  onChangeTab: (tab: SidebarTab) => void;
  onSelectNote: (noteId: string) => void;
  onOpenPdfAttachment: (attachmentId: string) => void;
  onDeleteAttachment: (attachmentId: string) => void;
  onCreateNote: (folderId: string | null) => void;
  onCreateFolder: (name: string) => void;
  onToggleFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onOpenDailyNote: () => void;
  onOpenTemplates: () => void;
  onSelectTagFilter: (tag: string | null) => void;
  onImportFiles: (files: FileList) => void;
  onExportBackup: () => void;
}

export const VaultSidebar: React.FC<VaultSidebarProps> = ({
  notes,
  folders,
  attachments,
  activeNoteId,
  activeTab,
  selectedTagFilter,
  vaultIndex,
  onChangeTab,
  onSelectNote,
  onOpenPdfAttachment,
  onDeleteAttachment,
  onCreateNote,
  onCreateFolder,
  onToggleFolder,
  onDeleteFolder,
  onOpenDailyNote,
  onOpenTemplates,
  onSelectTagFilter,
  onImportFiles,
  onExportBackup,
}) => {
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pinnedNotes = useMemo(
    () => notes.filter((n) => n.isPinned).sort((a, b) => b.updatedAt - a.updatedAt),
    [notes]
  );

  const rootNotes = useMemo(
    () => notes.filter((n) => !n.folderId).sort((a, b) => b.updatedAt - a.updatedAt),
    [notes]
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return notes
      .filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
      .map((n) => {
        const idx = n.content.toLowerCase().indexOf(q);
        let snippet = '';
        if (idx !== -1) {
          const start = Math.max(0, idx - 32);
          const end = Math.min(n.content.length, idx + q.length + 65);
          snippet = n.content.slice(start, end).replace(/\n/g, ' ');
        }
        return { note: n, snippet };
      });
  }, [notes, searchQuery]);

  const taggedNotes = useMemo(() => {
    if (!selectedTagFilter) return [];
    const ids = vaultIndex.notesByTag.get(selectedTagFilter) ?? [];
    return ids.map((id) => vaultIndex.noteById.get(id)).filter((n): n is NoteItem => Boolean(n));
  }, [selectedTagFilter, vaultIndex]);

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newFolderName.trim();
    if (cleaned) {
      onCreateFolder(cleaned);
    }
    setNewFolderName('');
    setCreatingFolder(false);
  };

  return (
    <aside
      className="no-print w-[274px] shrink-0 h-full flex flex-col border-l select-none"
      style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}
    >
      {/* Top Segmented Tabs */}
      <div className="p-2.5 border-b shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
        <div
          className="grid grid-cols-4 p-0.5 rounded-lg border"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <button
            type="button"
            onClick={() => onChangeTab('files')}
            className="flex flex-col items-center justify-center py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap"
            style={{
              backgroundColor: activeTab === 'files' ? 'var(--bg-elevated)' : 'transparent',
              color: activeTab === 'files' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <Folder className="w-3.5 h-3.5 mb-0.5" />
            <span>ھۆججەت</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('search')}
            className="flex flex-col items-center justify-center py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap"
            style={{
              backgroundColor: activeTab === 'search' ? 'var(--bg-elevated)' : 'transparent',
              color: activeTab === 'search' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <Search className="w-3.5 h-3.5 mb-0.5" />
            <span>ئىزدەش</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('tags')}
            className="flex flex-col items-center justify-center py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap"
            style={{
              backgroundColor: activeTab === 'tags' ? 'var(--bg-elevated)' : 'transparent',
              color: activeTab === 'tags' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <Hash className="w-3.5 h-3.5 mb-0.5" />
            <span>خەتكۈچ</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('library')}
            className="flex flex-col items-center justify-center py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap"
            style={{
              backgroundColor: activeTab === 'library' ? 'var(--bg-elevated)' : 'transparent',
              color: activeTab === 'library' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <BookOpen className="w-3.5 h-3.5 mb-0.5" />
            <span>PDF/رەسىم</span>
          </button>
        </div>
      </div>

      {/* Quick Action Row (when in files tab) */}
      {activeTab === 'files' && (
        <div
          className="flex items-center justify-between px-3 py-2 border-b shrink-0"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <span className="text-[11px] font-medium tabular-nums" style={{ color: 'var(--text-muted)' }}>
            ئامبار · {notes.length} خاتىرە
          </span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              title="يېڭى خاتىرە"
              onClick={() => onCreateNote(null)}
              className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              <FilePlus2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="يېڭى قىسقۇچ"
              onClick={() => setCreatingFolder(true)}
              className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="بۈگۈنكى كۈندىلىك خاتىرە"
              onClick={onOpenDailyNote}
              className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              <CalendarDays className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="قېلىپلار"
              onClick={onOpenTemplates}
              className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
        {/* FILES TAB */}
        {activeTab === 'files' && (
          <div className="space-y-3">
            {creatingFolder && (
              <form
                onSubmit={handleCreateFolderSubmit}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border"
                style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--accent)' }}
              >
                <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
                <input
                  type="text"
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onBlur={() => {
                    if (!newFolderName.trim()) setCreatingFolder(false);
                  }}
                  placeholder="قىسقۇچ نامى..."
                  className="flex-1 min-w-0 bg-transparent text-xs outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
                <button
                  type="button"
                  onClick={() => setCreatingFolder(false)}
                  className="p-0.5 cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X className="w-3 h-3" />
                </button>
              </form>
            )}

            {/* Pinned Notes */}
            {pinnedNotes.length > 0 && (
              <div>
                <div className="px-2 pb-1 text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                  چوققىلانغان
                </div>
                <ul className="space-y-0.5">
                  {pinnedNotes.map((note) => {
                    const active = note.id === activeNoteId;
                    return (
                      <li key={`pin-${note.id}`}>
                        <button
                          type="button"
                          onClick={() => onSelectNote(note.id)}
                          className="w-full text-right flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] transition-colors cursor-pointer"
                          style={{
                            backgroundColor: active ? 'var(--bg-active)' : 'transparent',
                            color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                          }}
                        >
                          <Pin className="w-3 h-3 shrink-0" style={{ color: 'var(--accent)' }} />
                          <span className="truncate">{note.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Folders & Nested Notes */}
            <div className="space-y-1">
              {folders.map((folder) => {
                const folderNotes = notes
                  .filter((n) => n.folderId === folder.id)
                  .sort((a, b) => b.updatedAt - a.updatedAt);

                return (
                  <div key={folder.id}>
                    <div className="group flex items-center justify-between px-1.5 py-1 rounded-md hover:bg-[var(--bg-hover)] transition-colors">
                      <button
                        type="button"
                        onClick={() => onToggleFolder(folder.id)}
                        className="flex-1 min-w-0 flex items-center gap-1.5 text-right text-[13px] font-medium cursor-pointer"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {folder.isOpen ? (
                          <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                        ) : (
                          <ChevronLeft className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                        )}
                        {folder.isOpen ? (
                          <FolderOpen className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent-text)' }} />
                        ) : (
                          <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                        )}
                        <span className="truncate">{folder.name}</span>
                        <span className="text-[11px] tabular-nums mr-auto" style={{ color: 'var(--text-muted)' }}>
                          {folderNotes.length}
                        </span>
                      </button>

                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mr-1">
                        <button
                          type="button"
                          title="بۇ قىسقۇچتا يېڭى خاتىرە قۇرۇش"
                          onClick={() => onCreateNote(folder.id)}
                          className="p-1 rounded hover:bg-[var(--bg-elevated)] cursor-pointer"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <FilePlus2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          title="قىسقۇچنى ئۆچۈرۈش (خاتىرىلەر ساقلىنىدۇ)"
                          onClick={() => onDeleteFolder(folder.id)}
                          className="p-1 rounded hover:bg-[var(--bg-elevated)] cursor-pointer"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {folder.isOpen && (
                      <ul className="mt-0.5 pr-4 space-y-0.5 border-r mr-3" style={{ borderColor: 'var(--border-subtle)' }}>
                        {folderNotes.map((note) => {
                          const active = note.id === activeNoteId;
                          return (
                            <li key={note.id}>
                              <button
                                type="button"
                                onClick={() => onSelectNote(note.id)}
                                className="w-full text-right flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors cursor-pointer hover:bg-[var(--bg-hover)]"
                                style={{
                                  backgroundColor: active ? 'var(--bg-active)' : undefined,
                                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                                  fontWeight: active ? 500 : 400,
                                }}
                              >
                                <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                                <span className="truncate">{note.title}</span>
                              </button>
                            </li>
                          );
                        })}
                        {folderNotes.length === 0 && (
                          <li className="px-2 py-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            قىسقۇچ قۇرۇق
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                );
              })}

              {/* Root-level Notes */}
              {rootNotes.length > 0 && (
                <div className="pt-2">
                  <div className="px-2 pb-1 text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                    قىسقۇچسىز خاتىرىلەر
                  </div>
                  <ul className="space-y-0.5">
                    {rootNotes.map((note) => {
                      const active = note.id === activeNoteId;
                      return (
                        <li key={note.id}>
                          <button
                            type="button"
                            onClick={() => onSelectNote(note.id)}
                            className="w-full text-right flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[13px] transition-colors cursor-pointer hover:bg-[var(--bg-hover)]"
                            style={{
                              backgroundColor: active ? 'var(--bg-active)' : undefined,
                              color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                              fontWeight: active ? 500 : 400,
                            }}
                          >
                            <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                            <span className="truncate">{note.title}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SEARCH TAB */}
        {activeTab === 'search' && (
          <div className="space-y-3 p-1">
            <div
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg border"
              style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)' }}
            >
              <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بارلىق خاتىرىلەردىن ئىزدەش..."
                className="flex-1 min-w-0 bg-transparent text-xs outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {searchQuery.trim() ? (
              searchResults.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="px-1 text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {searchResults.length} نەتىجە تېپىلدى
                  </div>
                  {searchResults.map(({ note, snippet }) => (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => onSelectNote(note.id)}
                      className="w-full text-right p-2.5 rounded-lg border transition-colors cursor-pointer hover:bg-[var(--bg-hover)]"
                      style={{
                        backgroundColor: note.id === activeNoteId ? 'var(--bg-active)' : 'var(--bg-surface)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {note.title}
                      </div>
                      {snippet && (
                        <div className="mt-1 text-[11px] line-clamp-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          {snippet}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                  «{searchQuery}» ئۈچۈن نەتىجە تېپىلمىدى.
                </div>
              )
            ) : (
              <div className="py-6 px-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                ماۋزۇ ياكى مەزمۇن ئىچىدىن ئىزدەش ئۈچۈن سۆز كىرگۈزۈڭ. تېز ئالماشتۇرۇش ئۈچۈن{' '}
                <span className="font-code" dir="ltr">
                  Ctrl+K
                </span>{' '}
                نى ئىشلىتەلەيسىز.
              </div>
            )}
          </div>
        )}

        {/* TAGS TAB */}
        {activeTab === 'tags' && (
          <div className="space-y-3 p-1">
            {selectedTagFilter ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold" style={{ color: 'var(--tag-color)' }}>
                    #{selectedTagFilter}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectTagFilter(null)}
                    className="text-[11px] hover:underline cursor-pointer"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    بارلىق خەتكۈچلەر
                  </button>
                </div>
                <ul className="space-y-1">
                  {taggedNotes.map((note) => (
                    <li key={note.id}>
                      <button
                        type="button"
                        onClick={() => onSelectNote(note.id)}
                        className="w-full text-right flex items-center gap-2 px-2.5 py-2 rounded-md text-xs cursor-pointer hover:bg-[var(--bg-hover)]"
                        style={{
                          backgroundColor: note.id === activeNoteId ? 'var(--bg-active)' : 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                        <span className="truncate">{note.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : vaultIndex.allTags.length > 0 ? (
              <ul className="space-y-0.5">
                {vaultIndex.allTags.map((item) => (
                  <li key={item.tag}>
                    <button
                      type="button"
                      onClick={() => onSelectTagFilter(item.tag)}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-colors cursor-pointer hover:bg-[var(--bg-hover)]"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <span className="font-medium truncate" style={{ color: 'var(--tag-color)' }}>
                        #{item.tag}
                      </span>
                      <span className="tabular-nums text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {item.count}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 px-2 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                تېخى خەتكۈچ قوشۇلمىغان. خاتىرە ئىچىدە #تارىخ شەكلىدە يېزىپ سىناڭ.
              </div>
            )}
          </div>
        )}
        {/* LIBRARY TAB (PDF & Images in IndexedDB) */}
        {activeTab === 'library' && (
          <div className="space-y-4 p-1">
            {attachments.length === 0 ? (
              <div
                className="py-8 px-3 rounded-lg border text-center space-y-3"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
              >
                <BookOpen className="w-7 h-7 mx-auto" style={{ color: 'var(--text-muted)' }} />
                <div className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  تېخى PDF كىتاب ياكى رەسىم ئەكىرىلمىگەن. بارلىق ھۆججەتلەر پەقەت ئۆز كومپيۇتېرىڭىزدىكى IndexedDB دا بىخەتەر ساقلىنىدۇ.
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>PDF / Word / رەسىم ئەكىرىش</span>
                </button>
              </div>
            ) : (
              <>
                {/* PDF Books Section */}
                <div>
                  <div className="flex items-center justify-between px-1 pb-1.5">
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      PDF كىتاب ۋە ماتېرىياللار
                    </span>
                    <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      {attachments.filter((a) => a.kind === 'pdf').length}
                    </span>
                  </div>
                  {attachments.filter((a) => a.kind === 'pdf').length > 0 ? (
                    <ul className="space-y-1">
                      {attachments
                        .filter((a) => a.kind === 'pdf')
                        .map((att) => (
                          <li
                            key={att.id}
                            className="group flex items-center gap-1.5 px-2 py-1.5 rounded-md border transition-colors hover:bg-[var(--bg-hover)]"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-subtle)',
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => onOpenPdfAttachment(att.id)}
                              className="flex-1 min-w-0 text-right flex items-center gap-2 cursor-pointer"
                            >
                              <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent)' }} />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                  {att.name}
                                </div>
                                <div className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                                  {formatBytesUg(att.size)}
                                </div>
                              </div>
                            </button>
                            <button
                              type="button"
                              title="PDF نى ئۆچۈرۈش"
                              onClick={() => onDeleteAttachment(att.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--bg-elevated)] transition-opacity cursor-pointer"
                              style={{ color: 'var(--danger)' }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <div className="px-2 py-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      PDF ھۆججىتى يوق
                    </div>
                  )}
                </div>

                {/* Images Section */}
                <div>
                  <div className="flex items-center justify-between px-1 pb-1.5">
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      خاتىرىگە قىستۇرۇلغان رەسىملەر
                    </span>
                    <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      {attachments.filter((a) => a.kind === 'image').length}
                    </span>
                  </div>
                  {attachments.filter((a) => a.kind === 'image').length > 0 ? (
                    <ul className="space-y-1">
                      {attachments
                        .filter((a) => a.kind === 'image')
                        .map((att) => (
                          <li
                            key={att.id}
                            className="group flex items-center gap-1.5 px-2 py-1.5 rounded-md border transition-colors"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-subtle)',
                            }}
                          >
                            <ImageIcon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                                {att.name}
                              </div>
                              <div className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                                {formatBytesUg(att.size)}
                              </div>
                            </div>
                            <button
                              type="button"
                              title="رەسىمنى ئۆچۈرۈش"
                              onClick={() => onDeleteAttachment(att.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--bg-elevated)] transition-opacity cursor-pointer"
                              style={{ color: 'var(--danger)' }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <div className="px-2 py-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      رەسىم ھۆججىتى يوق
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom Local Vault Import / Backup Footer */}
      <div
        className="px-3 py-2.5 border-t flex items-center justify-between gap-2 shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".md,.markdown,.txt,.docx,.pdf,.json,image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onImportFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />
        <button
          type="button"
          title="Markdown, Word (.docx), PDF, TXT, رەسىم ياكى زاپاس (.json) ئەكىرىش"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md border text-[11px] font-medium hover:bg-[var(--bg-hover)] transition-colors cursor-pointer whitespace-nowrap"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>ئەكىرىش</span>
        </button>
        <button
          type="button"
          onClick={onExportBackup}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md border text-[11px] font-medium hover:bg-[var(--bg-hover)] transition-colors cursor-pointer whitespace-nowrap"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
        >
          <Download className="w-3.5 h-3.5" />
          <span>زاپاسلاش</span>
        </button>
      </div>
    </aside>
  );
};
