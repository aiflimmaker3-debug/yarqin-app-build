import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  FilePlus2,
  FileText,
  Info,
  Layers,
  LayoutGrid,
  LayoutTemplate,
  Network,
  Palette,
  Search,
  Sparkles,
} from 'lucide-react';
import { NoteItem, ThemeId } from '../types/vault';

interface CommandPaletteProps {
  isOpen: boolean;
  notes: NoteItem[];
  onClose: () => void;
  onSelectNote: (noteId: string) => void;
  onCreateNoteWithTitle: (title: string) => void;
  onOpenDailyNote: () => void;
  onOpenGraph: () => void;
  onOpenPdfReader: () => void;
  onOpenCanvas: () => void;
  onOpenFlashcards: () => void;
  onOpenAbout: () => void;
  onOpenTemplates: () => void;
  onOpenAi: () => void;
  onChangeTheme: (theme: ThemeId) => void;
}

interface PaletteOption {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.FC<{ className?: string }>;
  onRun: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  notes,
  onClose,
  onSelectNote,
  onCreateNoteWithTitle,
  onOpenDailyNote,
  onOpenGraph,
  onOpenPdfReader,
  onOpenCanvas,
  onOpenFlashcards,
  onOpenAbout,
  onOpenTemplates,
  onOpenAi,
  onChangeTheme,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIdx(0);
    }
  }, [isOpen]);

  const options = useMemo<PaletteOption[]>(() => {
    const q = query.trim().toLowerCase();
    const list: PaletteOption[] = [];

    // Matching notes first
    const matchedNotes = notes
      .filter((n) => !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
      .slice(0, 8);

    for (const note of matchedNotes) {
      list.push({
        id: `note-${note.id}`,
        label: note.title,
        sublabel: 'خاتىرە ئېچىش',
        icon: FileText,
        onRun: () => {
          onSelectNote(note.id);
          onClose();
        },
      });
    }

    // Create new note directly with query text
    if (query.trim()) {
      list.push({
        id: 'create-from-query',
        label: `«${query.trim()}» نامىدا يېڭى خاتىرە قۇرۇش`,
        sublabel: 'يېڭى خاتىرە',
        icon: FilePlus2,
        onRun: () => {
          onCreateNoteWithTitle(query.trim());
          onClose();
        },
      });
    }

    // Quick workspace commands
    const commands: PaletteOption[] = [
      {
        id: 'cmd-daily',
        label: 'بۈگۈنكى كۈندىلىك خاتىرىنى ئېچىش',
        sublabel: 'بۇيرۇق',
        icon: CalendarDays,
        onRun: () => {
          onOpenDailyNote();
          onClose();
        },
      },
      {
        id: 'cmd-graph',
        label: 'بىلىم تورى گرافىكىنى ئېچىش',
        sublabel: 'كۆرۈنۈش',
        icon: Network,
        onRun: () => {
          onOpenGraph();
          onClose();
        },
      },
      {
        id: 'cmd-pdf',
        label: 'PDF كىتاب ئوقۇش ۋە بىللە خاتىرە يېزىش',
        sublabel: 'كۆرۈنۈش',
        icon: BookOpen,
        onRun: () => {
          onOpenPdfReader();
          onClose();
        },
      },
      {
        id: 'cmd-canvas',
        label: 'تەپەككۇر تاختىسى (Canvas) نى ئېچىش',
        sublabel: 'كۆرۈنۈش',
        icon: LayoutGrid,
        onRun: () => {
          onOpenCanvas();
          onClose();
        },
      },
      {
        id: 'cmd-flashcards',
        label: 'ئەسلەش كارتىلىرى (Flashcards) نى ئېچىش',
        sublabel: 'تەكرارلاش',
        icon: Layers,
        onRun: () => {
          onOpenFlashcards();
          onClose();
        },
      },
      {
        id: 'cmd-about',
        label: 'بىز ھەققىدە ۋە تولۇق قوللانما',
        sublabel: 'ئۇچۇر',
        icon: Info,
        onRun: () => {
          onOpenAbout();
          onClose();
        },
      },
      {
        id: 'cmd-templates',
        label: 'قېلىپ تاللاش ۋە قىستۇرۇش',
        sublabel: 'قېلىپ',
        icon: LayoutTemplate,
        onRun: () => {
          onOpenTemplates();
          onClose();
        },
      },
      {
        id: 'cmd-ai',
        label: 'سۈنئىي ئەقىل ياردەمچىسىنى ئېچىش',
        sublabel: 'AI',
        icon: Sparkles,
        onRun: () => {
          onOpenAi();
          onClose();
        },
      },
      {
        id: 'theme-obsidian',
        label: 'تېما: ئوبسىدىيان قاراڭغۇ',
        sublabel: 'ئۇسلۇب',
        icon: Palette,
        onRun: () => {
          onChangeTheme('obsidian-dark');
          onClose();
        },
      },
      {
        id: 'theme-modern-light',
        label: 'تېما: زامانىۋى يورۇق',
        sublabel: 'ئۇسلۇب',
        icon: Palette,
        onRun: () => {
          onChangeTheme('modern-light');
          onClose();
        },
      },
      {
        id: 'theme-modern-dark',
        label: 'تېما: زامانىۋى قاراڭغۇ',
        sublabel: 'ئۇسلۇب',
        icon: Palette,
        onRun: () => {
          onChangeTheme('modern-dark');
          onClose();
        },
      },
      {
        id: 'theme-paper',
        label: 'تېما: ئىللىق قەغەز ۋە كىتاب',
        sublabel: 'ئۇسلۇب',
        icon: Palette,
        onRun: () => {
          onChangeTheme('paper-light');
          onClose();
        },
      },
    ];

    for (const cmd of commands) {
      if (!q || cmd.label.toLowerCase().includes(q) || (cmd.sublabel && cmd.sublabel.toLowerCase().includes(q))) {
        list.push(cmd);
      }
    }

    return list;
  }, [query, notes, onSelectNote, onClose, onCreateNoteWithTitle, onOpenDailyNote, onOpenGraph, onOpenTemplates, onOpenAi, onChangeTheme]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => (options.length ? (i + 1) % options.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => (options.length ? (i - 1 + options.length) % options.length : 0));
    } else if (e.key === 'Enter' && options[selectedIdx]) {
      e.preventDefault();
      options[selectedIdx].onRun();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/50 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-xl rounded-xl border overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-strong)' }}
        onKeyDown={handleKeyDown}
      >
        <div
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="خاتىرە ئىزدەش، يېڭى خاتىرە قۇرۇش ياكى بۇيرۇق تاللاش..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          <span className="font-code text-[11px]" style={{ color: 'var(--text-muted)' }}>
            ESC
          </span>
        </div>

        <ul className="max-h-[55vh] overflow-y-auto py-1.5">
          {options.map((opt, idx) => {
            const Icon = opt.icon;
            const active = idx === selectedIdx;
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  onMouseEnter={() => setSelectedIdx(idx)}
                  onClick={opt.onRun}
                  className="w-full text-right flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer"
                  style={{
                    backgroundColor: active ? 'var(--bg-active)' : 'transparent',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {opt.sublabel && (
                    <span className="text-[11px] shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {opt.sublabel}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          {options.length === 0 && (
            <li className="px-4 py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              نەتىجە تېپىلمىدى.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};
