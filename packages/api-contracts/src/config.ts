/**
 * Runtime API config — set once per app at boot, applied to the
 * generated `@hey-api/client-fetch` client.
 *
 * The generated client exports a shared singleton `client` from
 * `./generated`.  We forward the config there so every generated
 * service function picks it up without needing to pass `client` through.
 */
import { client } from './generated';

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
