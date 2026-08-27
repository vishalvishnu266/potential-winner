//! Top-level app shell — Router + header + scrollable body + fixed
//! bottom nav.
//!
//! `leptos_router` gives us real URLs (`/`, `/settings`) so the browser
//! Back button, deep-linking, and per-tab reloads all Just Work.
//! Shared app-wide reactive state (status line, OTA version pills) is
//! provided into the router context so any page can subscribe.
//!
//! ## Rollback fix (kept here — must run once at app-mount time)
//!
//! Capawesome's `LiveUpdate` plugin has a built-in "confirm the new bundle
//! actually booted" safety net: after `setNextBundle` + `reload`, if the
//! app doesn't call `LiveUpdate.ready()` within a short window, the plugin
//! rolls back on the next launch. We call `ready()` from the mount-time
//! `spawn_local` block below.

use leptos::html::div;
use leptos::*;
use leptos_router::{Route, Router, Routes};
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::spawn_local;

use crate::capacitor::capacitor_plugin;
use crate::components::bottom_nav::bottom_nav;
use crate::components::header::header_bar;
use crate::live_update::{current_bundle_id, ready as live_ready};
use crate::pages::home::home_page;
use crate::pages::route;
use crate::pages::settings::settings_page;
use crate::util::{short, BUNDLED_VERSION};

/// Top-level Leptos component — mounted from `main.rs`.
pub fn app() -> impl IntoView {
    // Shared app-wide reactive state. Passed explicitly into pages so
    // dependencies are visible in the type signatures (instead of hidden
    // behind `use_context`), which keeps the small demo easy to trace.
    let (status, set_status) = create_signal(String::from("Idle."));
    let (server_ver, set_server_ver) = create_signal(String::from("?"));
    let (installed_ver, set_installed_ver) = create_signal(String::from("(checking…)"));

    // On mount: populate the "Installed" pill and disarm the OTA rollback
    // safety net by calling `LiveUpdate.ready()`. See module docs above.
    spawn_local(async move {
        match capacitor_plugin("LiveUpdate") {
            Some(live) => {
                match current_bundle_id(&live).await {
                    Ok(id) if !id.is_empty() => set_installed_ver.set(short(&id)),
                    _ => set_installed_ver.set(BUNDLED_VERSION.into()),
                }
                if let Err(e) = live_ready(&live).await {
                    web_sys::console::warn_1(&JsValue::from_str(&format!(
                        "LiveUpdate.ready() failed ({e:?}); rollback protection may be inactive"
                    )));
                }
            }
            None => set_installed_ver.set(BUNDLED_VERSION.into()),
        }
    });

    // The Router owns the URL. We nest header + body + bottom nav inside
    // it so `use_location` works everywhere in the tree.
    Router(
        leptos_router::RouterProps::builder()
            .children(ToChildren::to_children(move || {
                Fragment::new(vec![shell(
                    installed_ver,
                    set_installed_ver,
                    server_ver,
                    set_server_ver,
                    status,
                    set_status,
                )
                .into_view()])
            }))
            .build(),
    )
}

/// The mobile shell rendered inside the `Router`. Header + routed body +
/// bottom nav. Extracted so `app()` stays focused on state + routing wiring.
fn shell(
    installed_ver: ReadSignal<String>,
    set_installed_ver: WriteSignal<String>,
    server_ver: ReadSignal<String>,
    set_server_ver: WriteSignal<String>,
    status: ReadSignal<String>,
    set_status: WriteSignal<String>,
) -> impl IntoView {
    div()
        .attr(
            "class",
            "min-h-screen w-full flex flex-col bg-slate-50 text-slate-900",
        )
        .child(header_bar())
        .child(
            div()
                .attr("class", "flex-1 overflow-y-auto px-4 pt-4 pb-24")
                .child(routes(
                    installed_ver,
                    set_installed_ver,
                    server_ver,
                    set_server_ver,
                    status,
                    set_status,
                )),
        )
        .child(bottom_nav())
}

/// The `<Routes>` block: one `<Route>` per page. Kept in its own helper
/// so the signal-plumbing doesn't clutter `shell()`.
fn routes(
    installed_ver: ReadSignal<String>,
    set_installed_ver: WriteSignal<String>,
    server_ver: ReadSignal<String>,
    set_server_ver: WriteSignal<String>,
    status: ReadSignal<String>,
    set_status: WriteSignal<String>,
) -> impl IntoView {
    Routes(
        leptos_router::RoutesProps::builder()
            .children(ToChildren::to_children(move || {
                Fragment::new(vec![
                    Route(
                        leptos_router::RouteProps::builder()
                            .path(route::HOME)
                            .view(move || home_page().into_view())
                            .build(),
                    )
                    .into_view(),
                    Route(
                        leptos_router::RouteProps::builder()
                            .path(route::SETTINGS)
                            .view(move || {
                                settings_page(
                                    installed_ver,
                                    set_installed_ver,
                                    server_ver,
                                    set_server_ver,
                                    status,
                                    set_status,
                                )
                                .into_view()
                            })
                            .build(),
                    )
                    .into_view(),
                ])
            }))
            .build(),
    )
}
