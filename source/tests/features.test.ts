/**
 * تەپەككۇر بۇلىقى — يېزىق ئايلاندۇرغۇچ، ئەسلەش كارتىسى ۋە v1->v2 كۆچۈرۈش تېستلىرى
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { convertUeyToUly, convertUlyToUey } from '../src/utils/uyghurScript.ts';
import {
  computeNextFlashcardProgress,
  extractFlashcardsFromNotes,
} from '../src/utils/flashcards.ts';
import { normalizeVaultState } from '../src/utils/storage.ts';
import { NoteItem } from '../src/types/vault.ts';

describe('TC-SCRIPT: ئۇيغۇرچە يېزىق ئايلاندۇرغۇچ (UEY ⇄ ULY) تېستلىرى', () => {
  it('TC-SC-01: ئۇيغۇر ئەرەب يېزىقىدىن لاتىن يېزىقىغا توغرا ئايلاندۇرىدۇ', () => {
    const out = convertUeyToUly('تەپەككۇر بۇلىقى، شەرقىي تۈركىستان؟');
    assert.equal(out, 'tepekkur buliqi, sherqiy türkistan?');
  });

  it('TC-SC-02: ئۇيغۇر لاتىن يېزىقىدىن ئەرەب يېزىقىغا (ھەمزە قائىدىسى بىلەن) توغرا ئايلاندۇرىدۇ', () => {
    const out = convertUlyToUey('uyghur tili, chong, sheher, ng');
    assert.ok(out.includes('ئۇيغۇر'));
    assert.ok(out.includes('تىلى'));
    assert.ok(out.includes('چوڭ'));
    assert.ok(out.includes('شەھەر'));
  });

  it('TC-SC-03: كود بۆلىكى، قۇر ئىچى كودى ۋە local-img ئۇلانمىسىنى ئۆزگەرتمەي ساقلايدۇ', () => {
    const md = [
      'بۇ بىر سىناق: `const x = "salom";`',
      '![رەسىم](local-img://img-123)',
      '```ts',
      'const y = "بۇ ئۆزگەرمەيدۇ";',
      '```',
    ].join('\n');

    const converted = convertUeyToUly(md);
    assert.ok(converted.includes('`const x = "salom";`'));
    assert.ok(converted.includes('(local-img://img-123)'));
    assert.ok(converted.includes('const y = "بۇ ئۆزگەرمەيدۇ";'));
    assert.ok(converted.includes('bu bir sinaq:'));
  });
});

describe('TC-FLASH: ئەسلەش كارتىسى (Flashcards) ۋە تەكرارلاش تېستلىرى', () => {
  const sampleNotes: NoteItem[] = [
    {
      id: 'n1',
      title: 'تارىخ خاتىرىسى',
      folderId: null,
      createdAt: 1,
      updatedAt: 1,
      content: [
        '# تارىخ',
        '«تۈركىي تىللار دىۋانى» نى كىم يازغان؟ :: مەھمۇد قەشقىرى يازغان.',
        '```md',
        'كود ئىچى :: ئېلىنمايدۇ',
        '```',
        'س: «قۇتادغۇ بىلىك» نى كىم يازغان؟',
        'ج: يۈسۈپ خاس ھاجىپ يازغان.',
      ].join('\n'),
    },
  ];

  it('TC-FL-01: خاتىرىدىن :: ۋە س:/ج: كارتىلىرىنى ئاپتوماتىك چىقىرىدۇ، كود ئىچىدىكىنى چىقارمايدۇ', () => {
    const cards = extractFlashcardsFromNotes(sampleNotes, [
      { id: 'custom-1', question: 'خاس سوئال', answer: 'خاس جاۋاب', createdAt: 10 },
    ]);
    assert.equal(cards.length, 3);
    assert.equal(cards[0].isCustom, true);
    assert.ok(cards.some((c) => c.question.includes('تۈركىي تىللار دىۋانى') && c.answer.includes('مەھمۇد قەشقىرى')));
    assert.ok(cards.some((c) => c.question.includes('قۇتادغۇ بىلىك') && c.answer.includes('يۈسۈپ خاس ھاجىپ')));
    assert.ok(!cards.some((c) => c.question.includes('كود ئىچى')));
  });

  it('TC-FL-02: computeNextFlashcardProgress — قايتا، ياخشى ۋە ئاسان دەرىجىلىرىنى توغرا ھېسابلايدۇ', () => {
    const now = 1_700_000_000_000;
    const good1 = computeNextFlashcardProgress('c1', undefined, 'good', now);
    assert.equal(good1.intervalDays, 1);
    assert.equal(good1.reviews, 1);

    const good2 = computeNextFlashcardProgress('c1', good1, 'good', now);
    assert.ok(good2.intervalDays >= 2);
    assert.equal(good2.reviews, 2);

    const easy = computeNextFlashcardProgress('c1', good2, 'easy', now);
    assert.ok(easy.intervalDays > good2.intervalDays);

    const again = computeNextFlashcardProgress('c1', easy, 'again', now);
    assert.equal(again.intervalDays, 0);
    assert.equal(again.reviews, 4);
    assert.ok(again.nextReviewAt > now);
  });

  it('TC-FL-03: normalizeVaultState — كونا v1 ئامبارنى v2 قۇرۇلمىسىغا بىخەتەر كۆچۈرىدۇ', () => {
    const legacyV1 = {
      version: 1,
      notes: sampleNotes,
      folders: [],
      templates: [],
    };
    const migrated = normalizeVaultState(legacyV1 as never);
    assert.equal(migrated.version, 2);
    assert.equal(migrated.notes.length, 1);
    assert.ok(Array.isArray(migrated.attachments));
    assert.ok(Array.isArray(migrated.canvasCards));
    assert.ok(Array.isArray(migrated.canvasEdges));
    assert.ok(Array.isArray(migrated.customFlashcards));
    assert.ok(typeof migrated.flashcardProgress === 'object');
  });
});
