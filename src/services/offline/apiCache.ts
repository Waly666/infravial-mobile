import AsyncStorage from '@react-native-async-storage/async-storage';

type CacheEnvelope<T> = {
  updatedAt: string;
  data: T[];
};

function cacheKey(key: string): string {
  return `api_cache:${key}`;
}

async function readCache<T>(key: string): Promise<T[] | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!Array.isArray(parsed.data)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

async function writeCache<T>(key: string, data: T[]): Promise<void> {
  try {
    const payload: CacheEnvelope<T> = { updatedAt: new Date().toISOString(), data };
    await AsyncStorage.setItem(cacheKey(key), JSON.stringify(payload));
  } catch {
    // noop
  }
}

export async function fetchArrayWithOfflineCache<T>(
  key: string,
  fetcher: () => Promise<T[]>,
): Promise<T[]> {
  try {
    const fresh = await fetcher();
    await writeCache(key, fresh);
    return fresh;
  } catch (err) {
    const cached = await readCache<T>(key);
    if (cached) return cached;
    return [];
  }
}

