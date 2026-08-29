//! Root component + routing.
//!
//! Three pages backed by `leptos_router`:
//!   * `/`                       → `UsersListPage`   (list + Edit / Delete)
//!   * `/users/new`              → `CreateUserPage`
//!   * `/users/:id/edit`         → `EditUserPage`
//!
//! Each page owns its own state and calls into `api` for the HTTP work.

use leptos::*;
use leptos_router::*;
use shared::{CreateUser, SimpleDate, UpdateUser, User};
use uuid::Uuid;

use crate::api;
use crate::user_form::{UserForm, UserFormData};

#[component]
pub fn App() -> impl IntoView {
    view! {
        <Router>
            <div class="container">
                <h1>"Leptos + Axum User CRUD"</h1>
                <nav class="nav-links">
                    <A href="/" exact=true>"Users"</A>
                    <A href="/users/new">"Add user"</A>
                </nav>

                <Routes>
                    <Route path="/"                view=UsersListPage/>
                    <Route path="/users/new"       view=CreateUserPage/>
                    <Route path="/users/:id/edit"  view=EditUserPage/>
                </Routes>
            </div>
        </Router>
    }
}

// -------------------------------------------------------------------------
// /  – Users list
// -------------------------------------------------------------------------

#[component]
fn UsersListPage() -> impl IntoView {
    let (users, set_users) = create_signal::<Vec<User>>(Vec::new());
    let (error, set_error) = create_signal::<Option<String>>(None);

    let refresh = move || {
        spawn_local(async move {
            match api::list_users().await {
                Ok(list) => { set_users.set(list); set_error.set(None); }
                Err(e) => set_error.set(Some(format!("Failed to load users: {e}"))),
            }
        });
    };

    // Initial load on mount.
    {
        let refresh = refresh.clone();
        create_effect(move |_| { refresh(); });
    }

    let delete_user = move |id: Uuid| {
        let refresh = refresh.clone();
        spawn_local(async move {
            match api::delete_user(id).await {
                Ok(()) => refresh(),
                Err(e) => set_error.set(Some(format!("Delete failed: {e}"))),
            }
        });
    };

    view! {
        <div class="card">
            <h3>"Users"</h3>

            <Show when=move || error.get().is_some() fallback=|| view!{ <></> }>
                <div class="error">{move || error.get().unwrap_or_default()}</div>
            </Show>

            <Show
                when=move || !users.get().is_empty()
                fallback=|| view! {
                    <p style="color:#6b7280">
                        "No users yet — "<A href="/users/new">"add one"</A>"."
                    </p>
                }
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
                                let id = u.id;
                                let edit_href = format!("/users/{id}/edit");
                                view! {
                                    <tr>
                                        <td>{u.name.clone()}</td>
                                        <td>{u.age}</td>
                                        <td>{u.dob.to_iso()}</td>
                                        <td>
                                            <div class="actions">
                                                <A href=edit_href>
                                                    <button class="secondary">"Edit"</button>
                                                </A>
                                                <button
                                                    class="danger"
                                                    on:click=move |_| delete_user(id)
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
    }
}

// -------------------------------------------------------------------------
// /users/new  – Create page
// -------------------------------------------------------------------------

#[component]
fn CreateUserPage() -> impl IntoView {
    let (error, set_error) = create_signal::<Option<String>>(None);
    let navigate = use_navigate();

    let initial = UserFormData {
        name: String::new(),
        age: 0,
        dob: SimpleDate::new(2000, 1, 1),
    };

    let on_submit = {
        let navigate = navigate.clone();
        move |data: UserFormData| {
            let navigate = navigate.clone();
            spawn_local(async move {
                let payload = CreateUser { name: data.name, age: data.age, dob: data.dob };
                match api::create_user(payload).await {
                    Ok(_) => navigate("/", NavigateOptions::default()),
                    Err(e) => set_error.set(Some(format!("Create failed: {e}"))),
                }
            });
        }
    };

    let on_cancel = {
        let navigate = navigate.clone();
        move |_| navigate("/", NavigateOptions::default())
    };

    view! {
        <div class="card">
            <h3>"Add user"</h3>
            <UserForm
                initial=initial
                submit_label="Add".to_string()
                on_submit=on_submit
                on_cancel=Callback::new(on_cancel)
            />
            <Show when=move || error.get().is_some() fallback=|| view!{ <></> }>
                <div class="error">{move || error.get().unwrap_or_default()}</div>
            </Show>
        </div>
    }
}

// -------------------------------------------------------------------------
// /users/:id/edit  – Edit page
// -------------------------------------------------------------------------

#[component]
fn EditUserPage() -> impl IntoView {
    let params = use_params_map();
    let navigate = use_navigate();
    let (error, set_error) = create_signal::<Option<String>>(None);
    let (loaded, set_loaded) = create_signal::<Option<UserFormData>>(None);
    let (user_id, set_user_id) = create_signal::<Option<Uuid>>(None);

    // Load the user whose id is in the URL.
    create_effect(move |_| {
        let id_str = params.with(|p| p.get("id").cloned()).unwrap_or_default();
        let Ok(id) = Uuid::parse_str(&id_str) else {
            set_error.set(Some(format!("Invalid user id: {id_str}")));
            return;
        };
        set_user_id.set(Some(id));
        spawn_local(async move {
            match api::list_users().await {
                Ok(list) => match list.into_iter().find(|u| u.id == id) {
                    Some(u) => set_loaded.set(Some(UserFormData {
                        name: u.name, age: u.age, dob: u.dob,
                    })),
                    None => set_error.set(Some("User not found".into())),
                },
                Err(e) => set_error.set(Some(format!("Load failed: {e}"))),
            }
        });
    });

    let on_submit = {
        let navigate = navigate.clone();
        move |data: UserFormData| {
            let navigate = navigate.clone();
            let Some(id) = user_id.get() else { return; };
            spawn_local(async move {
                let payload = UpdateUser {
                    name: Some(data.name),
                    age: Some(data.age),
                    dob: Some(data.dob),
                };
                match api::update_user(id, payload).await {
                    Ok(_) => navigate("/", NavigateOptions::default()),
                    Err(e) => set_error.set(Some(format!("Update failed: {e}"))),
                }
            });
        }
    };

    let on_cancel = {
        let navigate = navigate.clone();
        move |_| navigate("/", NavigateOptions::default())
    };

    view! {
        <div class="card">
            <h3>"Edit user"</h3>

            <Show
                when=move || loaded.get().is_some()
                fallback=move || view! {
                    <p style="color:#6b7280">
                        {move || match error.get() {
                            Some(e) => e,
                            None => "Loading…".to_string(),
                        }}
                    </p>
                }
            >
                {
                    // Safe unwrap: guarded by <Show when=loaded.is_some()>.
                    let data = loaded.get().unwrap();
                    view! {
                        <UserForm
                            initial=data
                            submit_label="Update".to_string()
                            on_submit=on_submit.clone()
                            on_cancel=Callback::new(on_cancel.clone())
                        />
                    }
                }
            </Show>

            <Show when=move || error.get().is_some() && loaded.get().is_some()
                  fallback=|| view!{ <></> }>
                <div class="error">{move || error.get().unwrap_or_default()}</div>
            </Show>
        </div>
    }
}
