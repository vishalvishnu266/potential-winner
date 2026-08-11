/**
 * Repository factory.
 *
 * Reads the build-time `env.mode` exactly once and returns a frozen set of
 * concrete implementations. Callers never see the branching.
 *
 * Add a new backend (e.g. SQLite-cached, Cypress fixtures) by:
 *   1. Creating new implementations under `./sqlite/` or `./fixtures/`.
 *   2. Adding a case in `pickRepositories`.
 *   3. Adding the mode to `EnvMode` in `../env.ts`.
 */

import { env } from '../env';
import type { Repositories } from './types';

import { MockJobsRepository }      from './mock/MockJobsRepository';
import { MockProvidersRepository } from './mock/MockProvidersRepository';
import { MockSponsorsRepository }  from './mock/MockSponsorsRepository';

import { HttpJobsRepository }      from './http/HttpJobsRepository';
import { HttpProvidersRepository } from './http/HttpProvidersRepository';
import { HttpSponsorsRepository }  from './http/HttpSponsorsRepository';

function pickRepositories(): Repositories {
  if (env.mode === 'mock') {
    return {
      jobs:      new MockJobsRepository(),
      providers: new MockProvidersRepository(),
      sponsors:  new MockSponsorsRepository(),
    };
  }
  const baseUrl = env.baseUrl();
  return {
    jobs:      new HttpJobsRepository(baseUrl),
    providers: new HttpProvidersRepository(baseUrl),
    sponsors:  new HttpSponsorsRepository(baseUrl),
  };
}

/** Singleton repository bundle — built once, frozen. */
export const repositories: Readonly<Repositories> = Object.freeze(pickRepositories());

// Re-export interface types so callers can annotate against them.
export type * from './types';
