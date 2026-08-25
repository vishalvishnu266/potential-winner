//! Leptos UI (builder syntax — no `view!` macro).
//!
//! Composes the small OTA / demo widgets and wires their button handlers
//! to the platform helpers in the sibling modules (`http`,
//! `live_update`, `haptics`).

use leptos::html::{button, div, h1, p, pre};
use leptos::*;
use ota_common::{routes, HelloReq, HelloResp, Latest};
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::spawn_local;

use crate::capacitor::{capacitor_plugin, window};
use crate::haptics::vibrate;
use crate::http::{fetch_text, post_json};
use crate::live_update::{current_bundle_id, download_bundle, reload_app, set_next_bundle};

/// Base URL of the OTA server. Adjust for your LAN or point at localhost
/// when testing in a browser.
const SERVER: &str = "http://192.168.0.2:8080";

/// Placeholder shown in the "Installed" pill before the first OTA is
/// applied (i.e. while the WebView is still serving APK-bundled assets).
const BUNDLED_VERSION: &str = "bundled";

/// Top-level Leptos component — mounted from `main.rs`.
pub fn app() -> impl IntoView {
    let (status, set_status) = create_signal(String::from("Idle."));
    let (server_ver, set_server_ver) = create_signal(String::from("?"));
    let (installed_ver, set_installed_ver) = create_signal(String::from("(checking…)"));

    // Populate "Installed" pill from the plugin on mount (falls back to
    // BUNDLED_VERSION when the plugin isn't there, i.e. in a plain browser).
    spawn_local(async move {
        match capacitor_plugin("LiveUpdate") {
            Some(live) => match current_bundle_id(&live).await {
                Ok(id) if !id.is_empty() => set_installed_ver.set(short(&id)),
                _ => set_installed_ver.set(BUNDLED_VERSION.into()),
            },
            None => set_installed_ver.set(BUNDLED_VERSION.into()),
        }
    });

    let on_check = move |_| {
        set_status.set("Checking…".into());
        spawn_local(async move {
            // 1. Ask the OTA server what the latest version is. The route
            //    path and the response type both come from `ota-common`,
            //    so any wire-shape change on the server fails to compile
            //    here as well.
            let body = match fetch_text(&format!("{SERVER}{}", routes::LATEST)).await {
                Err(e) => {
                    set_status.set(format!("Version check failed: {e:?}"));
                    return;
                }
                Ok(b) => b,
            };
            let parsed: Latest = match serde_json::from_str(&body) {
                Err(e) => {
                    set_status.set(format!("Bad /latest JSON: {e}"));
                    return;
                }
                Ok(v) => v,
            };
            let sv = parsed.version;
            let url = parsed.url;
            if sv.is_empty() || url.is_empty() {
                set_status.set("Malformed /latest response".into());
                return;
            }
            set_server_ver.set(sv.clone());

            // 2. Compare against the currently-active bundle.
            let live = match capacitor_plugin("LiveUpdate") {
                Some(l) => l,
                None => {
                    set_status.set(
                        "LiveUpdate plugin unavailable — are you running inside Capacitor?"
                            .into(),
                    );
                    return;
                }
            };
            let current = current_bundle_id(&live).await.unwrap_or_default();
            if current == sv {
                set_status.set(format!("Up to date (v {})", short(&sv)));
                return;
            }

            // 3. Download → activate → reload.
            set_status.set(format!(
                "Update available: {} → {}\nDownloading bundle…",
                short(&current),
                short(&sv),
            ));
            if let Err(e) = download_bundle(&live, &sv, &url).await {
                set_status.set(format!("Download failed: {e:?}"));
                return;
            }

            set_status.set(format!("Activating v {}…", short(&sv)));
            if let Err(e) = set_next_bundle(&live, &sv).await {
                set_status.set(format!("Activate failed: {e:?}"));
                return;
            }

            set_status.set("Reloading into new bundle…".into());
            if let Err(e) = reload_app(&live).await {
                // If reload() isn't available on this plugin version, fall
                // back to a plain window.location.reload().
                web_sys::console::warn_1(&JsValue::from_str(&format!(
                    "LiveUpdate.reload failed ({e:?}), using window.location.reload()"
                )));
                let _ = window().location().reload();
            }
        });
    };

    let on_vibrate = move |_| {
        spawn_local(async move {
            if let Err(e) = vibrate().await {
                set_status.set(format!("Vibrate failed: {e:?}"));
            } else {
                set_status.set("Vibrated 📳".into());
            }
        });
    };

    // Demo of a typed POST round-trip. Both `HelloReq` and `HelloResp`
    // come from `ota-common`, so the compiler enforces that we send and
    // parse the exact shapes the Axum handler expects.
    let on_hello = move |_| {
        set_status.set("POSTing /hello…".into());
        spawn_local(async move {
            let req = HelloReq { name: "Leptos".into() };
            let url = format!("{SERVER}{}", routes::HELLO);
            match post_json::<HelloReq, HelloResp>(&url, &req).await {
                Ok(resp) => set_status.set(format!("Server said: {}", resp.message)),
                Err(e) => set_status.set(format!("POST /hello failed: {e:?}")),
            }
        });
    };

    div()
        .attr("style", "font-family:system-ui;padding:24px;max-width:640px;margin:auto")
        .child(h1().child("Leptos + Axum OTA demo"))
        .child(
            p().child("Bundled: ")
                .child(pre().attr("style", "display:inline").child(BUNDLED_VERSION))
                .child(" | Installed: ")
                .child(pre().attr("style", "display:inline").child(move || installed_ver.get()))
                .child(" | Server: ")
                .child(pre().attr("style", "display:inline").child(move || short(&server_ver.get()))),
        )
        .child(
            div()
                .attr("style", "display:flex;gap:8px;margin:16px 0")
                .child(
                    button()
                        .attr("style", "padding:12px 16px;font-size:16px")
                        .on(ev::click, on_check)
                        .child("Check for update"),
                )
                .child(
                    button()
                        .attr("style", "padding:12px 16px;font-size:16px")
                        .on(ev::click, on_vibrate)
                        .child("Vibrate (native)"),
                )
                .child(
                    button()
                        .attr("style", "padding:12px 16px;font-size:16px")
                        .on(ev::click, on_hello)
                        .child("Say hello (POST)"),
                ),
        )
        .child(
            pre()
                .attr(
                    "style",
                    "background:#111;color:#0f0;padding:12px;border-radius:8px;\
                     white-space:pre-wrap;word-break:break-all;min-height:120px",
                )
                .child(move || status.get()),
        )
}

/// Trim a hash-looking string to a short display form.
pub fn short(s: &str) -> String {
    if s.len() > 10 {
        format!("{}…", &s[..10])
    } else {
        s.to_string()
    }
}
