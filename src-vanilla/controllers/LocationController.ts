/**
 * LocationController — orchestrates location prompts + updates the store.
 */

import { appStore, AppState } from '../state';
import { locationService } from '../services';

export const LocationController = {
  async init(): Promise<void> {
    await locationService.init();
    // Push initial coord into the store so views can read it synchronously.
    const c = locationService.current;
    appStore.update({ location: { coord: c, permission: locationService.permission } });
    // Keep the store in sync with the service on every update.
    locationService.subscribe((coord) => {
      appStore.update({
        location: {
          coord,
          permission: locationService.permission,
        } as AppState['location'],
      });
    });
  },

  async requestNow(): Promise<void> {
    await locationService.getCurrent(true);
    appStore.update({
      location: {
        coord: locationService.current,
        permission: locationService.permission,
      } as AppState['location'],
    });
  },
};
