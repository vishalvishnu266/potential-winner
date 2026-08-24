//! Leptos CSR frontend for the OTA demo — written entirely in builder style
//! (no `view!` macro). It exposes two buttons:
//!
//!   * "Check for update" — fetches http://192.168.0.2:8080/version. If the
//!     server version is newer than the locally stored one, it downloads the
//!     new HTML bundle, writes it via the Capacitor Filesystem plugin to
//!     `Data/public/index.html`, updates localStorage, then reloads.
//!
//!   * "Vibrate" — calls the Capacitor Haptics plugin to prove that native
//!     JS APIs are reachable from Leptos/WASM.

use leptos::html::{button, div, h1, p, pre};
use leptos::*;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::{spawn_local, JsFuture};
use web_sys::{Request, RequestInit, RequestMode, Response};

const SERVER: &str = "http://192.168.0.2:8080";
const LOCAL_VERSION_KEY: &str = "ota_version";
const BUNDLED_VERSION: &str = "1"; // baked-in version at build time

// ---------- Capacitor JS bridge ----------
//
// We reach into `window.Capacitor.Plugins.*` through js-sys rather than
// depending on a JS shim, so the WASM binary is fully self-contained.

fn window() -> web_sys::Window {
    web_sys::window().expect("no window")
}

fn capacitor_plugin(name: &str) -> Option<js_sys::Object> {
    let cap = js_sys::Reflect::get(&window(), &JsValue::from_str("Capacitor")).ok()?;
    if cap.is_undefined() || cap.is_null() {
        return None;
    }
    let plugins = js_sys::Reflect::get(&cap, &JsValue::from_str("Plugins")).ok()?;
    let plugin = js_sys::Reflect::get(&plugins, &JsValue::from_str(name)).ok()?;
    plugin.dyn_into::<js_sys::Object>().ok()
}

async fn call_plugin(
    plugin: &js_sys::Object,
    method: &str,
    args: &JsValue,
) -> Result<JsValue, JsValue> {
    let func = js_sys::Reflect::get(plugin, &JsValue::from_str(method))?
        .dyn_into::<js_sys::Function>()?;
    let promise = func.call1(plugin, args)?;
    let promise = promise.dyn_into::<js_sys::Promise>()?;
    JsFuture::from(promise).await
}

// ---------- OTA logic ----------

async fn fetch_text(url: &str) -> Result<String, JsValue> {
    let opts = RequestInit::new();
    opts.set_method("GET");
    opts.set_mode(RequestMode::Cors);
    let req = Request::new_with_str_and_init(url, &opts)?;
    let resp_val = JsFuture::from(window().fetch_with_request(&req)).await?;
    let resp: Response = resp_val.dyn_into()?;
    if !resp.ok() {
        return Err(JsValue::from_str(&format!("HTTP {}", resp.status())));
    }
    let text = JsFuture::from(resp.text()?).await?;
    Ok(text.as_string().unwrap_or_default())
}

fn local_version() -> String {
    window()
        .local_storage()
        .ok()
        .flatten()
        .and_then(|s| s.get_item(LOCAL_VERSION_KEY).ok().flatten())
        .unwrap_or_else(|| BUNDLED_VERSION.to_string())
}

fn set_local_version(v: &str) {
    if let Some(Some(s)) = window().local_storage().ok() {
        let _ = s.set_item(LOCAL_VERSION_KEY, v);
    }
}

/// Write `contents` to `index.html` in the Capacitor Data directory using
/// `Filesystem.writeFile`. Returns the resulting native URI on success.
async fn write_index_html(contents: &str) -> Result<String, JsValue> {
    let fs = capacitor_plugin("Filesystem")
        .ok_or_else(|| JsValue::from_str("Capacitor Filesystem plugin not available"))?;
    let opts = js_sys::Object::new();
    js_sys::Reflect::set(&opts, &"path".into(), &"public/index.html".into())?;
    js_sys::Reflect::set(&opts, &"data".into(), &contents.into())?;
    js_sys::Reflect::set(&opts, &"directory".into(), &"DATA".into())?;
    js_sys::Reflect::set(&opts, &"encoding".into(), &"utf8".into())?;
    js_sys::Reflect::set(&opts, &"recursive".into(), &JsValue::TRUE)?;
    let result = call_plugin(&fs, "writeFile", &opts).await?;
    let uri = js_sys::Reflect::get(&result, &"uri".into())
        .ok()
        .and_then(|v| v.as_string())
        .unwrap_or_default();
    Ok(uri)
}

async fn vibrate() -> Result<(), JsValue> {
    if let Some(haptics) = capacitor_plugin("Haptics") {
        let opts = js_sys::Object::new();
        js_sys::Reflect::set(&opts, &"duration".into(), &JsValue::from_f64(300.0))?;
        call_plugin(&haptics, "vibrate", &opts).await?;
        return Ok(());
    }
    // Browser fallback so it also works in `trunk serve`.
    let nav = window().navigator();
    let vibrate_fn = js_sys::Reflect::get(&nav, &"vibrate".into())?;
    if let Ok(f) = vibrate_fn.dyn_into::<js_sys::Function>() {
        f.call1(&nav, &JsValue::from_f64(300.0))?;
    }
    Ok(())
}

// ---------- UI (builder-style Leptos) ----------

// ---------- UI (builder-style Leptos) ----------

fn app() -> impl IntoView {
    let (status, set_status) = create_signal(String::from("Idle."));
    let (server_ver, set_server_ver) = create_signal(String::from("?"));
    let local_ver = local_version();

    let on_check = move |_| {
        set_status.set("Checking…".into());
        spawn_local(async move {
            match fetch_text(&format!("{SERVER}/version")).await {
                Err(e) => set_status.set(format!("Version check failed: {e:?}")),
                Ok(body) => {
                    // Parse {"version":"N"}
                    let sv = serde_json::from_str::<serde_json::Value>(&body)
                        .ok()
                        .and_then(|v| v.get("version").and_then(|s| s.as_str()).map(String::from))
                        .unwrap_or_else(|| body.trim().to_string());
                    set_server_ver.set(sv.clone());

                    let lv = local_version();
                    if sv == lv {
                        set_status.set(format!("Up to date (v{lv})."));
                        return;
                    }
                    set_status.set(format!("Update available: v{lv} → v{sv}. Downloading…"));

                    let url = format!("{SERVER}/bundle/{sv}/index.html");
                    match fetch_text(&url).await {
                        Err(e) => set_status.set(format!("Download failed: {e:?}")),
                        Ok(html) => match write_index_html(&html).await {
                            Err(e) => set_status.set(format!(
                                "Write failed: {e:?} \n(Are you running inside Capacitor?)"
                            )),
                            Ok(uri) => {
                                set_local_version(&sv);
                                set_status.set(format!(
                                    "Wrote v{sv} to {uri}. Reloading in 1s…"
                                ));
                                let win = window();
                                let cb = Closure::once_into_js(move || {
                                    let _ = window().location().reload();
                                });
                                let _ = win.set_timeout_with_callback_and_timeout_and_arguments_0(
                                    cb.as_ref().unchecked_ref(),
                                    1000,
                                );
                            }
                        },
                    }
                }
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

    // ---- builder syntax: no styles attached anywhere ----
    div()
        .child(h1().child("Leptos + Axum OTA demo"))
        .child(
            p().child("Bundled version: ")
                .child(pre().child(BUNDLED_VERSION))
                .child(" | Installed: ")
                .child(pre().child(local_ver))
                .child(" | Server: ")
                .child(pre().child(move || server_ver.get())),
        )
        .child(
            div()
                .child(
                    button()
                        .on(ev::click, on_check)
                        .child("Check for update"),
                )
                .child(
                    button()
                        .on(ev::click, on_vibrate)
                        .child("Vibrate (native)"),
                ),
        )
        .child(
            pre()
                .child(move || status.get()),
        )
}
fn main() {
    // Surface Rust panics in the browser console during development.
    std::panic::set_hook(Box::new(|info| {
        web_sys::console::error_1(&JsValue::from_str(&format!("{info}")));
    }));
    mount_to_body(app);
}
