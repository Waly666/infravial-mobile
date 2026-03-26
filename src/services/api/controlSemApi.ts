import { getApiBaseUrl } from '@/config/env';
import { getAuthApiClient } from '@/services/api/client';
import { fetchArrayWithOfflineCache } from '@/services/offline/apiCache';
import * as tokenStorage from '@/services/auth/tokenStorage';
import type { ControlSemDto } from '@/types/controlSem';

export async function fetchControlesSem(): Promise<ControlSemDto[]> {
  return fetchArrayWithOfflineCache('control-semaforo:list', async () => {
    const client = getAuthApiClient();
    const { data } = await client.get<{ registros?: ControlSemDto[] }>('/control-semaforo');
    return Array.isArray(data.registros) ? data.registros : [];
  });
}

export async function fetchControlSemById(id: string): Promise<ControlSemDto | null> {
  const client = getAuthApiClient();
  const { data } = await client.get<{ registro?: ControlSemDto }>(`/control-semaforo/${id}`);
  return data.registro ?? null;
}

export async function createControlSem(body: Record<string, unknown>): Promise<ControlSemDto> {
  const client = getAuthApiClient();
  const { data } = await client.post<{ registro: ControlSemDto }>('/control-semaforo', body);
  return data.registro;
}

export async function updateControlSem(id: string, body: Record<string, unknown>): Promise<ControlSemDto> {
  const client = getAuthApiClient();
  const { data } = await client.put<{ registro: ControlSemDto }>(`/control-semaforo/${id}`, body);
  return data.registro;
}

export async function deleteControlSem(id: string): Promise<void> {
  const client = getAuthApiClient();
  await client.delete(`/control-semaforo/${id}`);
}

export async function uploadControlSemFoto(file: { uri: string; name: string; type: string }): Promise<string> {
  const base = getApiBaseUrl();
  if (!base) throw new Error('API no configurada');
  const token = await tokenStorage.getAccessToken();
  const fd = new FormData();
  fd.append('foto', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  const res = await fetch(`${base}/upload/control-sem`, {
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

