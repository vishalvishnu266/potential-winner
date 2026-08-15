//! HTTP middleware — CORS, structured tracing, request-id.
//!
//! Each layer is built in its own sub-module so `main.rs` stays a
//! straight-line "bind and serve" script.  The `apply` helper below
//! wraps a `Router` in the standard middleware stack in the right
//! order (outermost runs first).

use axum::Router;

pub mod cors;
pub mod request_id;
pub mod tracing;

/// Wrap the given router in the standard middleware stack.
///
/// Order matters — outermost runs first on the request, last on the
/// response.  We apply, from outside in:
///
///   1. CORS              (respond to OPTIONS before doing any work)
///   2. Tracing           (span every request end-to-end)
///   3. SetRequestId      (stamp `x-request-id` if the client didn't)
///   4. PropagateRequestId (echo it back on the response)
pub fn apply(router: Router) -> Router {
    router
        .layer(tracing::layer())
        .layer(request_id::set_layer())
        .layer(request_id::propagate_layer())
        .layer(cors::layer())
}
