/**
 * Public `sponsorsService` — thin re-export of the repository chosen by
 * the factory at boot.
 */

import { repositories } from '../repositories';
import type { SponsorsRepository } from '../repositories/types';

export const sponsorsService: SponsorsRepository = repositories.sponsors;
