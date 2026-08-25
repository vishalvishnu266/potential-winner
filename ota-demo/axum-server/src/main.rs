//! Tiny OTA server for the Leptos + Capacitor demo.
//!
//! Serves pre-built OTA bundles produced by
//! `capacitor-android/scripts/make-bundle.mjs`. The build script drops
//! `<hash>.zip` files and a `latest.json` pointer into the `bundles/`
//! directory next to this crate; we just serve them as static files.
//!
//! Endpoints:
//!   GET  /latest              -> contents of bundles/latest.json
//!                                 { "version": "<hash>",
//!                                   "url": "http://…/bundles/<hash>.zip",
//!                                   "artifactType": "zip" }
//!   GET  /version             -> { "version": "<hash>" } (thin passthrough)
//!   GET  /bundles/<name>.zip  -> raw bundle bytes (served via ServeDir)
//!   POST /hello               -> body { "name": "..." }
//!                                 -> { "message": "Hello, ...!" }  (demo)
//!
//! Override the bundles directory with `--bundles <path>` or the
//! `OTA_BUNDLES` env var. Default is `../axum-server/bundles` (relative to
//! wherever you `cargo run` the server from).

use std::{net::SocketAddr, path::PathBuf, sync::Arc};

use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use ota_common::{routes, HelloReq, HelloResp, Latest, VersionResp};
use tower_http::{cors::{Any, CorsLayer}, services::ServeDir};

// The wire shape of `latest.json` (and the /latest response body) lives in
// the shared `ota-common` crate, so the Leptos client deserializes it
// against the exact same type.

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

/// `POST /hello` — trivial demo of a typed round-trip POST. Body in and
/// body out are both defined in `ota-common`, so the Leptos client sends
/// / parses the exact same shapes with zero duplication.
async fn hello(Json(req): Json<HelloReq>) -> Json<HelloResp> {
    let who = if req.name.trim().is_empty() {
        "world".to_string()
    } else {
        req.name
    };
    Json(HelloResp {
        message: format!("Hello, {who}!"),
    })
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

    // Permissive CORS so the Leptos WebView (whose origin is
    // `http://localhost` on Android, `capacitor://localhost` on iOS, or
    // whatever `trunk serve` picks when developing on desktop) can reach
    // the API. Crucially we must also allow *headers* — without
    // `allow_headers(Any)` the browser's `OPTIONS` preflight for
    // `Content-Type: application/json` fails, and reqwest reports
    // "error sending request".
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route(routes::LATEST, get(latest))
        .route(routes::VERSION, get(version))
        .route(routes::HELLO, post(hello))
        .nest_service(routes::BUNDLES_PREFIX, ServeDir::new(bundles_dir))
        .with_state(state)
        .layer(cors);

    let addr: SocketAddr = "0.0.0.0:8080".parse().unwrap();
    tracing::info!(
        "OTA server listening on http://{addr}  (expected LAN IP: 192.168.0.2)"
    );
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
