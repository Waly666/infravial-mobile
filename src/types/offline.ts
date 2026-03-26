/**
 * Estados de ciclo de vida para registros hechos fuera de línea.
 * (Iteración D: persistencia SQLite + cola de envío.)
 */
export type OfflineRecordStatus = 'borrador' | 'pendiente' | 'enviado' | 'error';

export interface OfflineSurveyDraft {
  /** UUID v4 generado en dispositivo; clave de deduplicación con backend. */
  localId: string;
  status: OfflineRecordStatus;
  /** Identificador de recurso en servidor una vez aceptado (si aplica). */
  serverId?: string;
  createdAt: string;
  updatedAt: string;
  /** Cuerpo alineado con POST existente o con contrato de sincronización. */
  payload: Record<string, unknown>;
  lastError?: string;
  attemptCount: number;
}

/** Entrada genérica de cola (subir, reintentar, marcar error). */
export interface SyncQueueItem {
  id: string;
  kind: 'encuesta_vial' | string;
  localRecordId: string;
  priority: number;
  createdAt: string;
  attempts: number;
  nextAttemptAt: string | null;
}
