//! Settings page.
//!
//! Reads shared state from context (`AppState::expect()`) so no props
//! are drilled in from the router/shell. The "Check for update" button
//! kicks off the same [`check_and_apply`] flow that the background
//! poller runs — it's just a manual trigger for users who don't want to
//! wait for the next 15 s tick.
//!
//! **Removed** in this pass: the manual rollback button (the plugin's
//! automatic safety net + `ready()` on boot is sufficient) and the
//! standalone Vibrate button (moved to the bottom nav bar).

use leptos::html::{button, div, p, span};
use leptos::*;
use ota_common::{routes, HelloReq, HelloResp};
use wasm_bindgen_futures::spawn_local;

use crate::ota::events::{event_status_line, OtaEvent};
use crate::ota::{check_and_apply};
use crate::platform::http::post_json;
use crate::state::AppState;
use crate::ui::version_pill::version_pill;
use crate::util::{short, BUNDLED_VERSION, SERVER};

/// Render the Settings page contents.
pub fn settings_page() -> impl IntoView {
    let state = AppState::expect();

    // Manual "check now" — same OTA flow the poller uses, just triggered
    // by the user tapping the button instead of the 15s timer.
    let on_check = move |_| {
        spawn_local(async move {
            let _ = check_and_apply(|ev| apply_ota_event(&ev, state)).await;
        });
    };

    // Small platform smoke-test — kept because it's useful for
    // developers verifying the server round-trip after an OTA.
    let on_hello = move |_| {
        state.status.set("POSTing /hello…".into());
        spawn_local(async move {
            let req = HelloReq { name: "Leptos".into() };
            let url = format!("{SERVER}{}", routes::HELLO);
            match post_json::<HelloReq, HelloResp>(&url, &req).await {
                Ok(resp) => state.status.set(format!("Server said: {}", resp.message)),
                Err(e) => state.status.set(format!("POST /hello failed: {e:?}")),
            }
        });
    };

    div()
        .attr("class", "flex flex-col gap-4")
        .child(profile_card(state, on_check))
        .child(diagnostics_card(on_hello))
}

/// Fan an [`OtaEvent`] out to the shared reactive state.
fn apply_ota_event(ev: &OtaEvent, state: AppState) {
    state.status.set(event_status_line(ev));
    match ev {
        OtaEvent::ServerVersion(v) => state.server_ver.set(v.clone()),
        OtaEvent::Installed { version } => state.installed_ver.set(version.clone()),
        _ => {}
    }
}

// ---------------------------------------------------------------------------
// Profile card
// ---------------------------------------------------------------------------

fn profile_card<FCheck>(state: AppState, on_check: FCheck) -> impl IntoView
where
    FCheck: Fn(ev::MouseEvent) + 'static,
{
    let installed_ver = state.installed_ver;
    let server_ver = state.server_ver;
    let status = state.status;

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
        // Update action
        .child(
            div()
                .attr("class", "mt-4")
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
                ),
        )
        // Status line (also driven by the background poller)
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

fn diagnostics_card<FHello>(on_hello: FHello) -> impl IntoView
where
    FHello: Fn(ev::MouseEvent) + 'static,
{
    div()
        .attr(
            "class",
            "rounded-2xl bg-white shadow-sm border border-slate-200 p-5",
        )
        .child(
            span()
                .attr("class", "text-base font-semibold text-slate-900 block mb-3")
                .child("Diagnostics"),
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
        )
}
