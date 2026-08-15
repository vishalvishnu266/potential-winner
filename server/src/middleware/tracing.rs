//! Structured tracing layer.
//!
//! Every request gets its own span with `method`, `uri`, and the
//! `x-request-id` header attached, so all handler-level `tracing::info!`
//! calls carry that context automatically.

use tower_http::trace::{DefaultOnResponse, TraceLayer};
use tracing::Level;

use crate::config::REQUEST_ID_HEADER;

fn make_span(req: &http::Request<axum::body::Body>) -> tracing::Span {
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

pub fn layer() -> TraceLayer<
    tower_http::classify::SharedClassifier<tower_http::classify::ServerErrorsAsFailures>,
    fn(&http::Request<axum::body::Body>) -> tracing::Span,
> {
    TraceLayer::new_for_http()
        .make_span_with(make_span as fn(&http::Request<axum::body::Body>) -> tracing::Span)
        .on_response(DefaultOnResponse::new().level(Level::DEBUG))
}
