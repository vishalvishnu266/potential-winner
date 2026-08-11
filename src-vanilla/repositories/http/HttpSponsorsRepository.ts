import type { SponsorsRepository } from '../types';
import type { Sponsor } from '../../data/mock';
import { http } from '../../services/http';

export class HttpSponsorsRepository implements SponsorsRepository {
  constructor(private readonly baseUrl: string) {}
  async listNearby(): Promise<Sponsor[]> {
    return http.get<Sponsor[]>(`${this.baseUrl}/api/sponsors`);
  }
}
