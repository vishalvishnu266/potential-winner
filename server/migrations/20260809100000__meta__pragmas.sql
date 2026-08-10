-- One-time SQLite pragmas.
-- Kept in a "meta" pseudo-table file so it never mixes with real DDL.
-- WAL mode makes reads non-blocking during writes.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
