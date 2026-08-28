//! Pure OTA state machine — no Leptos, no view code.
//!
//! Talks to the OTA server (`/latest`) and the Capawesome `LiveUpdate`
//! plugin. Progress is streamed via caller-supplied [`OtaEvent`] callback.

use wasm_bindgen::prelude::*;

use ota_common::{routes, Latest};

use crate::ota::events::OtaEvent;
use crate::platform::capacitor::{capacitor_plugin, window};
use crate::platform::http::fetch_text;
use crate::platform::live_update::{
    current_bundle_id, download_bundle, reload_app, set_next_bundle,
};
use crate::util::{short, SERVER};

/// Run the full "check → download → activate → reload" flow. Events are
/// streamed to `on_event` as they happen so the UI can update in real time.
///
/// Returns `Ok(())` on success (including the "already up to date" case);
/// on failure the error is already reported via [`OtaEvent::Error`] and
/// `Err(())` is returned so callers can bail without double-reporting.
pub async fn check_and_apply<F>(on_event: F) -> Result<(), ()>
where
    F: Fn(OtaEvent),
{
    on_event(OtaEvent::Checking);

    // 1. Ask the OTA server what the latest version is.
    let body = match fetch_text(&format!("{SERVER}{}", routes::LATEST)).await {
        Ok(b) => b,
        Err(e) => {
            on_event(OtaEvent::Error(format!("Version check failed: {e:?}")));
            return Err(());
        }
    };
    let parsed: Latest = match serde_json::from_str(&body) {
        Ok(v) => v,
        Err(e) => {
            on_event(OtaEvent::Error(format!("Bad /latest JSON: {e}")));
            return Err(());
        }
    };
    let sv = parsed.version;
    let url = parsed.url;
    if sv.is_empty() || url.is_empty() {
        on_event(OtaEvent::Error("Malformed /latest response".into()));
        return Err(());
    }
    on_event(OtaEvent::ServerVersion(sv.clone()));

    // 2. Compare against the currently-active bundle.
    let live = match capacitor_plugin("LiveUpdate") {
        Some(l) => l,
        None => {
            on_event(OtaEvent::Error(
                "LiveUpdate plugin unavailable — are you running inside Capacitor?".into(),
            ));
            return Err(());
        }
    };
    let current = current_bundle_id(&live).await.unwrap_or_default();
    if current == sv {
        on_event(OtaEvent::UpToDate {
            version: short(&sv),
        });
        return Ok(());
    }

    // 3. Download → activate → reload.
    on_event(OtaEvent::Downloading {
        from: short(&current),
        to: short(&sv),
    });
    if let Err(e) = download_bundle(&live, &sv, &url).await {
        on_event(OtaEvent::Error(format!("Download failed: {e:?}")));
        return Err(());
    }

    on_event(OtaEvent::Activating {
        version: short(&sv),
    });
    if let Err(e) = set_next_bundle(&live, &sv).await {
        on_event(OtaEvent::Error(format!("Activate failed: {e:?}")));
        return Err(());
    }
    on_event(OtaEvent::Installed {
        version: short(&sv),
    });

    on_event(OtaEvent::Reloading);
    if let Err(e) = reload_app(&live).await {
        // If reload() isn't available on this plugin version, fall back
        // to a plain window.location.reload(). The new bundle's mount-
        // time `ready()` call (see `app::app`) will then confirm the boot
        // and prevent the plugin from rolling back on next launch.
        web_sys::console::warn_1(&JsValue::from_str(&format!(
            "LiveUpdate.reload failed ({e:?}), using window.location.reload()"
        )));
        let _ = window().location().reload();
    }
    Ok(())
}
