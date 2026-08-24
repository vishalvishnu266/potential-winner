//! Tiny OTA server for the Leptos + Capacitor demo.
//!
//! It watches a single directory — by default `../leptos-app/dist` — and
//! serves whatever is in it as the "latest bundle".
//!
//! Endpoints:
//!   GET /version               -> {"version":"<sha256-of-manifest>"}
//!   GET /manifest              -> {"version":"…","files":[{"path":"…","sha256":"…","size":…}, …]}
//!   GET /files/<relative/path> -> raw file bytes from the dist directory
//!
//! The "version" is derived from a SHA-256 over (relative-path, file-hash) for
//! every file in dist/, so any change to any file automatically bumps it — no
//! version.txt to bump manually. Just run `trunk build` (or `npm run sync`)
//! and hit "Check for update" on the phone.
//!
//! Override the served folder with `--dist <path>` or the `OTA_DIST` env var.

use std::{
    net::SocketAddr,
    path::{Path as StdPath, PathBuf},
    sync::Arc,
};

use axum::{
    extract::{Path, State},
    http::{header, StatusCode},
    response::{IntoResponse, Json},
    routing::get,
    Router,
};
use serde::Serialize;
use sha2::{Digest, Sha256};
use tokio::sync::RwLock;
use tower_http::cors::{Any, CorsLayer};
use walkdir::WalkDir;

// ---------- manifest ----------

#[derive(Clone, Serialize)]
struct FileEntry {
    path: String,   // POSIX-style, relative to dist/
    sha256: String, // hex
    size: u64,
}

#[derive(Clone, Serialize)]
struct Manifest {
    version: String, // hex sha256 of the whole thing
    files: Vec<FileEntry>,
}

/// Walk `dist_dir` and build a fresh manifest. Deterministic ordering so the
/// version hash only changes when actual content changes.
fn build_manifest(dist_dir: &StdPath) -> std::io::Result<Manifest> {
    let mut files = Vec::new();
    for entry in WalkDir::new(dist_dir).into_iter().filter_map(Result::ok) {
        if !entry.file_type().is_file() {
            continue;
        }
        let abs = entry.path();
        let rel = abs.strip_prefix(dist_dir).unwrap_or(abs);
        // Force POSIX separators so the client can use the path verbatim.
        let rel_str: String = rel
            .components()
            .map(|c| c.as_os_str().to_string_lossy().to_string())
            .collect::<Vec<_>>()
            .join("/");

        let bytes = std::fs::read(abs)?;
        let mut h = Sha256::new();
        h.update(&bytes);
        let sha = hex::encode(h.finalize());

        files.push(FileEntry {
            path: rel_str,
            sha256: sha,
            size: bytes.len() as u64,
        });
    }
    files.sort_by(|a, b| a.path.cmp(&b.path));

    // Overall version = hash over (path, file-hash) pairs.
    let mut v = Sha256::new();
    for f in &files {
        v.update(f.path.as_bytes());
        v.update([0u8]);
        v.update(f.sha256.as_bytes());
        v.update([0u8]);
    }
    let version = hex::encode(v.finalize());

    Ok(Manifest { version, files })
}

// ---------- app state ----------

#[derive(Clone)]
struct AppState {
    dist_dir: Arc<PathBuf>,
    manifest: Arc<RwLock<Manifest>>,
}

/// Re-scan dist/ before every response so edits are picked up live.
/// Cheap enough for a dev server; caches result if content hasn't changed.
async fn refresh(state: &AppState) -> std::io::Result<Manifest> {
    let dir = state.dist_dir.clone();
    let fresh =
        tokio::task::spawn_blocking(move || build_manifest(&dir)).await.unwrap()?;
    let mut guard = state.manifest.write().await;
    if guard.version != fresh.version {
        tracing::info!(
            "dist changed: {} files, version {}",
            fresh.files.len(),
            &fresh.version[..12]
        );
    }
    *guard = fresh.clone();
    Ok(fresh)
}

// ---------- handlers ----------

#[derive(Serialize)]
struct VersionResp {
    version: String,
}

async fn version(State(state): State<AppState>) -> impl IntoResponse {
    match refresh(&state).await {
        Ok(m) => Json(VersionResp { version: m.version }).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("scan failed: {e}")).into_response(),
    }
}

async fn manifest(State(state): State<AppState>) -> impl IntoResponse {
    match refresh(&state).await {
        Ok(m) => Json(m).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("scan failed: {e}")).into_response(),
    }
}

/// Serve a single file from dist/ by relative path, e.g. GET /files/index.html
/// or GET /files/leptos-app-abc123_bg.wasm.
async fn file(
    State(state): State<AppState>,
    Path(rel): Path<String>,
) -> impl IntoResponse {
    // Refuse traversal.
    if rel.split('/').any(|seg| seg == ".." || seg.is_empty()) {
        return (StatusCode::BAD_REQUEST, "bad path").into_response();
    }
    let full = state.dist_dir.join(&rel);
    match tokio::fs::read(&full).await {
        Ok(bytes) => {
            let ct = content_type(&rel);
            (
                [
                    (header::CONTENT_TYPE, ct),
                    (header::CACHE_CONTROL, "no-store"),
                ],
                bytes,
            )
                .into_response()
        }
        Err(_) => (StatusCode::NOT_FOUND, format!("no such file: {rel}")).into_response(),
    }
}

fn content_type(path: &str) -> &'static str {
    let lower = path.to_ascii_lowercase();
    if lower.ends_with(".html") {
        "text/html; charset=utf-8"
    } else if lower.ends_with(".js") || lower.ends_with(".mjs") {
        "application/javascript"
    } else if lower.ends_with(".wasm") {
        "application/wasm"
    } else if lower.ends_with(".css") {
        "text/css; charset=utf-8"
    } else if lower.ends_with(".json") {
        "application/json"
    } else if lower.ends_with(".png") {
        "image/png"
    } else if lower.ends_with(".svg") {
        "image/svg+xml"
    } else {
        "application/octet-stream"
    }
}

// ---------- entrypoint ----------

fn resolve_dist_dir() -> PathBuf {
    // 1. CLI: `cargo run -- --dist ../leptos-app/dist`
    let mut args = std::env::args().skip(1);
    while let Some(a) = args.next() {
        if a == "--dist" {
            if let Some(v) = args.next() {
                return PathBuf::from(v);
            }
        }
    }
    // 2. Env var
    if let Ok(v) = std::env::var("OTA_DIST") {
        return PathBuf::from(v);
    }
    // 3. Default relative to where you `cargo run` the server from.
    PathBuf::from("../leptos-app/dist")
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt().with_target(false).init();

    let dist_dir = resolve_dist_dir()
        .canonicalize()
        .unwrap_or_else(|_| PathBuf::from("../leptos-app/dist"));
    tracing::info!("Serving OTA bundles from: {}", dist_dir.display());

    let manifest0 = build_manifest(&dist_dir).unwrap_or(Manifest {
        version: "0".into(),
        files: vec![],
    });

    let state = AppState {
        dist_dir: Arc::new(dist_dir),
        manifest: Arc::new(RwLock::new(manifest0)),
    };

    let cors = CorsLayer::new().allow_origin(Any).allow_methods(Any);

    let app = Router::new()
        .route("/version", get(version))
        .route("/manifest", get(manifest))
        .route("/files/*rel", get(file))
        .with_state(state)
        .layer(cors);

    let addr: SocketAddr = "0.0.0.0:8080".parse().unwrap();
    tracing::info!(
        "OTA server listening on http://{addr}  (expected LAN IP: 192.168.0.2)"
    );
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
