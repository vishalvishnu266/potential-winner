/**
 * The ONLY place in the app that touches localStorage.
 *
 * Kept as a thin async facade so we can swap the backend to
 * `@capacitor/preferences` (or SQLite KV, etc.) in a single file without
 * touching any caller.
 */

export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota / private mode — swallow */
    }
  },

  async remove(key: string): Promise<void> {
    try { localStorage.removeItem(key); } catch { /* noop */ }
  },
};
