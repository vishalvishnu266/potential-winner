import type { JobsRepository } from '../types';
import type { MockJob } from '../../data/mock';
import { generateJobs } from '../../data/mock';

export class MockJobsRepository implements JobsRepository {
  async listNearby(lat: number, lon: number, radiusKm: number): Promise<MockJob[]> {
    return generateJobs(lat, lon, 24).filter((j) => j.distanceKm <= radiusKm);
  }
  async byId(id: string): Promise<MockJob | null> {
    return generateJobs().find((j) => j.id === id) ?? null;
  }
}
