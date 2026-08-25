//! `<ActionButton/>` — the primary tap-target used for OTA + vibrate.

use leptos::html::button;
use leptos::*;

use crate::styles::action_button as css;

#[component]
pub fn ActionButton(
    #[prop(into)] label: String,
    #[prop(optional)] secondary: bool,
    on_click: Callback<ev::MouseEvent>,
) -> impl IntoView {
    let class = if secondary {
        format!(
            "{} {}",
            css::action_button::button,
            css::action_button::secondary
        )
    } else {
        css::action_button::button.to_string()
    };

    button()
        .attr("class", class)
        .on(ev::click, move |e| on_click.call(e))
        .child(label)
}
