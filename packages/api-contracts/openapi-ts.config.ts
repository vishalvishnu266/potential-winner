/**
 * @hey-api/openapi-ts config.
 *
 * Emits, into `src/generated/`:
 *   • `types.gen.ts`    — every request/response schema as TS types
 *   • `services.gen.ts` — a typed function per endpoint (`health()`, `checkUpdate({...})`)
 *   • `schemas.gen.ts`  — runtime schema objects (optional; used by mock adapter)
 *   • `index.ts`        — barrel re-exporting everything
 *
 * The generated client uses `@hey-api/client-fetch` which supports a
 * pluggable `fetch` — that's how our mock adapter intercepts calls
 * without a service worker.
 */
import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
    input: './openapi.json',
    output: {
        path: './src/generated',
        format: 'prettier',
    },
    client: '@hey-api/client-fetch',
    services: {
        asClass: false, // export bare functions: health(), checkUpdate({...})
    },
    types: {
        enums: 'typescript',
    },
    schemas: {
        // Emit runtime schema objects with example values so the mock
        // adapter can fabricate default responses for every endpoint.
        export: true,
    },
});
