//! Background poller that runs [`check_and_apply`] every
//! [`POLL_INTERVAL_MS`] milliseconds.
//!
//! Started once from `app::app()`. Uses Leptos' `set_interval` which
//! schedules on the browser event loop and is automatically cancelled
//! when the enclosing reactive scope is disposed (the entire app, in
//! practice).
//!
//! ## Reentrancy
//!
//! Multiple overlapping runs would be wasteful (double-downloads, racy
//! signal writes) so a small `Rc<Cell<bool>>` gate skips ticks while a
//! previous run is still in flight.

use std::cell::Cell;
use std::rc::Rc;
use std::time::Duration;

use leptos::{set_interval, set_timeout};
use wasm_bindgen_futures::spawn_local;

use crate::ota::engine::check_and_apply;
use crate::ota::events::{event_status_line, OtaEvent};
use crate::ota::POLL_INTERVAL_MS;
use crate::state::AppState;

/// Start the background OTA poller. Safe to call once at app boot.
///
/// Fires an initial check immediately, then every [`POLL_INTERVAL_MS`]
/// milliseconds thereafter. When a new version is detected the engine
/// downloads/activates/reloads automatically, so the app effectively
/// stays live on the latest bundle.
pub fn start_background_poller(state: AppState) {
    // Shared "is a check already running?" flag. Rc<Cell<_>> is fine on
    // wasm (single-threaded) and cheaper than Arc<Mutex<_>>.
    let running = Rc::new(Cell::new(false));

    // Kick off an initial check ~1s after mount so we don't compete
    // with first-paint work.
    let state0 = state;
    let running0 = running.clone();
    set_timeout(
        move || tick(state0, running0),
        Duration::from_millis(1_000),
    );

    // Recurring check.
    set_interval(
        move || tick(state, running.clone()),
        Duration::from_millis(POLL_INTERVAL_MS as u64),
    );
}

/// One poll tick: reentrancy-guarded call to the OTA engine, wired to
/// update the shared [`AppState`] signals.
fn tick(state: AppState, running: Rc<Cell<bool>>) {
    if running.get() {
        // Previous check still in flight — skip this tick.
        return;
    }
    running.set(true);
    spawn_local(async move {
        let _ = check_and_apply(|ev| apply_event(&ev, state)).await;
        running.set(false);
    });
}

/// Fan an [`OtaEvent`] out to the shared reactive state.
fn apply_event(ev: &OtaEvent, state: AppState) {
    state.status.set(event_status_line(ev));
    match ev {
        OtaEvent::ServerVersion(v) => state.server_ver.set(v.clone()),
        OtaEvent::Installed { version } => state.installed_ver.set(version.clone()),
        _ => {}
    }
}
