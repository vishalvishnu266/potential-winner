import { appStore } from '../state';
import { jobsService, sponsorsService, locationService } from '../services';

export const FeedController = {
  async loadNearby(): Promise<void> {
    const { radiusKm } = appStore.state.ui;
    const { lat, lon } = locationService.current;
    appStore.update({ feed: { ...appStore.state.feed, loading: true, error: null } });
    try {
      const jobs = await jobsService.listNearby(lat, lon, radiusKm);
      appStore.update({ feed: { jobs, loading: false, error: null } });
    } catch (e) {
      appStore.update({
        feed: { ...appStore.state.feed, loading: false, error: String(e) },
      });
    }
  },

  async loadSponsors(): Promise<void> {
    appStore.update({ local: { ...appStore.state.local, loading: true } });
    try {
      const sponsors = await sponsorsService.listNearby();
      appStore.update({ local: { sponsors, loading: false } });
    } catch {
      appStore.update({ local: { ...appStore.state.local, loading: false } });
    }
  },

  setRadius(km: number): void {
    appStore.update({ ui: { ...appStore.state.ui, radiusKm: km } });
    void this.loadNearby();
  },
};
