/**
 * Repository interfaces — the sole contract between controllers/views and
 * the data layer. Implementations live in `mock/` or `http/` folders.
 *
 * Rule: nothing in the app imports a concrete implementation directly.
 *       Everything imports the interface *type* from here, and the
 *       singleton instance from `../services` (which re-exports from
 *       `./index.ts`).
 */

import type { CategoryKey } from '../data/categories';
import type { MockJob, Sponsor } from '../data/mock';
import type { Provider } from '../services/providers-types';

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export interface JobsRepository {
  listNearby(lat: number, lon: number, radiusKm: number): Promise<MockJob[]>;
  byId(id: string): Promise<MockJob | null>;
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

export interface ProvidersRepository {
  listNearby(
    lat: number,
    lon: number,
    radiusKm: number,
    category?: CategoryKey,
  ): Promise<Provider[]>;
  byId(id: string): Promise<Provider | null>;
}

// ---------------------------------------------------------------------------
// Sponsors
// ---------------------------------------------------------------------------

export interface SponsorsRepository {
  listNearby(): Promise<Sponsor[]>;
}

// ---------------------------------------------------------------------------
// Repository bundle — what the factory returns.
// ---------------------------------------------------------------------------

export interface Repositories {
  jobs: JobsRepository;
  providers: ProvidersRepository;
  sponsors: SponsorsRepository;
}
