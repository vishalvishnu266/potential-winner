//! URL → handler wiring — the single-file table of contents for the
//! entire HTTP surface.
//!
//! Every route in the app is declared here.  Adding a new endpoint
//! is a two-step process:
//!
//!   1. Create the handler in `handlers/<resource>.rs` (with
//!      `#[utoipa::path(...)]` + `#[derive(ToSchema)]` DTOs).
//!   2. Add one `.routes(routes!(handlers::<resource>::<handler>))`
//!      line below.
//!
//! `OpenApiRouter` mirrors axum's `Router` but also records every
//! route in the generated OpenAPI doc — no double-bookkeeping.

use utoipa_axum::{router::OpenApiRouter, routes};

use crate::handlers;

/// Assemble the app router.  Middleware is applied on top in `main.rs`.
pub fn build() -> OpenApiRouter {
    OpenApiRouter::new()
        .routes(routes!(handlers::ota::check_update))
        .routes(routes!(handlers::health::health))
}
