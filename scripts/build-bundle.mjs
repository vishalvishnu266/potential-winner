#!/usr/bin/env node
/**
 * Build one of the apps in `apps/*` and create a versioned OTA bundle
 * zip under `<repo>/bundles/<app>/`.
 *
 * Usage:
 *   node scripts/build-bundle.mjs --app=customer
 *   node scripts/build-bundle.mjs --app=worker
 *   APP_ENV=prod node scripts/build-bundle.mjs --app=customer
 *
 * The version is auto-generated from the app's package.json version +
 * a UTC timestamp so every run produces a NEW version the server can
 * pick up.
 *
 * Respects the APP_ENV env var (see each app's vite.config.js).
 */
import { execSync } from 'node:child_process';
import { mkdirSync, existsSync, createWriteStream, readFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ---- args ------------------------------------------------------------------
const args = Object.fromEntries(
    process.argv.slice(2)
        .filter((a) => a.startsWith('--'))
        .map((a) => {
            const eq = a.indexOf('=');
            return eq === -1
                ? [a.slice(2), true]
                : [a.slice(2, eq), a.slice(eq + 1)];
        }),
);

const app = args.app || process.env.APP_NAME;
if (!app) {
    console.error('[bundle] Missing --app=<name> (or APP_NAME env). Expected e.g. --app=customer');
    process.exit(1);
}

const appDir = join(root, 'apps', app);
if (!existsSync(appDir)) {
    console.error(`[bundle] Unknown app "${app}" (looked in ${appDir}). Available apps live under apps/*.`);
    process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf-8'));

// ---- version stamp ---------------------------------------------------------
const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
              `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
const version = `${pkg.version}-${stamp}`;

console.log(`[bundle] app=${app}  version=${version}`);

// ---- build the app ---------------------------------------------------------
// Pass the version + app name to Vite so they're baked into the JS.
process.env.APP_VERSION = version;
process.env.APP_NAME = app;

execSync('npm run build', {
    stdio: 'inherit',
    cwd: appDir,
    env: { ...process.env },
});

// ---- zip dist/ into bundles/<app>/ -----------------------------------------
const bundlesDir = join(root, 'bundles', app);
if (!existsSync(bundlesDir)) mkdirSync(bundlesDir, { recursive: true });

const outFile = join(bundlesDir, `v${version}.zip`);
console.log(`[bundle] Zipping ${join(appDir, 'dist')} -> ${outFile}`);

let archiver;
try { archiver = (await import('archiver')).default; } catch (_) { /* not installed */ }

if (archiver) {
    await new Promise((res, rej) => {
        const output = createWriteStream(outFile);
        const archive = archiver('zip', { zlib: { level: 9 } });
        output.on('close', res);
        archive.on('error', rej);
        archive.pipe(output);
        archive.directory(join(appDir, 'dist'), false);
        archive.finalize();
    });
} else {
    const distDir = join(appDir, 'dist');
    const isWin = process.platform === 'win32';
    if (isWin) {
        execSync(
            `powershell -NoProfile -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${outFile}' -Force"`,
            { stdio: 'inherit' },
        );
    } else {
        execSync(`cd "${distDir}" && zip -r "${outFile}" .`, { stdio: 'inherit', shell: '/bin/bash' });
    }
}

// ---- write per-app manifest ------------------------------------------------
// Consumed by the Rust server (server/src/main.rs::LatestManifest).
// Keys must stay in sync with that struct.
const manifest = {
    app,
    version,
    file: `v${version}.zip`,
    created_at: now.toISOString(),
};
const manifestPath = join(bundlesDir, 'latest.json');
const fs = await import('node:fs/promises');
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`[bundle] ✅ Done. Manifest: ${manifestPath}`);
console.log(`[bundle] Serve at:  http://<host>:3000/bundles/${app}/v${version}.zip`);
