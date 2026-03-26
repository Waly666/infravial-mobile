import { getAuthApiClient } from '@/services/api/client';
import { fetchArrayWithOfflineCache } from '@/services/offline/apiCache';
import type { DemarcacionDto, ObsShDto, UbicSenHorDto } from '@/types/senHor';

export async function fetchDemarcaciones(): Promise<DemarcacionDto[]> {
  return fetchArrayWithOfflineCache('catalog:demarcaciones', async () => {
    const client = getAuthApiClient();
    const { data } = await client.get<{ datos?: DemarcacionDto[] }>('/catalogos/demarcaciones');
    return Array.isArray(data.datos) ? data.datos : [];
  });
}

export async function fetchUbicSenHor(): Promise<UbicSenHorDto[]> {
  return fetchArrayWithOfflineCache('catalog:ubic-sen-hor', async () => {
    const client = getAuthApiClient();
    const { data } = await client.get<{ datos?: UbicSenHorDto[] }>('/catalogos/ubic-sen-hor');
    return Array.isArray(data.datos) ? data.datos : [];
  });
}

export async function fetchObsSh(): Promise<ObsShDto[]> {
  return fetchArrayWithOfflineCache('catalog:obs-sh', async () => {
    const client = getAuthApiClient();
    const { data } = await client.get<{ datos?: ObsShDto[] }>('/catalogos/obs-sh');
    return Array.isArray(data.datos) ? data.datos : [];
  });
}

