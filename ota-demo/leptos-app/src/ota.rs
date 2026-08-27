//! Pure OTA update flow — no Leptos, no view code.
//!
//! Everything that talks to the OTA server or the Capawesome `LiveUpdate`
//! plugin lives here, behind a tiny state-machine-ish surface. The UI
//! (`pages::settings`) invokes `check_and_apply` / `do_rollback` and
//! reacts to the streamed [`OtaEvent`]s via a caller-supplied callback.
//!
//! Keeping this module Leptos-free means:
//!   * Signals can never leak into the OTA layer (easier to test, easier
//!     to swap the UI framework later).
//!   * The Settings page is now just a thin view that maps events →
//!     status strings + pill values.

use wasm_bindgen::prelude::*;

use ota_common::{routes, Latest};

use crate::capacitor::{capacitor_plugin, window};
use crate::http::fetch_text;
use crate::live_update::{
    current_bundle_id, download_bundle, reload_app, rollback as live_rollback, set_next_bundle,
};
use crate::util::{short, BUNDLED_VERSION, SERVER};

/// Events emitted while an OTA operation is in progress. The UI turns
/// these into a status line + updates the "Installed"/"Server" pills.
#[derive(Debug, Clone)]
pub enum OtaEvent {
    /// About to hit `/latest`.
    Checking,
    /// `/latest` returned this server version (raw, not shortened).
    ServerVersion(String),
    /// Currently-installed bundle matches the server → nothing to do.
    UpToDate { version: String },
    /// New version available; download about to start.
    Downloading { from: String, to: String },
    /// Download finished, `setNextBundle` is being applied.
    Activating { version: String },
    /// New bundle activated; about to reload the WebView. The UI can
    /// update the "Installed" pill to this value optimistically —
    /// `ready()` on the next boot will confirm it.
    Installed { version: String },
    /// Reload has been requested (or fallback `location.reload()` used).
    Reloading,
    /// Rollback started.
    RollingBack,
    /// Rollback complete; app will reload.
    RolledBack,
    /// Any terminal error, already formatted for display.
    Error(String),
}

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
        // time `ready()` call (see `ui::app`) will then confirm the boot
        // and prevent the plugin from rolling back on next launch.
        web_sys::console::warn_1(&JsValue::from_str(&format!(
            "LiveUpdate.reload failed ({e:?}), using window.location.reload()"
        )));
        let _ = window().location().reload();
    }
    Ok(())
}

/// Manually roll back to the previously-active bundle. Same event
/// contract as [`check_and_apply`] — the UI just observes.
pub async fn do_rollback<F>(on_event: F) -> Result<(), ()>
where
    F: Fn(OtaEvent),
{
    on_event(OtaEvent::RollingBack);
    let live = match capacitor_plugin("LiveUpdate") {
        Some(l) => l,
        None => {
            on_event(OtaEvent::Error("LiveUpdate plugin unavailable".into()));
            return Err(());
        }
    };
    if let Err(e) = live_rollback(&live).await {
        on_event(OtaEvent::Error(format!("Rollback failed: {e:?}")));
        return Err(());
    }
    on_event(OtaEvent::RolledBack);
    let _ = reload_app(&live).await;
    Ok(())
}

/// Convert an [`OtaEvent`] into a human-readable status line for the
/// Settings page. Kept in this module (rather than in the view) so the
/// wording lives next to the event definitions.
pub fn event_status_line(ev: &OtaEvent) -> String {
    match ev {
        OtaEvent::Checking => "Checking…".into(),
        OtaEvent::ServerVersion(v) => format!("Server has v {}", short(v)),
        OtaEvent::UpToDate { version } => format!("Up to date (v {version})"),
        OtaEvent::Downloading { from, to } => {
            format!("Update available: {from} → {to}\nDownloading bundle…")
        }
        OtaEvent::Activating { version } => format!("Activating v {version}…"),
        OtaEvent::Installed { version } => format!("Installed v {version}"),
        OtaEvent::Reloading => "Reloading into new bundle…".into(),
        OtaEvent::RollingBack => "Rolling back…".into(),
        OtaEvent::RolledBack => "Rolled back. Reloading…".into(),
        OtaEvent::Error(msg) => msg.clone(),
    }
}

/// The pill value to show for "Installed" after a rollback completes.
pub fn bundled_placeholder() -> &'static str {
    BUNDLED_VERSION
}
