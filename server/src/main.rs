//! Task Platform backend — a tiny axum server.
//!
//! Responsibilities:
//!   1. `GET  /api/check-update` — tells a native app whether a newer
//!      bundle is available (see `api::check_update`).
//!   2. `GET  /bundles/*`        — serves the actual bundle zips.
//!   3. `GET  /health`           — cheap liveness probe.
//!   4. `GET  /docs`             — interactive OpenAPI docs (Scalar).
//!   5. `GET  /api-docs/openapi.json` — machine spec used by TS codegen.
//!
//! All endpoint logic + OpenAPI decoration lives in `src/api.rs`.
//! This file is just the runtime glue (tracing, request-id, CORS, static
//! hosting, docs UI, bind).

mod api;

use std::net::SocketAddr;

use axum::Router;
use tower_http::cors::{Any, CorsLayer};
use tower_http::request_id::{
    MakeRequestId, PropagateRequestIdLayer, RequestId, SetRequestIdLayer,
};
use tower_http::services::ServeDir;
use tower_http::trace::{DefaultOnResponse, TraceLayer};
use tracing::Level;
use utoipa::OpenApi;
use utoipa_scalar::{Scalar, Servable as _};

// -----------------------------------------------------------------------------

const REQUEST_ID_HEADER: &str = "x-request-id";
const BUNDLES_DIR: &str = "../bundles";
const DEFAULT_PORT: u16 = 3000;

#[derive(Clone, Default)]
struct UuidRequestId;

impl MakeRequestId for UuidRequestId {
    fn make_request_id<B>(&mut self, _request: &http::Request<B>) -> Option<RequestId> {
        let id = format!("{:016x}{:016x}", rand_u64(), rand_u64());
        http::HeaderValue::from_str(&id).ok().map(RequestId::new)
    }
}

fn rand_u64() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(0);
    nanos.rotate_left(17) ^ 0x9E37_79B9_7F4A_7C15
}

fn make_request_span(req: &http::Request<axum::body::Body>) -> tracing::Span {
    let request_id = req
        .headers()
        .get(REQUEST_ID_HEADER)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("-")
        .to_string();
    tracing::info_span!(
        "http",
        method = %req.method(),
        uri = %req.uri(),
        request_id = %request_id,
    )
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_target(true)
        .with_level(true)
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                "info,server=debug,tower_http=debug,hyper=info,mio=info".into()
            }),
        )
        .init();

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let trace_layer = TraceLayer::new_for_http()
        .make_span_with(make_request_span)
        .on_response(DefaultOnResponse::new().level(Level::DEBUG));

    let set_req_id = SetRequestIdLayer::new(
        http::HeaderName::from_static(REQUEST_ID_HEADER),
        UuidRequestId::default(),
    );
    let propagate_req_id = PropagateRequestIdLayer::new(
        http::HeaderName::from_static(REQUEST_ID_HEADER),
    );

    // Build the API router (records every route in the OpenAPI doc).
    let (api_router, api_doc) = api::router()
        .split_for_parts();

    let app: Router = api_router
        // Static OTA bundles
        .nest_service("/bundles", ServeDir::new(BUNDLES_DIR))
        // Scalar interactive docs at /docs, spec at /api-docs/openapi.json
        .merge(Scalar::with_url("/docs", api_doc.clone()))
        .route(
            "/api-docs/openapi.json",
            axum::routing::get(move || {
                let doc = api_doc.clone();
                async move { axum::Json(doc) }
            }),
        )
        // Layer order matters — outermost runs first.
        .layer(trace_layer)
        .layer(set_req_id)
        .layer(propagate_req_id)
        .layer(cors);

    let port = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse::<u16>().ok())
        .unwrap_or(DEFAULT_PORT);
    let addr: SocketAddr = ([0, 0, 0, 0], port).into();
    tracing::info!("Task Platform server listening on http://{}", addr);
    tracing::info!("  • docs: http://{}/docs", addr);
    tracing::info!("  • spec: http://{}/api-docs/openapi.json", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

// Referenced by the derive macro on `api::ApiDoc` — surface it so external
// tools that expect `server::api::ApiDoc` can still reach it.
#[allow(dead_code)]
fn _openapi_touch() -> utoipa::openapi::OpenApi {
    api::ApiDoc::openapi()
}
