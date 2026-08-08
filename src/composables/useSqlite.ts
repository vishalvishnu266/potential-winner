import { useCallback, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
    CapacitorSQLite,
    SQLiteConnection,
    SQLiteDBConnection,
} from '@capacitor-community/sqlite';

/**
 * Thin wrapper around @capacitor-community/sqlite — TEST SCAFFOLD ONLY.
 *
 * There is exactly one table: `notes(id, body, created_at)`.
 * Do NOT add more tables here. Real schema will be designed later.
 *
 * API:
 *   run(sql, params?)   → number of affected rows
 *   query(sql, params?) → array of rows
 *   reset()             → wipe the notes table
 */

const DB_NAME_DEFAULT = 'dailygig.db';
const DB_VERSION = 1;

// Module-level singletons (survive component unmounts, hot reloads)
let sqlite: SQLiteConnection | null = null;
let dbConn: SQLiteDBConnection | null = null;
let initPromise: Promise<SQLiteDBConnection> | null = null;

async function ensureWebStore() {
    // Only needed on the web platform. On native the plugin has its own storage.
    if (Capacitor.getPlatform() !== 'web') return;

    // Lazy-register the jeep-sqlite custom element and initialize the store
    // exactly once. Safe to call repeatedly.
    const { defineCustomElements } = await import('jeep-sqlite/loader');
    defineCustomElements(window);

    if (!document.querySelector('jeep-sqlite')) {
        const el = document.createElement('jeep-sqlite');
        document.body.appendChild(el);
        // Wait for the element to define/upgrade
        await customElements.whenDefined('jeep-sqlite');
    }
    if (!sqlite) sqlite = new SQLiteConnection(CapacitorSQLite);
    await sqlite.initWebStore();
}

async function openDb(name = DB_NAME_DEFAULT): Promise<SQLiteDBConnection> {
    if (dbConn) return dbConn;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        await ensureWebStore();
        if (!sqlite) sqlite = new SQLiteConnection(CapacitorSQLite);

        // Reuse an existing connection if one somehow exists (hot reload edge case)
        const check = await sqlite.checkConnectionsConsistency();
        const isConn = (await sqlite.isConnection(name, false)).result;
        const conn = check.result && isConn
            ? await sqlite.retrieveConnection(name, false)
            : await sqlite.createConnection(name, false, 'no-encryption', DB_VERSION, false);

        await conn.open();

        // Single test table — do not add more, this is only for smoke-testing
        // that SQLite works on the device.
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                body TEXT NOT NULL,
                created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
            );
        `);

        // On the web, persist changes back to IndexedDB.
        if (Capacitor.getPlatform() === 'web') {
            try { await sqlite.saveToStore(name); } catch { /* first run */ }
        }

        dbConn = conn;
        return conn;
    })();

    return initPromise;
}

export function useSqlite(name = DB_NAME_DEFAULT) {
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isWeb = Capacitor.getPlatform() === 'web';

    const db = useCallback(async (): Promise<SQLiteDBConnection> => {
        try {
            const c = await openDb(name);
            setReady(true);
            return c;
        } catch (e: any) {
            setError(e?.message || 'Failed to open database');
            throw e;
        }
    }, [name]);

    /** Execute a write statement (INSERT/UPDATE/DELETE/CREATE). Returns changes count. */
    const run = useCallback(async (sql: string, params: any[] = []): Promise<number> => {
        const c = await db();
        const res = await c.run(sql, params);
        if (isWeb && sqlite) { try { await sqlite.saveToStore(name); } catch { /* noop */ } }
        return res.changes?.changes ?? 0;
    }, [db, isWeb, name]);

    /** Execute a read statement (SELECT). Returns an array of row objects. */
    const query = useCallback(async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
        const c = await db();
        const res = await c.query(sql, params);
        return (res.values ?? []) as T[];
    }, [db]);

    /** Wipe the notes table — used by the Sandbox "Clear all" button. */
    const reset = useCallback(async () => {
        await run('DELETE FROM notes;');
    }, [run]);

    return { ready, error, run, query, reset, isWeb };
}
