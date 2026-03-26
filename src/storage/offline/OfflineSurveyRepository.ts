import type { OfflineSurveyDraft } from '@/types/offline';

/** Persistencia local de encuestas y cola de envío. */
export interface IOfflineSurveyRepository {
  saveDraft(draft: OfflineSurveyDraft): Promise<void>;
  /** Todos los registros (pantalla Sincronización). */
  listAll(): Promise<OfflineSurveyDraft[]>;
  /** Solo los que debe intentar subir el sincronizador. */
  listForSync(): Promise<OfflineSurveyDraft[]>;
  markStatus(localId: string, status: OfflineSurveyDraft['status'], err?: string): Promise<void>;
  bumpAttempt(localId: string, err: string): Promise<void>;
}
