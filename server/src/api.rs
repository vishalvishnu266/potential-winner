//! HTTP API surface — all handlers, DTOs, and the OpenAPI root doc.
//!
//! Everything defined here is picked up automatically:
//!   • `#[utoipa::path(...)]` handlers are registered on the `OpenApiRouter`
//!     in `main.rs`, so declaring a route ALSO documents it.
//!   • `#[derive(ToSchema)]` DTOs are added to the generated schema.
//!   • `ApiDoc` composes the top-level `OpenAPI` object consumed by the
//!     `export-openapi` binary and by the Scalar `/docs` page.
//!
//! When you add a new endpoint:
//!   1. Add its handler + `#[utoipa::path]` here (or in a sub-module and
//!      re-export it).
//!   2. Add its route to the `router()` function.
//!   3. Add any new schema types to `ApiDoc::components(schemas(...))`.
//!   4. Run `cargo run --bin export-openapi` from `server/`, then
//!      `npm run api:codegen` from the repo root — the TS client updates.

use axum::{extract::Query, http::StatusCode, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use utoipa::{OpenApi, ToSchema};
use utoipa_axum::{router::OpenApiRouter, routes};

// -----------------------------------------------------------------------------
// Constants (module-local so `main.rs` doesn't need them)
// -----------------------------------------------------------------------------

const BUNDLES_DIR: &str = "../bundles";
/// App used when the client doesn't specify `?app=...`. Kept for
/// backwards compatibility with the original single-app setup.
const DEFAULT_APP: &str = "customer";

// -----------------------------------------------------------------------------
// DTOs — every field is annotated for the OpenAPI schema
// -----------------------------------------------------------------------------

#[derive(Deserialize, ToSchema)]
pub struct UpdateQuery {
    /// Version the client currently has installed.
    #[schema(example = "0.0.0-20260814T120500")]
    current: Option<String>,
    /// Which app is asking — `customer` or `worker`. Maps to a
    /// `bundles/<app>/` sub-directory on disk.
    #[schema(example = "customer")]
    app: Option<String>,
    /// Reserved for future channels (`stable`, `beta`, …).
    #[allow(dead_code)]
    channel: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct CheckUpdateResponse {
    /// True if a newer bundle is available for download.
    #[schema(example = true)]
    pub available: bool,
    /// The newest bundle version on the server, or null if none exists.
    #[schema(example = "0.0.0-20260814T120500")]
    pub version: Option<String>,
    /// Absolute URL of the bundle zip, or null when no update is available.
    #[schema(example = "http://192.168.0.4:3000/bundles/customer/v0.0.0-20260814T120500.zip")]
    pub url: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct HealthResponse {
    /// Liveness flag — always `true` when the server is up.
    #[schema(example = true)]
    pub ok: bool,
}

#[derive(Deserialize)]
struct LatestManifest {
    version: String,
    file: String,
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

fn public_base_url() -> String {
    let host = std::env::var("PUBLIC_HOST").unwrap_or_else(|_| "192.168.0.4".to_string());
    let port = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse::<u16>().ok())
        .unwrap_or(3000);
    format!("http://{}:{}", host, port)
}

/// Only accept simple alphanumeric app names to avoid path traversal via `?app=../..`.
fn sanitize_app(name: &str) -> Option<String> {
    if name.is_empty() || name.len() > 32 { return None; }
    if !name.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') {
        return None;
    }
    Some(name.to_string())
}

fn find_latest_bundle(app: &str) -> Option<(String, String)> {
    let manifest_path = std::path::Path::new(BUNDLES_DIR).join(app).join("latest.json");
    if let Ok(txt) = std::fs::read_to_string(&manifest_path) {
        if let Ok(m) = serde_json::from_str::<LatestManifest>(&txt) {
            return Some((m.version, m.file));
        }
    }
    None
}

// -----------------------------------------------------------------------------
// Handlers
// -----------------------------------------------------------------------------

/// Report whether the running app should download a newer OTA bundle.
#[utoipa::path(
    get,
    path = "/api/check-update",
    tag  = "ota",
    params(
        ("current" = Option<String>, Query, description = "Version the client currently has installed."),
        ("app"     = Option<String>, Query, description = "App id — `customer` or `worker`. Defaults to `customer`."),
        ("channel" = Option<String>, Query, description = "Reserved for future release channels.")
    ),
    responses(
        (status = 200, description = "OTA status", body = CheckUpdateResponse)
    )
)]
#[tracing::instrument(skip_all, fields(current = ?params.current, app = ?params.app))]
pub async fn check_update(Query(params): Query<UpdateQuery>) -> impl IntoResponse {
    let app = params
        .app
        .as_deref()
        .and_then(sanitize_app)
        .unwrap_or_else(|| DEFAULT_APP.to_string());

    match find_latest_bundle(&app) {
        Some((version, file)) => {
            let normalize = |s: &str| s.trim().trim_start_matches('v').to_ascii_lowercase();
            let same = params
                .current
                .as_deref()
                .map(|c| normalize(c) == normalize(&version))
                .unwrap_or(false);
            let available = !same;
            let url = format!("{}/bundles/{}/{}", public_base_url(), app, file);
            tracing::info!(app = %app, latest = %version, available, url = %url, "OTA check");
            Json(CheckUpdateResponse {
                available,
                version: Some(version),
                url: Some(url),
            })
        }
        None => {
            tracing::warn!(app = %app, "OTA check: no bundles/{}/latest.json found", app);
            Json(CheckUpdateResponse { available: false, version: None, url: None })
        }
    }
}

/// Liveness probe.
#[utoipa::path(
    get,
    path = "/health",
    tag  = "health",
    responses(
        (status = 200, description = "Server is up", body = HealthResponse)
    )
)]
#[tracing::instrument]
pub async fn health() -> impl IntoResponse {
    (StatusCode::OK, Json(HealthResponse { ok: true }))
}

// -----------------------------------------------------------------------------
// Router + top-level OpenAPI doc
// -----------------------------------------------------------------------------

/// Build the app's HTTP router.  `OpenApiRouter` mirrors the axum
/// `Router` API but *also* records every route in the OpenAPI schema.
pub fn router() -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(check_update))
        .routes(routes!(health))
}

/// Top-level OpenAPI document.  Consumed by `bin/export_openapi.rs` and
/// by the Scalar `/docs` UI in `main.rs`.
#[derive(OpenApi)]
#[openapi(
    info(
        title       = "Task Platform API",
        version     = "0.1.0",
        description = "Shared HTTP surface for the customer + worker apps.",
    ),
    tags(
        (name = "ota",    description = "OTA hot-update endpoints"),
        (name = "health", description = "Liveness / readiness")
    ),
    components(schemas(CheckUpdateResponse, HealthResponse))
)]
pub struct ApiDoc;
