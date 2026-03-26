import { getAuthApiClient } from '@/services/api/client';
import { fetchArrayWithOfflineCache } from '@/services/offline/apiCache';
import type { ObsSemaforoDto } from '@/types/semaforo';

export async function fetchObsSemaforos(): Promise<ObsSemaforoDto[]> {
  return fetchArrayWithOfflineCache('catalog:obs-semaforos', async () => {
    const client = getAuthApiClient();
    const { data } = await client.get<{ datos?: ObsSemaforoDto[] }>('/catalogos/obs-semaforos');
    return Array.isArray(data.datos) ? data.datos : [];
  });
}

