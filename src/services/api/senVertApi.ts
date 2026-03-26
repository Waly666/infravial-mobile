import { getApiBaseUrl } from '@/config/env';
import { getAuthApiClient } from '@/services/api/client';
import * as tokenStorage from '@/services/auth/tokenStorage';
import type { ExistSenVertListItemDto } from '@/types/senVert';

export async function fetchExistSenVertRegistros(): Promise<ExistSenVertListItemDto[]> {
  const client = getAuthApiClient();
  const { data } = await client.get<{ registros?: ExistSenVertListItemDto[] }>('/sen-vert');
  return Array.isArray(data.registros) ? data.registros : [];
}

export async function fetchExistSenVertById(id: string): Promise<ExistSenVertListItemDto | null> {
  const client = getAuthApiClient();
  const { data } = await client.get<{ registro?: ExistSenVertListItemDto }>(`/sen-vert/${id}`);
  return data.registro ?? null;
}

export async function createExistSenVert(body: Record<string, unknown>): Promise<ExistSenVertListItemDto> {
  const client = getAuthApiClient();
  const { data } = await client.post<{ registro: ExistSenVertListItemDto }>('/sen-vert', body);
  return data.registro;
}

export async function updateExistSenVert(
  id: string,
  body: Record<string, unknown>,
): Promise<ExistSenVertListItemDto> {
  const client = getAuthApiClient();
  const { data } = await client.put<{ registro: ExistSenVertListItemDto }>(`/sen-vert/${id}`, body);
  return data.registro;
}

export async function deleteExistSenVert(id: string): Promise<void> {
  const client = getAuthApiClient();
  await client.delete(`/sen-vert/${id}`);
}

export async function uploadSenVertFoto(file: { uri: string; name: string; type: string }): Promise<string> {
  const base = getApiBaseUrl();
  if (!base) throw new Error('API no configurada');
  const token = await tokenStorage.getAccessToken();
  const fd = new FormData();
  fd.append('foto', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  const res = await fetch(`${base}/upload/sen-vert`, {
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
