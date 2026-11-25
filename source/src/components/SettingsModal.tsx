import React, { useRef, useState } from 'react';
import { Check, Download, FolderOutput, Lock, RotateCcw, Unlock, Upload, X } from 'lucide-react';
import { FontStyleId, ThemeId, VaultLockConfig } from '../types/vault';
import { formatBytesUg } from '../utils/indexedDb';
import { BrandLogo } from './BrandLogo';

interface SettingsModalProps {
  isOpen: boolean;
  theme: ThemeId;
  fontStyle: FontStyleId;
  fontSize: number;
  noteCount: number;
  folderCount: number;
  attachmentCount: number;
  attachmentBytes: number;
  lockConfig: VaultLockConfig | null;
  onClose: () => void;
  onChangeTheme: (theme: ThemeId) => void;
  onChangeFontStyle: (style: FontStyleId) => void;
  onChangeFontSize: (size: number) => void;
  onSetVaultLock: (password: string) => Promise<void>;
  onRemoveVaultLock: () => void;
  onLockNow: () => void;
  onExportBackup: () => void;
  onExportToLocalFolder: () => void;
  onRestoreBackupFile: (file: File) => void;
  onResetStarterVault: () => void;
}

const THEME_PRESETS: Array<{
  id: ThemeId;
  name: string;
  desc: string;
  swatches: [string, string, string];
}> = [
  {
    id: 'obsidian-dark',
    name: 'ئوبسىدىيان قاراڭغۇ',
    desc: 'ئەسلى Obsidian غا ئوخشاش قېنىق كۆمۈر رەڭ ۋە بىنەپشە بېزەك',
    swatches: ['#141418', '#1c1c21', '#8b5cf6'],
  },
  {
    id: 'modern-dark',
    name: 'زامانىۋى قاراڭغۇ',
    desc: 'چوڭقۇر تۇتۇق كۆك-كۈلرەڭ ۋە سۈزۈك ئاسمان كۆك بېزەك',
    swatches: ['#0b1120', '#0f172a', '#3b82f6'],
  },
  {
    id: 'modern-light',
    name: 'زامانىۋى يورۇق',
    desc: 'ساپ ئاق تەگلىك، ئىخچام سوغۇق كۈلرەڭ يان تاختا ۋە كۆك بېزەك',
    swatches: ['#f6f7f9', '#ffffff', '#2563eb'],
  },
  {
    id: 'paper-light',
    name: 'ئىللىق قەغەز ۋە كىتاب',
    desc: 'كۆزنى چارچاتمايدىغان كىتاب قەغىزى رەڭگى ۋە سىياھ قارا خەت',
    swatches: ['#f3ede1', '#fbf8f1', '#8f4f24'],
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  theme,
  fontStyle,
  fontSize,
  noteCount,
  folderCount,
  attachmentCount,
  attachmentBytes,
  lockConfig,
  onClose,
  onChangeTheme,
  onChangeFontStyle,
  onChangeFontSize,
  onSetVaultLock,
  onRemoveVaultLock,
  onLockNow,
  onExportBackup,
  onExportToLocalFolder,
  onRestoreBackupFile,
  onResetStarterVault,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [savingLock, setSavingLock] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.trim().length < 4 || savingLock) return;
    setSavingLock(true);
    await onSetVaultLock(newPassword.trim());
    setNewPassword('');
    setSavingLock(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] rounded-xl border overflow-hidden shadow-2xl flex flex-col"
        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-strong)' }}
      >
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b shrink-0"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5">
            <BrandLogo size={30} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              تەپەككۇر بۇلىقى تەڭشەكلىرى
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Theme Switcher */}
          <section>
            <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              كۆرۈنمە يۈز ئۇسلۇبى (تېما)
            </h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              خالىغان ۋاقىتتا تۆت خىل ئۇسلۇب ئارىسىدا ئالمىشالايسىز؛ بىلىم گرافىكىمۇ دەرھال ماسلىشىدۇ.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {THEME_PRESETS.map((preset) => {
                const active = theme === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onChangeTheme(preset.id)}
                    className="text-right p-3.5 rounded-lg border transition-colors cursor-pointer"
                    style={{
                      backgroundColor: active ? 'var(--bg-active)' : 'var(--bg-canvas)',
                      borderColor: active ? 'var(--accent)' : 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {preset.name}
                      </span>
                      <div className="flex items-center gap-1">
                        {preset.swatches.map((hex, i) => (
                          <span
                            key={i}
                            className="w-3.5 h-3.5 rounded-full border"
                            style={{ backgroundColor: hex, borderColor: 'rgba(128,128,128,0.35)' }}
                          />
                        ))}
                        {active && <Check className="w-3.5 h-3.5 mr-1" style={{ color: 'var(--accent)' }} />}
                      </div>
                    </div>
                    <p className="text-[11px] mt-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {preset.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Typography Settings */}
          <section className="pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              ئۇيغۇرچە خەت نۇسخىسى ۋە چوڭلۇقى
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  تېكىست خەت نۇسخىسى
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onChangeFontStyle('naskh')}
                    className="py-2 px-3 rounded-lg border text-xs font-uyghur-prose cursor-pointer"
                    style={{
                      backgroundColor: fontStyle === 'naskh' ? 'var(--bg-active)' : 'var(--bg-canvas)',
                      borderColor: fontStyle === 'naskh' ? 'var(--accent)' : 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    UKIJ Tuz (ئاساسىي)
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeFontStyle('sans')}
                    className="py-2 px-3 rounded-lg border text-xs font-uyghur-sans cursor-pointer"
                    style={{
                      backgroundColor: fontStyle === 'sans' ? 'var(--bg-active)' : 'var(--bg-canvas)',
                      borderColor: fontStyle === 'sans' ? 'var(--accent)' : 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    ALKATIP Basma
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--text-secondary)' }}>خەت چوڭلۇقى</span>
                  <span className="font-code tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {fontSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min={14}
                  max={21}
                  step={1}
                  value={fontSize}
                  onChange={(e) => onChangeFontSize(Number(e.target.value))}
                  className="w-full accent-[var(--accent)] cursor-pointer"
                />
              </div>
            </div>
          </section>

          {/* Local Encrypted Vault Lock */}
          <section className="pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              يەرلىك شىفىرلىق قۇلۇپ (Vault Lock)
            </h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              پارول پەقەت ئۆز ئۈسكۈنىڭىزدە Web Crypto (PBKDF2 + SHA-256) ئارقىلىق ساقلىنىدۇ؛ سىرتقا قەتئىي ئەۋەتىلمەيدۇ.
            </p>

            {lockConfig?.enabled ? (
              <div className="flex items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLockNow();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>ئامبارنى ھازىر قۇلۇپلاش</span>
                </button>
                <button
                  type="button"
                  onClick={onRemoveVaultLock}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium cursor-pointer hover:bg-[var(--bg-hover)]"
                  style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)' }}
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>قۇلۇپنى بىكار قىلىش</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSavePassword} className="flex items-center gap-2 flex-wrap">
                <input
                  type="password"
                  minLength={4}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="يېڭى پارول (ئەڭ ئاز 4 ھەرپ)..."
                  className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border text-xs outline-none"
                  style={{
                    backgroundColor: 'var(--bg-canvas)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  type="submit"
                  disabled={newPassword.trim().length < 4 || savingLock}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-45"
                  style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>قۇلۇپ ئورنىتىش</span>
                </button>
              </form>
            )}
          </section>

          {/* Local IndexedDB Storage & Vault Management */}
          <section className="pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              يەرلىك IndexedDB ساقلاش ۋە زاپاسلاش
            </h3>
            <p className="text-xs mb-3 tabular-nums" style={{ color: 'var(--text-muted)' }}>
              ھازىر كومپيۇتېرىڭىزدا {noteCount} خاتىرە · {folderCount} قىسقۇچ · {attachmentCount} ھۆججەت/رەسىم ({formatBytesUg(attachmentBytes)}) ساقلانغان.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onExportToLocalFolder}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium cursor-pointer hover:bg-[var(--bg-hover)]"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
              >
                <FolderOutput className="w-3.5 h-3.5" />
                <span>يەرلىك قىسقۇچقا (.md) چىقىرىش</span>
              </button>

              <button
                type="button"
                onClick={onExportBackup}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium cursor-pointer hover:bg-[var(--bg-hover)]"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                <Download className="w-3.5 h-3.5" />
                <span>تولۇق زاپاس (.json) چۈشۈرۈش</span>
              </button>

              <input
                ref={restoreInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onRestoreBackupFile(file);
                    e.target.value = '';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => restoreInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium cursor-pointer hover:bg-[var(--bg-hover)]"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>زاپاستىن ئەسلىگە كەلتۈرۈش</span>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                باشلانغۇچ ئۈلگە خاتىرىلەرنى قايتا يۈكلەش
              </span>
              {confirmReset ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onResetStarterVault();
                      setConfirmReset(false);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer"
                    style={{ backgroundColor: 'var(--danger)', color: '#ffffff' }}
                  >
                    جەزملەشتۈرۈش
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-2.5 py-1.5 rounded-md text-xs cursor-pointer"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    بىكار قىلىش
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs cursor-pointer hover:bg-[var(--bg-hover)]"
                  style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ئۈلگە ئامبارغا قايتۇرۇش</span>
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
