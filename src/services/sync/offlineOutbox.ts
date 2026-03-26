import { sqliteSurveyRepository } from '@/storage/offline/sqliteSurveyRepository';
import { newLocalId } from '@/utils/id';

export async function enqueueOffline(kind: string, payload: Record<string, unknown>): Promise<void> {
  const now = new Date().toISOString();
  await sqliteSurveyRepository.saveDraft({
    localId: newLocalId(),
    status: 'pendiente',
    createdAt: now,
    updatedAt: now,
    payload: { _kind: kind, ...payload },
    attemptCount: 0,
  });
}

