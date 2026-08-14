/**
 * Customer app — public API barrel.
 *
 * All UI code should import from here (not from `@pkg/api-contracts`
 * directly) so we retain the option of decorating requests, adding
 * app-specific fallbacks, or renaming endpoints later without touching
 * every call site.
 *
 * The real work — request/response types, transport, base URL — lives
 * in `@pkg/api-contracts` (generated from `openapi.json`).
 */
export { api, configureApi, getApiConfig } from '@pkg/api-contracts';
export type * from '@pkg/api-contracts';
