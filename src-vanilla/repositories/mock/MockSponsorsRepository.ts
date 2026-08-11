import type { SponsorsRepository } from '../types';
import { MOCK_SPONSORS, Sponsor } from '../../data/mock';

export class MockSponsorsRepository implements SponsorsRepository {
  async listNearby(): Promise<Sponsor[]> {
    // A little latency to exercise the loading state.
    await new Promise((r) => setTimeout(r, 100));
    return MOCK_SPONSORS;
  }
}
