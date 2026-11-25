/**
 * تەپەككۇر بۇلىقى — Electron Preload (ئەڭ تۆۋەن ئىجازەت پرىنسىپى بىلەن)
 */
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('tepekkurDesktop', {
  isElectron: true,
  platform: process.platform,
});
