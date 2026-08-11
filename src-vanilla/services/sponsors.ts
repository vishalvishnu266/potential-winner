import { MOCK_SPONSORS, Sponsor } from '../data/mock';
import { http } from './http';
import { env } from '../env';

export const sponsorsService = {
  async listNearby(): Promise<Sponsor[]> {
    if (env.isMock()) {
      await new Promise((r) => setTimeout(r, 100));
      return MOCK_SPONSORS;
    }
    return http.get<Sponsor[]>(`${env.baseUrl()}/api/sponsors`);
  },
};
