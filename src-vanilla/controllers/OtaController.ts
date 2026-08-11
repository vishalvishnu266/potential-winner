/**
 * OtaController — thin adapter over the OTA service.
 *
 * Views should call methods here (never `otaService.*` directly) so we can
 * add cross-cutting concerns (analytics, permissions, retry) in one place.
 */

import { otaService, OtaState } from '../services';

export const OtaController = {
  start(intervalMs?: number): void { otaService.startAutoUpdate(intervalMs); },
  stop(): void { otaService.stopAutoUpdate(); },
  checkNow(): Promise<void> { return otaService.checkForUpdate(false); },
  subscribe(listener: (s: Readonly<OtaState>) => void): () => void {
    return otaService.subscribe(listener);
  },
  snapshot(): Readonly<OtaState> { return otaService.state; },
};
