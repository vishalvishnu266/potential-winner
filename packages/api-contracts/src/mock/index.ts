/**
 * @pkg/api-contracts/mock — client-level mock adapter.
 *
 * We DON'T use MSW's service worker (awkward inside a Capacitor
 * WebView).  Instead we plug a mock `fetch` implementation into the
 * generated client via `configureApi({ fetch })`.
 *
 * For every endpoint, the default response is derived from the
 * OpenAPI `example` values baked into `schemas.gen.ts`.  Apps override
 * per-endpoint behaviour via `mockOverride('operationId', handler)`.
 *
 * Usage in an app entry file:
 *
 *     if (import.meta.env.MODE === 'mock' || __APP_ENV__ === 'mock') {
 *         const { installMockFetch } = await import('@pkg/api-contracts/mock');
 *         installMockFetch();
 *     }
 *     configureApi({ baseUrl: '...' });   // still call this after
 */

import openapi from '../../openapi.json' assert { type: 'json' };
import { configureApi } from '../config';

type MockHandler = (req: Request) => Promise<Response> | Response;

/**
 * Operation-id → custom handler.  Anything not in this map falls back
 * to the OpenAPI example-derived default.
 */
const overrides = new Map<string, MockHandler>();

/**
 * Install a custom response handler for a specific operation.  The
 * `operationId` matches the one in `openapi.json` / `services.gen.ts`
 * (e.g. `'check_update'`, `'health'`).
 */
export function mockOverride(operationId: string, handler: MockHandler): void {
    overrides.set(operationId, handler);
}

/** Clear all overrides (useful in tests). */
export function clearMockOverrides(): void {
    overrides.clear();
}

/**
 * Swap the shared client's `fetch` for our mock.  Call BEFORE any
 * `configureApi({...})` that sets a real `fetch` — the last one wins.
 */
export function installMockFetch(): void {
    configureApi({ fetch: mockFetch });
}

// ---------------------------------------------------------------------------
// The mock fetch implementation
// ---------------------------------------------------------------------------

async function mockFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const req = input instanceof Request ? input : new Request(input.toString(), init);
    const url = new URL(req.url);
    const spec = openapi as OpenAPISpec;

    // Find the matching path template.  Simple exact-then-parametric match.
    const match = matchPath(url.pathname, req.method.toLowerCase(), spec);
    if (!match) {
        return json({ error: `[mock] No route for ${req.method} ${url.pathname}` }, 404);
    }
    const { operation } = match;

    // Per-endpoint override wins.
    if (operation.operationId && overrides.has(operation.operationId)) {
        return overrides.get(operation.operationId)!(req);
    }

    // Otherwise derive a default response from the OpenAPI example values.
    const body = defaultResponseBody(operation, spec);
    return json(body, 200);
}

// ---------------------------------------------------------------------------
// OpenAPI plumbing
// ---------------------------------------------------------------------------

interface OpenAPISpec {
    paths: Record<string, Record<string, Operation>>;
    components?: { schemas?: Record<string, Schema> };
}
interface Operation {
    operationId?: string;
    responses?: Record<string, {
        content?: Record<string, { schema?: Schema }>;
    }>;
}
interface Schema {
    type?: string | string[];
    example?: unknown;
    properties?: Record<string, Schema>;
    required?: string[];
    items?: Schema;
    $ref?: string;
    enum?: unknown[];
}

function matchPath(pathname: string, method: string, spec: OpenAPISpec) {
    const paths = spec.paths || {};
    // Exact match first
    if (paths[pathname]?.[method]) {
        return { operation: paths[pathname][method], pathTemplate: pathname };
    }
    // Parametric match — replace `{param}` with `[^/]+`
    for (const template of Object.keys(paths)) {
        if (!paths[template][method]) continue;
        const re = new RegExp('^' + template.replace(/\{[^}]+\}/g, '[^/]+') + '$');
        if (re.test(pathname)) {
            return { operation: paths[template][method], pathTemplate: template };
        }
    }
    return null;
}

function defaultResponseBody(operation: Operation, spec: OpenAPISpec): unknown {
    const ok = operation.responses?.['200']
        ?? operation.responses?.['201']
        ?? Object.values(operation.responses ?? {})[0];
    const schema = ok?.content?.['application/json']?.schema;
    if (!schema) return {};
    return exampleFor(schema, spec);
}

function resolveRef(ref: string, spec: OpenAPISpec): Schema | undefined {
    // Only supports local `#/components/schemas/Xxx` refs.
    const [, , kind, name] = ref.split('/');
    if (kind !== 'schemas') return undefined;
    return spec.components?.schemas?.[name];
}

function exampleFor(schema: Schema, spec: OpenAPISpec): unknown {
    if (schema.$ref) {
        const resolved = resolveRef(schema.$ref, spec);
        return resolved ? exampleFor(resolved, spec) : null;
    }
    if (schema.example !== undefined) return schema.example;

    const t = Array.isArray(schema.type) ? schema.type[0] : schema.type;
    switch (t) {
        case 'object': {
            const out: Record<string, unknown> = {};
            for (const [k, sub] of Object.entries(schema.properties ?? {})) {
                out[k] = exampleFor(sub, spec);
            }
            return out;
        }
        case 'array':
            return schema.items ? [exampleFor(schema.items, spec)] : [];
        case 'string':  return schema.enum?.[0] ?? '';
        case 'number':
        case 'integer': return 0;
        case 'boolean': return false;
        case 'null':    return null;
        default:        return null;
    }
}

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}
