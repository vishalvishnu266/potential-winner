//! Leptos CSR frontend for the OTA demo — builder syntax only, no `view!`.
//!
//! OTA flow (multi-file):
//!   1. GET  http://192.168.0.2:8080/version   → {"version":"<hash>"}
//!   2. If different from what we stored, GET /manifest
//!      → {"version":"…","files":[{"path":"index.html","sha256":"…","size":…}, …]}
//!   3. For every file: GET /files/<path>, then
//!      Capacitor Filesystem.writeFile({ directory:'DATA', path:'public/<path>', … })
//!      (binary files are base64-encoded; text files use utf8).
//!   4. Store new version in localStorage and window.location.reload().
//!   5. Next launch, MainActivity swaps the WebView root to the OTA dir.

use leptos::html::{button, div, h1, p, pre};
use leptos::*;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::{spawn_local, JsFuture};
use web_sys::{Request, RequestInit, RequestMode, Response};

const SERVER: &str = "http://192.168.0.2:8080";
const LOCAL_VERSION_KEY: &str = "ota_version";
const BUNDLED_VERSION: &str = "bundled"; // baked-in placeholder

// ---------- Capacitor JS bridge helpers ----------

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

// ---------- HTTP helpers ----------

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

async fn fetch_bytes(url: &str) -> Result<Vec<u8>, JsValue> {
    let opts = RequestInit::new();
    opts.set_method("GET");
    opts.set_mode(RequestMode::Cors);
    let req = Request::new_with_str_and_init(url, &opts)?;
    let resp_val = JsFuture::from(window().fetch_with_request(&req)).await?;
    let resp: Response = resp_val.dyn_into()?;
    if !resp.ok() {
        return Err(JsValue::from_str(&format!("HTTP {}", resp.status())));
    }
    let buf = JsFuture::from(resp.array_buffer()?).await?;
    let u8 = js_sys::Uint8Array::new(&buf);
    Ok(u8.to_vec())
}

// ---------- version storage ----------

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

// ---------- OTA write ----------

fn is_text_path(p: &str) -> bool {
    let p = p.to_ascii_lowercase();
    p.ends_with(".html")
        || p.ends_with(".htm")
        || p.ends_with(".js")
        || p.ends_with(".mjs")
        || p.ends_with(".css")
        || p.ends_with(".json")
        || p.ends_with(".svg")
        || p.ends_with(".txt")
        || p.ends_with(".map")
}

/// Pure-Rust base64 encoder (standard alphabet, with `=` padding).
///
/// We intentionally avoid the previous `js_sys::eval(format!("btoa({:?})", …))`
/// approach: `{:?}` on a Rust `String` emits octal escapes like `"\001"` for
/// control bytes, and JavaScript strict mode (which WASM-hosted `eval` runs
/// under) rejects octal escape sequences with:
///     "Octal escape sequences are not allowed in strict mode."
/// That blew up "Check for update" as soon as the first binary (WASM) file
/// was downloaded. Encoding in Rust sidesteps `eval` entirely.
fn base64_encode(bytes: &[u8]) -> Result<String, JsValue> {
    const ALPHABET: &[u8; 64] =
        b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    let mut out = String::with_capacity((bytes.len() + 2) / 3 * 4);
    let mut chunks = bytes.chunks_exact(3);
    for c in &mut chunks {
        let n = ((c[0] as u32) << 16) | ((c[1] as u32) << 8) | (c[2] as u32);
        out.push(ALPHABET[((n >> 18) & 0x3f) as usize] as char);
        out.push(ALPHABET[((n >> 12) & 0x3f) as usize] as char);
        out.push(ALPHABET[((n >> 6) & 0x3f) as usize] as char);
        out.push(ALPHABET[(n & 0x3f) as usize] as char);
    }
    let rem = chunks.remainder();
    match rem.len() {
        1 => {
            let n = (rem[0] as u32) << 16;
            out.push(ALPHABET[((n >> 18) & 0x3f) as usize] as char);
            out.push(ALPHABET[((n >> 12) & 0x3f) as usize] as char);
            out.push('=');
            out.push('=');
        }
        2 => {
            let n = ((rem[0] as u32) << 16) | ((rem[1] as u32) << 8);
            out.push(ALPHABET[((n >> 18) & 0x3f) as usize] as char);
            out.push(ALPHABET[((n >> 12) & 0x3f) as usize] as char);
            out.push(ALPHABET[((n >> 6) & 0x3f) as usize] as char);
            out.push('=');
        }
        _ => {}
    }
    Ok(out)
}

/// Write a single OTA file to `Data/public/<rel>`.
async fn write_ota_file(
    fs: &js_sys::Object,
    rel: &str,
    bytes: &[u8],
) -> Result<(), JsValue> {
    let opts = js_sys::Object::new();
    js_sys::Reflect::set(&opts, &"path".into(), &format!("public/{rel}").into())?;
    js_sys::Reflect::set(&opts, &"directory".into(), &"DATA".into())?;
    js_sys::Reflect::set(&opts, &"recursive".into(), &JsValue::TRUE)?;

    if is_text_path(rel) {
        let s = std::str::from_utf8(bytes)
            .map_err(|_| JsValue::from_str("non-utf8 in text file"))?;
        js_sys::Reflect::set(&opts, &"data".into(), &s.into())?;
        js_sys::Reflect::set(&opts, &"encoding".into(), &"utf8".into())?;
    } else {
        let b64 = base64_encode(bytes)?;
        js_sys::Reflect::set(&opts, &"data".into(), &b64.into())?;
    }
    call_plugin(fs, "writeFile", &opts).await?;
    Ok(())
}

/// Wipe any previous OTA files so old hashed assets don't linger.
async fn wipe_ota_dir(fs: &js_sys::Object) -> Result<(), JsValue> {
    let opts = js_sys::Object::new();
    js_sys::Reflect::set(&opts, &"path".into(), &"public".into())?;
    js_sys::Reflect::set(&opts, &"directory".into(), &"DATA".into())?;
    js_sys::Reflect::set(&opts, &"recursive".into(), &JsValue::TRUE)?;
    let _ = call_plugin(fs, "rmdir", &opts).await;
    Ok(())
}

// ---------- Vibrate ----------

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

// ---------- UI ----------

fn app() -> impl IntoView {
    let (status, set_status) = create_signal(String::from("Idle."));
    let (server_ver, set_server_ver) = create_signal(String::from("?"));
    let local_ver = local_version();

    let on_check = move |_| {
        set_status.set("Checking…".into());
        spawn_local(async move {
            let sv = match fetch_text(&format!("{SERVER}/version")).await {
                Err(e) => {
                    set_status.set(format!("Version check failed: {e:?}"));
                    return;
                }
                Ok(body) => serde_json::from_str::<serde_json::Value>(&body)
                    .ok()
                    .and_then(|v| v.get("version").and_then(|s| s.as_str()).map(String::from))
                    .unwrap_or_else(|| body.trim().to_string()),
            };
            set_server_ver.set(sv.clone());

            let lv = local_version();
            if sv == lv {
                set_status.set(format!("Up to date (v {}…)", &sv[..sv.len().min(8)]));
                return;
            }
            set_status.set(format!(
                "Update available: {}… → {}…\nFetching manifest…",
                &lv[..lv.len().min(8)],
                &sv[..sv.len().min(8)]
            ));

            let manifest_txt = match fetch_text(&format!("{SERVER}/manifest")).await {
                Err(e) => {
                    set_status.set(format!("Manifest failed: {e:?}"));
                    return;
                }
                Ok(t) => t,
            };
            let manifest: serde_json::Value = match serde_json::from_str(&manifest_txt) {
                Err(e) => {
                    set_status.set(format!("Bad manifest JSON: {e}"));
                    return;
                }
                Ok(v) => v,
            };
            let files = match manifest.get("files").and_then(|v| v.as_array()) {
                Some(a) => a.clone(),
                None => {
                    set_status.set("Manifest missing 'files'".into());
                    return;
                }
            };

            let fs = match capacitor_plugin("Filesystem") {
                Some(fs) => fs,
                None => {
                    set_status.set(
                        "Filesystem plugin unavailable — are you running inside Capacitor?"
                            .into(),
                    );
                    return;
                }
            };

            let _ = wipe_ota_dir(&fs).await;

            let total = files.len();
            for (i, entry) in files.iter().enumerate() {
                let path = entry.get("path").and_then(|v| v.as_str()).unwrap_or("");
                if path.is_empty() {
                    continue;
                }
                set_status.set(format!("[{}/{}] {}", i + 1, total, path));

                let bytes = match fetch_bytes(&format!("{SERVER}/files/{path}")).await {
                    Err(e) => {
                        set_status.set(format!("Download {path} failed: {e:?}"));
                        return;
                    }
                    Ok(b) => b,
                };

                if let Err(e) = write_ota_file(&fs, path, &bytes).await {
                    set_status.set(format!("Write {path} failed: {e:?}"));
                    return;
                }
            }

            set_local_version(&sv);
            set_status.set(format!(
                "Applied {} files (v {}…). Reloading in 1s…",
                total,
                &sv[..sv.len().min(8)]
            ));
            let win = window();
            let cb = Closure::once_into_js(move || {
                let _ = window().location().reload();
            });
            let _ = win.set_timeout_with_callback_and_timeout_and_arguments_0(
                cb.as_ref().unchecked_ref(),
                1000,
            );
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

    let short = |s: String| {
        if s.len() > 10 { format!("{}…", &s[..10]) } else { s }
    };

    div()
        .attr("style", "font-family:system-ui;padding:24px;max-width:640px;margin:auto")
        .child(h1().child("Leptos + Axum OTA demo"))
        .child(
            p().child("Bundled: ")
                .child(pre().attr("style", "display:inline").child(BUNDLED_VERSION))
                .child(" | Installed: ")
                .child(pre().attr("style", "display:inline").child(short(local_ver)))
                .child(" | Server: ")
                .child(pre().attr("style", "display:inline").child(move || short(server_ver.get()))),
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

fn main() {
    std::panic::set_hook(Box::new(|info| {
        web_sys::console::error_1(&JsValue::from_str(&format!("{info}")));
    }));
    mount_to_body(app);
}