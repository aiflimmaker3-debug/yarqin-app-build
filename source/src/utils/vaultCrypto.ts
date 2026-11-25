/**
 * تەپەككۇر بۇلىقى — يەرلىك شىفىرلىق قۇلۇپ (Local Web Crypto PBKDF2 + AES-GCM)
 * Zero external transmission: password hash & encryption keys stay strictly inside the user's device.
 */

import { VaultLockConfig } from '../types/vault';

const LOCK_STORAGE_KEY = 'tepekkur_buliqi_lock_v1';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(Math.floor(hex.length / 2));
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function deriveKeyBytes(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 120_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return new Uint8Array(bits);
}

export function loadVaultLockConfig(): VaultLockConfig | null {
  try {
    const raw = localStorage.getItem(LOCK_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VaultLockConfig>;
    if (parsed.enabled && typeof parsed.saltHex === 'string' && typeof parsed.verifierHex === 'string') {
      return {
        enabled: true,
        saltHex: parsed.saltHex,
        verifierHex: parsed.verifierHex,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function setVaultLockPassword(password: string): Promise<VaultLockConfig> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await deriveKeyBytes(password, salt);
  const verifierHash = new Uint8Array(await crypto.subtle.digest('SHA-256', derived as BufferSource));

  const config: VaultLockConfig = {
    enabled: true,
    saltHex: toHex(salt),
    verifierHex: toHex(verifierHash),
  };
  localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(config));
  return config;
}

export async function verifyVaultLockPassword(password: string, config: VaultLockConfig): Promise<boolean> {
  try {
    const salt = fromHex(config.saltHex);
    const derived = await deriveKeyBytes(password, salt);
    const verifierHash = new Uint8Array(await crypto.subtle.digest('SHA-256', derived as BufferSource));
    return toHex(verifierHash) === config.verifierHex;
  } catch {
    return false;
  }
}

export function clearVaultLockPassword(): void {
  try {
    localStorage.removeItem(LOCK_STORAGE_KEY);
  } catch {
    // ignore
  }
}
