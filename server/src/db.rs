//! SQLite persistence via sqlx + file-based migrations.
//!
//! Schema lives in `server/migrations/` — one file per table, timestamp
//! prefixed, double-underscore separated (see `migrations/README.md`).
//! Migrations run automatically on startup; sqlx tracks which files have
//! already been applied in an internal `_sqlx_migrations` table.
//!
//! Notes on SQLite pragmas:
//! - `journal_mode = WAL` and other "engine-level" pragmas MUST be
//!   applied **outside** of any transaction.  `sqlx::migrate!` wraps
//!   every migration file in its own transaction, so we cannot put
//!   `PRAGMA journal_mode = WAL` in a migration — SQLite rejects it
//!   with "cannot change into wal mode from within a transaction".
//!   We therefore run those pragmas here, once, right after opening
//!   the pool and before firing migrations.

use sqlx::{migrate::Migrator, sqlite::SqlitePoolOptions, SqlitePool};
use std::path::Path;

pub type Db = SqlitePool;

/// Compile-time embed of everything under `server/migrations/`.  This
/// means the running binary carries its own schema — no need to ship the
/// SQL files alongside the executable.
static MIGRATOR: Migrator = sqlx::migrate!("./migrations");

/// Open (or create) the SQLite file, apply engine-level pragmas, then
/// run any pending migrations.
pub async fn open(path: &str) -> anyhow::Result<Db> {
    // Ensure the parent directory exists (e.g. `data/app.sqlite`).
    if let Some(parent) = Path::new(path).parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent).ok();
        }
    }

    let url = format!("sqlite://{}?mode=rwc", path);
    let pool = SqlitePoolOptions::new()
        .max_connections(8)
        .connect(&url)
        .await?;

    // Engine-level pragmas — must run OUTSIDE any transaction.
    // `execute` runs in autocommit mode, which is what we want.
    sqlx::query("PRAGMA journal_mode = WAL;").execute(&pool).await?;
    sqlx::query("PRAGMA foreign_keys = ON;").execute(&pool).await?;
    // Recommended companions for WAL mode:
    sqlx::query("PRAGMA synchronous = NORMAL;").execute(&pool).await?;
    sqlx::query("PRAGMA busy_timeout = 5000;").execute(&pool).await?;

    MIGRATOR.run(&pool).await?;
    Ok(pool)
}
