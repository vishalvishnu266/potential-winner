//! OTA subsystem.
//!
//! * [`events`] — the [`OtaEvent`] enum + `event_status_line` formatter.
//! * [`engine`] — the pure "check → download → activate → reload" flow.
//! * [`poller`] — the 15-second background poller started at app boot.
//!
//! All modules are Leptos-free so they can be reused/tested in isolation.

pub mod engine;
pub mod events;
pub mod poller;

pub use engine::check_and_apply;
pub use events::{event_status_line, OtaEvent};
pub use poller::start_background_poller;

/// Interval between automatic OTA checks kicked off by [`poller`].
pub const POLL_INTERVAL_MS: i32 = 15_000;
