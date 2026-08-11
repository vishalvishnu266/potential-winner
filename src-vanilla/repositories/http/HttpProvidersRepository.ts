import type { ProvidersRepository } from '../types';
import type { Provider } from '../../services/providers-types';
import type { CategoryKey } from '../../data/categories';
import { http } from '../../services/http';

export class HttpProvidersRepository implements ProvidersRepository {
  constructor(private readonly baseUrl: string) {}
  async listNearby(lat: number, lon: number, radiusKm: number, category?: CategoryKey): Promise<Provider[]> {
    const q = new URLSearchParams({
      lat: String(lat), lon: String(lon), r: String(radiusKm),
    });
    if (category) q.set('cat', category);
    return http.get<Provider[]>(`${this.baseUrl}/api/providers?${q.toString()}`);
  }
  async byId(id: string): Promise<Provider | null> {
    try { return await http.get<Provider>(`${this.baseUrl}/api/providers/${encodeURIComponent(id)}`); }
    catch { return null; }
  }
}
