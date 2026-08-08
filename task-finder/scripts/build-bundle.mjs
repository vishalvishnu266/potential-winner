#!/usr/bin/env node
/**
 * Build the Vue app and create a versioned OTA bundle zip in ../bundles.
 * The version is auto-generated from package.json + a UTC timestamp so
 * every `npm run bundle:ota` produces a NEW version the server can pick up.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, existsSync, createWriteStream, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));

const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
              `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
const version = `${pkg.version}-${stamp}`;

console.log(`[bundle] Building OTA bundle version: ${version}`);

// Pass version to Vite so it's baked into the JS as __APP_VERSION__
process.env.APP_VERSION = version;
execSync('npm run build', { stdio: 'inherit', cwd: root, env: { ...process.env } });

const bundlesDir = join(root, 'bundles');
if (!existsSync(bundlesDir)) mkdirSync(bundlesDir, { recursive: true });

const outFile = join(bundlesDir, `v${version}.zip`);
console.log(`[bundle] Zipping dist/ -> ${outFile}`);

// Use archiver if present; otherwise fallback to Node's built-in zip via a tiny impl
let archiver;
try { archiver = (await import('archiver')).default; } catch (_) { /* not installed */ }

if (archiver) {
    await new Promise((res, rej) => {
        const output = createWriteStream(outFile);
        const archive = archiver('zip', { zlib: { level: 9 } });
        output.on('close', res);
        archive.on('error', rej);
        archive.pipe(output);
        archive.directory(join(root, 'dist'), false);
        archive.finalize();
    });
} else {
    // Fallback: shell out to a platform-appropriate zip command
    const distDir = join(root, 'dist');
    const isWin = process.platform === 'win32';
    if (isWin) {
        // PowerShell Compress-Archive
        execSync(
            `powershell -NoProfile -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${outFile}' -Force"`,
            { stdio: 'inherit' }
        );
    } else {
        execSync(`cd "${distDir}" && zip -r "${outFile}" .`, { stdio: 'inherit', shell: '/bin/bash' });
    }
}

// Write a small manifest so the server always knows the freshest version
const manifest = { latest: version, file: `v${version}.zip`, created_at: now.toISOString() };
const manifestPath = join(bundlesDir, 'latest.json');
const fs = await import('node:fs/promises');
await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`[bundle] ✅ Done. Latest manifest: ${manifestPath}`);
console.log(`[bundle] Serve at:  http://10.0.2.2:3000/bundles/v${version}.zip`);
