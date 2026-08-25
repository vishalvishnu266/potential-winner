//! Top-level `<App/>` — composes the small components in
//! `crate::components` into the OTA demo screen. Owns the three signals
//! that drive the UI and hands them to `crate::ota::run_update` on click.

use leptos::html::{div, h1};
use leptos::*;
use wasm_bindgen_futures::spawn_local;

use crate::components::action_button::ActionButton;
use crate::components::log_pane::LogPane;
use crate::components::status_pill::StatusPill;
use crate::config::{short, BUNDLED_VERSION};
use crate::ota;
use crate::platform::{capacitor, haptics};
use crate::styles::app as css;

#[component]
pub fn App() -> impl IntoView {
    let (status, set_status) = create_signal(String::from("Idle."));
    let (server_ver, set_server_ver) = create_signal(String::from("?"));
    let (installed_ver, set_installed_ver) =
        create_signal(String::from("(checking…)"));

    // Populate the "Installed" pill from the plugin on mount. Falls back
    // to `BUNDLED_VERSION` when the plugin isn't there (e.g. running in
    // a plain browser via `trunk serve`).
    spawn_local(async move {
        match capacitor::plugin("LiveUpdate") {
            Some(live) => match ota::live_update::current_bundle_id(&live).await {
                Ok(id) if !id.is_empty() => set_installed_ver.set(short(&id)),
                _ => set_installed_ver.set(BUNDLED_VERSION.into()),
            },
            None => set_installed_ver.set(BUNDLED_VERSION.into()),
        }
    });

    // Derived signals for the pills so we can pass a plain `Signal<String>`
    // into the reusable component.
    let bundled_sig = Signal::derive(|| BUNDLED_VERSION.to_string());
    let installed_sig = Signal::derive(move || installed_ver.get());
    let server_sig = Signal::derive(move || short(&server_ver.get()));
    let status_sig = Signal::derive(move || status.get());

    let on_check = Callback::new(move |_| {
        spawn_local(async move {
            ota::run_update(set_status, set_server_ver).await;
        });
    });

    let on_vibrate = Callback::new(move |_| {
        spawn_local(async move {
            match haptics::vibrate().await {
                Ok(()) => set_status.set("Vibrated 📳".into()),
                Err(e) => set_status.set(format!("Vibrate failed: {e:?}")),
            }
        });
    });

    div()
        .attr("class", css::app::container)
        .child(
            h1()
                .attr("class", css::app::title)
                .child("Leptos + Axum OTA demo"),
        )
        .child(
            div()
                .attr("class", css::app::pill_row)
                .child(StatusPill(StatusPillProps {
                    label: "Bundled".to_string(),
                    value: bundled_sig,
                }))
                .child(StatusPill(StatusPillProps {
                    label: "Installed".to_string(),
                    value: installed_sig,
                }))
                .child(StatusPill(StatusPillProps {
                    label: "Server".to_string(),
                    value: server_sig,
                })),
        )
        .child(
            div()
                .attr("class", css::app::actions)
                .child(ActionButton(ActionButtonProps {
                    label: "Check for update".to_string(),
                    secondary: false,
                    on_click: on_check,
                }))
                .child(ActionButton(ActionButtonProps {
                    label: "Vibrate (native)".to_string(),
                    secondary: true,
                    on_click: on_vibrate,
                })),
        )
        .child(LogPane(LogPaneProps { text: status_sig }))
}
