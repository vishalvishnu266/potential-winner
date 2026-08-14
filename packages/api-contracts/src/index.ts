/**
 * @pkg/api-contracts — the ONE place both apps import their API from.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  RUST server (source of truth)                                      │
 * │    #[utoipa::path] + #[derive(ToSchema)] on every handler + DTO     │
 * │                          │                                           │
 * │   cargo run --bin export-openapi                                     │
 * │                          ▼                                           │
 * │  packages/api-contracts/openapi.json  ← committed                    │
 * │                          │                                           │
 * │   npm run api:codegen  (@hey-api/openapi-ts)                         │
 * │                          ▼                                           │
 * │  packages/api-contracts/src/generated/                               │
 * │    types.gen.ts, services.gen.ts, schemas.gen.ts, index.ts           │
 * │                          │                                           │
 * │   re-exported by this file →  `import { api } from '@pkg/api-contracts'` │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Usage in an app:
 *
 *     import { api, configureApi } from '@pkg/api-contracts';
 *
 *     configureApi({ baseUrl: 'http://192.168.0.4:3000' });
 *     const info = await api.health();
 *     const upd  = await api.checkUpdate({ query: { current: 'v0.1', app: 'customer' } });
 *
 * Mock mode:  see `@pkg/api-contracts/mock` — one call in `main.tsx`
 * seeds sensible default responses for every endpoint from the OpenAPI
 * `example` values.  Per-endpoint overrides supported.
 */

// Re-export everything the generator produces.  The wildcard is safe
// because the whole `generated/` folder is authored by the codegen and
// controlled by us.
export * from './generated';

// Namespaced convenience alias — `api.health()`, `api.checkUpdate({...})`.
import * as sdk from './generated';
export const api = sdk;

// Runtime configuration for the fetch client.
export { configureApi, getApiConfig } from './config';

// Base contract retained for hand-written interfaces that pre-date the
// generated client (e.g. `apps/*/src/data/types.ts::Api extends BaseApi`).
export interface HealthResponse   { ok: boolean; }
export interface CheckUpdateResponse {
    available: boolean;
    version: string | null;
    url:     string | null;
}
export interface BaseApi {
    health(): Promise<HealthResponse>;
    checkUpdate(currentVersion: string): Promise<CheckUpdateResponse>;
}
