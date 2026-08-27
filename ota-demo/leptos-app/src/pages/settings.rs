//! Settings page — view only.
//!
//! The OTA state machine lives in `crate::ota`; this file just wires
//! button clicks to `ota::check_and_apply` / `ota::do_rollback` and
//! translates the streamed events into reactive signal updates.

use leptos::html::{button, div, h2, p, span};
use leptos::*;
use ota_common::{routes, HelloReq, HelloResp};
use wasm_bindgen_futures::spawn_local;

use crate::components::version_pill::version_pill;
use crate::haptics::vibrate;
use crate::http::post_json;
use crate::ota::{
    bundled_placeholder, check_and_apply, do_rollback, event_status_line, OtaEvent,
};
use crate::util::{short, BUNDLED_VERSION, SERVER};

/// Render the Settings page contents.
pub fn settings_page(
    installed_ver: ReadSignal<String>,
    set_installed_ver: WriteSignal<String>,
    server_ver: ReadSignal<String>,
    set_server_ver: WriteSignal<String>,
    status: ReadSignal<String>,
    set_status: WriteSignal<String>,
) -> impl IntoView {
    // ---- OTA button handlers ---------------------------------------

    let on_check = move |_| {
        spawn_local(async move {
            let _ = check_and_apply(|ev| apply_ota_event(
                &ev,
                set_status,
                set_server_ver,
                set_installed_ver,
            ))
            .await;
        });
    };

    let on_rollback = move |_| {
        spawn_local(async move {
            let _ = do_rollback(|ev| apply_ota_event(
                &ev,
                set_status,
                set_server_ver,
                set_installed_ver,
            ))
            .await;
        });
    };

    // ---- Diagnostics handlers --------------------------------------

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

    div()
        .attr("class", "flex flex-col gap-4")
        .child(profile_card(
            installed_ver,
            server_ver,
            status,
            on_check,
            on_rollback,
        ))
        .child(diagnostics_card(on_vibrate, on_hello))
}

/// Fan a single [`OtaEvent`] out to the three signals the Settings page
/// cares about (status line + pills).
fn apply_ota_event(
    ev: &OtaEvent,
    set_status: WriteSignal<String>,
    set_server_ver: WriteSignal<String>,
    set_installed_ver: WriteSignal<String>,
) {
    // Always update the status line.
    set_status.set(event_status_line(ev));

    // Some events also carry pill data.
    match ev {
        OtaEvent::ServerVersion(v) => set_server_ver.set(v.clone()),
        OtaEvent::Installed { version } => set_installed_ver.set(version.clone()),
        OtaEvent::RolledBack => set_installed_ver.set(bundled_placeholder().into()),
        _ => {}
    }
}

// ---------------------------------------------------------------------------
// Profile card
// ---------------------------------------------------------------------------

fn profile_card<FCheck, FRoll>(
    installed_ver: ReadSignal<String>,
    server_ver: ReadSignal<String>,
    status: ReadSignal<String>,
    on_check: FCheck,
    on_rollback: FRoll,
) -> impl IntoView
where
    FCheck: Fn(ev::MouseEvent) + 'static,
    FRoll: Fn(ev::MouseEvent) + 'static,
{
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
                             font-medium text-sm active:bg-indigo-700 \
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
            p().attr(
                "class",
                "mt-3 text-xs text-slate-500 whitespace-pre-wrap break-all \
                 bg-slate-50 rounded-lg p-3 border border-slate-100 min-h-[3rem]",
            )
            .child(move || status.get()),
        )
}

// ---------------------------------------------------------------------------
// Diagnostics card
// ---------------------------------------------------------------------------

fn diagnostics_card<FVib, FHello>(on_vibrate: FVib, on_hello: FHello) -> impl IntoView
where
    FVib: Fn(ev::MouseEvent) + 'static,
    FHello: Fn(ev::MouseEvent) + 'static,
{
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
        )
}
