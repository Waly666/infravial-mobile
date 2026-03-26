import { getAuthApiClient } from '@/services/api/client';
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
  const client = getAuthApiClient();
  const { data } = await client.get<{ datos?: ZatDto[] }>('/catalogos/zats', { params: filtros });
  return Array.isArray(data.datos) ? data.datos : [];
}

export async function fetchComunas(filtros?: { munDivipol?: string }): Promise<ComunaDto[]> {
  const client = getAuthApiClient();
  const { data } = await client.get<{ datos?: ComunaDto[] }>('/catalogos/comunas', { params: filtros });
  return Array.isArray(data.datos) ? data.datos : [];
}

export async function fetchBarrios(filtros?: { munDivipol?: string }): Promise<BarrioDto[]> {
  const client = getAuthApiClient();
  const { data } = await client.get<{ datos?: BarrioDto[] }>('/catalogos/barrios', { params: filtros });
  return Array.isArray(data.datos) ? data.datos : [];
}

export async function fetchEsquemasPerfil(): Promise<EsquemaPerfilDto[]> {
  const client = getAuthApiClient();
  const { data } = await client.get<{ datos?: EsquemaPerfilDto[] }>('/catalogos/esquema-perfil');
  return Array.isArray(data.datos) ? data.datos : [];
}

export async function fetchObsVias(): Promise<ObsViaDto[]> {
  const client = getAuthApiClient();
  const { data } = await client.get<{ datos?: ObsViaDto[] }>('/catalogos/obs-vias');
  return Array.isArray(data.datos) ? data.datos : [];
}

export async function fetchPreguntasEncuestaTramo(): Promise<PreguntaEncViaDto[]> {
  const client = getAuthApiClient();
  const { data } = await client.get<{ datos?: PreguntaEncViaDto[] }>('/catalogos/preguntas-enc');
  const raw = Array.isArray(data.datos) ? data.datos : [];
  return sortPreguntasByConsecutivo(raw);
}
