import { createAppConfig } from '@pkg/vite-config';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const appDir = dirname(fileURLToPath(import.meta.url));

// See @pkg/vite-config for the list of honoured env vars.
export default createAppConfig({ appName: 'worker', appDir });
