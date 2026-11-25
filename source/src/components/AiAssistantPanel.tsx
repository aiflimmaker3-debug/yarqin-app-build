import React, { useState } from 'react';
import {
  Check,
  Copy,
  FilePlus2,
  GitBranch,
  Loader2,
  Replace,
  RotateCcw,
  Send,
  Sparkles,
  Wand2,
  FileText,
  AlignRight,
} from 'lucide-react';
import { AiActionType, NoteItem } from '../types/vault';
import { MarkdownPreview } from './MarkdownPreview';

interface AiAssistantPanelProps {
  activeNote: NoteItem | null;
  allNotes: NoteItem[];
  noteByNormalizedTitle: Map<string, NoteItem>;
  onAppendToNote: (text: string) => void;
  onReplaceNoteContent: (text: string) => void;
  onCreateNoteFromAi: (title: string, content: string) => void;
  onOpenWikilink: (targetTitle: string) => void;
  onClickTag: (tag: string) => void;
}

const QUICK_ACTIONS: Array<{
  id: Exclude<AiActionType, 'ask'>;
  label: string;
  desc: string;
  icon: React.FC<{ className?: string }>;
}> = [
  {
    id: 'summarize',
    label: 'خاتىرىنى خۇلاسىلەش',
    desc: 'ئاساسلىق نۇقتا ۋە قىسقىچە يەكۈن چىقىرىش',
    icon: AlignRight,
  },
  {
    id: 'proofread',
    label: 'ئىملا ۋە ئۇسلۇب تۈزىتىش',
    desc: 'ئۇيغۇرچە جۈملە راۋانلىقى ۋە فورماتنى ياخشىلاش',
    icon: Wand2,
  },
  {
    id: 'suggest_links',
    label: 'ئۇلانما ۋە خەتكۈچ تەۋسىيەسى',
    desc: 'ئامباردىكى باشقا خاتىرىلەر بىلەن باغلىنىش تېپىش',
    icon: GitBranch,
  },
  {
    id: 'expand',
    label: 'مەزمۇننى كېڭەيتىش',
    desc: 'قىسقا پىكىرنى تارماق ماۋزۇلۇق تولۇق خاتىرىگە ئايلاندۇرۇش',
    icon: FileText,
  },
];

export const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({
  activeNote,
  allNotes,
  noteByNormalizedTitle,
  onAppendToNote,
  onReplaceNoteContent,
  onCreateNoteFromAi,
  onOpenWikilink,
  onClickTag,
}) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState<AiActionType | null>(null);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const runAiAction = async (action: AiActionType, customQuestion?: string) => {
    if (!activeNote) return;
    setLoading(true);
    setError(null);
    setLastAction(action);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          noteTitle: activeNote.title,
          noteContent: activeNote.content,
          vaultTitles: allNotes.map((n) => n.title),
          question: customQuestion,
        }),
      });

      const data = (await response.json()) as { result?: string; error?: string };
      if (!response.ok || !data.result) {
        setError(data.error || 'سۈنئىي ئەقىل جاۋاب قايتۇرۇشتا خاتالىق كۆرۈلدى.');
        return;
      }

      setResult(data.result);
    } catch {
      setError('مۇلازىمېتىر بىلەن ئۇلىنىش مەغلۇپ بولدى. تور ئۇلىنىشىڭىزنى تەكشۈرۈپ قايتا سىناڭ.');
    } finally {
      setLoading(false);
    }
  };

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading) return;
    runAiAction('ask', question.trim());
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(result).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!activeNote) {
    return (
      <div className="p-4 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        سۈنئىي ئەقىل ياردەمچىسىنى ئىشلىتىش ئۈچۈن ئالدى بىلەن بىر خاتىرىنى ئېچىڭ.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Quick Action List */}
      <div className="p-3.5 border-b space-y-2 shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          نۆۋەتتىكى خاتىرە ئۈچۈن تېز قوراللار
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {QUICK_ACTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                disabled={loading}
                onClick={() => runAiAction(item.id)}
                className="w-full text-right px-3 py-2 rounded-lg border transition-colors cursor-pointer hover:bg-[var(--bg-hover)] disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </div>
                <div className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {item.desc}
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Question Input */}
        <form onSubmit={handleAskSubmit} className="pt-1 flex items-center gap-1.5">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="خاتىرە ھەققىدە سوئال سوراڭ..."
            className="flex-1 min-w-0 px-3 py-2 rounded-lg border text-xs outline-none"
            style={{
              backgroundColor: 'var(--bg-canvas)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            title="يوللاش"
            className="p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-40 shrink-0"
            style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Output / Loading / Error Region */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3.5">
        {loading && (
          <div className="py-10 flex flex-col items-center justify-center gap-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--accent)' }} />
            <span>خاتىرە تەھلىل قىلىنىۋاتىدۇ...</span>
          </div>
        )}

        {!loading && error && (
          <div
            className="p-3.5 rounded-lg border text-xs space-y-2.5 leading-relaxed"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--danger)',
              color: 'var(--text-primary)',
            }}
          >
            <div>{error}</div>
            {lastAction && (
              <button
                type="button"
                onClick={() => runAiAction(lastAction, question)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs cursor-pointer hover:bg-[var(--bg-hover)]"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>قايتا سىناش</span>
              </button>
            )}
          </div>
        )}

        {!loading && !error && result && (
          <div className="space-y-3">
            {/* Apply / Copy Bar */}
            <div className="flex items-center flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onAppendToNote(result)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium cursor-pointer transition-colors"
                style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
              >
                <Sparkles className="w-3 h-3" />
                <span>خاتىرىگە قوشۇش</span>
              </button>

              {(lastAction === 'proofread' || lastAction === 'expand') && (
                <button
                  type="button"
                  onClick={() => onReplaceNoteContent(result)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-[11px] font-medium cursor-pointer hover:bg-[var(--bg-hover)]"
                  style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
                >
                  <Replace className="w-3 h-3" />
                  <span>ئالماشتۇرۇش</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onCreateNoteFromAi(`${activeNote.title} — خۇلاسە`, result)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-[11px] cursor-pointer hover:bg-[var(--bg-hover)]"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                <FilePlus2 className="w-3 h-3" />
                <span>يېڭى خاتىرە</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-[11px] cursor-pointer hover:bg-[var(--bg-hover)]"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'كۆچۈرۈلدى' : 'كۆچۈرۈش'}</span>
              </button>
            </div>

            <div
              className="p-3.5 rounded-lg border"
              style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)' }}
            >
              <MarkdownPreview
                content={result}
                noteByNormalizedTitle={noteByNormalizedTitle}
                fontClass="font-uyghur-sans"
                fontSize={13.5}
                onOpenWikilink={onOpenWikilink}
                onClickTag={onClickTag}
              />
            </div>
          </div>
        )}

        {!loading && !error && !result && (
          <div className="py-6 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            يۇقىرىدىكى تۆت قورالدىن بىرنى تاللاڭ ياكى «{activeNote.title}» خاتىرىسى ھەققىدە خالىغان سوئالنى يېزىپ يوللاڭ.
          </div>
        )}
      </div>
    </div>
  );
};
