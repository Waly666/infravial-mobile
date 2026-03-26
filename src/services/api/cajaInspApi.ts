import { getApiBaseUrl } from '@/config/env';
import { getAuthApiClient } from '@/services/api/client';
import { fetchArrayWithOfflineCache } from '@/services/offline/apiCache';
import * as tokenStorage from '@/services/auth/tokenStorage';
import type { CajaInspDto } from '@/types/cajaInsp';

export async function fetchCajasInsp(): Promise<CajaInspDto[]> {
  return fetchArrayWithOfflineCache('cajas-inspeccion:list', async () => {
    const client = getAuthApiClient();
    const { data } = await client.get<{ registros?: CajaInspDto[] }>('/cajas-inspeccion');
    return Array.isArray(data.registros) ? data.registros : [];
  });
}

export async function fetchCajaInspById(id: string): Promise<CajaInspDto | null> {
  const client = getAuthApiClient();
  const { data } = await client.get<{ registro?: CajaInspDto }>(`/cajas-inspeccion/${id}`);
  return data.registro ?? null;
}

export async function createCajaInsp(body: Record<string, unknown>): Promise<CajaInspDto> {
  const client = getAuthApiClient();
  const { data } = await client.post<{ registro: CajaInspDto }>('/cajas-inspeccion', body);
  return data.registro;
}

export async function updateCajaInsp(id: string, body: Record<string, unknown>): Promise<CajaInspDto> {
  const client = getAuthApiClient();
  const { data } = await client.put<{ registro: CajaInspDto }>(`/cajas-inspeccion/${id}`, body);
  return data.registro;
}

export async function deleteCajaInsp(id: string): Promise<void> {
  const client = getAuthApiClient();
  await client.delete(`/cajas-inspeccion/${id}`);
}

// En Angular se reutiliza /upload/via-tramo para la foto de caja.
export async function uploadCajaInspFoto(file: { uri: string; name: string; type: string }): Promise<string> {
  const base = getApiBaseUrl();
  if (!base) throw new Error('API no configurada');
  const token = await tokenStorage.getAccessToken();
  const fd = new FormData();
  fd.append('foto', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  const res = await fetch(`${base}/upload/via-tramo`, {
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

