import { getAuthApiClient } from '@/services/api/client';
import { fetchArrayWithOfflineCache } from '@/services/offline/apiCache';
import type { ObsSvDto, SenVertCatalogoDto } from '@/types/senVert';

export async function fetchSenVertCatalogo(): Promise<SenVertCatalogoDto[]> {
  return fetchArrayWithOfflineCache('catalog:sen-vert', async () => {
    const client = getAuthApiClient();
    const { data } = await client.get<{ datos?: SenVertCatalogoDto[] }>('/catalogos/sen-vert');
    return Array.isArray(data.datos) ? data.datos : [];
  });
}

export async function fetchObsSvCatalogo(): Promise<ObsSvDto[]> {
  return fetchArrayWithOfflineCache('catalog:obs-sv', async () => {
    const client = getAuthApiClient();
    const { data } = await client.get<{ datos?: ObsSvDto[] }>('/catalogos/obs-sv');
    return Array.isArray(data.datos) ? data.datos : [];
  });
}
