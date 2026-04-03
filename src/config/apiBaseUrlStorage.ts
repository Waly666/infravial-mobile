import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'infravial_api_base_url';

let cachedApiBaseUrl = '';

function normalizeApiBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

/** Dominio de prod sin prefijo `/api` (versión anterior de la app móvil). */
function coerceLegacyProductionUrl(normalized: string): string {
  if (!normalized) return '';
  if (/^https?:\/\/infravial\.cloud$/i.test(normalized)) {
    return `${normalized}/api`;
  }
  return normalized;
}

export function getStoredApiBaseUrlSync(): string {
  return cachedApiBaseUrl;
}

export async function loadStoredApiBaseUrl(): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    let next = normalizeApiBaseUrl(raw ?? '');
    next = coerceLegacyProductionUrl(next);
    cachedApiBaseUrl = next;
    if (raw != null && next && next !== normalizeApiBaseUrl(raw)) {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    }
    return cachedApiBaseUrl;
  } catch {
    return cachedApiBaseUrl;
  }
}

export async function saveStoredApiBaseUrl(value: string): Promise<string> {
  const normalized = coerceLegacyProductionUrl(normalizeApiBaseUrl(value));
  cachedApiBaseUrl = normalized;
  if (normalized) {
    await AsyncStorage.setItem(STORAGE_KEY, normalized);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
  return normalized;
}
