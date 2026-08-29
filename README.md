# Leptos CSR + Axum User CRUD

A minimal full-stack Rust demo:

* **`shared/`** — plain Rust crate with the `User`, `CreateUser`, `UpdateUser`
  and `SimpleDate` types. Compiled into both server and client, so the JSON
  wire format is guaranteed to match.
* **`server/`** — [Axum](https://github.com/tokio-rs/axum) REST API with an
  in-memory user store and CORS enabled.
* **`client/`** — [Leptos](https://leptos.dev) CSR app served by
  [Trunk](https://trunkrs.dev). Includes a **custom datepicker component**
  (`client/src/datepicker.rs`) written entirely in Leptos — no JS libs.

## Layout

```
.
├── Cargo.toml          # workspace
├── shared/             # common structs (User, CreateUser, UpdateUser, SimpleDate)
├── server/             # Axum JSON API on :3000
└── client/             # Leptos CSR app on :8080
```

## API

| Method | Path              | Body            | Description        |
|--------|-------------------|-----------------|--------------------|
| GET    | `/api/users`      |                 | List users         |
| POST   | `/api/users`      | `CreateUser`    | Create a user      |
| GET    | `/api/users/:id`  |                 | Get a single user  |
| PUT    | `/api/users/:id`  | `UpdateUser`    | Partial update     |
| DELETE | `/api/users/:id`  |                 | Delete a user      |

## Running

### Prerequisites

```bash
rustup target add wasm32-unknown-unknown
cargo install trunk
```

### 1. Start the Axum server (port 3000)

```bash
cargo run -p server
```

### 2. Start the Leptos CSR client (port 8080)

In another terminal:

```bash
cd client
trunk serve
```

Then open <http://127.0.0.1:8080>.

## Custom Datepicker

`client/src/datepicker.rs` implements a `<DatePicker/>` component that shows:

* a text-style trigger with the current ISO date,
* a popup calendar with prev/next month + prev/next year navigation,
* a 6×7 grid built from Zeller's congruence and leap-year math,
* click-to-select that fires an `on_change` `Callback<SimpleDate>`.

It demonstrates the core Leptos primitives:
`create_signal`, `create_memo`, `create_effect`, `Show`, `For`, `Callback`,
and the `view!` macro — all with **zero JavaScript dependencies**.
