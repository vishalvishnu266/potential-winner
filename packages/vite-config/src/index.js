/**
 * @pkg/vite-config — one shared Vite config factory for every app.
 *
 * Each app's `vite.config.js` becomes a two-line wrapper:
 *
 *     import { createAppConfig } from '@pkg/vite-config';
 *     export default createAppConfig({ appName: 'customer' });
 *
 * All app-agnostic concerns (React + Tailwind plugins, monorepo `fs.allow`,
 * shared-package pre-bundling, the `__APP_*__` compile-time globals,
 * deterministic `APP_VERSION` stamping) live here.
 *
 * The factory is written in plain JS on purpose so it works both when Vite
 * loads it via native ESM and when Node loads it during build tooling.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// -- Shared constants --------------------------------------------------------

const DEFAULT_SHARED_PACKAGES = [
    '@pkg/api-contracts',
    '@pkg/i18n',
    '@pkg/native',
    '@pkg/ota',
    '@pkg/theme',
    '@pkg/ui',
];

// -- Helpers -----------------------------------------------------------------

function buildVersion(pkgVersion) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp =
        `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
        `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
    return `${pkgVersion}+${stamp}`;
}

// -- Factory -----------------------------------------------------------------

/**
 * Build a Vite config for one of the apps in `apps/*`.
 *
 * @param {Object} opts
 * @param {string} opts.appName           — e.g. 'customer' or 'worker'.
 * @param {string} opts.appDir            — absolute path to the app root (pass `import.meta.dirname` or the equivalent).
 * @param {number} [opts.port=5173]       — dev server port.
 * @param {string[]} [opts.extraOptimizeDeps] — extra pre-bundled deps unique to this app.
 * @param {Record<string, unknown>} [opts.extraDefine] — extra `define`d compile-time globals.
 */
export function createAppConfig({
    appName,
    appDir,
    port = 5173,
    extraOptimizeDeps = [],
    extraDefine = {},
}) {
    if (!appName) throw new Error('createAppConfig: `appName` is required');
    if (!appDir)  throw new Error('createAppConfig: `appDir` is required');

    const pkg = JSON.parse(readFileSync(resolve(appDir, 'package.json'), 'utf-8'));

    const APP_VERSION = process.env.APP_VERSION || buildVersion(pkg.version);
    const APP_ENV     = process.env.APP_ENV || 'mock';
    const OTA_HOST    = process.env.OTA_HOST || '192.168.0.4';
    const OTA_PORT    = Number(process.env.OTA_PORT || 3000);

    return defineConfig({
        plugins: [react(), tailwindcss()],
        server: {
            host: '0.0.0.0',
            port,
            fs: {
                // Allow serving files from the monorepo root so imports
                // from `packages/*` resolve during dev.
                allow: [resolve(appDir, '..', '..')],
            },
        },
        optimizeDeps: {
            include: [...DEFAULT_SHARED_PACKAGES, ...extraOptimizeDeps],
        },
        define: {
            __APP_NAME__:    JSON.stringify(appName),
            __APP_VERSION__: JSON.stringify(APP_VERSION),
            __APP_ENV__:     JSON.stringify(APP_ENV),
            __OTA_HOST__:    JSON.stringify(OTA_HOST),
            __OTA_PORT__:    JSON.stringify(OTA_PORT),
            ...extraDefine,
        },
    });
}
