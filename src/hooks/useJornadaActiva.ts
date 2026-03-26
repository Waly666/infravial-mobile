import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchJornadaActiva } from '@/services/api/jornadaApi';
import type { JornadaActivaDto } from '@/types/jornada';

const JORNADA_CACHE_KEY = 'offline:last_jornada_activa';

async function readCachedJornada(): Promise<JornadaActivaDto | null> {
  try {
    const raw = await AsyncStorage.getItem(JORNADA_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as JornadaActivaDto;
    if (!parsed || typeof parsed !== 'object' || !parsed._id) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeCachedJornada(jornada: JornadaActivaDto): Promise<void> {
  try {
    await AsyncStorage.setItem(JORNADA_CACHE_KEY, JSON.stringify(jornada));
  } catch {
    // noop
  }
}

async function clearCachedJornada(): Promise<void> {
  try {
    await AsyncStorage.removeItem(JORNADA_CACHE_KEY);
  } catch {
    // noop
  }
}

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
      if (j) {
        await writeCachedJornada(j);
      } else {
        await clearCachedJornada();
      }
    } catch (e) {
      const cached = await readCachedJornada();
      if (cached) {
        setJornada(cached);
        setError(null);
      } else {
        setError(e instanceof Error ? e.message : 'No se pudo consultar la jornada');
        setJornada(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { jornada, loading, error, refresh };
}
