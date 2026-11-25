/**
 * تەپەككۇر بۇلىقى — يەرلىك ساقلاش، زاپاسلاش، باشلانغۇچ ئامبار ۋە مەخپىيەتلىك پرىنسىپى يۇنىت تېستلىرى
 * Non-invasive unit tests covering src/utils/storage.ts & src/data/starterVault.ts
 */

import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BUILT_IN_TEMPLATES, createStarterVault } from '../src/data/starterVault.ts';
import {
  DEFAULT_PREFS,
  loadPrefsFromLocal,
  loadVaultFromLocal,
  parseImportedMarkdownFile,
  parseVaultBackupJson,
  savePrefsToLocal,
  saveVaultToLocal,
} from '../src/utils/storage.ts';

// Isolated in-memory localStorage mock for pure, independent Node unit tests
function installMockLocalStorage() {
  const store = new Map<string, string>();
  const mockStorage: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    configurable: true,
    writable: true,
  });
  return store;
}

describe('TC-ST: يەرلىك ساقلاش، زاپاسلاش ۋە بىخەتەرلىك/مۇستەقىللىق تېستلىرى', () => {
  let backingStore: Map<string, string>;

  beforeEach(() => {
    backingStore = installMockLocalStorage();
  });

  it('TC-ST-01: createStarterVault — باشلانغۇچ ئۇيغۇرچە ئامبار تولۇق ۋە قىسقۇچلارغا توغرا باغلانغان', () => {
    const vault = createStarterVault();
    assert.ok(vault.notes.length >= 7);
    assert.ok(vault.folders.length >= 4);
    assert.equal(vault.templates.length, BUILT_IN_TEMPLATES.length);

    const folderIds = new Set(vault.folders.map((f) => f.id));
    for (const note of vault.notes) {
      assert.ok(note.title.trim().length > 0);
      if (note.folderId) {
        assert.ok(folderIds.has(note.folderId), `قىسقۇچ تېپىلمىدى: ${note.folderId}`);
      }
    }
  });

  it('TC-ST-02: loadVaultFromLocal — ساقلىغۇچ قۇرۇق بولغاندا باشلانغۇچ ئامبارنى يۈكلەيدۇ', () => {
    const loaded = loadVaultFromLocal();
    assert.ok(loaded.notes.length >= 7);
    assert.ok(loaded.notes.some((n) => n.id === 'note-welcome'));
  });

  it('TC-ST-03: saveVaultToLocal & loadVaultFromLocal — يەرلىك ساقلاش ۋە قايتا ئوقۇش توغرا ئىشلەيدۇ', () => {
    const starter = createStarterVault();
    starter.notes.push({
      id: 'note-custom-1',
      title: 'مېنىڭ شەخسىي خاتىرەم',
      folderId: null,
      content: '# شەخسىي\nبۇ يەرلىكتە ساقلاندى.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const saved = saveVaultToLocal(starter);
    assert.equal(saved, true);

    const reloaded = loadVaultFromLocal();
    assert.ok(reloaded.notes.some((n) => n.id === 'note-custom-1' && n.title === 'مېنىڭ شەخسىي خاتىرەم'));
  });

  it('TC-ST-04: loadVaultFromLocal — بۇزۇلغان JSON مەلۇماتىدا پىروگرامما توختاپ قالماي ئەسلىگە قايتىدۇ (Error Case)', () => {
    backingStore.set('tepekkur_buliqi_vault_v1', '{invalid-json!!!');
    const recovered = loadVaultFromLocal();
    assert.ok(Array.isArray(recovered.notes));
    assert.ok(recovered.notes.length >= 7);
  });

  it('TC-ST-05: savePrefsToLocal & loadPrefsFromLocal — تېما ۋە فونت تەڭشەكلىرىنى ساقلايدۇ', () => {
    assert.deepEqual(loadPrefsFromLocal(), DEFAULT_PREFS);
    const updated = { ...DEFAULT_PREFS, theme: 'paper-light' as const, fontSize: 18 };
    savePrefsToLocal(updated);
    const loaded = loadPrefsFromLocal();
    assert.equal(loaded.theme, 'paper-light');
    assert.equal(loaded.fontSize, 18);
  });

  it('TC-ST-06: parseImportedMarkdownFile — .md ھۆججەت نامى ياكى H1 دىن ماۋزۇنى توغرا ئالىدۇ', () => {
    const res1 = parseImportedMarkdownFile('تارىخىي_خاتىرە.md', '# ئىچكى ماۋزۇ\nمەزمۇن');
    assert.equal(res1.title, 'تارىخىي_خاتىرە');

    const res2 = parseImportedMarkdownFile('.md', '# ئىچكى ماۋزۇ\nمەزمۇن');
    assert.equal(res2.title, 'ئىچكى ماۋزۇ');
  });

  it('TC-ST-07: parseVaultBackupJson — ئىناۋەتلىك زاپاسنى ئوقۇيدۇ، خاتا فورماتتا null قايتۇرىدۇ', () => {
    const valid = createStarterVault();
    const parsed = parseVaultBackupJson(JSON.stringify(valid));
    assert.ok(parsed);
    assert.equal(parsed.notes.length, valid.notes.length);

    assert.equal(parseVaultBackupJson('not json'), null);
    assert.equal(parseVaultBackupJson(JSON.stringify({ hello: 'world' })), null);
  });

  it('TC-ST-08: بىخەتەرلىك ۋە مۇستەقىللىق تەكشۈرۈشى — نۆل ئىز قوغلاش، تاشقى CDN يوق ۋە چەكلەنگەن ئاتالغۇ يوق', () => {
    const rootDir = process.cwd();
    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
    const starterSrc = fs.readFileSync(path.join(rootDir, 'src/data/starterVault.ts'), 'utf-8');

    // Zero Google Analytics / Baidu / Tencent / Alibaba / external font CDN
    const forbiddenExternal = [
      'google-analytics.com',
      'googletagmanager.com',
      'fonts.googleapis.com',
      'baidu.com',
      'qq.com',
      'alicdn.com',
      'aliyuncs.com',
    ];
    for (const domain of forbiddenExternal) {
      assert.ok(!indexHtml.includes(domain), `تاشقى مۇلازىمەت بايقالدى: ${domain}`);
    }

    // Enforce RTL in root HTML
    assert.ok(indexHtml.includes('dir="rtl"'));

    // Enforce terminology standards in starter content
    const forbiddenTerms = ['جۇڭگو', 'شىنجاڭ', 'شىنلاڭ', 'خەنزۇ'];
    for (const term of forbiddenTerms) {
      assert.ok(!starterSrc.includes(term), `چەكلەنگەن ئاتالغۇ بايقالدى: ${term}`);
    }
  });
});
