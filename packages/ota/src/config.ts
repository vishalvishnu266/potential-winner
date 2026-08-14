/**
 * Runtime OTA config — set once per app at boot, read by `otaClient`.
 *
 * The HTTP base URL is NOT stored here anymore — the shared
 * `@pkg/api-contracts` client owns it (via `configureApi({ baseUrl })`).
 * OTA is a channel + build-version concern on top of that shared
 * client, so we only carry those two pieces here.
 */

export interface OtaConfig {
    /** Which app is asking — used as the `?app=` query for OTA calls. */
    appName: string;
    /** Build version to report when the native plugin can't provide one (web). */
    buildVersion?: string;
}

let config: OtaConfig = {
    appName: 'customer',
    buildVersion: '0.0.0',
};

export function configureOta(patch: Partial<OtaConfig>): void {
    config = { ...config, ...patch };
}

export function getOtaConfig(): OtaConfig {
    return config;
}
