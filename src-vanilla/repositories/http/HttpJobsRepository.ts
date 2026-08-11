import type { JobsRepository } from '../types';
import type { MockJob } from '../../data/mock';
import { http } from '../../services/http';

export class HttpJobsRepository implements JobsRepository {
  constructor(private readonly baseUrl: string) {}
  async listNearby(lat: number, lon: number, radiusKm: number): Promise<MockJob[]> {
    return http.get<MockJob[]>(
      `${this.baseUrl}/api/jobs?lat=${lat}&lon=${lon}&r=${radiusKm}`,
    );
  }
  async byId(id: string): Promise<MockJob | null> {
    try { return await http.get<MockJob>(`${this.baseUrl}/api/jobs/${encodeURIComponent(id)}`); }
    catch { return null; }
  }
}
