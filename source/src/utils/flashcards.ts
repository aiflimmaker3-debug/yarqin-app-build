/**
 * تەپەككۇر بۇلىقى — ئەسلەش كارتىسى (Flashcards) ۋە ئارىلىق تەكرارلاش (Spaced Repetition) ماتورى
 */

import { CustomFlashcard, FlashcardProgress, NoteItem } from '../types/vault';
import { stripFencedCodeBlocks } from './markdown';

export interface StudyFlashcard {
  id: string;
  question: string;
  answer: string;
  sourceNoteId?: string;
  sourceTitle: string;
  isCustom: boolean;
}

export type ReviewRating = 'again' | 'good' | 'easy';

/**
 * Extracts flashcards from all vault notes using two natural patterns:
 * 1) Inline double-colon: `سوئال :: جاۋاب`
 * 2) Two-line Uyghur Q/A: `س: ...` followed by `ج: ...`
 */
export function extractFlashcardsFromNotes(
  notes: NoteItem[],
  customCards: CustomFlashcard[]
): StudyFlashcard[] {
  const cards: StudyFlashcard[] = [];

  for (const c of customCards) {
    cards.push({
      id: c.id,
      question: c.question,
      answer: c.answer,
      sourceTitle: c.sourceTitle || 'شەخسىي كارتا',
      isCustom: true,
    });
  }

  for (const note of notes) {
    const cleaned = stripFencedCodeBlocks(note.content);
    const lines = cleaned.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Pattern 1: Inline Question :: Answer (ignore bullet prefix)
      const strippedBullet = line.replace(/^[-*+]\s+/, '');
      const colonIdx = strippedBullet.indexOf('::');
      if (colonIdx > 1 && colonIdx < strippedBullet.length - 2) {
        const q = strippedBullet.slice(0, colonIdx).trim();
        const a = strippedBullet.slice(colonIdx + 2).trim();
        if (q && a) {
          cards.push({
            id: `note-fc-${note.id}-${i}`,
            question: q,
            answer: a,
            sourceNoteId: note.id,
            sourceTitle: note.title,
            isCustom: false,
          });
          continue;
        }
      }

      // Pattern 2: `س: ...` + next line `ج: ...`
      const qMatch = /^(?:س|Q)[:：]\s*(.+)$/.exec(strippedBullet);
      if (qMatch && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim().replace(/^[-*+]\s+/, '');
        const aMatch = /^(?:ج|A)[:：]\s*(.+)$/.exec(nextLine);
        if (aMatch) {
          cards.push({
            id: `note-fc-${note.id}-${i}`,
            question: qMatch[1].trim(),
            answer: aMatch[1].trim(),
            sourceNoteId: note.id,
            sourceTitle: note.title,
            isCustom: false,
          });
          i++;
        }
      }
    }
  }

  return cards;
}

export function computeNextFlashcardProgress(
  cardId: string,
  prev: FlashcardProgress | undefined,
  rating: ReviewRating,
  now = Date.now()
): FlashcardProgress {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const currentEase = prev?.ease ?? 2.3;
  const currentInterval = prev?.intervalDays ?? 0;
  const reviews = (prev?.reviews ?? 0) + 1;

  if (rating === 'again') {
    return {
      cardId,
      ease: Math.max(1.3, Number((currentEase - 0.2).toFixed(2))),
      intervalDays: 0,
      reviews,
      nextReviewAt: now + 10 * 60 * 1000, // 10 minutes
    };
  }

  if (rating === 'good') {
    const nextDays = currentInterval === 0 ? 1 : Math.max(2, Math.round(currentInterval * currentEase));
    return {
      cardId,
      ease: currentEase,
      intervalDays: nextDays,
      reviews,
      nextReviewAt: now + nextDays * DAY_MS,
    };
  }

  // easy
  const nextEase = Math.min(3.0, Number((currentEase + 0.15).toFixed(2)));
  const nextDays = currentInterval === 0 ? 4 : Math.max(4, Math.round(currentInterval * nextEase * 1.3));
  return {
    cardId,
    ease: nextEase,
    intervalDays: nextDays,
    reviews,
    nextReviewAt: now + nextDays * DAY_MS,
  };
}
