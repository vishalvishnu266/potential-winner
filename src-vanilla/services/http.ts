/**
 * The ONLY place in the app that calls `fetch()`.
 * Controllers ask this service; views never see it.
 */

export interface HttpOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

async function request<T>(
  method: string,
  url: string,
  body: unknown,
  opts: HttpOptions = {},
): Promise<T> {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
    signal: opts.signal,
    cache: 'no-store',
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  // Some endpoints return empty bodies (204). Guard against JSON parse errors.
  const text = await res.text();
  return (text ? JSON.parse(text) : (undefined as unknown)) as T;
}

export const http = {
  get:  <T>(url: string, opts?: HttpOptions) => request<T>('GET',    url, undefined, opts),
  post: <T>(url: string, body: unknown, opts?: HttpOptions) => request<T>('POST', url, body, opts),
  put:  <T>(url: string, body: unknown, opts?: HttpOptions) => request<T>('PUT',  url, body, opts),
  del:  <T>(url: string, opts?: HttpOptions) => request<T>('DELETE', url, undefined, opts),
};
