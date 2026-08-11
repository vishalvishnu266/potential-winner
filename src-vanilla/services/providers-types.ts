/**
 * Pure `Provider` type — extracted here so `repositories/*` can import the
 * type without introducing a circular dependency with `services/`.
 */

import type { CategoryKey } from '../data/categories';

export interface Provider {
  id: string;
  name: string;
  category: CategoryKey;
  phone: string;
  lat: number;
  lon: number;
  distanceKm: number;
  rating: number;
  reviews: number;
  openNow: boolean;
  eta?: string;
}
