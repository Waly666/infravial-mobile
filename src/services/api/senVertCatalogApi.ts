import { getAuthApiClient } from '@/services/api/client';
import type { ObsSvDto, SenVertCatalogoDto } from '@/types/senVert';

export async function fetchSenVertCatalogo(): Promise<SenVertCatalogoDto[]> {
  const client = getAuthApiClient();
  const { data } = await client.get<{ datos?: SenVertCatalogoDto[] }>('/catalogos/sen-vert');
  return Array.isArray(data.datos) ? data.datos : [];
}

export async function fetchObsSvCatalogo(): Promise<ObsSvDto[]> {
  const client = getAuthApiClient();
  const { data } = await client.get<{ datos?: ObsSvDto[] }>('/catalogos/obs-sv');
  return Array.isArray(data.datos) ? data.datos : [];
}
