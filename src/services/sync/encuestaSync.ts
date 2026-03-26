import { postEncuestaVial } from '@/services/api/encuestaApi';
import { localPayloadToApiBody } from '@/services/sync/encuestaPayload';
import type { IOfflineSurveyRepository } from '@/storage/offline/OfflineSurveyRepository';
import { sqliteSurveyRepository } from '@/storage/offline/sqliteSurveyRepository';

export type SyncEncuestaResult = { enviados: number; errores: number };

export async function syncEncuestaOutbox(
  repo: IOfflineSurveyRepository = sqliteSurveyRepository,
): Promise<SyncEncuestaResult> {
  const items = await repo.listForSync();
  let enviados = 0;
  let errores = 0;
  for (const item of items) {
    try {
      const body = localPayloadToApiBody(item.payload);
      if (!body.idTramoVia || body.respuestas.length === 0) {
        await repo.bumpAttempt(item.localId, 'Faltan idTramoVia o respuestas.');
        errores += 1;
        continue;
      }
      await postEncuestaVial(body, item.localId);
      await repo.markStatus(item.localId, 'enviado');
      enviados += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await repo.bumpAttempt(item.localId, msg.slice(0, 500));
      errores += 1;
    }
  }
  return { enviados, errores };
}
