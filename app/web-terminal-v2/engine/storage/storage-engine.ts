export interface StorageAdapter {
  get<T>(key: string, fallback: T): T;
  getRaw(key: string): string | null;
  set(key: string, value: unknown): void;
  remove(key: string): void;
  clear(): void;
}

export const STORAGE_PREFIX = "fd.v2";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function buildKey(key: string): string {
  return `${STORAGE_PREFIX}.${key}`;
}

export const storage: StorageAdapter = {
  get<T>(key: string, fallback: T): T {
    const raw = storage.getRaw(key);
    if (raw === null) {
      return fallback;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  getRaw(key: string): string | null {
    if (!isBrowser()) {
      return null;
    }
    return window.localStorage.getItem(buildKey(key));
  },
  set(key: string, value: unknown): void {
    if (!isBrowser()) {
      return;
    }
    window.localStorage.setItem(buildKey(key), JSON.stringify(value));
  },
  remove(key: string): void {
    if (!isBrowser()) {
      return;
    }
    window.localStorage.removeItem(buildKey(key));
  },
  clear(): void {
    if (!isBrowser()) {
      return;
    }
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(STORAGE_PREFIX))
      .forEach((key) => window.localStorage.removeItem(key));
  },
};

export function createScopedStorage(scope: string): StorageAdapter {
  const prefix = `${STORAGE_PREFIX}.${scope}.`;
  return {
    get<T>(key: string, fallback: T): T {
      const raw = storage.getRaw(`${scope}.${key}`);
      if (raw === null) {
        return fallback;
      }
      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    },
    getRaw(key: string): string | null {
      return storage.getRaw(`${scope}.${key}`);
    },
    set(key: string, value: unknown): void {
      storage.set(`${scope}.${key}`, value);
    },
    remove(key: string): void {
      storage.remove(`${scope}.${key}`);
    },
    clear(): void {
      if (!isBrowser()) {
        return;
      }
      Object.keys(window.localStorage)
        .filter((storageKey) => storageKey.startsWith(prefix))
        .forEach((storageKey) => window.localStorage.removeItem(storageKey));
    },
  };
}

export const workspaceStorage = createScopedStorage("workspace");
export const settingsStorage = createScopedStorage("settings");
export const themeStorage = createScopedStorage("theme");
export const watchlistStorage = createScopedStorage("watchlist");
