//! Top-level OpenAPI document.
//!
//! Consumed by:
//!   • `bin/export_openapi.rs` — dumps this to `openapi.json` for TS codegen
//!   • `main.rs`               — served via Scalar UI at `/docs`
//!
//! Add new schemas to `components(schemas(...))` when you add a DTO
//! that isn't already reachable through a `#[utoipa::path]` handler.

use utoipa::OpenApi;

use crate::handlers::{health::HealthResponse, ota::CheckUpdateResponse};

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
