import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Layers,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { CustomFlashcard, FlashcardProgress, NoteItem } from '../types/vault';
import {
  computeNextFlashcardProgress,
  extractFlashcardsFromNotes,
  ReviewRating,
} from '../utils/flashcards';

interface FlashcardsViewProps {
  notes: NoteItem[];
  customFlashcards: CustomFlashcard[];
  flashcardProgress: Record<string, FlashcardProgress>;
  onUpdateProgress: (cardId: string, next: FlashcardProgress) => void;
  onAddCustomCard: (question: string, answer: string) => void;
  onDeleteCustomCard: (cardId: string) => void;
  onOpenNote: (noteId: string) => void;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  notes,
  customFlashcards,
  flashcardProgress,
  onUpdateProgress,
  onAddCustomCard,
  onDeleteCustomCard,
  onOpenNote,
}) => {
  const [filterMode, setFilterMode] = useState<'due' | 'all'>('due');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQ, setNewQ] = useState('');
  const [newA, setNewA] = useState('');

  const allCards = useMemo(
    () => extractFlashcardsFromNotes(notes, customFlashcards),
    [notes, customFlashcards]
  );

  const now = Date.now();
  const dueCards = useMemo(
    () =>
      allCards.filter((card) => {
        const prog = flashcardProgress[card.id];
        return !prog || prog.nextReviewAt <= now;
      }),
    [allCards, flashcardProgress, now]
  );

  const activeDeck = filterMode === 'due' ? dueCards : allCards;
  const safeIdx = activeDeck.length > 0 ? currentIdx % activeDeck.length : 0;
  const currentCard = activeDeck[safeIdx] ?? null;

  const masteredCount = useMemo(
    () =>
      allCards.filter((c) => {
        const prog = flashcardProgress[c.id];
        return prog && prog.intervalDays >= 3;
      }).length,
    [allCards, flashcardProgress]
  );

  const handleRate = (rating: ReviewRating) => {
    if (!currentCard) return;
    const next = computeNextFlashcardProgress(currentCard.id, flashcardProgress[currentCard.id], rating);
    onUpdateProgress(currentCard.id, next);
    setRevealed(false);
    if (filterMode === 'all') {
      setCurrentIdx((i) => i + 1);
    } else {
      setCurrentIdx(0);
    }
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQ.trim() || !newA.trim()) return;
    onAddCustomCard(newQ.trim(), newA.trim());
    setNewQ('');
    setNewA('');
    setShowAddForm(false);
  };

  return (
    <div className="h-full overflow-y-auto px-6 py-6" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header & Quiet Metrics */}
        <div
          className="flex items-start justify-between gap-4 pb-4 border-b flex-wrap"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              ئەسلەش كارتىلىرى ۋە ئارىلىق تەكرارلاش
            </h1>
            <div className="mt-1.5 flex items-center gap-2 text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
              <span>جەمئىي {allCards.length} كارتا</span>
              <span aria-hidden="true">·</span>
              <span>بۈگۈن تەكرارلاشقا تېگىشلىك: {dueCards.length}</span>
              <span aria-hidden="true">·</span>
              <span>مۇستەھكەملەنگەن: {masteredCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="flex items-center p-0.5 rounded-lg border"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
            >
              <button
                type="button"
                onClick={() => {
                  setFilterMode('due');
                  setCurrentIdx(0);
                  setRevealed(false);
                }}
                className="px-3 py-1 rounded-md text-xs font-medium cursor-pointer"
                style={{
                  backgroundColor: filterMode === 'due' ? 'var(--bg-elevated)' : 'transparent',
                  color: filterMode === 'due' ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                بۈگۈنكى ({dueCards.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterMode('all');
                  setCurrentIdx(0);
                  setRevealed(false);
                }}
                className="px-3 py-1 rounded-md text-xs font-medium cursor-pointer"
                style={{
                  backgroundColor: filterMode === 'all' ? 'var(--bg-elevated)' : 'transparent',
                  color: filterMode === 'all' ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                ھەممىسى ({allCards.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
              style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>يېڭى كارتا</span>
            </button>
          </div>
        </div>

        {/* Add Custom Card Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreateCustom}
            className="p-4 rounded-xl border space-y-3"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-strong)' }}
          >
            <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              يېڭى ئەسلەش كارتىسى قوشۇش
            </div>
            <input
              type="text"
              required
              value={newQ}
              onChange={(e) => setNewQ(e.target.value)}
              placeholder="سوئالنى يېزىڭ..."
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{
                backgroundColor: 'var(--bg-canvas)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
            <textarea
              required
              rows={2}
              value={newA}
              onChange={(e) => setNewA(e.target.value)}
              placeholder="جاۋابنى يېزىڭ..."
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
              style={{
                backgroundColor: 'var(--bg-canvas)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 rounded-md border text-xs cursor-pointer"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
              >
                بىكار قىلىش
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-md text-xs font-medium cursor-pointer"
                style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
              >
                كارتىنى ساقلاش
              </button>
            </div>
          </form>
        )}

        {/* Active Study Card */}
        {currentCard ? (
          <div
            className="rounded-xl border p-6 sm:p-8 space-y-6"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span className="tabular-nums">
                كارتا {safeIdx + 1} / {activeDeck.length}
              </span>
              <div className="flex items-center gap-3">
                {currentCard.sourceNoteId ? (
                  <button
                    type="button"
                    onClick={() => onOpenNote(currentCard.sourceNoteId!)}
                    className="inline-flex items-center gap-1 hover:underline cursor-pointer"
                    style={{ color: 'var(--link-color)' }}
                  >
                    <span>مەنبە: {currentCard.sourceTitle}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                ) : (
                  <span>{currentCard.sourceTitle}</span>
                )}
                {currentCard.isCustom && (
                  <button
                    type="button"
                    title="كارتىنى ئۆچۈرۈش"
                    onClick={() => onDeleteCustomCard(currentCard.id)}
                    className="hover:opacity-100 opacity-70 cursor-pointer"
                    style={{ color: 'var(--danger)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Question */}
            <div className="py-4 text-center">
              <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                سوئال
              </div>
              <p className="text-lg font-semibold leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                {currentCard.question}
              </p>
            </div>

            {/* Answer Reveal */}
            {revealed ? (
              <div
                className="pt-5 border-t space-y-5"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div className="text-center">
                  <div className="text-xs mb-2" style={{ color: 'var(--accent-text)' }}>
                    جاۋاب
                  </div>
                  <p className="text-base leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {currentCard.answer}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleRate('again')}
                    className="px-4 py-2 rounded-lg border text-xs font-medium cursor-pointer hover:bg-[var(--bg-hover)]"
                    style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                  >
                    قايتا كۆرۈش (10 مىنۇت)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRate('good')}
                    className="px-4 py-2 rounded-lg text-xs font-medium cursor-pointer"
                    style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                  >
                    ياخشى (ئەستە قالدى)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRate('easy')}
                    className="px-4 py-2 rounded-lg border text-xs font-medium cursor-pointer hover:bg-[var(--bg-hover)]"
                    style={{ borderColor: 'var(--success)', color: 'var(--success)' }}
                  >
                    ئاسان (ئۇزاق ئارىلىق)
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="px-6 py-2.5 rounded-lg text-xs font-medium cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                >
                  جاۋابنى كۆرسىتىش
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            className="rounded-xl border p-10 text-center space-y-3"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <CheckCircle2 className="w-8 h-8 mx-auto" style={{ color: 'var(--success)' }} />
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {allCards.length === 0
                ? 'تېخى ئەسلەش كارتىسى يوق'
                : 'بۈگۈنكى بارلىق كارتىلارنى تەكرارلاپ بولدىڭىز'}
            </h3>
            <p className="text-xs leading-relaxed max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
              خالىغان خاتىرە ئىچىدە <span className="font-code">سوئال :: جاۋاب</span> شەكلىدە قۇر يازسىڭىز ئاپتوماتىك ئەسلەش كارتىسى بولۇپ قوشۇلىدۇ.
            </p>
            {allCards.length > 0 && filterMode === 'due' && (
              <button
                type="button"
                onClick={() => {
                  setFilterMode('all');
                  setCurrentIdx(0);
                  setRevealed(false);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border text-xs font-medium cursor-pointer hover:bg-[var(--bg-hover)]"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>بارلىق كارتىلارنى قايتا مەشىق قىلىش</span>
              </button>
            )}
          </div>
        )}

        {/* How-to Guide Box */}
        <div
          className="p-4 rounded-xl border text-xs leading-relaxed space-y-1.5"
          style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
        >
          <div className="inline-flex items-center gap-1.5 font-semibold" style={{ color: 'var(--text-primary)' }}>
            <Layers className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            <span>خاتىرىدىن ئاپتوماتىك كارتا ياساش ئۇسۇلى</span>
          </div>
          <p>
            خالىغان خاتىرىدە بىر قۇرغا <code className="font-code px-1">سوئال :: جاۋاب</code> دەپ يېزىڭ ياكى قوش قۇر قىلىپ <code className="font-code px-1">س: سوئال</code> ۋە كېيىنكى قۇرغا <code className="font-code px-1">ج: جاۋاب</code> دەپ يېزىڭ — سىستېما ئاپتوماتىك بۇ يەرگە يىغىپ بېرىدۇ.
          </p>
        </div>
      </div>
    </div>
  );
};
