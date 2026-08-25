//! Tiny OTA server for the Leptos + Capacitor demo.
//!
//! Serves pre-built OTA bundles produced by
//! `capacitor-android/scripts/make-bundle.mjs`. The build script drops
//! `<hash>.zip` files and a `latest.json` pointer into the `bundles/`
//! directory next to this crate; we just serve them as static files.
//!
//! Endpoints:
//!   GET /latest              -> contents of bundles/latest.json
//!                                { "version": "<hash>",
//!                                  "url": "http://…/bundles/<hash>.zip",
//!                                  "artifactType": "zip" }
//!   GET /version             -> { "version": "<hash>" } (thin passthrough)
//!   GET /bundles/<name>.zip  -> raw bundle bytes (served via ServeDir)
//!
//! Override the bundles directory with `--bundles <path>` or the
//! `OTA_BUNDLES` env var. Default is `../axum-server/bundles` (relative to
//! wherever you `cargo run` the server from).

use std::{net::SocketAddr, path::PathBuf, sync::Arc};

use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use tower_http::{cors::{Any, CorsLayer}, services::ServeDir};

// ---------- latest.json shape ----------

#[derive(Clone, Debug, Serialize, Deserialize)]
struct Latest {
    version: String,
    url: String,
    #[serde(rename = "artifactType", default = "default_artifact_type")]
    artifact_type: String,
}

fn default_artifact_type() -> String {
    "zip".to_string()
}

// ---------- app state ----------

#[derive(Clone)]
struct AppState {
    bundles_dir: Arc<PathBuf>,
}

/// Read (and freshly parse) bundles/latest.json on every request so the
/// server always reflects whatever the sync script last produced.
async fn read_latest(state: &AppState) -> Result<Latest, String> {
    let path = state.bundles_dir.join("latest.json");
    let bytes = tokio::fs::read(&path)
        .await
        .map_err(|e| format!("cannot read {}: {e}", path.display()))?;
    serde_json::from_slice::<Latest>(&bytes)
        .map_err(|e| format!("invalid latest.json: {e}"))
}

// ---------- handlers ----------

#[derive(Serialize)]
struct VersionResp {
    version: String,
}

async fn latest(State(state): State<AppState>) -> impl IntoResponse {
    match read_latest(&state).await {
        Ok(l) => Json(l).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
    }
}

async fn version(State(state): State<AppState>) -> impl IntoResponse {
    match read_latest(&state).await {
        Ok(l) => Json(VersionResp { version: l.version }).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e).into_response(),
    }
}

// ---------- entrypoint ----------

fn resolve_bundles_dir() -> PathBuf {
    // 1. CLI: `cargo run -- --bundles ./bundles`
    let mut args = std::env::args().skip(1);
    while let Some(a) = args.next() {
        if a == "--bundles" || a == "--dist" {
            // `--dist` kept as a legacy alias so old muscle memory still works.
            if let Some(v) = args.next() {
                return PathBuf::from(v);
            }
        }
    }
    // 2. Env var
    if let Ok(v) = std::env::var("OTA_BUNDLES") {
        return PathBuf::from(v);
    }
    // 3. Default relative to where you `cargo run` the server from
    //    (i.e. inside `axum-server/`).
    PathBuf::from("./bundles")
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt().with_target(false).init();

    let bundles_dir = resolve_bundles_dir()
        .canonicalize()
        .unwrap_or_else(|_| PathBuf::from("./bundles"));
    tracing::info!("Serving OTA bundles from: {}", bundles_dir.display());

    // Warn early if latest.json is missing — the server still starts fine,
    // but /latest and /version will 500 until the sync script runs once.
    let latest_path = bundles_dir.join("latest.json");
    if !latest_path.exists() {
        tracing::warn!(
            "no latest.json at {} — run `npm --prefix ../capacitor-android run bundle` first",
            latest_path.display()
        );
    }

    let state = AppState {
        bundles_dir: Arc::new(bundles_dir.clone()),
    };

    let cors = CorsLayer::new().allow_origin(Any).allow_methods(Any);

    let app = Router::new()
        .route("/latest", get(latest))
        .route("/version", get(version))
        .nest_service("/bundles", ServeDir::new(bundles_dir))
        .with_state(state)
        .layer(cors);

    let addr: SocketAddr = "0.0.0.0:8080".parse().unwrap();
    tracing::info!(
        "OTA server listening on http://{addr}  (expected LAN IP: 192.168.0.2)"
    );
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
