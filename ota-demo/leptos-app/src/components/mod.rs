//! Small reusable UI building blocks — header bar, bottom nav, pills.
//!
//! Split out of `ui.rs` so each concern lives in its own file. Anything
//! genuinely reusable across pages goes here; page-local widgets stay
//! inside their page module.

pub mod bottom_nav;
pub mod header;
pub mod version_pill;
