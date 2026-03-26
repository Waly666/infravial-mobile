import { getApiBaseUrl } from '@/config/env';
import { getAuthApiClient } from '@/services/api/client';
import { fetchArrayWithOfflineCache } from '@/services/offline/apiCache';
import * as tokenStorage from '@/services/auth/tokenStorage';
import type { SemaforoDto } from '@/types/semaforo';

export async function fetchSemaforos(): Promise<SemaforoDto[]> {
  return fetchArrayWithOfflineCache('semaforos:list', async () => {
    const client = getAuthApiClient();
    const { data } = await client.get<{ registros?: SemaforoDto[] }>('/semaforos');
    return Array.isArray(data.registros) ? data.registros : [];
  });
}

export async function fetchSemaforoById(id: string): Promise<SemaforoDto | null> {
  const client = getAuthApiClient();
  const { data } = await client.get<{ registro?: SemaforoDto }>(`/semaforos/${id}`);
  return data.registro ?? null;
}

export async function createSemaforo(body: Record<string, unknown>): Promise<SemaforoDto> {
  const client = getAuthApiClient();
  const { data } = await client.post<{ registro: SemaforoDto }>('/semaforos', body);
  return data.registro;
}

export async function updateSemaforo(id: string, body: Record<string, unknown>): Promise<SemaforoDto> {
  const client = getAuthApiClient();
  const { data } = await client.put<{ registro: SemaforoDto }>(`/semaforos/${id}`, body);
  return data.registro;
}

export async function updateSemaforoCaras(id: string, caras: unknown[]): Promise<void> {
  const client = getAuthApiClient();
  await client.put(`/semaforos/${id}/caras`, { caras });
}

export async function deleteSemaforo(id: string): Promise<void> {
  const client = getAuthApiClient();
  await client.delete(`/semaforos/${id}`);
}

export async function uploadSemaforoFoto(file: { uri: string; name: string; type: string }): Promise<string> {
  const base = getApiBaseUrl();
  if (!base) throw new Error('API no configurada');
  const token = await tokenStorage.getAccessToken();
  const fd = new FormData();
  fd.append('foto', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  const res = await fetch(`${base}/upload/semaforo`, {
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

