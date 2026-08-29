//! Reusable form component written entirely with Leptos's builder API.
//!
//! Same public shape as before: `initial`, `submit_label`, `on_submit`,
//! optional `on_cancel`, and a reactive `saving` flag that disables the
//! inputs / shows a spinner while a request is in flight.

use leptos::html::{button, div, input, label, span};
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

    // Re-sync fields whenever `initial` changes (edit page finishes loading).
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

    // ---- Name field -----------------------------------------------------
    let name_field = label()
        .child("Name")
        .child(
            input()
                .attr("type", "text")
                .prop("value", move || name.get())
                .prop("disabled", move || saving.get())
                .on(ev::input, move |ev| set_name.set(event_target_value(&ev))),
        );

    // ---- Age field ------------------------------------------------------
    let age_field = label()
        .child("Age")
        .child(
            input()
                .attr("type", "number")
                .attr("min", "0")
                .prop("value", move || age.get().to_string())
                .prop("disabled", move || saving.get())
                .on(ev::input, move |ev| {
                    let v = event_target_value(&ev).parse::<u32>().unwrap_or(0);
                    set_age.set(v);
                }),
        );

    // ---- DOB field (custom datepicker) ----------------------------------
    let dob_field = label()
        .child("Date of birth")
        .child(DatePicker(
            DatePickerProps::builder()
                .value(dob.into())
                .on_change(Callback::new(move |d| set_dob.set(d)))
                .build(),
        ));

    // ---- Submit button --------------------------------------------------
    let submit_btn = button()
        .on(ev::click, submit)
        .prop("disabled", move || saving.get())
        .child(move || {
            if saving.get() {
                span().classes("spinner").into_view()
            } else {
                ().into_view()
            }
        })
        .child(move || submit_label.get());

    // ---- Cancel button (optional) --------------------------------------
    let cancel_btn = move || {
        on_cancel.map(|cb| {
            button()
                .classes("secondary")
                .prop("disabled", move || saving.get())
                .on(ev::click, move |_| cb.call(()))
                .child("Cancel")
                .into_view()
        })
    };

    // ---- Error line (conditional) --------------------------------------
    let error_line = move || {
        if let Some(msg) = error.get() {
            div().classes("error").child(msg).into_view()
        } else {
            ().into_view()
        }
    };

    // ---- Root: form row + error ----------------------------------------
    (
        div()
            .classes("form-row")
            .child(name_field)
            .child(age_field)
            .child(dob_field)
            .child(submit_btn)
            .child(cancel_btn),
        error_line,
    )
        .into_view()
}
