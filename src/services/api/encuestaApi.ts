import { getAuthApiClient } from '@/services/api/client';
import type { EncuestaVialApiBody, PreguntaEncViaDto } from '@/types/encuesta';
import { sortPreguntasByConsecutivo } from '@/utils/sortPreguntasEnc';

/**
 * Misma fuente que el wizard web (`via-tramo-form.ts`): `GET /catalogos/preguntas-enc` → `datos`.
 * El reporte Angular también puede usar `/encuesta-vial/preguntas`; el catálogo es el canónico del formulario.
 */
export async function fetchPreguntasEncuesta(): Promise<PreguntaEncViaDto[]> {
  const client = getAuthApiClient();
  const { data } = await client.get<{ datos?: PreguntaEncViaDto[] }>('/catalogos/preguntas-enc');
  const raw = Array.isArray(data.datos) ? data.datos : [];
  return sortPreguntasByConsecutivo(raw);
}

/** Respuestas ya guardadas de un tramo (reporte / edición). */
export async function fetchRespuestasEncuestaPorTramo(idTramo: string): Promise<unknown[]> {
  const client = getAuthApiClient();
  const { data } = await client.get<{ respuestas?: unknown[] }>(`/encuesta-vial/tramo/${idTramo}`);
  return Array.isArray(data.respuestas) ? data.respuestas : [];
}

export async function postEncuestaVial(
  body: EncuestaVialApiBody,
  idempotencyKey?: string,
): Promise<void> {
  const client = getAuthApiClient();
  await client.post('/encuesta-vial', body, {
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
  });
}
