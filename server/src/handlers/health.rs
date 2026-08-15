//! Liveness probe.
//!
//! Deliberately dependency-free so k8s / uptime monitors don't get
//! false negatives when downstream services (DB, cache) hiccup.
//! When we grow a real "readiness" check, add a second endpoint —
//! do not overload this one.

use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Serialize, ToSchema)]
pub struct HealthResponse {
    /// Liveness flag — always `true` when the server is up.
    #[schema(example = true)]
    pub ok: bool,
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
#[tracing::instrument(level = "debug")]
pub async fn health() -> impl IntoResponse {
    (StatusCode::OK, Json(HealthResponse { ok: true }))
}
