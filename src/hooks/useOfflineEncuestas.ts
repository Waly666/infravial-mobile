import { useCallback, useEffect, useState } from 'react';

import type { OfflineSurveyDraft } from '@/types/offline';
import { sqliteSurveyRepository } from '@/storage/offline/sqliteSurveyRepository';

export function useOfflineEncuestas(): {
  list: OfflineSurveyDraft[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [list, setList] = useState<OfflineSurveyDraft[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await sqliteSurveyRepository.listAll();
      setList(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { list, loading, refresh };
}
