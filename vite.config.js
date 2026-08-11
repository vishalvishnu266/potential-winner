import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))

// Auto-bump the patch version on every `vite build` so every build produces
// a NEW bundle version that the OTA server can serve.
function buildVersion() {
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
                  `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`
    return `${pkg.version}+${stamp}`
}

const APP_VERSION = process.env.APP_VERSION || buildVersion()
const OTA_HOST = process.env.OTA_HOST || '192.168.0.4'
const OTA_PORT = Number(process.env.OTA_PORT || 3000)
// Choose the deployment environment: 'mock' | 'dev' | 'prod'.
// Defaults to 'mock' so `vite build` produces a self-contained UI you can
// demo without any backend. Override with `APP_ENV=dev npm run build`.
const APP_ENV = process.env.APP_ENV || 'mock'

// Single-entry React app served from `index.html` → `src/main.tsx`.
// This is what both `npm run dev` (browser) and the Capacitor Android/iOS
// shells load from `dist/index.html`.
export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        host: '0.0.0.0',
        port: 5173,
    },
    define: {
        __APP_VERSION__: JSON.stringify(APP_VERSION),
        __APP_ENV__:     JSON.stringify(APP_ENV),
        __OTA_HOST__:    JSON.stringify(OTA_HOST),
        __OTA_PORT__:    JSON.stringify(OTA_PORT),
    },
})

export { APP_VERSION, APP_ENV, OTA_HOST, OTA_PORT }
