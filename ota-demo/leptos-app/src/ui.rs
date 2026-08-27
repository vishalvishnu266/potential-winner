//! Leptos UI (builder syntax — no `view!` macro).
//!
//! Renders a small mobile-shaped shell with two tabs:
//!
//!   * **Home**     — empty landing card (placeholder for real product UI).
//!   * **Settings** — a Profile card that hosts the OTA "Check for update"
//!                    action (plus a manual rollback), version pills, and
//!                    a couple of smoke-test buttons.
//!
//! Styling uses Tailwind (loaded via CDN in `index.html`). Everything is
//! composed with Leptos' HTML *builder* API — no `view!` macro anywhere.
//!
//! ## Rollback fix
//!
//! Capawesome's `LiveUpdate` plugin implements a "confirm the new bundle
//! actually booted" safety net: after `setNextBundle` + `reload`, if the
//! app doesn't call `LiveUpdate.ready()` within a short window, the plugin
//! assumes the new bundle is broken and rolls back to the previous one on
//! the next launch. We call `ready()` from the mount-time `spawn_local`
//! block below, so a healthy WASM boot = no more spurious rollbacks.

use leptos::html::{button, div, h1, h2, p, span};
use leptos::*;
use ota_common::{routes, HelloReq, HelloResp, Latest};
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::spawn_local;

use crate::capacitor::{capacitor_plugin, window};
use crate::haptics::vibrate;
use crate::http::{fetch_text, post_json};
use crate::live_update::{
    current_bundle_id, download_bundle, ready as live_ready, reload_app, rollback as live_rollback,
    set_next_bundle,
};

/// Base URL of the OTA server. Adjust for your LAN or point at localhost
/// when testing in a browser.
const SERVER: &str = "http://192.168.0.5:8080";

/// Placeholder shown in the "Installed" pill before the first OTA is
/// applied (i.e. while the WebView is still serving APK-bundled assets).
const BUNDLED_VERSION: &str = "bundled";

/// Which tab is currently visible in the bottom nav.
#[derive(Clone, Copy, PartialEq, Eq)]
enum Tab {
    Home,
    Settings,
}

/// Top-level Leptos component — mounted from `main.rs`.
pub fn app() -> impl IntoView {
    let (tab, set_tab) = create_signal(Tab::Home);
    let (status, set_status) = create_signal(String::from("Idle."));
    let (server_ver, set_server_ver) = create_signal(String::from("?"));
    let (installed_ver, set_installed_ver) = create_signal(String::from("(checking…)"));

    // On mount:
    //   1. Populate the "Installed" pill from the plugin (falls back to
    //      BUNDLED_VERSION when the plugin isn't present, e.g. plain browser).
    //   2. Call `LiveUpdate.ready()` — this is the *rollback fix*. Without
    //      it the plugin would assume the fresh bundle failed to boot and
    //      revert on next launch. See `live_update::ready` for the full
    //      explanation.
    spawn_local(async move {
        match capacitor_plugin("LiveUpdate") {
            Some(live) => {
                match current_bundle_id(&live).await {
                    Ok(id) if !id.is_empty() => set_installed_ver.set(short(&id)),
                    _ => set_installed_ver.set(BUNDLED_VERSION.into()),
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
            None => set_installed_ver.set(BUNDLED_VERSION.into()),
        }
    });

    // ---- Shared handlers (used by the Settings page) ----------------

    let on_check = move |_| {
        set_status.set("Checking…".into());
        spawn_local(async move {
            // 1. Ask the OTA server what the latest version is.
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
                // back to a plain window.location.reload(). The new bundle's
                // mount-time `ready()` call will then confirm the boot and
                // prevent the plugin from rolling back on next launch.
                web_sys::console::warn_1(&JsValue::from_str(&format!(
                    "LiveUpdate.reload failed ({e:?}), using window.location.reload()"
                )));
                let _ = window().location().reload();
            }
        });
    };

    let on_rollback = move |_| {
        set_status.set("Rolling back…".into());
        spawn_local(async move {
            let live = match capacitor_plugin("LiveUpdate") {
                Some(l) => l,
                None => {
                    set_status.set("LiveUpdate plugin unavailable".into());
                    return;
                }
            };
            if let Err(e) = live_rollback(&live).await {
                set_status.set(format!("Rollback failed: {e:?}"));
                return;
            }
            set_status.set("Rolled back. Reloading…".into());
            let _ = reload_app(&live).await;
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

    // ---- Layout: phone-shaped shell with header, body, bottom nav -----

    div()
        .attr(
            "class",
            "min-h-screen w-full flex flex-col bg-slate-50 text-slate-900",
        )
        .child(header_bar(tab))
        .child(
            // Scrollable content area. pb-24 keeps the last card above the
            // fixed bottom nav; safe-bottom respects the phone gesture bar.
            div()
                .attr("class", "flex-1 overflow-y-auto px-4 pt-4 pb-24")
                .child(move || match tab.get() {
                    Tab::Home => home_page().into_view(),
                    Tab::Settings => settings_page(
                        installed_ver,
                        server_ver,
                        status,
                        on_check.clone(),
                        on_rollback.clone(),
                        on_vibrate.clone(),
                        on_hello.clone(),
                    )
                    .into_view(),
                }),
        )
        .child(bottom_nav(tab, set_tab))
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

fn header_bar(tab: ReadSignal<Tab>) -> impl IntoView {
    div()
        .attr(
            "class",
            "safe-top sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200",
        )
        .child(
            div()
                .attr("class", "px-4 py-3 flex items-center justify-between")
                .child(
                    h1()
                        .attr("class", "text-lg font-semibold tracking-tight")
                        .child(move || match tab.get() {
                            Tab::Home => "Home",
                            Tab::Settings => "Settings",
                        }),
                )
                .child(
                    span()
                        .attr(
                            "class",
                            "text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full",
                        )
                        .child("OTA Demo"),
                ),
        )
}

// ---------------------------------------------------------------------------
// Home page — intentionally empty scaffolding.
// ---------------------------------------------------------------------------

fn home_page() -> impl IntoView {
    div()
        .attr("class", "flex flex-col gap-4")
        .child(
            div()
                .attr(
                    "class",
                    "rounded-2xl bg-white shadow-sm border border-slate-200 p-5",
                )
                .child(
                    h2()
                        .attr("class", "text-base font-semibold text-slate-900")
                        .child("Welcome 👋"),
                )
                .child(
                    p().attr("class", "mt-1 text-sm text-slate-600").child(
                        "This is your Home page!!!. Add your app content here.",
                    ),
                ),
        )
        .child(
            div()
                .attr(
                    "class",
                    "rounded-2xl bg-white shadow-sm border border-slate-200 p-5 \
                     text-sm text-slate-500 flex items-center justify-center h-40",
                )
                .child("Empty — build your feed / dashboard here."),
        )
}

// ---------------------------------------------------------------------------
// Settings page — includes the Profile card with the OTA update controls.
// ---------------------------------------------------------------------------

fn settings_page<FCheck, FRoll, FVib, FHello>(
    installed_ver: ReadSignal<String>,
    server_ver: ReadSignal<String>,
    status: ReadSignal<String>,
    on_check: FCheck,
    on_rollback: FRoll,
    on_vibrate: FVib,
    on_hello: FHello,
) -> impl IntoView
where
    FCheck: Fn(ev::MouseEvent) + 'static + Clone,
    FRoll: Fn(ev::MouseEvent) + 'static + Clone,
    FVib: Fn(ev::MouseEvent) + 'static + Clone,
    FHello: Fn(ev::MouseEvent) + 'static + Clone,
{
    div()
        .attr("class", "flex flex-col gap-4")
        // ---- Profile card ---------------------------------------------
        .child(
            div()
                .attr(
                    "class",
                    "rounded-2xl bg-white shadow-sm border border-slate-200 p-5",
                )
                // Avatar + name row
                .child(
                    div()
                        .attr("class", "flex items-center gap-4")
                        .child(
                            div()
                                .attr(
                                    "class",
                                    "h-14 w-14 rounded-full bg-gradient-to-br \
                                     from-indigo-500 to-fuchsia-500 text-white \
                                     flex items-center justify-center text-xl font-semibold",
                                )
                                .child("U"),
                        )
                        .child(
                            div()
                                .attr("class", "flex flex-col")
                                .child(
                                    span()
                                        .attr("class", "text-base font-semibold text-slate-900")
                                        .child("Your Profile"),
                                )
                                .child(
                                    span()
                                        .attr("class", "text-xs text-slate-500")
                                        .child("Signed in locally"),
                                ),
                        ),
                )
                // Divider
                .child(div().attr("class", "my-4 h-px bg-slate-200"))
                // Version pills
                .child(
                    div()
                        .attr("class", "grid grid-cols-3 gap-2 text-center")
                        .child(version_pill(
                            "Bundled",
                            Signal::derive(|| BUNDLED_VERSION.to_string()),
                        ))
                        .child(version_pill(
                            "Installed",
                            Signal::derive(move || installed_ver.get()),
                        ))
                        .child(version_pill(
                            "Server",
                            Signal::derive(move || short(&server_ver.get())),
                        )),
                )
                // Update actions
                .child(
                    div()
                        .attr("class", "mt-4 flex flex-col gap-2")
                        .child(
                            button()
                                .attr(
                                    "class",
                                    "w-full py-3 rounded-xl bg-indigo-600 text-white \
                                     font-medium text-sm active:bg-red-700 \
                                     shadow-sm transition",
                                )
                                .on(ev::click, on_check)
                                .child("Check for update"),
                        )
                        .child(
                            button()
                                .attr(
                                    "class",
                                    "w-full py-3 rounded-xl bg-slate-100 text-slate-700 \
                                     font-medium text-sm active:bg-slate-200 transition",
                                )
                                .on(ev::click, on_rollback)
                                .child("Roll back to previous bundle"),
                        ),
                )
                // Status line
                .child(
                    p()
                        .attr(
                            "class",
                            "mt-3 text-xs text-slate-500 whitespace-pre-wrap break-all \
                             bg-slate-50 rounded-lg p-3 border border-slate-100 min-h-[3rem]",
                        )
                        .child(move || status.get()),
                ),
        )
        // ---- Diagnostics card (kept as small dev smoke-tests) ---------
        .child(
            div()
                .attr(
                    "class",
                    "rounded-2xl bg-white shadow-sm border border-slate-200 p-5",
                )
                .child(
                    h2()
                        .attr("class", "text-base font-semibold text-slate-900 mb-3")
                        .child("Diagnostics"),
                )
                .child(
                    div()
                        .attr("class", "flex flex-col gap-2")
                        .child(
                            button()
                                .attr(
                                    "class",
                                    "w-full py-3 rounded-xl bg-slate-100 text-slate-700 \
                                     font-medium text-sm active:bg-slate-200 transition",
                                )
                                .on(ev::click, on_vibrate)
                                .child("Vibrate (native)"),
                        )
                        .child(
                            button()
                                .attr(
                                    "class",
                                    "w-full py-3 rounded-xl bg-slate-100 text-slate-700 \
                                     font-medium text-sm active:bg-slate-200 transition",
                                )
                                .on(ev::click, on_hello)
                                .child("Say hello (POST /hello)"),
                        ),
                ),
        )
}

/// A single labelled pill used in the Profile card's version row.
fn version_pill(label: &'static str, value: Signal<String>) -> impl IntoView {
    div()
        .attr(
            "class",
            "rounded-xl bg-slate-50 border border-slate-100 py-2 px-2",
        )
        .child(
            span()
                .attr("class", "block text-[10px] uppercase tracking-wide text-slate-400")
                .child(label),
        )
        .child(
            span()
                .attr("class", "block text-xs font-mono text-slate-700 truncate")
                .child(move || value.get()),
        )
}

// ---------------------------------------------------------------------------
// Bottom navigation
// ---------------------------------------------------------------------------

fn bottom_nav(tab: ReadSignal<Tab>, set_tab: WriteSignal<Tab>) -> impl IntoView {
    div()
        .attr(
            "class",
            "fixed bottom-0 inset-x-0 safe-bottom bg-white/95 backdrop-blur \
             border-t border-slate-200 z-10",
        )
        .child(
            div()
                .attr("class", "grid grid-cols-2")
                .child(nav_tab_button(tab, set_tab, Tab::Home, "🏠", "Home"))
                .child(nav_tab_button(
                    tab,
                    set_tab,
                    Tab::Settings,
                    "⚙️",
                    "Settings",
                )),
        )
}

fn nav_tab_button(
    tab: ReadSignal<Tab>,
    set_tab: WriteSignal<Tab>,
    which: Tab,
    icon: &'static str,
    label: &'static str,
) -> impl IntoView {
    // Reactive class string so the active tab is highlighted.
    let class = move || {
        let active = tab.get() == which;
        let base = "flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs font-medium transition";
        if active {
            format!("{base} text-indigo-600")
        } else {
            format!("{base} text-slate-500 active:text-slate-700")
        }
    };
    button()
        .attr("class", class)
        .on(ev::click, move |_| set_tab.set(which))
        .child(span().attr("class", "text-lg leading-none").child(icon))
        .child(span().child(label))
}

/// Trim a hash-looking string to a short display form.
pub fn short(s: &str) -> String {
    if s.len() > 10 {
        format!("{}…", &s[..10])
    } else {
        s.to_string()
    }
}
