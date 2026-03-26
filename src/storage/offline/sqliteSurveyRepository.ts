import { getDatabase } from '@/storage/offline/db';
import type { IOfflineSurveyRepository } from '@/storage/offline/OfflineSurveyRepository';
import type { OfflineRecordStatus, OfflineSurveyDraft } from '@/types/offline';

type Row = {
  local_id: string;
  status: string;
  payload: string;
  last_error: string | null;
  attempt_count: number;
  created_at: string;
  updated_at: string;
};

function rowToDraft(row: Row): OfflineSurveyDraft {
  return {
    localId: row.local_id,
    status: row.status as OfflineRecordStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    lastError: row.last_error ?? undefined,
    attemptCount: row.attempt_count,
  };
}

export class SqliteSurveyRepository implements IOfflineSurveyRepository {
  async saveDraft(draft: OfflineSurveyDraft): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO encuesta_outbox
        (local_id, status, payload, last_error, attempt_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        draft.localId,
        draft.status,
        JSON.stringify(draft.payload),
        draft.lastError ?? null,
        draft.attemptCount,
        draft.createdAt,
        draft.updatedAt,
      ],
    );
  }

  async listAll(): Promise<OfflineSurveyDraft[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Row>(
      'SELECT * FROM encuesta_outbox ORDER BY updated_at DESC',
    );
    return rows.map(rowToDraft);
  }

  async listForSync(): Promise<OfflineSurveyDraft[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Row>(
      `SELECT * FROM encuesta_outbox
       WHERE status IN ('pendiente', 'error')
       ORDER BY updated_at ASC`,
    );
    return rows.map(rowToDraft);
  }

  async markStatus(
    localId: string,
    status: OfflineSurveyDraft['status'],
    err?: string,
  ): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE encuesta_outbox
       SET status = ?, last_error = ?, updated_at = ?
       WHERE local_id = ?`,
      [status, err ?? null, now, localId],
    );
  }

  async bumpAttempt(localId: string, err: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE encuesta_outbox
       SET status = 'error', last_error = ?, attempt_count = attempt_count + 1, updated_at = ?
       WHERE local_id = ?`,
      [err, now, localId],
    );
  }

  async updatePayload(localId: string, payload: Record<string, unknown>): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE encuesta_outbox
       SET payload = ?, status = 'pendiente', last_error = NULL, updated_at = ?
       WHERE local_id = ?`,
      [JSON.stringify(payload), now, localId],
    );
  }

  async deleteDraft(localId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM encuesta_outbox WHERE local_id = ?', [localId]);
  }
}

export const sqliteSurveyRepository = new SqliteSurveyRepository();
