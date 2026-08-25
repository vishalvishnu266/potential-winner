//! OTA update orchestration. Delegates all native work to the Capawesome
//! `LiveUpdate` plugin; this module just sequences the calls and reports
//! progress via the caller-supplied status setter.

pub mod live_update;
pub mod types;

use leptos::WriteSignal;
use wasm_bindgen::JsValue;

use crate::config::{short, SERVER};
use crate::platform::{capacitor, fetch::fetch_text};

/// Full "check → download → activate → reload" flow. Any failure updates
/// the status signal and returns early; successful updates end with a
/// call to `LiveUpdate.reload()` which restarts the WebView, so this
/// function typically never returns on the happy path.
pub async fn run_update(set_status: WriteSignal<String>, set_server_ver: WriteSignal<String>) {
    set_status.set("Checking…".into());

    // 1. Fetch latest.json.
    let body = match fetch_text(&format!("{SERVER}/latest")).await {
        Ok(b) => b,
        Err(e) => {
            set_status.set(format!("Version check failed: {e:?}"));
            return;
        }
    };
    let latest: types::LatestResp = match serde_json::from_str(&body) {
        Ok(v) => v,
        Err(e) => {
            set_status.set(format!("Bad /latest JSON: {e}"));
            return;
        }
    };
    if latest.version.is_empty() || latest.url.is_empty() {
        set_status.set("Malformed /latest response".into());
        return;
    }
    set_server_ver.set(latest.version.clone());

    // 2. Compare with the currently-active bundle.
    let live = match capacitor::plugin("LiveUpdate") {
        Some(l) => l,
        None => {
            set_status
                .set("LiveUpdate plugin unavailable — are you running inside Capacitor?".into());
            return;
        }
    };
    let current = live_update::current_bundle_id(&live)
        .await
        .unwrap_or_default();
    if current == latest.version {
        set_status.set(format!("Up to date (v {})", short(&latest.version)));
        return;
    }

    // 3. Download → activate → reload.
    set_status.set(format!(
        "Update available: {} → {}\nDownloading bundle…",
        short(&current),
        short(&latest.version),
    ));
    if let Err(e) = live_update::download_bundle(&live, &latest.version, &latest.url).await {
        set_status.set(format!("Download failed: {e:?}"));
        return;
    }

    set_status.set(format!("Activating v {}…", short(&latest.version)));
    if let Err(e) = live_update::set_next_bundle(&live, &latest.version).await {
        set_status.set(format!("Activate failed: {e:?}"));
        return;
    }

    set_status.set("Reloading into new bundle…".into());
    if let Err(e) = live_update::reload(&live).await {
        // If reload() isn't available (older plugin build), fall back to a
        // plain window.location.reload().
        web_sys::console::warn_1(&JsValue::from_str(&format!(
            "LiveUpdate.reload failed ({e:?}), using window.location.reload()"
        )));
        let _ = crate::platform::window::window().location().reload();
    }
}
