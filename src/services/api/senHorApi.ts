import { getApiBaseUrl } from '@/config/env';
import { getAuthApiClient } from '@/services/api/client';
import { fetchArrayWithOfflineCache } from '@/services/offline/apiCache';
import * as tokenStorage from '@/services/auth/tokenStorage';
import type { ExistSenHorListItemDto } from '@/types/senHor';

export async function fetchExistSenHorRegistros(): Promise<ExistSenHorListItemDto[]> {
  return fetchArrayWithOfflineCache('sen-hor:list', async () => {
    const client = getAuthApiClient();
    const { data } = await client.get<{ registros?: ExistSenHorListItemDto[] }>('/sen-hor');
    return Array.isArray(data.registros) ? data.registros : [];
  });
}

export async function fetchExistSenHorById(id: string): Promise<ExistSenHorListItemDto | null> {
  const client = getAuthApiClient();
  const { data } = await client.get<{ registro?: ExistSenHorListItemDto }>(`/sen-hor/${id}`);
  return data.registro ?? null;
}

export async function createExistSenHor(body: Record<string, unknown>): Promise<ExistSenHorListItemDto> {
  const client = getAuthApiClient();
  const { data } = await client.post<{ registro: ExistSenHorListItemDto }>('/sen-hor', body);
  return data.registro;
}

export async function updateExistSenHor(id: string, body: Record<string, unknown>): Promise<ExistSenHorListItemDto> {
  const client = getAuthApiClient();
  const { data } = await client.put<{ registro: ExistSenHorListItemDto }>(`/sen-hor/${id}`, body);
  return data.registro;
}

export async function deleteExistSenHor(id: string): Promise<void> {
  const client = getAuthApiClient();
  await client.delete(`/sen-hor/${id}`);
}

export async function uploadSenHorFoto(file: { uri: string; name: string; type: string }): Promise<string> {
  const base = getApiBaseUrl();
  if (!base) throw new Error('API no configurada');
  const token = await tokenStorage.getAccessToken();
  const fd = new FormData();
  fd.append('foto', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  const res = await fetch(`${base}/upload/sen-hor`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Upload ${res.status}`);
  }
  const data = (await res.json()) as { urls?: string[] };
  const u = data.urls?.[0];
  if (!u) throw new Error('Sin URL de foto');
  return u;
}

