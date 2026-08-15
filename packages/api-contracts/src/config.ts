/**
 * Runtime API config — set once per app at boot, applied to the
 * `@hey-api/client-fetch` client used by every generated service function.
 *
 * We import `client` directly from `@hey-api/client-fetch` rather than
 * from `./generated`, because the codegen output shape changed across
 * `@hey-api/openapi-ts` versions.  The generator wires its service
 * functions to *this same shared client instance* automatically, so
 * configuring it here propagates to every `api.foo({...})` call.
 */
import { client } from '@hey-api/client-fetch';

export interface ApiConfig {
    /** Base URL of the API server, e.g. `http://192.168.0.4:3000`. */
    baseUrl: string;
    /** Extra headers to attach to every request. */
    headers?: Record<string, string>;
    /** Optional custom fetch (interceptors, auth, logging). */
    fetch?: typeof fetch;
}

let current: ApiConfig = { baseUrl: 'http://localhost:3000' };

export function configureApi(patch: Partial<ApiConfig>): void {
    current = { ...current, ...patch };
    client.setConfig({
        baseUrl: current.baseUrl,
        headers: current.headers,
        fetch:   current.fetch,
    });
}

export function getApiConfig(): ApiConfig {
    return current;
}
