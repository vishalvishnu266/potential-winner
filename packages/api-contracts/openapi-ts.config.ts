/**
 * @hey-api/openapi-ts config.
 *
 * Emits, into `src/generated/`:
 *   • `types.gen.ts`    — every request/response schema as TS types
 *   • `services.gen.ts` — a typed function per endpoint (`health()`, `checkUpdate({...})`)
 *   • `schemas.gen.ts`  — runtime schema objects (kept as optionality; no consumer today)
 *   • `index.ts`        — barrel re-exporting everything
 *
 * The generated client uses `@hey-api/client-fetch`, which exposes a
 * pluggable `fetch` — leaving room for interceptors (auth, logging) at
 * boot time via `configureApi({ fetch })`.
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
        export: true,
    },
});
