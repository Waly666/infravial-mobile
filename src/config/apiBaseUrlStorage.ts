import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'infravial_api_base_url';

let cachedApiBaseUrl = '';

function normalizeApiBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export function getStoredApiBaseUrlSync(): string {
  return cachedApiBaseUrl;
}

export async function loadStoredApiBaseUrl(): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    cachedApiBaseUrl = normalizeApiBaseUrl(raw ?? '');
    return cachedApiBaseUrl;
  } catch {
    return cachedApiBaseUrl;
  }
}

export async function saveStoredApiBaseUrl(value: string): Promise<string> {
  const normalized = normalizeApiBaseUrl(value);
  cachedApiBaseUrl = normalized;
  if (normalized) {
    await AsyncStorage.setItem(STORAGE_KEY, normalized);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
  return normalized;
}
