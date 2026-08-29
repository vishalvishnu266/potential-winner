//! Reusable form used by both the "Create user" and "Edit user" pages.
//!
//! The parent supplies:
//!   * `initial` — the values the form starts with (empty for create,
//!     current user for edit).
//!   * `submit_label` — text on the submit button ("Add" vs "Update").
//!   * `saving` — reactive flag; when `true` the submit / cancel buttons
//!     are disabled and a spinner appears next to the submit button.
//!     This is how the parent tells us "waiting on the server".
//!   * `on_submit` — callback receiving the finished `(name, age, dob)`.
//!   * `on_cancel` — optional cancel handler.

use leptos::*;
use shared::SimpleDate;

use crate::datepicker::DatePicker;

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct UserFormData {
    pub name: String,
    pub age: u32,
    pub dob: SimpleDate,
}

#[component]
pub fn UserForm(
    #[prop(into)] initial: MaybeSignal<UserFormData>,
    #[prop(into)] submit_label: MaybeSignal<String>,
    #[prop(into)] on_submit: Callback<UserFormData>,
    #[prop(optional, into)] on_cancel: Option<Callback<()>>,
    #[prop(optional, into)] saving: MaybeSignal<bool>,
) -> impl IntoView {
    let init = initial.get_untracked();
    let (name, set_name) = create_signal(init.name.clone());
    let (age, set_age) = create_signal(init.age);
    let (dob, set_dob) = create_signal(init.dob);
    let (error, set_error) = create_signal::<Option<String>>(None);

    // Re-sync fields whenever `initial` changes (e.g. edit page finishes loading).
    create_effect(move |_| {
        let v = initial.get();
        set_name.set(v.name);
        set_age.set(v.age);
        set_dob.set(v.dob);
    });

    let submit = move |_| {
        if saving.get() { return; }
        let n = name.get().trim().to_string();
        if n.is_empty() {
            set_error.set(Some("Name is required".into()));
            return;
        }
        set_error.set(None);
        on_submit.call(UserFormData { name: n, age: age.get(), dob: dob.get() });
    };

    view! {
        <div class="form-row">
            <label>
                "Name"
                <input
                    type="text"
                    prop:value=move || name.get()
                    prop:disabled=move || saving.get()
                    on:input=move |ev| set_name.set(event_target_value(&ev))
                />
            </label>

            <label>
                "Age"
                <input
                    type="number"
                    min="0"
                    prop:value=move || age.get().to_string()
                    prop:disabled=move || saving.get()
                    on:input=move |ev| {
                        let v = event_target_value(&ev).parse::<u32>().unwrap_or(0);
                        set_age.set(v);
                    }
                />
            </label>

            <label>
                "Date of birth"
                <DatePicker
                    value=dob.into()
                    on_change=move |d| set_dob.set(d)
                />
            </label>

            <button on:click=submit prop:disabled=move || saving.get()>
                <Show when=move || saving.get() fallback=|| view! { <></> }>
                    <span class="spinner"></span>
                </Show>
                {move || submit_label.get()}
            </button>

            {move || on_cancel.map(|cb| view! {
                <button
                    class="secondary"
                    prop:disabled=move || saving.get()
                    on:click=move |_| cb.call(())
                >
                    "Cancel"
                </button>
            })}
        </div>

        <Show when=move || error.get().is_some() fallback=|| view!{ <></> }>
            <div class="error">{move || error.get().unwrap_or_default()}</div>
        </Show>
    }
}
