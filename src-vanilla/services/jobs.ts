/** Jobs service — mock-backed for now. Swap to `http` when backend is ready. */

import { generateJobs, MockJob } from '../data/mock';

export const jobsService = {
  async listNearby(lat = 12.9716, lon = 77.5946, radiusKm = 5): Promise<MockJob[]> {
    const all = generateJobs(lat, lon, 24);
    return all.filter((j) => j.distanceKm <= radiusKm);
  },
  async byId(id: string): Promise<MockJob | null> {
    const all = generateJobs();
    return all.find((j) => j.id === id) ?? null;
  },
};
