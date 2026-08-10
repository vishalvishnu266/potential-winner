//! SQLite persistence via sqlx + file-based migrations.
//!
//! Schema lives in `server/migrations/` — one file per table, timestamp
//! prefixed, double-underscore separated (see `migrations/README.md`).
//! Migrations run automatically on startup; sqlx tracks which files have
//! already been applied in an internal `_sqlx_migrations` table.

use sqlx::{migrate::Migrator, sqlite::SqlitePoolOptions, SqlitePool};
use std::path::Path;

pub type Db = SqlitePool;

/// Compile-time embed of everything under `server/migrations/`.  This
/// means the running binary carries its own schema — no need to ship the
/// SQL files alongside the executable.
static MIGRATOR: Migrator = sqlx::migrate!("./migrations");

/// Open (or create) the SQLite file and run any pending migrations.
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

    MIGRATOR.run(&pool).await?;
    Ok(pool)
}
