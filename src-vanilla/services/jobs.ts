/**
 * Jobs service — env-aware.
 *   mock: locally generated deterministic mock jobs.
 *   dev/prod: real HTTP calls against `env.baseUrl()`.
 */

import { generateJobs, MockJob } from '../data/mock';
import { http } from './http';
import { env } from '../env';

export const jobsService = {
  async listNearby(lat = 12.9716, lon = 77.5946, radiusKm = 5): Promise<MockJob[]> {
    if (env.isMock()) {
      return generateJobs(lat, lon, 24).filter((j) => j.distanceKm <= radiusKm);
    }
    const url = `${env.baseUrl()}/api/jobs?lat=${lat}&lon=${lon}&r=${radiusKm}`;
    return http.get<MockJob[]>(url);
  },
  async byId(id: string): Promise<MockJob | null> {
    if (env.isMock()) {
      const all = generateJobs();
      return all.find((j) => j.id === id) ?? null;
    }
    try { return await http.get<MockJob>(`${env.baseUrl()}/api/jobs/${encodeURIComponent(id)}`); }
    catch { return null; }
  },
};
