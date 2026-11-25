import React, { useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { VaultLockConfig } from '../types/vault';
import { verifyVaultLockPassword } from '../utils/vaultCrypto';
import { BrandLogo } from './BrandLogo';

interface VaultLockOverlayProps {
  lockConfig: VaultLockConfig;
  onUnlock: () => void;
}

export const VaultLockOverlay: React.FC<VaultLockOverlayProps> = ({ lockConfig, onUnlock }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || checking) return;
    setChecking(true);
    setError(null);
    const ok = await verifyVaultLockPassword(password, lockConfig);
    setChecking(false);
    if (ok) {
      setPassword('');
      onUnlock();
    } else {
      setError('پارول خاتا. قايتا سىناپ بېقىڭ.');
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border p-7 space-y-5 shadow-2xl text-center"
        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-strong)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <BrandLogo size={64} className="rounded-xl" />
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              تەپەككۇر بۇلىقى قۇلۇپلانغان
            </h1>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              شەخسىي بىلىم ئامبىرىڭىزنى ئېچىش ئۈچۈن يەرلىك پارولنى كىرگۈزۈڭ
            </p>
          </div>
        </div>

        <div className="space-y-2 text-right">
          <label className="text-xs block" style={{ color: 'var(--text-secondary)' }}>
            ئامبار پارولى
          </label>
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border"
            style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)' }}
          >
            <Lock className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="پارول..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
          {error && (
            <p className="text-xs" style={{ color: 'var(--danger)' }}>
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={checking || !password}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
        >
          <Unlock className="w-4 h-4" />
          <span>{checking ? 'تەكشۈرۈلۈۋاتىدۇ...' : 'قۇلۇپنى ئېچىش'}</span>
        </button>
      </form>
    </div>
  );
};
