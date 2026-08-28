//! Fixed bottom tab bar.
//!
//! Three items:
//!   * **Home**     — navigate to `/`
//!   * **Vibrate**  — action button (not a link) that triggers native haptics
//!   * **Settings** — navigate to `/settings`
//!
//! Navigation goes through `use_navigate` so it's a real client-side
//! transition (no full page reload). Active-tab styling comes from
//! `use_location`. The vibrate button is intentionally *not* a link — it
//! just fires and provides tactile feedback.

use leptos::html::{a, button, div, span};
use leptos::*;
use leptos_router::{use_location, use_navigate, NavigateOptions};
use wasm_bindgen_futures::spawn_local;

use crate::platform::haptics::vibrate;
use crate::router::path;
use crate::state::AppState;

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
                .attr("class", "grid grid-cols-3")
                .child(nav_link(path::HOME, "🏠", "Home"))
                .child(vibrate_button())
                .child(nav_link(path::SETTINGS, "⚙️", "Settings")),
        )
}

// ---------------------------------------------------------------------------
// Nav link (Home / Settings)
// ---------------------------------------------------------------------------

/// A router link rendered as an `<a>` with `href` so long-press etc.
/// behave like real links, but click is intercepted to route via
/// `use_navigate` (no full page reload).
fn nav_link(href: &'static str, icon: &'static str, label: &'static str) -> impl IntoView {
    let location = use_location();
    let navigate = use_navigate();

    let class = move || {
        let active = location.pathname.get() == href;
        let base = tab_class_base();
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
            navigate(href, NavigateOptions::default());
        })
        .child(span().attr("class", "text-lg leading-none").child(icon))
        .child(span().child(label))
}

// ---------------------------------------------------------------------------
// Vibrate action button
// ---------------------------------------------------------------------------

/// Not a navigation target — fires native haptics on tap and writes a
/// small status line so the user knows it worked (helpful on desktop
/// where there's no physical feedback).
fn vibrate_button() -> impl IntoView {
    let state = AppState::expect();

    button()
        .attr("class", format!("{} text-slate-600 active:text-indigo-600", tab_class_base()))
        .on(ev::click, move |_| {
            spawn_local(async move {
                match vibrate().await {
                    Ok(()) => state.status.set("Vibrated 📳".into()),
                    Err(e) => state.status.set(format!("Vibrate failed: {e:?}")),
                }
            });
        })
        .child(span().attr("class", "text-lg leading-none").child("📳"))
        .child(span().child("Vibrate"))
}

// ---------------------------------------------------------------------------

/// Common Tailwind classes shared by every nav item, so the three
/// buttons visually align even though their `<a>` vs `<button>` tags
/// differ. Kept as a helper to avoid drift between the two call sites.
fn tab_class_base() -> &'static str {
    "flex flex-col items-center justify-center py-2.5 gap-0.5 \
     text-xs font-medium transition no-underline bg-transparent border-0"
}
