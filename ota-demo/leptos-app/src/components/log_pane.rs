//! `<LogPane/>` — the terminal-styled status readout at the bottom of the
//! screen.

use leptos::html::pre;
use leptos::*;

use crate::styles::log_pane as css;

#[component]
pub fn LogPane(#[prop(into)] text: Signal<String>) -> impl IntoView {
    pre()
        .attr("class", css::log_pane::pane)
        .child(move || text.get())
}
