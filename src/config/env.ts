import Constants from 'expo-constants';

import { getStoredApiBaseUrlSync } from '@/config/apiBaseUrlStorage';

/**
 * URL base del backend (sin slash final). Prioridad:
 * 1) URL guardada en Configuración dentro de la app
 * 2) EXPO_PUBLIC_API_BASE_URL (recomendado, por entorno dev/staging/prod)
 * 3) extra.apiBaseUrl en app.config.js (útil en builds EAS con secretos como env en build)
 */
export function getDefaultApiBaseUrl(): string {
  const fromPublic = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromPublic) {
    return fromPublic.replace(/\/+$/, '');
  }
  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  const fromExtra = extra?.apiBaseUrl?.trim();
  if (fromExtra) {
    return fromExtra.replace(/\/+$/, '');
  }
  return '';
}

export function getApiBaseUrl(): string {
  const fromStored = getStoredApiBaseUrlSync();
  if (fromStored) {
    return fromStored;
  }
  return getDefaultApiBaseUrl();
}
