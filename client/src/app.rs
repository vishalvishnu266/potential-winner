//! Root Leptos component: the user CRUD screen.
//!
//! Layout:
//!   - "Add / Edit user" card at the top (form uses the custom DatePicker).
//!   - Users table below with edit / delete actions.
//!
//! All state (users list, form fields, edit mode) is kept in signals so the
//! view stays reactive without any manual DOM work.

use leptos::*;
use shared::{CreateUser, SimpleDate, UpdateUser, User};
use uuid::Uuid;

use crate::api;
use crate::datepicker::DatePicker;

#[component]
pub fn App() -> impl IntoView {
    // ---- server-backed state ---------------------------------------------
    let (users, set_users) = create_signal::<Vec<User>>(Vec::new());
    let (error, set_error) = create_signal::<Option<String>>(None);

    // ---- form state ------------------------------------------------------
    let (name, set_name) = create_signal(String::new());
    let (age, set_age) = create_signal(0u32);
    let (dob, set_dob) = create_signal(SimpleDate::new(2000, 1, 1));
    let (editing, set_editing) = create_signal::<Option<Uuid>>(None);

    // ---- helpers ---------------------------------------------------------
    let refresh = move || {
        spawn_local(async move {
            match api::list_users().await {
                Ok(list) => { set_users.set(list); set_error.set(None); }
                Err(e) => set_error.set(Some(format!("Failed to load users: {e}"))),
            }
        });
    };

    // Initial load.
    {
        let refresh = refresh.clone();
        create_effect(move |_| { refresh(); });
    }

    let reset_form = move || {
        set_name.set(String::new());
        set_age.set(0);
        set_dob.set(SimpleDate::new(2000, 1, 1));
        set_editing.set(None);
    };

    let submit = move |_| {
        let name_val = name.get().trim().to_string();
        if name_val.is_empty() {
            set_error.set(Some("Name is required".into()));
            return;
        }
        let age_val = age.get();
        let dob_val = dob.get();
        let editing_id = editing.get();
        let refresh = refresh.clone();
        let reset_form = reset_form.clone();

        spawn_local(async move {
            let result = if let Some(id) = editing_id {
                api::update_user(
                    id,
                    UpdateUser {
                        name: Some(name_val),
                        age: Some(age_val),
                        dob: Some(dob_val),
                    },
                )
                .await
                .map(|_| ())
            } else {
                api::create_user(CreateUser {
                    name: name_val,
                    age: age_val,
                    dob: dob_val,
                })
                .await
                .map(|_| ())
            };

            match result {
                Ok(()) => {
                    reset_form();
                    set_error.set(None);
                    refresh();
                }
                Err(e) => set_error.set(Some(format!("Save failed: {e}"))),
            }
        });
    };

    let edit_user = move |u: User| {
        set_name.set(u.name);
        set_age.set(u.age);
        set_dob.set(u.dob);
        set_editing.set(Some(u.id));
    };

    let delete_user = move |id: Uuid| {
        let refresh = refresh.clone();
        spawn_local(async move {
            match api::delete_user(id).await {
                Ok(()) => refresh(),
                Err(e) => set_error.set(Some(format!("Delete failed: {e}"))),
            }
        });
    };

    // ---- view ------------------------------------------------------------
    view! {
        <div class="container">
            <h1>"Leptos + Axum User CRUD"</h1>

            <div class="card">
                <h3>{move || if editing.get().is_some() { "Edit user" } else { "Add user" }}</h3>
                <div class="form-row">
                    <label>
                        "Name"
                        <input
                            type="text"
                            prop:value=move || name.get()
                            on:input=move |ev| set_name.set(event_target_value(&ev))
                        />
                    </label>

                    <label>
                        "Age"
                        <input
                            type="number"
                            min="0"
                            prop:value=move || age.get().to_string()
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

                    <button on:click=submit>
                        {move || if editing.get().is_some() { "Update" } else { "Add" }}
                    </button>
                    <Show when=move || editing.get().is_some() fallback=|| view!{ <></> }>
                        <button class="secondary" on:click=move |_| reset_form()>"Cancel"</button>
                    </Show>
                </div>

                <Show when=move || error.get().is_some() fallback=|| view!{ <></> }>
                    <div class="error">{move || error.get().unwrap_or_default()}</div>
                </Show>
            </div>

            <div class="card">
                <h3>"Users"</h3>
                <Show
                    when=move || !users.get().is_empty()
                    fallback=|| view! { <p style="color:#6b7280">"No users yet — add one above."</p> }
                >
                    <table>
                        <thead>
                            <tr>
                                <th>"Name"</th>
                                <th>"Age"</th>
                                <th>"DOB"</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            <For
                                each=move || users.get()
                                key=|u| u.id
                                children=move |u: User| {
                                    let u_edit = u.clone();
                                    let u_id = u.id;
                                    view! {
                                        <tr>
                                            <td>{u.name.clone()}</td>
                                            <td>{u.age}</td>
                                            <td>{u.dob.to_iso()}</td>
                                            <td>
                                                <div class="actions">
                                                    <button
                                                        class="secondary"
                                                        on:click=move |_| edit_user(u_edit.clone())
                                                    >"Edit"</button>
                                                    <button
                                                        class="danger"
                                                        on:click=move |_| delete_user(u_id)
                                                    >"Delete"</button>
                                                </div>
                                            </td>
                                        </tr>
                                    }
                                }
                            />
                        </tbody>
                    </table>
                </Show>
            </div>
        </div>
    }
}
