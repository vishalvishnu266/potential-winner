# Task Platform (monorepo)

Two Capacitor apps sharing one Rust/Axum backend and one OTA pipeline:

| App                | Path             | Audience                                | Native `appId`               |
|--------------------|------------------|-----------------------------------------|------------------------------|
| **Customer**       | `apps/customer/` | End users posting work / finding cabs   | `com.yourcompany.taskfinder` |
| **Worker**         | `apps/worker/`   | Freelancers & service firms (crew, ops) | `com.yourcompany.worker`     |

This repo was recently converted from a single-app layout to an
**npm workspaces** monorepo.  No new business logic has been added yet —
`apps/worker` is currently a byte-for-byte copy of the customer shell so
the two apps can diverge independently from a known-good baseline.

## Stack (unchanged)

- **Frontend:** React 18 + Vite + `react-router-dom` + Tailwind v4
- **State:**    Zustand
- **i18n:**     Custom, zero-dependency (English + Tamil)
- **Native:**   Capacitor 8 (Android + iOS)
- **OTA:**      `@capgo/capacitor-updater` + a tiny Axum Rust server
- **Backend:**  Rust / Axum (OTA + health only, for now)

## Repo layout

```
task-platform/
├─ package.json                 ← npm workspaces root, orchestration scripts
├─ tsconfig.base.json           ← shared TS compiler options
│
├─ apps/
│  ├─ customer/                 ← the original app, moved here as-is
│  │  ├─ package.json           name: @app/customer
│  │  ├─ capacitor.config.json  appId: com.yourcompany.taskfinder
│  │  ├─ vite.config.js
│  │  ├─ tsconfig.json          extends ../../tsconfig.base.json
│  │  ├─ index.html
│  │  ├─ src/                   (App.tsx, router, pages, components, ...)
│  │  ├─ public/
│  │  ├─ android/               Capacitor-generated
│  │  └─ ios/                   Capacitor-generated
│  │
│  └─ worker/                   ← new shell, mirror of customer
│     ├─ package.json           name: @app/worker
│     ├─ capacitor.config.json  appId: com.yourcompany.worker
│     ├─ vite.config.js
│     ├─ tsconfig.json          extends ../../tsconfig.base.json
│     ├─ index.html
│     ├─ src/                   (identical shell to customer)
│     └─ public/
│     (android/ & ios/ are NOT committed — run `npm run cap:add:android`
│      and `npm run cap:add:ios` inside apps/worker to generate them)
│
├─ packages/                    ← shared code (single source of truth)
│  ├─ theme/                    Tailwind v4 tokens + seven accent palettes
│  ├─ native/                   Capacitor wrappers (storage, haptics, useTheme, useAccent, ...)
│  ├─ i18n/                     generic createI18n({ bundles, defaultLocale })
│  ├─ api-contracts/            generated typed client + configureApi + /mock subpath
│  ├─ ota/                      configureOta, useOta, otaStore, UpdateOverlay (uses api.checkUpdate)
│  ├─ ui/                       generic <TabBar />, more components to come
│  └─ vite-config/              createAppConfig({ appName, appDir }) — one factory, both apps
│
├─ server/                      ← Rust/Axum backend (unchanged location)
│  ├─ Cargo.toml
│  ├─ migrations/
│  └─ src/main.rs               ← now serves per-app OTA channels
│
├─ bundles/                     ← generated OTA bundles, per-app subfolders
│  ├─ customer/                 latest.json + vX.zip
│  └─ worker/                   latest.json + vX.zip
│
└─ scripts/
   ├─ build-bundle.mjs          ← now takes --app=<customer|worker>
   └─ dev.sh
```

### Shared `packages/`

The app-agnostic shell has been extracted into workspace packages so
`apps/customer` and `apps/worker` share a single source of truth:

| Package              | What lives here                                                                | Consumers                     |
|----------------------|---------------------------------------------------------------------------------|-------------------------------|
| `@pkg/theme`         | Tailwind v4 tokens, dark/light surfaces, seven accent palettes (`style.css`).  | Both apps import in `main.tsx`|
| `@pkg/native`        | Capacitor wrappers: `initNative`, `syncStatusBar`, `hapticTap`, `storage`, `useTheme`, `bootAccent`. | Both apps |
| `@pkg/i18n`          | Generic `createI18n({ bundles, defaultLocale, localeMeta })` factory.          | Each app registers its own bundles |
| `@pkg/api-contracts` | Generated typed client + `configureApi({ baseUrl })`, plus a `/mock` subpath that intercepts `fetch`. Source of truth: `openapi.json`. | Both apps |
| `@pkg/ota`           | `configureOta({ appName })`, `otaClient`, `useOtaStore`, `useOta`, `UpdateOverlay`. Uses `api.checkUpdate` under the hood — no separate HTTP transport. | Both apps |
| `@pkg/ui`            | Generic `<TabBar tabs={...} getTabForPath={...} />`.                            | Each app supplies its own tab list |
| `@pkg/vite-config`   | `createAppConfig({ appName, appDir })` — React + Tailwind plugins, monorepo `fs.allow`, shared-package pre-bundling, `__APP_*__` compile-time globals, `APP_ACCENT` validation, `APP_VERSION` stamping. | Both `vite.config.js` files are now one-liners. |

Apps consume packages via workspace name imports (`@pkg/native`,
`@pkg/ota`, etc.). No build step is required — Vite reads the package
TS sources directly. TypeScript path aliases in `tsconfig.base.json`
plus the `optimizeDeps.include` list in each app's `vite.config.js`
keep dev + typecheck happy.

App-specific pieces stay per-app:

- `apps/<app>/src/data/{types,api,mockApi,realApi}.ts` — each app owns its own `Api` (extending `BaseApi`) and its mock/real implementations. Swap chosen at build time via the `@api-impl` Vite alias, unchanged.
- `apps/<app>/src/i18n/{en,ta,types}.ts` — each app owns its own message shape and translations.
- `apps/<app>/src/components/TabBar.tsx` — thin app-flavoured wrapper over `@pkg/ui`'s `TabBar`.
- `apps/<app>/src/{router,pages}/` — apps' route surface.

## Install

```bash
npm install                      # installs both workspaces at once
```

npm workspaces hoists shared deps into the root `node_modules/`. Each
app also gets a lightweight `node_modules/` symlink so tools that
resolve from the app dir (Vite, Capacitor) still work.

## Common workflows

All commands are runnable from the repo root:

```bash
# Dev servers (mock API)
npm run dev:customer             # -> http://localhost:5173  (customer)
npm run dev:worker               # -> http://localhost:5173  (worker)

# Dev against the real backend
npm run dev:customer:real
npm run dev:worker:real

# Type-check every workspace
npm run typecheck

# Prod builds
npm run build:customer:prod
npm run build:worker:prod
npm run build:all

# Native (build + cap sync + run)
npm run android:customer
npm run android:worker
npm run ios:customer
npm run ios:worker

# OTA bundles — written to bundles/<app>/
npm run bundle:ota:customer
npm run bundle:ota:worker

# Rust OTA / health server
npm run server
```

Or run from inside an app directory as before:

```bash
cd apps/customer
npm run dev
npm run android
npm run bundle:ota
```

## OTA — now per-app

The Rust server accepts an `app` query parameter and reads
`bundles/<app>/latest.json`:

```
GET /api/check-update?app=customer&current=<installed-version>
GET /api/check-update?app=worker&current=<installed-version>
```

Behaviour:

- `?app=` is validated (`[A-Za-z0-9_-]{1,32}`) to prevent path traversal.
- If omitted, defaults to `customer` for backwards compatibility with
  the original single-app setup.
- Bundles are served under `/bundles/<app>/vX.zip` (unchanged
  `ServeDir` on `/bundles`, now with per-app subdirectories).

`scripts/build-bundle.mjs` mirrors this layout:

```bash
node scripts/build-bundle.mjs --app=customer
node scripts/build-bundle.mjs --app=worker
```

Output:

```
bundles/
  customer/
    latest.json
    v0.0.0-20260814T120500.zip
  worker/
    latest.json
    v0.0.0-20260814T120530.zip
```

> **Note on the client side:** the client-side OTA call in
> `apps/customer/src/data/realApi.ts` currently hits
> `/api/check-update?current=...` — no `app=` param.  The server still
> serves the customer bundle correctly because `customer` is the
> default.  Once the worker app starts using OTA, pass `?app=worker`
> from `apps/worker/src/data/realApi.ts` (single-line change).

## API — spec-first, codegen everywhere

The Rust server is the single source of truth for the HTTP contract.
Handlers and DTOs are decorated with `utoipa`, producing an OpenAPI 3.1
spec that drives both the interactive docs UI and the TypeScript
client.

```
server/src/api.rs                                         (Rust — hand-written)
     │  #[utoipa::path(...)] on each handler,
     │  #[derive(ToSchema)] on each DTO
     ▼
GET /api-docs/openapi.json     ─┐
GET /docs (Scalar UI)           │  served at runtime by the Rust server
                                │
cargo run --bin export-openapi ─┘
     │  writes deterministic JSON
     ▼
packages/api-contracts/openapi.json                       (committed)
     │
npm run api:codegen  (@hey-api/openapi-ts)
     ▼
packages/api-contracts/src/generated/                     (git-ignored *.gen.ts)
     │  types.gen.ts   — request/response TS types
     │  services.gen.ts — one typed function per endpoint
     │  schemas.gen.ts  — runtime schema objects
     ▼
apps/{customer,worker}/src/data/api.ts  re-exports it
```

### The workflow — three commands total

```bash
npm run api:export         # Rust → openapi.json
npm run api:codegen        # openapi.json → TS client + types
npm run api:sync           # both, in order (use this)
```

Add a new endpoint:

1. Add the Rust handler + `#[derive(ToSchema)]` DTO + `#[utoipa::path(...)]` in `server/src/api.rs`.
2. Register the route in `api::router()` (one line: `.routes(routes!(my_handler))`).
3. From the repo root: `npm run api:sync`.
4. `api.myHandler({...})` is now callable and fully typed in both apps.

### Calling the API

```ts
import { api, configureApi } from '@pkg/api-contracts';

// Done once at boot in main.tsx:
configureApi({ baseUrl: 'http://192.168.0.4:3000' });

// Everywhere else, from any component/hook/effect:
const { ok }       = await api.health();
const { available, url, version } = await api.checkUpdate({
    query: { current: 'v0.1', app: 'customer' },
});
```

Requests + responses are typed end-to-end.  Change a Rust `#[derive(ToSchema)]` DTO and `tsc --noEmit` will pinpoint every affected call site.

### Mocks — automatic, per-endpoint override

When `APP_ENV=mock` (the default for `npm run dev:*`), the app installs a
tiny client-level fetch adapter that intercepts every generated request.
Default responses are synthesised from the OpenAPI `example` values, so
**every endpoint has a working mock the moment it's defined** — no
duplicate hand-written mock file to maintain.

Override any specific endpoint from your app:

```ts
import { mockOverride } from '@pkg/api-contracts/mock';

mockOverride('check_update', () =>
    new Response(JSON.stringify({
        available: true,
        version: '9.9.9',
        url: 'http://mock/bundle.zip',
    }), { status: 200, headers: { 'content-type': 'application/json' } }),
);
```

There is no service worker — the adapter is installed via
`configureApi({ fetch: mockFetch })`, so it works inside a Capacitor
WebView with zero setup.

### Docs UI

While the Rust server is running:

- `http://localhost:3000/docs`                — Scalar interactive docs
- `http://localhost:3000/api-docs/openapi.json` — the raw spec

## Adding a feature (checklist)

**Per-app (customer OR worker only):**

1. Add the endpoint to `server/src/api.rs` (Rust — see "API workflow" above).
2. Run `npm run api:sync` from the repo root.
3. Call `api.myEndpoint({...})` from `apps/<app>/src/data/api.ts` or directly from your component.
4. Add i18n keys to `apps/<app>/src/i18n/types.ts` and translate in `en.ts` + `ta.ts`.
5. Add a new route in `apps/<app>/src/router/index.tsx` and (optionally) a tab in `apps/<app>/src/components/TabBar.tsx`.

**Cross-cutting concerns (shared code):**

- **UI primitive** used identically in both apps → add to `@pkg/ui` (presentation-only + generic).
- **Native side-effect** (permissions, plugin wrapper) → add to `@pkg/native`.
- **New i18n key that both apps need** → for now, add to each app's `i18n/types.ts` (their `Messages` shapes are per-app so they can diverge). If a truly shared string emerges, we can lift a `SharedMessages` type into `@pkg/i18n`.
- **Anything the API returns** → already shared — it lives in `@pkg/api-contracts/src/generated/`, regenerated from Rust.

## Install & run

The old lockfile under `apps/customer/` was deleted as part of the extraction — the root workspace hoists everything now:

```bash
npm install                      # from repo root, installs all workspaces
npm run dev:customer             # -> http://localhost:5173
npm run dev:worker               # -> http://localhost:5173  (stop customer first)
```

## Migration notes (what changed in this pivot)

- All previously top-level app files (`src/`, `android/`, `ios/`,
  `public/`, `index.html`, `vite.config.js`, `tsconfig.json`,
  `capacitor.config.json`, `package.json`, `package-lock.json`) now live
  under `apps/customer/`.
- Root `package.json` declares npm workspaces: `apps/*`, `packages/*`.
- Root `tsconfig.base.json` holds the shared compiler config; each app's
  `tsconfig.json` extends it.
- `scripts/build-bundle.mjs` now requires `--app=<name>` and writes to
  `bundles/<app>/` instead of `bundles/`.
- `server/src/main.rs::check_update` reads per-app manifests and returns
  per-app URLs.
- `apps/worker/` is a fresh copy of the customer shell with a distinct
  `appId` (`com.yourcompany.worker`) and no native `android/`/`ios/`
  folders yet (regenerate with `npx cap add android|ios`).

No product/business logic (jobs, cabs, sponsors, ERP, AI agents) has
been introduced by this conversion — that lands in follow-up commits.
