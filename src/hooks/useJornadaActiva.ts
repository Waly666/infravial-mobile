import { useCallback, useEffect, useState } from 'react';

import { fetchJornadaActiva } from '@/services/api/jornadaApi';
import type { JornadaActivaDto } from '@/types/jornada';

export function useJornadaActiva(): {
  jornada: JornadaActivaDto | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [jornada, setJornada] = useState<JornadaActivaDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const j = await fetchJornadaActiva();
      setJornada(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo consultar la jornada');
      setJornada(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { jornada, loading, error, refresh };
}
