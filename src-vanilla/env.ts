/**
 * Environment configuration — build-time only.
 *
 * Chosen at bundle time via `APP_ENV=mock|dev|prod npm run build`.
 * There is intentionally no runtime override: a build only ever targets
 * one backend, so nothing surprises QA in production.
 *
 * Repositories consume `env.mode` + `env.baseUrl()` exactly once at boot.
 */

declare const __APP_ENV__: string | undefined;
declare const __APP_VERSION__: string | undefined;
declare const __OTA_HOST__: string | undefined;
declare const __OTA_PORT__: number | undefined;

export type EnvMode = 'mock' | 'dev' | 'prod';

const build: EnvMode =
  (typeof __APP_ENV__ === 'string' && ['mock','dev','prod'].includes(__APP_ENV__))
    ? (__APP_ENV__ as EnvMode)
    : 'mock';

export const env = {
  mode: build,
  version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev',
  apiBaseUrl: (() => {
    const host = typeof __OTA_HOST__ === 'string' ? __OTA_HOST__ : '192.168.0.4';
    const port = typeof __OTA_PORT__ === 'number' ? __OTA_PORT__ : 3000;
    return {
      mock: '',                                      // never used
      dev:  `http://${host}:${port}`,
      prod: 'https://api.dailygig.example.com',
    };
  })(),

  isMock(): boolean { return this.mode === 'mock'; },
  isDev():  boolean { return this.mode === 'dev'; },
  isProd(): boolean { return this.mode === 'prod'; },
  baseUrl(): string { return this.apiBaseUrl[this.mode]; },
};
