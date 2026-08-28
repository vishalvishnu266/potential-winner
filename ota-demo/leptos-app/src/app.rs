//! Top-level Leptos component.
//!
//! Responsibilities (kept deliberately small):
//!   1. Create + provide the shared [`AppState`] into context.
//!   2. Run the mount-time OTA bookkeeping (`ready()` disarms the
//!      plugin's automatic rollback; `getBundle` populates the
//!      "Installed" pill).
//!   3. Start the background OTA poller (15 s cadence).
//!   4. Mount the `Router` around the shell.
//!
//! Everything else — layout, routes, page contents — lives under
//! `router`, `ui`, and `pages`.

use leptos::*;
use leptos_router::{Router, RouterProps};
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::spawn_local;

use crate::ota::start_background_poller;
use crate::platform::capacitor::capacitor_plugin;
use crate::platform::live_update::{current_bundle_id, ready as live_ready};
use crate::router::shell::shell;
use crate::state::AppState;
use crate::util::{short, BUNDLED_VERSION};

/// Top-level Leptos component — mounted from `main.rs`.
pub fn app() -> impl IntoView {
    // 1. Shared state, provided into context so pages don't need props.
    let state = AppState::new();
    state.provide();

    // 2. On mount: populate "Installed" pill + disarm rollback via ready().
    spawn_local(async move {
        match capacitor_plugin("LiveUpdate") {
            Some(live) => {
                match current_bundle_id(&live).await {
                    Ok(id) if !id.is_empty() => state.installed_ver.set(short(&id)),
                    _ => state.installed_ver.set(BUNDLED_VERSION.into()),
                }
                if let Err(e) = live_ready(&live).await {
                    // Not fatal — just log. On very old plugin versions
                    // `ready` may not exist; the rollback safety net is
                    // then effectively opt-out anyway.
                    web_sys::console::warn_1(&JsValue::from_str(&format!(
                        "LiveUpdate.ready() failed ({e:?}); rollback protection may be inactive"
                    )));
                }
            }
            None => state.installed_ver.set(BUNDLED_VERSION.into()),
        }
    });

    // 3. Kick off the 15s background OTA poller.
    start_background_poller(state);

    // 4. Mount the router around the shell. `Router` owns URL state, so
    //    everything below can use `use_location` / `use_navigate`.
    Router(
        RouterProps::builder()
            .children(ToChildren::to_children(move || {
                Fragment::new(vec![shell().into_view()])
            }))
            .build(),
    )
}
