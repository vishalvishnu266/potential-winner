//! Leptos CSR frontend for the OTA demo — builder syntax only, no `view!`.
//!
//! OTA flow (Capawesome Live Update):
//!   1. GET  http://192.168.0.2:8080/latest
//!      -> { "version": "<hash>", "url": "…/bundles/<hash>.zip", "artifactType": "zip" }
//!   2. Ask LiveUpdate for the currently-active bundle id.
//!   3. If the server version differs:
//!         LiveUpdate.downloadBundle({ bundleId, url })   ← fetches zip, unpacks
//!         LiveUpdate.setNextBundle({ bundleId })         ← activate on reload
//!         LiveUpdate.reload()                            ← restart WebView now
//!   4. The plugin points the WebView at the new bundle after reload — no
//!      MainActivity swap needed.
//!
//! The vibrate button is unrelated to OTA and left intact for demo purposes.

use leptos::html::{button, div, h1, p, pre};
use leptos::*;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::{spawn_local, JsFuture};

const SERVER: &str = "http://192.168.0.2:8080";
const BUNDLED_VERSION: &str = "bundled"; // baked-in placeholder shown in UI

// ---------- JS interop helpers ----------

fn window() -> web_sys::Window {
    web_sys::window().expect("no window")
}

/// Look up `window.Capacitor.Plugins.<name>` and return the plugin object
/// if it's present. Returns `None` in a plain browser (where Capacitor is
/// obviously not injected).
fn capacitor_plugin(name: &str) -> Option<js_sys::Object> {
    let cap = js_sys::Reflect::get(&window(), &"Capacitor".into()).ok()?;
    let plugins = js_sys::Reflect::get(&cap, &"Plugins".into()).ok()?;
    let plugin = js_sys::Reflect::get(&plugins, &name.into()).ok()?;
    plugin.dyn_into::<js_sys::Object>().ok()
}

/// Call `plugin.method(opts)` and await the returned promise. `opts` may be
/// an empty `Object::new()` when the method takes no arguments.
async fn call_plugin(
    plugin: &js_sys::Object,
    method: &str,
    opts: &js_sys::Object,
) -> Result<JsValue, JsValue> {
    let f = js_sys::Reflect::get(plugin, &method.into())?
        .dyn_into::<js_sys::Function>()?;
    let promise = f.call1(plugin, opts)?;
    let promise: js_sys::Promise = promise.dyn_into()?;
    JsFuture::from(promise).await
}

async fn fetch_text(url: &str) -> Result<String, JsValue> {
    let promise = window().fetch_with_str(url);
    let resp: web_sys::Response = JsFuture::from(promise).await?.dyn_into()?;
    if !resp.ok() {
        return Err(JsValue::from_str(&format!("HTTP {}", resp.status())));
    }
    let text = JsFuture::from(resp.text()?).await?;
    Ok(text.as_string().unwrap_or_default())
}

// ---------- Vibrate (unrelated to OTA) ----------

async fn vibrate() -> Result<(), JsValue> {
    if let Some(haptics) = capacitor_plugin("Haptics") {
        let opts = js_sys::Object::new();
        js_sys::Reflect::set(&opts, &"duration".into(), &JsValue::from_f64(300.0))?;
        call_plugin(&haptics, "vibrate", &opts).await?;
        return Ok(());
    }
    let nav = window().navigator();
    let vibrate_fn = js_sys::Reflect::get(&nav, &"vibrate".into())?;
    if let Ok(f) = vibrate_fn.dyn_into::<js_sys::Function>() {
        f.call1(&nav, &JsValue::from_f64(300.0))?;
    }
    Ok(())
}

// ---------- Live Update (Capawesome) ----------

/// Pull the currently-active bundle id from the plugin. Returns the plugin's
/// reported `bundleId` (or `"default"` / `""` if the app is still running
/// the APK-bundled assets).
async fn current_bundle_id(live: &js_sys::Object) -> Result<String, JsValue> {
    let res = call_plugin(live, "getBundle", &js_sys::Object::new()).await?;
    let id = js_sys::Reflect::get(&res, &"bundleId".into())
        .ok()
        .and_then(|v| v.as_string())
        .unwrap_or_default();
    Ok(id)
}

async fn download_bundle(
    live: &js_sys::Object,
    bundle_id: &str,
    url: &str,
) -> Result<(), JsValue> {
    let opts = js_sys::Object::new();
    js_sys::Reflect::set(&opts, &"bundleId".into(), &bundle_id.into())?;
    js_sys::Reflect::set(&opts, &"url".into(), &url.into())?;
    js_sys::Reflect::set(&opts, &"artifactType".into(), &"zip".into())?;
    call_plugin(live, "downloadBundle", &opts).await?;
    Ok(())
}

async fn set_next_bundle(live: &js_sys::Object, bundle_id: &str) -> Result<(), JsValue> {
    let opts = js_sys::Object::new();
    js_sys::Reflect::set(&opts, &"bundleId".into(), &bundle_id.into())?;
    call_plugin(live, "setNextBundle", &opts).await?;
    Ok(())
}

async fn reload_app(live: &js_sys::Object) -> Result<(), JsValue> {
    // `reload` takes no options.
    let _ = call_plugin(live, "reload", &js_sys::Object::new()).await?;
    Ok(())
}

// ---------- UI ----------

fn app() -> impl IntoView {
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
            // 1. Ask the OTA server what the latest version is.
            let body = match fetch_text(&format!("{SERVER}/latest")).await {
                Err(e) => {
                    set_status.set(format!("Version check failed: {e:?}"));
                    return;
                }
                Ok(b) => b,
            };
            let parsed: serde_json::Value = match serde_json::from_str(&body) {
                Err(e) => {
                    set_status.set(format!("Bad /latest JSON: {e}"));
                    return;
                }
                Ok(v) => v,
            };
            let sv = parsed
                .get("version")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let url = parsed
                .get("url")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
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
fn short(s: &str) -> String {
    if s.len() > 10 {
        format!("{}…", &s[..10])
    } else {
        s.to_string()
    }
}

fn main() {
    std::panic::set_hook(Box::new(|info| {
        web_sys::console::error_1(&JsValue::from_str(&format!("{info}")));
    }));
    mount_to_body(app);
}
