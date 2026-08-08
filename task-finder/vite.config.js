import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))

// Auto-bump the patch version on every `vite build` so every build produces
// a NEW bundle version that the OTA server can serve.
// We combine package.json version + a UTC timestamp so it is monotonically
// increasing and human-readable, e.g. "0.0.0+20260807130612".
function buildVersion() {
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
                  `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`
    return `${pkg.version}+${stamp}`
}

const APP_VERSION = process.env.APP_VERSION || buildVersion()
// LAN IP of the machine running the Axum server. Override at build time:
//   OTA_HOST=192.168.1.42 npm run build
// Defaults to the current dev machine so the built app "just works" on
// a physical phone connected to the same Wi-Fi.
const OTA_HOST = process.env.OTA_HOST || '192.168.0.4'
const OTA_PORT = Number(process.env.OTA_PORT || 3000)

export default defineConfig({
    plugins: [vue(), tailwindcss()],
    // Bind Vite dev server on all interfaces so a phone on the LAN can hit it
    server: {
        host: '0.0.0.0',
        port: 5173,
    },
    define: {
        __APP_VERSION__: JSON.stringify(APP_VERSION),
        __OTA_HOST__: JSON.stringify(OTA_HOST),
        __OTA_PORT__: JSON.stringify(OTA_PORT),
    },
})

export { APP_VERSION, OTA_HOST, OTA_PORT }
