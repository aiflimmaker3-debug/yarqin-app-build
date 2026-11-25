/**
 * تەپەككۇر بۇلىقى — Markdown، ئۇلانما، خەتكۈچ ۋە بىلىم گرافىكى يۇنىت تېستلىرى
 * Non-invasive unit tests covering src/utils/markdown.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyTemplateVariables,
  buildVaultGraphIndex,
  computeNoteStats,
  extractHeadings,
  extractTags,
  extractWikilinks,
  formatRelativeTimeUg,
  getTodayDateString,
  normalizeTitle,
  replaceWikilinkTitleInContent,
  stripFencedCodeBlocks,
} from '../src/utils/markdown.ts';
import { NoteItem } from '../src/types/vault.ts';

describe('TC-MD: تەپەككۇر بۇلىقى Markdown ۋە ئىندېكس ماتورى تېستلىرى', () => {
  it('TC-MD-01: getTodayDateString — YYYY-MM-DD فورماتىدا بۈگۈنكى چېسلانى قايتۇرىدۇ', () => {
    const today = getTodayDateString();
    assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  });

  it('TC-MD-02: normalizeTitle — بوشلۇق ۋە چوڭ-كىچىك ھەرپلەرنى نورماللاشتۇرىدۇ', () => {
    assert.equal(normalizeTitle('  تۈركىي   تىللار  دىۋانى  '), 'تۈركىي تىللار دىۋانى');
    assert.equal(normalizeTitle('  Obsidian   PKM '), 'obsidian pkm');
    assert.equal(normalizeTitle(''), '');
  });

  it('TC-MD-03: stripFencedCodeBlocks — كود بۆلىكى ئىچىدىكى تېكىستنى تازىلاپ قۇر سانىنى ساقلايدۇ', () => {
    const input = 'بىرىنچى قۇر\n```ts\nconst x = "[[ساختا]] #كود";\n```\nئاخىرقى قۇر';
    const stripped = stripFencedCodeBlocks(input);
    assert.equal(stripped.split('\n').length, input.split('\n').length);
    assert.ok(!stripped.includes('[[ساختا]]'));
    assert.ok(stripped.includes('بىرىنچى قۇر'));
    assert.ok(stripped.includes('ئاخىرقى قۇر'));
  });

  it('TC-MD-04: extractWikilinks — ئۇيغۇرچە ئۇلانما ۋە قوشۇمچە نام (alias) نى توغرا چىقىرىدۇ', () => {
    const content =
      'قاراڭ: [[مەھمۇد قەشقىرى]] ۋە [[قۇتادغۇبىلىك|شاھ ئەسەر]].\n```\n[[كود_ئىچىدىكى]]\n```';
    const links = extractWikilinks(content);
    assert.equal(links.length, 2);
    assert.equal(links[0].targetTitle, 'مەھمۇد قەشقىرى');
    assert.equal(links[0].alias, undefined);
    assert.equal(links[1].targetTitle, 'قۇتادغۇبىلىك');
    assert.equal(links[1].alias, 'شاھ ئەسەر');
  });

  it('TC-MD-05: extractWikilinks — قۇرۇق ياكى بۇزۇق قوش تىرناقلاردا خاتالىق چىقارمايدۇ (Edge Case)', () => {
    assert.deepEqual(extractWikilinks(''), []);
    assert.deepEqual(extractWikilinks('[[]] [[   ]] [[ئېچىلىپ_يېپىلمىغان'), []);
  });

  it('TC-MD-06: extractTags — ئۇيغۇرچە، لاتىنچە ۋە قاتلاملىق خەتكۈچلەرنى ئايرىپ، ماۋزۇ ۋە رەڭ كودىنى تاشلايدۇ', () => {
    const content = [
      '# بۇ بىر ماۋزۇ',
      'ئىچىدە #تارىخ، #ئەدەبىيات/كلاسسىك ۋە #PKM_Notes بار.',
      'قۇر ئىچىدىكى كود `#كود_خەتكۈچ` ۋە رەڭ #ff00aa ھەم سان #12345 تاشلىنىدۇ.',
      '```css',
      '#كود_بۆلىكىدىكى_خەتكۈچ { color: #ffffff; }',
      '```',
    ].join('\n');

    const tags = extractTags(content);
    assert.deepEqual(tags, ['تارىخ', 'ئەدەبىيات/كلاسسىك', 'PKM_Notes']);
  });

  it('TC-MD-07: extractHeadings — H1-H4 ماۋزۇلىرىنى قۇر نومۇرى بىلەن چىقىرىپ كود بۆلىكىنى ئاتلايدۇ', () => {
    const content = [
      '# بىرىنچى دەرىجىلىك',
      '## **ئىككىنچى** دەرىجىلىك',
      '```bash',
      '# كود ئىچىدىكى ئىزاھات',
      '```',
      '### ئۈچىنچى دەرىجىلىك',
      '#### تۆتىنچى دەرىجىلىك',
    ].join('\n');

    const headings = extractHeadings(content);
    assert.equal(headings.length, 4);
    assert.deepEqual(
      headings.map((h) => ({ level: h.level, text: h.text })),
      [
        { level: 1, text: 'بىرىنچى دەرىجىلىك' },
        { level: 2, text: 'ئىككىنچى دەرىجىلىك' },
        { level: 3, text: 'ئۈچىنچى دەرىجىلىك' },
        { level: 4, text: 'تۆتىنچى دەرىجىلىك' },
      ]
    );
  });

  it('TC-MD-08: computeNoteStats — سۆز سانى، ھەرپ سانى ۋە ئوقۇش ۋاقتىنى توغرا ھېسابلايدۇ', () => {
    assert.deepEqual(computeNoteStats('   '), { words: 0, chars: 0, readMinutes: 0 });
    const stats = computeNoteStats('بىلىم ئىنساننىڭ ئەڭ قىممەتلىك بايلىقىدۇر');
    assert.equal(stats.words, 5);
    assert.equal(stats.readMinutes, 1);
    assert.ok(stats.chars > 20);
  });

  it('TC-MD-09: replaceWikilinkTitleInContent — خاتىرە نامى ئۆزگەرگەندە بارلىق ئۇلانما ۋە alias لارنى يېڭىلايدۇ', () => {
    const src = 'قاراڭ: [[كونا نام]] ۋە [[كونا نام|قىسقا نام]]، باشقا [[ئۆزگەرمەيدىغان]].';
    const updated = replaceWikilinkTitleInContent(src, 'كونا نام', 'يېڭى نام');
    assert.equal(updated, 'قاراڭ: [[يېڭى نام]] ۋە [[يېڭى نام|قىسقا نام]]، باشقا [[ئۆزگەرمەيدىغان]].');
  });

  it('TC-MD-10: applyTemplateVariables — {{date}} ۋە {{title}} ئۆزگەرگۈچىلىرىنى ئالماشتۇرىدۇ', () => {
    const out = applyTemplateVariables('# {{title}}\nچېسلا: {{date}}', 'تەتقىقات خاتىرىسى');
    assert.ok(out.startsWith('# تەتقىقات خاتىرىسى\n'));
    assert.ok(!out.includes('{{date}}'));
    assert.ok(!out.includes('{{title}}'));
  });

  it('TC-MD-11: buildVaultGraphIndex — ئەكسى ئۇلانما (Backlinks)، قۇرۇلمىغان تۈگۈن ۋە گرافىك سىزىقلىرىنى توغرا قۇرىدۇ', () => {
    const now = Date.now();
    const notes: NoteItem[] = [
      {
        id: 'n1',
        title: 'ئاساسىي خاتىرە',
        folderId: null,
        content: 'باغلىنىش: [[ئىككىنچى خاتىرە]] ۋە [[تېخى قۇرۇلمىغان]] #تارىخ',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'n2',
        title: 'ئىككىنچى خاتىرە',
        folderId: null,
        content: 'قايتىش: [[ئاساسىي خاتىرە]] #تارىخ #پەلسەپە',
        createdAt: now,
        updatedAt: now,
      },
    ];

    const index = buildVaultGraphIndex(notes);

    // 2 real notes + 1 unresolved ghost node = 3 nodes
    assert.equal(index.graphNodes.length, 3);
    assert.equal(index.graphEdges.length, 3);

    // Backlinks verification
    const backlinksToN2 = index.backlinksByNoteId.get('n2') ?? [];
    assert.equal(backlinksToN2.length, 1);
    assert.equal(backlinksToN2[0].sourceNoteId, 'n1');

    // Unresolved node verification
    const ghost = index.graphNodes.find((n) => n.isUnresolved);
    assert.ok(ghost);
    assert.equal(ghost.title, 'تېخى قۇرۇلمىغان');
    assert.equal(ghost.noteId, null);

    // Tag counting verification
    assert.equal(index.allTags[0].tag, 'تارىخ');
    assert.equal(index.allTags[0].count, 2);
  });

  it('TC-MD-12: formatRelativeTimeUg — ۋاقىت پەرقىنى ئۇيغۇرچە چۈشىنىشلىك شەكىلدە قايتۇرىدۇ', () => {
    const now = Date.now();
    assert.equal(formatRelativeTimeUg(now - 10_000), 'ھازىرلا');
    assert.equal(formatRelativeTimeUg(now - 5 * 60_000), '5 مىنۇت بۇرۇن');
    assert.equal(formatRelativeTimeUg(now - 3 * 3600_000), '3 سائەت بۇرۇن');
    assert.equal(formatRelativeTimeUg(now - 2 * 86400_000), '2 كۈن بۇرۇن');
  });
});
