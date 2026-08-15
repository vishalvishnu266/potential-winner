//! Task Platform backend — a tiny axum server.
//!
//! This file does one thing: assemble the router, apply middleware,
//! and bind the socket.  Everything else lives in a dedicated module:
//!
//!   • `config`     — env-driven constants (port, bundle dir, public host)
//!   • `routes`     — URL → handler wiring (the "table of contents")
//!   • `handlers/`  — one file per resource (health, ota, ...)
//!   • `middleware/`— cors, tracing, request-id
//!   • `openapi`    — top-level `ApiDoc` (Scalar UI + TS codegen source)

mod config;
mod handlers;
mod middleware;
mod openapi;
mod routes;

use std::net::SocketAddr;

use axum::Router;
use tower_http::services::ServeDir;
use utoipa_scalar::{Scalar, Servable as _};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    init_tracing();

    // Build the API router (records every route in the OpenAPI doc)
    // and split it into (axum Router, OpenAPI JSON) at the same time.
    let (api_router, api_doc) = routes::build().split_for_parts();

    let app: Router = api_router
        // Static OTA bundles served directly off disk.
        .nest_service("/bundles", ServeDir::new(config::BUNDLES_DIR))
        // Scalar interactive docs at /docs, spec at /api-docs/openapi.json.
        .merge(Scalar::with_url("/docs", api_doc.clone()))
        .route(
            "/api-docs/openapi.json",
            axum::routing::get(move || {
                let doc = api_doc.clone();
                async move { axum::Json(doc) }
            }),
        );

    // Wrap in the standard middleware stack (CORS, tracing, request-id).
    let app = middleware::apply(app);

    let addr: SocketAddr = ([0, 0, 0, 0], config::port()).into();
    tracing::info!("Task Platform server listening on http://{}", addr);
    tracing::info!("  • docs: http://{}/docs", addr);
    tracing::info!("  • spec: http://{}/api-docs/openapi.json", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

fn init_tracing() {
    tracing_subscriber::fmt()
        .with_target(true)
        .with_level(true)
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                "info,server=debug,tower_http=debug,hyper=info,mio=info".into()
            }),
        )
        .init();
}
