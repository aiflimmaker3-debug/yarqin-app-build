/**
 * تەپەككۇر بۇلىقى — يۇقىرى سىغىملىق يەرلىك IndexedDB ساقلاش ماتورى
 * Stores full Vault state + large binary PDF/Image attachments strictly on the user's own computer.
 */

import { VaultState } from '../types/vault';

const DB_NAME = 'tepekkur_buliqi_local_db';
const DB_VERSION = 1;
const STORE_VAULT = 'vault_state';
const STORE_ATTACHMENTS = 'attachments';
const VAULT_RECORD_KEY = 'primary_vault';

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_VAULT)) {
        db.createObjectStore(STORE_VAULT);
      }
      if (!db.objectStoreNames.contains(STORE_ATTACHMENTS)) {
        db.createObjectStore(STORE_ATTACHMENTS);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

export async function saveVaultToIndexedDb(vault: VaultState): Promise<boolean> {
  if (!hasIndexedDb()) return false;
  try {
    const db = await openVaultDb();
    return await new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction(STORE_VAULT, 'readwrite');
      tx.objectStore(STORE_VAULT).put(vault, VAULT_RECORD_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    return false;
  }
}

export async function loadVaultFromIndexedDb(): Promise<VaultState | null> {
  if (!hasIndexedDb()) return null;
  try {
    const db = await openVaultDb();
    return await new Promise<VaultState | null>((resolve, reject) => {
      const tx = db.transaction(STORE_VAULT, 'readonly');
      const req = tx.objectStore(STORE_VAULT).get(VAULT_RECORD_KEY);
      req.onsuccess = () => {
        db.close();
        const val = req.result as VaultState | undefined;
        resolve(val && Array.isArray(val.notes) ? val : null);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return null;
  }
}

export async function saveAttachmentBlob(id: string, blob: Blob): Promise<boolean> {
  if (!hasIndexedDb()) return false;
  try {
    const db = await openVaultDb();
    return await new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction(STORE_ATTACHMENTS, 'readwrite');
      tx.objectStore(STORE_ATTACHMENTS).put(blob, id);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    return false;
  }
}

export async function loadAttachmentBlob(id: string): Promise<Blob | null> {
  if (!hasIndexedDb()) return null;
  try {
    const db = await openVaultDb();
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE_ATTACHMENTS, 'readonly');
      const req = tx.objectStore(STORE_ATTACHMENTS).get(id);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as Blob | undefined) ?? null);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return null;
  }
}

export async function deleteAttachmentBlob(id: string): Promise<void> {
  if (!hasIndexedDb()) return;
  try {
    const db = await openVaultDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_ATTACHMENTS, 'readwrite');
      tx.objectStore(STORE_ATTACHMENTS).delete(id);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    // ignore
  }
}

export function formatBytesUg(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
