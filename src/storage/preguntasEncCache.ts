import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PreguntaEncViaDto } from '@/types/encuesta';

const KEY = '@infravial/preguntas_enc_v1';

export async function persistPreguntasEncCache(list: PreguntaEncViaDto[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function loadPreguntasEncCache(): Promise<PreguntaEncViaDto[] | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) {
    return null;
  }
  try {
    const p = JSON.parse(raw) as unknown;
    return Array.isArray(p) ? (p as PreguntaEncViaDto[]) : null;
  } catch {
    return null;
  }
}
