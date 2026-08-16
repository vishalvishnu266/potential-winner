#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { mkdirSync, existsSync, createWriteStream, readFileSync, writeFileSync } from 'node:fs';
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

const app = args.app || 'taskapp';
const appDir = join(root, 'task-app-native');

if (!existsSync(appDir)) {
    console.error(`[bundle-native] App directory not found: ${appDir}`);
    process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(appDir, 'package.json'), 'utf-8'));

// ---- version stamp ---------------------------------------------------------
const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
              `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
const version = `${pkg.version}-${stamp}`;

console.log(`[bundle-native] app=${app} version=${version}`);

// ---- stamp version.js ------------------------------------------------------
const versionJsPath = join(appDir, 'www', 'js', 'version.js');
const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
const versionJsContent = `window.APP_VERSION = '${version}';
window.APP_NAME = '${app}';
window.DEFAULT_SERVER_URL = '${serverUrl}';
window.getServerUrl = function() {
    return localStorage.getItem('ota:serverUrl') || window.DEFAULT_SERVER_URL;
};
window.setServerUrl = function(url) {
    if (url) localStorage.setItem('ota:serverUrl', url);
    else localStorage.removeItem('ota:serverUrl');
};
`;
writeFileSync(versionJsPath, versionJsContent);
console.log(`[bundle-native] Stamped ${versionJsPath}`);

// ---- zip www/ into bundles/<app>/ ------------------------------------------
const bundlesDir = join(root, 'bundles', app);
if (!existsSync(bundlesDir)) mkdirSync(bundlesDir, { recursive: true });

const outFile = join(bundlesDir, `v${version}.zip`);
console.log(`[bundle-native] Zipping ${join(appDir, 'www')} -> ${outFile}`);

const distDir = join(appDir, 'www');
const isWin = process.platform === 'win32';
if (isWin) {
    execSync(
        `powershell -NoProfile -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${outFile}' -Force"`,
        { stdio: 'inherit' },
    );
} else {
    execSync(`cd "${distDir}" && zip -r "${outFile}" .`, { stdio: 'inherit', shell: '/bin/bash' });
}

// ---- write per-app manifest ------------------------------------------------
const manifest = {
    app,
    version,
    file: `v${version}.zip`,
    created_at: now.toISOString(),
};
const manifestPath = join(bundlesDir, 'latest.json');
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`[bundle-native] ✅ Done. Manifest: ${manifestPath}`);
