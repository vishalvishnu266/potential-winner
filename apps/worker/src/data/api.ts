/**
 * Worker app — public API barrel.  Mirrors `apps/customer/src/data/api.ts`.
 * See `@pkg/api-contracts` for the actual implementation.
 */
export { api, configureApi, getApiConfig } from '@pkg/api-contracts';
export type * from '@pkg/api-contracts';
