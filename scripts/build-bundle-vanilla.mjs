#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const args = Object.fromEntries(
    process.argv.slice(2)
        .filter((a) => a.startsWith('--'))
        .map((a) => {
            const eq = a.indexOf('=');
            return eq === -1 ? [a.slice(2), true] : [a.slice(2, eq), a.slice(eq + 1)];
        }),
);

const app = args.app;
if (!app || !['customer', 'worker'].includes(app)) {
    console.error('[bundle] Usage: node scripts/build-bundle-vanilla.mjs --app=customer|worker');
    process.exit(1);
}

const appDir = join(root, 'apps', app);
const pkg = JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf-8'));

const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
              `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
const version = `${pkg.version}-${stamp}`;

const versionJsPath = join(appDir, 'www', 'js', 'version.js');
const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
writeFileSync(versionJsPath, `window.APP_VERSION = '${version}';
window.APP_NAME = '${app}';
window.DEFAULT_SERVER_URL = '${serverUrl}';
window.getServerUrl = function() { return localStorage.getItem('ota:serverUrl') || window.DEFAULT_SERVER_URL; };
window.setServerUrl = function(url) { if (url) localStorage.setItem('ota:serverUrl', url); else localStorage.removeItem('ota:serverUrl'); };
`);

const bundlesDir = join(root, 'bundles', app);
if (!existsSync(bundlesDir)) mkdirSync(bundlesDir, { recursive: true });
const outFile = join(bundlesDir, `v${version}.zip`);
const distDir = join(appDir, 'www');

if (process.platform === 'win32') {
    execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${outFile}' -Force"`, { stdio: 'inherit' });
} else {
    execSync(`cd "${distDir}" && zip -r "${outFile}" .`, { stdio: 'inherit', shell: '/bin/bash' });
}

writeFileSync(join(bundlesDir, 'latest.json'), JSON.stringify({ app, version, file: `v${version}.zip`, created_at: now.toISOString() }, null, 2));
console.log(`[bundle] ✅ ${app} v${version} created.`);
