import React, { useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ListTree,
  Network,
  Sparkles,
  Link2,
} from 'lucide-react';
import { InspectorTab, NoteItem, ThemeId, VaultGraphIndex } from '../types/vault';
import { extractHeadings } from '../utils/markdown';
import { AiAssistantPanel } from './AiAssistantPanel';
import { GraphView } from './GraphView';

interface InspectorPanelProps {
  activeTab: InspectorTab;
  activeNote: NoteItem | null;
  allNotes: NoteItem[];
  vaultIndex: VaultGraphIndex;
  theme: ThemeId;
  onChangeTab: (tab: InspectorTab) => void;
  onSelectNote: (noteId: string) => void;
  onOpenWikilink: (targetTitle: string) => void;
  onClickTag: (tag: string) => void;
  onSelectHeading: (headingId: string) => void;
  onExpandGlobalGraph: () => void;
  onAppendAiToNote: (text: string) => void;
  onReplaceAiContent: (text: string) => void;
  onCreateNoteFromAi: (title: string, content: string) => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  activeTab,
  activeNote,
  allNotes,
  vaultIndex,
  theme,
  onChangeTab,
  onSelectNote,
  onOpenWikilink,
  onClickTag,
  onSelectHeading,
  onExpandGlobalGraph,
  onAppendAiToNote,
  onReplaceAiContent,
  onCreateNoteFromAi,
}) => {
  const backlinks = useMemo(
    () => (activeNote ? vaultIndex.backlinksByNoteId.get(activeNote.id) ?? [] : []),
    [activeNote, vaultIndex]
  );

  const outgoingLinks = useMemo(
    () => (activeNote ? vaultIndex.outgoingByNoteId.get(activeNote.id) ?? [] : []),
    [activeNote, vaultIndex]
  );

  const headings = useMemo(
    () => (activeNote ? extractHeadings(activeNote.content) : []),
    [activeNote]
  );

  const noteTags = useMemo(
    () => (activeNote ? vaultIndex.tagsByNoteId.get(activeNote.id) ?? [] : []),
    [activeNote, vaultIndex]
  );

  return (
    <aside
      className="no-print w-[310px] shrink-0 h-full flex flex-col border-r"
      style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}
    >
      {/* Inspector Tab Bar */}
      <div className="p-2.5 border-b shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
        <div
          className="grid grid-cols-4 p-0.5 rounded-lg border"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <button
            type="button"
            title="باغلىنىشلار (Backlinks)"
            onClick={() => onChangeTab('links')}
            className="flex flex-col items-center justify-center py-1.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
            style={{
              backgroundColor: activeTab === 'links' ? 'var(--bg-elevated)' : 'transparent',
              color: activeTab === 'links' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <Link2 className="w-3.5 h-3.5 mb-0.5" />
            <span>ئۇلانما</span>
          </button>
          <button
            type="button"
            title="مۇندەرىجە (Outline)"
            onClick={() => onChangeTab('outline')}
            className="flex flex-col items-center justify-center py-1.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
            style={{
              backgroundColor: activeTab === 'outline' ? 'var(--bg-elevated)' : 'transparent',
              color: activeTab === 'outline' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <ListTree className="w-3.5 h-3.5 mb-0.5" />
            <span>مۇندەرىجە</span>
          </button>
          <button
            type="button"
            title="يەرلىك گرافىك"
            onClick={() => onChangeTab('local-graph')}
            className="flex flex-col items-center justify-center py-1.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
            style={{
              backgroundColor: activeTab === 'local-graph' ? 'var(--bg-elevated)' : 'transparent',
              color: activeTab === 'local-graph' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <Network className="w-3.5 h-3.5 mb-0.5" />
            <span>گرافىك</span>
          </button>
          <button
            type="button"
            title="سۈنئىي ئەقىل ياردەمچىسى"
            onClick={() => onChangeTab('ai')}
            className="flex flex-col items-center justify-center py-1.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
            style={{
              backgroundColor: activeTab === 'ai' ? 'var(--bg-elevated)' : 'transparent',
              color: activeTab === 'ai' ? 'var(--accent-text)' : 'var(--text-muted)',
            }}
          >
            <Sparkles className="w-3.5 h-3.5 mb-0.5" />
            <span>AI</span>
          </button>
        </div>
      </div>

      {/* Inspector Body */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* LINKS & BACKLINKS */}
        {activeTab === 'links' && (
          <div className="flex-1 overflow-y-auto p-3.5 space-y-5">
            {!activeNote ? (
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                خاتىرە تاللانمىدى.
              </div>
            ) : (
              <>
                {/* Backlinks Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-semibold"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                      <span>ئەكسى ئۇلانمىلار (Backlinks)</span>
                    </span>
                    <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      {backlinks.length}
                    </span>
                  </div>
                  {backlinks.length > 0 ? (
                    <div className="space-y-1.5">
                      {backlinks.map((bl) => (
                        <button
                          key={bl.sourceNoteId}
                          type="button"
                          onClick={() => onSelectNote(bl.sourceNoteId)}
                          className="w-full text-right p-2.5 rounded-lg border transition-colors cursor-pointer hover:bg-[var(--bg-hover)]"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-subtle)',
                          }}
                        >
                          <div className="text-xs font-medium" style={{ color: 'var(--link-color)' }}>
                            {bl.sourceTitle}
                          </div>
                          <div className="mt-1 text-[11px] line-clamp-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            {bl.snippet}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      باشقا خاتىرىلەردىن بۇ بەتكە تېخى ئۇلانما قويۇلمىغان.
                    </p>
                  )}
                </div>

                {/* Outgoing Links */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-semibold"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" style={{ color: 'var(--link-color)' }} />
                      <span>چىقىش ئۇلانمىلىرى</span>
                    </span>
                    <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      {outgoingLinks.length}
                    </span>
                  </div>
                  {outgoingLinks.length > 0 ? (
                    <ul className="space-y-1">
                      {outgoingLinks.map((link) => (
                        <li key={link.targetTitle}>
                          <button
                            type="button"
                            onClick={() => onOpenWikilink(link.targetTitle)}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer hover:bg-[var(--bg-hover)]"
                            style={{ color: link.resolvedNoteId ? 'var(--text-primary)' : 'var(--text-muted)' }}
                          >
                            <span className="truncate">{link.targetTitle}</span>
                            <span className="text-[11px] shrink-0 mr-2" style={{ color: 'var(--text-muted)' }}>
                              {link.resolvedNoteId ? 'ئېچىش' : 'قۇرۇش'}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      بۇ خاتىرىدە [[ئۇلانما]] يوق.
                    </p>
                  )}
                </div>

                {/* Tags in this Note (clean unboxed text) */}
                {noteTags.length > 0 && (
                  <div className="pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                      خاتىرىدىكى خەتكۈچلەر
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                      {noteTags.map((tag, idx) => (
                        <React.Fragment key={tag}>
                          {idx > 0 && (
                            <span aria-hidden="true" style={{ color: 'var(--text-muted)' }}>
                              ·
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => onClickTag(tag)}
                            className="hover:underline cursor-pointer"
                            style={{ color: 'var(--tag-color)' }}
                          >
                            #{tag}
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* OUTLINE */}
        {activeTab === 'outline' && (
          <div className="flex-1 overflow-y-auto p-3.5">
            <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
              بەت مۇندەرىجىسى
            </div>
            {headings.length > 0 ? (
              <ul className="space-y-1">
                {headings.map((h) => (
                  <li key={h.id} style={{ paddingRight: `${(h.level - 1) * 12}px` }}>
                    <button
                      type="button"
                      onClick={() => onSelectHeading(h.id)}
                      className="w-full text-right px-2 py-1.5 rounded-md text-xs hover:bg-[var(--bg-hover)] transition-colors cursor-pointer truncate"
                      style={{
                        color: h.level === 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontWeight: h.level <= 2 ? 500 : 400,
                      }}
                    >
                      {h.text}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                ماۋزۇ تېپىلمىدى. خاتىرىدە <span className="font-code" dir="ltr">## ماۋزۇ</span> شەكلىدە قۇرۇلما قوشۇڭ.
              </p>
            )}
          </div>
        )}

        {/* LOCAL GRAPH */}
        {activeTab === 'local-graph' && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div
              className="px-3.5 py-2 border-b text-[11px]"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
            >
              نۆۋەتتىكى خاتىرىنىڭ قوشنا باغلىنىش تورى
            </div>
            <div className="flex-1 min-h-0">
              <GraphView
                mode="local"
                nodes={vaultIndex.graphNodes}
                edges={vaultIndex.graphEdges}
                allTags={vaultIndex.allTags}
                activeNoteId={activeNote?.id ?? null}
                theme={theme}
                onSelectNote={onSelectNote}
                onCreateUnresolvedNote={onOpenWikilink}
                onExpandToGlobal={onExpandGlobalGraph}
              />
            </div>
          </div>
        )}

        {/* AI ASSISTANT */}
        {activeTab === 'ai' && (
          <AiAssistantPanel
            activeNote={activeNote}
            allNotes={allNotes}
            noteByNormalizedTitle={vaultIndex.noteByNormalizedTitle}
            onAppendToNote={onAppendAiToNote}
            onReplaceNoteContent={onReplaceAiContent}
            onCreateNoteFromAi={onCreateNoteFromAi}
            onOpenWikilink={onOpenWikilink}
            onClickTag={onClickTag}
          />
        )}
      </div>
    </aside>
  );
};
