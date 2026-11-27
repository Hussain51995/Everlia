import type { BrowserCacheRecord } from "@/lib/property-intelligence/browser/types";

export const BROWSER_CACHE_DB_NAME = "everlia-property-intelligence";
export const BROWSER_CACHE_STORE = "category_cache";
export const BROWSER_CACHE_DB_VERSION = 1;

export type BrowserStorageErrorCode =
  | "unavailable"
  | "quota_exceeded"
  | "unknown";

export class BrowserStorageError extends Error {
  code: BrowserStorageErrorCode;

  constructor(message: string, code: BrowserStorageErrorCode = "unknown") {
    super(message);
    this.name = "BrowserStorageError";
    this.code = code;
  }
}

export interface BrowserCacheStorage {
  get(key: string): Promise<BrowserCacheRecord | null>;
  getMany(keys: string[]): Promise<Map<string, BrowserCacheRecord>>;
  set(key: string, record: BrowserCacheRecord): Promise<void>;
  delete(key: string): Promise<void>;
  deleteByPrefix(prefix: string): Promise<number>;
  listKeys(limit?: number): Promise<string[]>;
  clear(): Promise<void>;
}

export function browserCacheStorageKey(input: {
  responseContextId: string;
  propertyIdentityKey: string;
  category: string;
  providerId: string;
}): string {
  return [
    input.responseContextId,
    input.propertyIdentityKey,
    input.category,
    input.providerId,
  ].join("|");
}

export class MemoryBrowserCacheStorage implements BrowserCacheStorage {
  readonly map = new Map<string, BrowserCacheRecord>();

  async get(key: string): Promise<BrowserCacheRecord | null> {
    return this.map.get(key) ?? null;
  }

  async getMany(keys: string[]): Promise<Map<string, BrowserCacheRecord>> {
    const out = new Map<string, BrowserCacheRecord>();
    for (const key of keys) {
      const row = this.map.get(key);
      if (row) out.set(key, row);
    }
    return out;
  }

  async set(key: string, record: BrowserCacheRecord): Promise<void> {
    this.map.set(key, record);
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    let n = 0;
    for (const key of [...this.map.keys()]) {
      if (key.startsWith(prefix)) {
        this.map.delete(key);
        n += 1;
      }
    }
    return n;
  }

  async listKeys(limit = 500): Promise<string[]> {
    return [...this.map.keys()].slice(0, Math.max(1, limit));
  }

  async clear(): Promise<void> {
    this.map.clear();
  }
}

function mapDomError(err: unknown): BrowserStorageError {
  const message = err instanceof Error ? err.message : String(err);
  if (
    message.toLowerCase().includes("quota") ||
    (typeof DOMException !== "undefined" &&
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" || err.code === 22))
  ) {
    return new BrowserStorageError(message, "quota_exceeded");
  }
  return new BrowserStorageError(message, "unknown");
}

export class IndexedDbBrowserCacheStorage implements BrowserCacheStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    if (typeof indexedDB === "undefined") {
      return Promise.reject(
        new BrowserStorageError("IndexedDB unavailable", "unavailable")
      );
    }
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        try {
          const req = indexedDB.open(
            BROWSER_CACHE_DB_NAME,
            BROWSER_CACHE_DB_VERSION
          );
          req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(BROWSER_CACHE_STORE)) {
              db.createObjectStore(BROWSER_CACHE_STORE);
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () =>
            reject(
              new BrowserStorageError(
                req.error?.message ?? "IndexedDB open failed",
                "unavailable"
              )
            );
        } catch (err) {
          reject(mapDomError(err));
        }
      });
    }
    return this.dbPromise;
  }

  private async withStore<T>(
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T> | void
  ): Promise<T> {
    try {
      const db = await this.open();
      return await new Promise<T>((resolve, reject) => {
        const tx = db.transaction(BROWSER_CACHE_STORE, mode);
        const store = tx.objectStore(BROWSER_CACHE_STORE);
        const req = fn(store);
        tx.oncomplete = () => {
          if (req) resolve(req.result as T);
          else resolve(undefined as T);
        };
        tx.onerror = () => reject(mapDomError(tx.error));
        if (req) {
          req.onerror = () => reject(mapDomError(req.error));
        }
      });
    } catch (err) {
      if (err instanceof BrowserStorageError) throw err;
      throw mapDomError(err);
    }
  }

  async get(key: string): Promise<BrowserCacheRecord | null> {
    const result = await this.withStore<BrowserCacheRecord | undefined>(
      "readonly",
      (store) => store.get(key)
    );
    return result ?? null;
  }

  async getMany(keys: string[]): Promise<Map<string, BrowserCacheRecord>> {
    const out = new Map<string, BrowserCacheRecord>();
    if (keys.length === 0) return out;
    for (const key of keys) {
      const row = await this.get(key);
      if (row) out.set(key, row);
    }
    return out;
  }

  async set(key: string, record: BrowserCacheRecord): Promise<void> {
    await this.withStore("readwrite", (store) => {
      store.put(record, key);
    });
  }

  async delete(key: string): Promise<void> {
    await this.withStore("readwrite", (store) => {
      store.delete(key);
    });
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    const keys = await this.listKeys(2000);
    let n = 0;
    for (const key of keys) {
      if (key.startsWith(prefix)) {
        await this.delete(key);
        n += 1;
      }
    }
    return n;
  }

  async listKeys(limit = 500): Promise<string[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BROWSER_CACHE_STORE, "readonly");
      const store = tx.objectStore(BROWSER_CACHE_STORE);
      const req = store.getAllKeys();
      req.onsuccess = () => {
        const keys = (req.result as IDBValidKey[])
          .map(String)
          .slice(0, Math.max(1, limit));
        resolve(keys);
      };
      req.onerror = () => reject(mapDomError(req.error));
    });
  }

  async clear(): Promise<void> {
    await this.withStore("readwrite", (store) => {
      store.clear();
    });
  }
}

let sharedStorage: BrowserCacheStorage | null = null;

export async function getDefaultBrowserCacheStorage(): Promise<{
  storage: BrowserCacheStorage;
  persistent: boolean;
}> {
  if (sharedStorage) {
    return {
      storage: sharedStorage,
      persistent: !(sharedStorage instanceof MemoryBrowserCacheStorage),
    };
  }

  if (typeof indexedDB === "undefined") {
    sharedStorage = new MemoryBrowserCacheStorage();
    return { storage: sharedStorage, persistent: false };
  }

  try {
    const idb = new IndexedDbBrowserCacheStorage();
    await idb.listKeys(1);
    sharedStorage = idb;
    return { storage: sharedStorage, persistent: true };
  } catch {
    sharedStorage = new MemoryBrowserCacheStorage();
    return { storage: sharedStorage, persistent: false };
  }
}

export function resetBrowserCacheStorageSingleton() {
  sharedStorage = null;
}
