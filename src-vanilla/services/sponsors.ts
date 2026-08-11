import { MOCK_SPONSORS, Sponsor } from '../data/mock';

export const sponsorsService = {
  async listNearby(): Promise<Sponsor[]> {
    // Fake latency to exercise loading states.
    await new Promise((r) => setTimeout(r, 150));
    return MOCK_SPONSORS;
  },
};
