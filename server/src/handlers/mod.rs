//! HTTP handlers — one file per resource.
//!
//! Each sub-module owns its handler function(s) plus the DTOs those
//! handlers accept/return.  Route wiring lives in `crate::routes`.

pub mod health;
pub mod ota;
