//! OTA (over-the-air) hot-update endpoint.
//!
//! The mobile apps periodically call `/api/check-update?app=<name>&current=<ver>`.
//! We look at `../bundles/<app>/latest.json` on disk and tell the
//! client whether it should download a newer bundle.
//!
//! Every field on the DTOs below is annotated for the OpenAPI schema so
//! the generated TS client stays exact.

use axum::{extract::Query, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::config::{public_base_url, BUNDLES_DIR, DEFAULT_APP};

// -----------------------------------------------------------------------------
// DTOs
// -----------------------------------------------------------------------------

#[derive(Deserialize, ToSchema)]
pub struct UpdateQuery {
    /// Version the client currently has installed.
    #[schema(example = "0.0.0-20260814T120500")]
    current: Option<String>,
    /// Which app is asking — `customer` or `worker`.  Maps to a
    /// `bundles/<app>/` sub-directory on disk.
    #[schema(example = "customer")]
    app: Option<String>,
    /// Reserved for future release channels (`stable`, `beta`, …).
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
    #[schema(example = "http://localhost:3000/bundles/customer/v0.0.0-20260814T120500.zip")]
    pub url: Option<String>,
}

#[derive(Deserialize)]
struct LatestManifest {
    version: String,
    file: String,
}

// -----------------------------------------------------------------------------
// Helpers (private — only this handler needs them)
// -----------------------------------------------------------------------------

/// Only accept simple alphanumeric app names to avoid path traversal via `?app=../..`.
fn sanitize_app(name: &str) -> Option<String> {
    if name.is_empty() || name.len() > 32 { return None; }
    if !name.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') {
        return None;
    }
    Some(name.to_string())
}

/// Read `bundles/<app>/latest.json` off disk.  Returns `(version, filename)`
/// or `None` if the manifest is missing/invalid.
fn find_latest_bundle(app: &str) -> Option<(String, String)> {
    let manifest_path = std::path::Path::new(BUNDLES_DIR).join(app).join("latest.json");
    let txt = std::fs::read_to_string(&manifest_path).ok()?;
    let manifest: LatestManifest = serde_json::from_str(&txt).ok()?;
    Some((manifest.version, manifest.file))
}

fn normalize_version(s: &str) -> String {
    s.trim().trim_start_matches('v').to_ascii_lowercase()
}

// -----------------------------------------------------------------------------
// Handler
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
            let same = params
                .current
                .as_deref()
                .map(|c| normalize_version(c) == normalize_version(&version))
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
