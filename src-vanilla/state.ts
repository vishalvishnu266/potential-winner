/**
 * Global app store.
 * No component may mutate this directly — always go through controllers.
 */

import { Store } from './framework';
import type { CategoryKey } from './data/categories';
import type { MockJob, Sponsor } from './data/mock';

export type ThemeMode = 'light' | 'dark' | 'system';
export type UiMode = 'findHelp' | 'findWork';

export interface Session {
  userId: string | null;
  name: string | null;
  phone: string | null;
}

export interface AppState {
  session: Session;
  ui: {
    mode: UiMode;
    theme: ThemeMode;
    locale: 'en' | 'ta';
    radiusKm: number;
    categoryFilter: CategoryKey | 'all';
  };
  feed: {
    jobs: MockJob[];
    loading: boolean;
    error: string | null;
  };
  local: {
    sponsors: Sponsor[];
    loading: boolean;
  };
}

export const appStore = new Store<AppState>({
  session: { userId: null, name: null, phone: null },
  ui: {
    mode: 'findHelp',
    theme: 'system',
    locale: 'en',
    radiusKm: 5,
    categoryFilter: 'all',
  },
  feed: { jobs: [], loading: false, error: null },
  local: { sponsors: [], loading: false },
});
