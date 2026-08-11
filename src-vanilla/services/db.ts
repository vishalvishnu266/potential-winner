/**
 * Database service placeholder.
 *
 * This is intentionally a stub today — the framework only ships the
 * *interface* so controllers can be written against it now, and we can
 * plug `@capacitor-community/sqlite` in later without touching callers.
 */

export interface DbService {
  init(): Promise<void>;
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  run(sql: string, params?: unknown[]): Promise<void>;
  close(): Promise<void>;
}

/** No-op in-memory stub. Replace with a real SQLite adapter later. */
export const db: DbService = {
  async init() { /* noop */ },
  async all() { return []; },
  async run() { /* noop */ },
  async close() { /* noop */ },
};
