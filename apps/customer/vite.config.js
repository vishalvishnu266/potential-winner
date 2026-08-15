import { createAppConfig } from '@pkg/vite-config';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const appDir = dirname(fileURLToPath(import.meta.url));

// All shared concerns (React/Tailwind plugins, monorepo fs.allow, shared
// package pre-bundling, __APP_*__ compile-time globals, APP_VERSION
// stamping) live in @pkg/vite-config.
//
// Env vars honoured (all optional):
//   APP_ENV      = mock | dev | prod   (default: mock)
//   APP_VERSION  = string              (default: pkg.version+UTC-timestamp)
//   OTA_HOST     = string              (default: 192.168.0.4)
//   OTA_PORT     = number              (default: 3000)
export default createAppConfig({ appName: 'customer', appDir });
