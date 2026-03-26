import { getAuthApiClient } from '@/services/api/client';
import { fetchArrayWithOfflineCache } from '@/services/offline/apiCache';
import type { PreguntaEncViaDto } from '@/types/encuesta';
import { sortPreguntasByConsecutivo } from '@/utils/sortPreguntasEnc';

export interface ZatDto {
  _id: string;
  zatNumero?: string;
  zatLetra?: string;
}

export interface ComunaDto {
  _id: string;
  comunaNumero?: string;
  comunaLetra?: string;
}

export interface BarrioDto {
  _id: string;
  nombre?: string;
}

export interface EsquemaPerfilDto {
  _id: string;
  codEsquema?: string;
  calzada?: string;
  urlImgEsq?: string;
}

export interface ObsViaDto {
  _id: string;
  txtObs?: string;
}

export async function fetchZats(filtros?: { munDivipol?: string }): Promise<ZatDto[]> {
  const key = `catalog:zats:${filtros?.munDivipol ?? 'all'}`;
  const list = await fetchArrayWithOfflineCache(key, async () => {
    const client = getAuthApiClient();
    const { data } = await client.get<{ datos?: ZatDto[] }>('/catalogos/zats', { params: filtros });
    return Array.isArray(data.datos) ? data.datos : [];
  });
  if (list.length === 0 && filtros?.munDivipol) {
    return fetchArrayWithOfflineCache('catalog:zats:all', async () => {
      const client = getAuthApiClient();
      const { data } = await client.get<{ datos?: ZatDto[] }>('/catalogos/zats');
      return Array.isArray(data.datos) ? data.datos : [];
    });
  }
  return list;
}

export async function fetchComunas(filtros?: { munDivipol?: string }): Promise<ComunaDto[]> {
  const key = `catalog:comunas:${filtros?.munDivipol ?? 'all'}`;
  const list = await fetchArrayWithOfflineCache(key, async () => {
    const client = getAuthApiClient();
    const { data } = await client.get<{ datos?: ComunaDto[] }>('/catalogos/comunas', {
      params: filtros,
    });
    return Array.isArray(data.datos) ? data.datos : [];
  });
  if (list.length === 0 && filtros?.munDivipol) {
    return fetchArrayWithOfflineCache('catalog:comunas:all', async () => {
      const client = getAuthApiClient();
      const { data } = await client.get<{ datos?: ComunaDto[] }>('/catalogos/comunas');
      return Array.isArray(data.datos) ? data.datos : [];
    });
  }
  return list;
}

export async function fetchBarrios(filtros?: { munDivipol?: string }): Promise<BarrioDto[]> {
  const key = `catalog:barrios:${filtros?.munDivipol ?? 'all'}`;
  const list = await fetchArrayWithOfflineCache(key, async () => {
    const client = getAuthApiClient();
    const { data } = await client.get<{ datos?: BarrioDto[] }>('/catalogos/barrios', {
      params: filtros,
    });
    return Array.isArray(data.datos) ? data.datos : [];
  });
  if (list.length === 0 && filtros?.munDivipol) {
    return fetchArrayWithOfflineCache('catalog:barrios:all', async () => {
      const client = getAuthApiClient();
      const { data } = await client.get<{ datos?: BarrioDto[] }>('/catalogos/barrios');
      return Array.isArray(data.datos) ? data.datos : [];
    });
  }
  return list;
}

export async function fetchEsquemasPerfil(): Promise<EsquemaPerfilDto[]> {
  return fetchArrayWithOfflineCache('catalog:esquema-perfil', async () => {
    const client = getAuthApiClient();
    const { data } = await client.get<{ datos?: EsquemaPerfilDto[] }>('/catalogos/esquema-perfil');
    return Array.isArray(data.datos) ? data.datos : [];
  });
}

export async function fetchObsVias(): Promise<ObsViaDto[]> {
  return fetchArrayWithOfflineCache('catalog:obs-vias', async () => {
    const client = getAuthApiClient();
    const { data } = await client.get<{ datos?: ObsViaDto[] }>('/catalogos/obs-vias');
    return Array.isArray(data.datos) ? data.datos : [];
  });
}

export async function fetchPreguntasEncuestaTramo(): Promise<PreguntaEncViaDto[]> {
  return fetchArrayWithOfflineCache('catalog:preguntas-enc', async () => {
    const client = getAuthApiClient();
    const { data } = await client.get<{ datos?: PreguntaEncViaDto[] }>('/catalogos/preguntas-enc');
    const raw = Array.isArray(data.datos) ? data.datos : [];
    return sortPreguntasByConsecutivo(raw);
  });
}
