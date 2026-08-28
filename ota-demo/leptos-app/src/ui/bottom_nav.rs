//! Fixed bottom tab bar.
//!
//! Two items: **Home** (`/`) and **Settings** (`/settings`). Tapping
//! either navigates via `use_navigate` (client-side, no full reload) and
//! fires a short native haptic pulse so the user feels the transition.
//!
//! Active-tab styling is derived from `use_location`.

use leptos::html::{a, div, span};
use leptos::*;
use leptos_router::{use_location, use_navigate, NavigateOptions};
use wasm_bindgen_futures::spawn_local;

use crate::platform::haptics::vibrate;
use crate::router::path;

/// Render the bottom nav bar.
pub fn bottom_nav() -> impl IntoView {
    div()
        .attr(
            "class",
            "fixed bottom-0 inset-x-0 safe-bottom bg-white/95 backdrop-blur \
             border-t border-slate-200 z-10",
        )
        .child(
            div()
                .attr("class", "grid grid-cols-2")
                .child(nav_link(path::HOME, "🏠", "Home"))
                .child(nav_link(path::SETTINGS, "⚙️", "Settings")),
        )
}

/// A router link rendered as an `<a>` with `href` (so long-press etc.
/// behave like real links) whose click is intercepted to route via
/// `use_navigate` — plus a short native haptic pulse for tactile feedback.
fn nav_link(href: &'static str, icon: &'static str, label: &'static str) -> impl IntoView {
    let location = use_location();
    let navigate = use_navigate();

    let class = move || {
        let active = location.pathname.get() == href;
        let base = "flex flex-col items-center justify-center py-2.5 gap-0.5 \
                    text-xs font-medium transition no-underline";
        if active {
            format!("{base} text-indigo-600")
        } else {
            format!("{base} text-slate-500 active:text-slate-700")
        }
    };

    a().attr("href", href)
        .attr("class", class)
        .on(ev::click, move |e| {
            e.prevent_default();
            // Fire-and-forget haptic — no need to await; errors here
            // aren't user-actionable (e.g. desktop browser with no
            // vibrate API just silently does nothing).
            spawn_local(async move {
                let _ = vibrate().await;
            });
            navigate(href, NavigateOptions::default());
        })
        .child(span().attr("class", "text-lg leading-none").child(icon))
        .child(span().child(label))
}
