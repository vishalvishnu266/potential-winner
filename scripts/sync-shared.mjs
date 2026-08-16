import { copyFileSync, readdirSync } from 'node:fs';
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

for (const target of targets) {
    for (const file of files) {
        const src = join(sharedJsDir, file);
        const dest = join(target, file);
        copyFileSync(src, dest);
        console.log(`[sync] ${file} -> ${dest}`);
    }
}
