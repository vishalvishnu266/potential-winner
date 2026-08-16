import { copyFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const sharedJsDir = join(root, 'packages', 'shared', 'www', 'js');
const targets = [
    join(root, 'apps', 'customer', 'www', 'js'),
    join(root, 'apps', 'worker', 'www', 'js')
];

const files = readdirSync(sharedJsDir).filter(f => f.endsWith('.js'));

// Also include the bundled UI library from packages/ui
const uiBundleSrc = join(root, 'packages', 'ui', 'dist', 'erp-ui.js');

for (const target of targets) {
    // 1. Copy erp-ui.js if it exists
    if (existsSync(uiBundleSrc)) {
        copyFileSync(uiBundleSrc, join(target, 'erp-ui.js'));
        console.log(`[sync] erp-ui.js -> ${target}`);
    } else {
        console.warn(`[sync] Warning: erp-ui.js not found at ${uiBundleSrc}. Did you run build:ui?`);
    }

    // 2. Copy modular JS files
    for (const file of files) {
        const src = join(sharedJsDir, file);
        const dest = join(target, file);
        copyFileSync(src, dest);
        console.log(`[sync] ${file} -> ${dest}`);
    }
}
