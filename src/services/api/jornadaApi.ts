import type { AxiosError } from 'axios';

import { getAuthApiClient } from '@/services/api/client';
import type { JornadaActivaDto } from '@/types/jornada';

/** Igual que la web: `GET /jornadas/activa`. 404 → sin jornada (no error). */
export async function fetchJornadaActiva(): Promise<JornadaActivaDto | null> {
  try {
    const client = getAuthApiClient();
    const { data } = await client.get<{ jornada: JornadaActivaDto }>('/jornadas/activa');
    return data.jornada ?? null;
  } catch (e) {
    const status = (e as AxiosError).response?.status;
    if (status === 404) {
      return null;
    }
    throw e;
  }
}
