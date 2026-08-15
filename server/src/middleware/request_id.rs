//! Request-id middleware.
//!
//! Stamps every inbound request with a UUIDv4 header (`x-request-id`)
//! if the client didn't already provide one, and echoes it back on
//! the response so log lines / client SDKs can correlate calls.

use tower_http::request_id::{
    MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer,
};

use crate::config::REQUEST_ID_HEADER;

pub fn set_layer() -> SetRequestIdLayer<MakeRequestUuid> {
    SetRequestIdLayer::new(
        http::HeaderName::from_static(REQUEST_ID_HEADER),
        MakeRequestUuid,
    )
}

pub fn propagate_layer() -> PropagateRequestIdLayer {
    PropagateRequestIdLayer::new(
        http::HeaderName::from_static(REQUEST_ID_HEADER),
    )
}
