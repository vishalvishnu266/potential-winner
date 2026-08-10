-- Intentionally empty.
--
-- Engine-level pragmas such as `PRAGMA journal_mode = WAL` cannot be
-- executed inside a transaction, and `sqlx::migrate!` wraps every
-- migration file in its own transaction.  They are therefore applied
-- in Rust (see server/src/db.rs `open()`) before migrations run.
--
-- This file exists purely as a placeholder so the timestamp sequence
-- (`20260809100000__meta__pragmas.sql` → `20260809100001__users__create.sql`)
-- stays stable.  Do not add DDL here.

SELECT 1;
