//! Leptos CSR entrypoint.

use leptos::*;

mod api;
mod app;
mod datepicker;
mod user_form;

fn main() {
    console_error_panic_hook::set_once();
    mount_to_body(|| view! { <app::App/> });
}
