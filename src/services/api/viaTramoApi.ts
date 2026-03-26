import { getApiBaseUrl } from '@/config/env';
import { getAuthApiClient } from '@/services/api/client';
import * as tokenStorage from '@/services/auth/tokenStorage';
import { fetchArrayWithOfflineCache } from '@/services/offline/apiCache';
import type { ViaTramoListItemDto } from '@/types/viaTramo';

/** Igual que Angular `ViaTramoService.getAll()` → `{ tramos }`. */
export async function fetchViaTramos(): Promise<ViaTramoListItemDto[]> {
  return fetchArrayWithOfflineCache('via-tramos:list', async () => {
    const client = getAuthApiClient();
    const { data } = await client.get<{ tramos?: ViaTramoListItemDto[] }>('/via-tramos');
    return Array.isArray(data.tramos) ? data.tramos : [];
  });
}

export interface ViaTramoCreateResponse {
  tramo: ViaTramoListItemDto & { _id: string };
}

/** POST /via-tramos — requiere jornada activa (salvo admin) vía `checkJornada`. */
export async function createViaTramo(body: Record<string, unknown>): Promise<ViaTramoCreateResponse> {
  const client = getAuthApiClient();
  const { data } = await client.post<ViaTramoCreateResponse>('/via-tramos', body);
  return data;
}

/** GET /via-tramos/:id — mismo contrato que Angular `ViaTramoService.getById`. */
export async function fetchViaTramoById(id: string): Promise<{ tramo: Record<string, unknown> }> {
  const client = getAuthApiClient();
  const { data } = await client.get<{ message?: string; tramo?: Record<string, unknown> }>(
    `/via-tramos/${id}`,
  );
  if (!data.tramo || typeof data.tramo !== 'object') {
    throw new Error('Tramo no encontrado');
  }
  return { tramo: data.tramo };
}

export async function updateViaTramo(
  id: string,
  body: Record<string, unknown>,
): Promise<ViaTramoCreateResponse> {
  const client = getAuthApiClient();
  const { data } = await client.put<ViaTramoCreateResponse>(`/via-tramos/${id}`, body);
  return data;
}

export async function deleteViaTramo(id: string): Promise<void> {
  const client = getAuthApiClient();
  await client.delete(`/via-tramos/${id}`);
}

export async function updateViaTramoFotos(id: string, fotos: string[]): Promise<void> {
  const client = getAuthApiClient();
  await client.put(`/via-tramos/${id}`, { fotos });
}

export interface UploadViaTramoFotosResponse {
  urls: string[];
}

/** Multipart vía `fetch` (RN): axios suele romper el boundary de FormData. */
export async function uploadViaTramoFotos(files: { uri: string; name: string; type: string }[]): Promise<string[]> {
  if (files.length === 0) return [];
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error('API no configurada');
  }
  const token = await tokenStorage.getAccessToken();
  const fd = new FormData();
  for (const f of files) {
    fd.append('foto', { uri: f.uri, name: f.name, type: f.type } as unknown as Blob);
  }
  const res = await fetch(`${base}/upload/via-tramo`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Upload ${res.status}`);
  }
  const data = (await res.json()) as UploadViaTramoFotosResponse;
  return Array.isArray(data.urls) ? data.urls : [];
}
