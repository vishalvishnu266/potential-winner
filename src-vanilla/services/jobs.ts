/**
 * Public `jobsService` — thin re-export of the repository chosen by the
 * factory at boot. Every caller keeps its existing import shape; the
 * concrete implementation (mock/http/…) is a single-file swap in
 * `../repositories/index.ts`.
 */

import { repositories } from '../repositories';
import type { JobsRepository } from '../repositories/types';

export const jobsService: JobsRepository = repositories.jobs;
