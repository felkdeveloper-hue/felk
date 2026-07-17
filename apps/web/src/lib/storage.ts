/**
 * Safe wrapper around `window.localStorage`.
 *
 * Guards against environments where `localStorage` is unavailable
 * (SSR, privacy mode, disabled storage, quota exceeded, etc.) so callers
 * never need to wrap access in try/catch themselves.
 */

function isStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export const storage = {
  get<T = unknown>(key: string): T | null {
    if (!isStorageAvailable()) return null;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  getRaw(key: string): string | null {
    if (!isStorageAvailable()) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  set<T = unknown>(key: string, value: T): boolean {
    if (!isStorageAvailable()) return false;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  setRaw(key: string, value: string): boolean {
    if (!isStorageAvailable()) return false;
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },

  remove(key: string): boolean {
    if (!isStorageAvailable()) return false;
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },

  clear(): boolean {
    if (!isStorageAvailable()) return false;
    try {
      window.localStorage.clear();
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * Zustand `persist` middleware storage adapter backed by the safe
 * localStorage wrapper above (string-based get/set/remove item contract).
 */
export const zustandStorage = {
  getItem: (name: string): string | null => storage.getRaw(name),
  setItem: (name: string, value: string): void => {
    storage.setRaw(name, value);
  },
  removeItem: (name: string): void => {
    storage.remove(name);
  },
};
