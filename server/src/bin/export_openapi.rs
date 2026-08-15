//! Dump the OpenAPI JSON to disk so the TS side can codegen a client
//! without needing the server to be running.
//!
//! Writes to `packages/api-contracts/openapi.json` by default.  Override
//! with:
//!
//!     cargo run --bin export-openapi -- --out ../packages/api-contracts/openapi.json
//!
//! Typical use from the repo root:
//!
//!     npm run api:export      # cargo run --bin export-openapi
//!     npm run api:codegen     # openapi codegen
//!     npm run api:sync        # both (also run automatically by `postinstall`)

// This binary lives inside the same crate as the server (no `lib.rs`),
// so we re-declare the modules it needs via `#[path]`.  Only `openapi`
// is required at the top level, but it in turn pulls in `handlers` and
// `config` — so include those siblings too.
#[path = "../config.rs"]
mod config;
#[path = "../handlers/mod.rs"]
mod handlers;
#[path = "../openapi.rs"]
mod openapi;

use std::path::PathBuf;
use utoipa::OpenApi;

fn main() -> anyhow::Result<()> {
    // Default output path relative to `server/`, resolving to
    // `<repo>/packages/api-contracts/openapi.json`.
    let mut out = PathBuf::from("../packages/api-contracts/openapi.json");

    let mut args = std::env::args().skip(1);
    while let Some(a) = args.next() {
        match a.as_str() {
            "-o" | "--out" => {
                if let Some(p) = args.next() {
                    out = PathBuf::from(p);
                }
            }
            "-h" | "--help" => {
                eprintln!("Usage: export-openapi [--out PATH]");
                return Ok(());
            }
            _ => {
                eprintln!("Unknown argument: {a}");
                std::process::exit(2);
            }
        }
    }

    let doc = openapi::ApiDoc::openapi();
    let json = doc.to_pretty_json()?;

    if let Some(parent) = out.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(&out, json)?;
    eprintln!("[export-openapi] wrote {}", out.display());
    Ok(())
}
