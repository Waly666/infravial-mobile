import Constants from 'expo-constants';

import { getStoredApiBaseUrlSync } from '@/config/apiBaseUrlStorage';

/**
 * API de producción (misma base que el front Angular: `environment.apiUrl` = `/api`).
 * El backend Express expone `/auth`, `/via-tramos`, etc. en la raíz; en el dominio público
 * todo entra bajo `/api/...` vía proxy.
 */
export const PRODUCTION_API_BASE_URL = 'https://infravial.cloud/api';

export function getFixedProductionApiBaseUrl(): string {
  return PRODUCTION_API_BASE_URL.replace(/\/+$/, '');
}

/** APK y builds release: la URL de API no se puede cambiar en runtime. */
export function isApiBaseUrlLocked(): boolean {
  return !__DEV__;
}

/**
 * Desarrollo (Expo Go, `npx expo start`): prioridad
 * EXPO_PUBLIC_* → extra en app.config → producción.
 * Release/APK: siempre {@link PRODUCTION_API_BASE_URL}.
 */
export function getDefaultApiBaseUrl(): string {
  if (!__DEV__) {
    return getFixedProductionApiBaseUrl();
  }
  const fromPublic = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromPublic) {
    return fromPublic.replace(/\/+$/, '');
  }
  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  const fromExtra = extra?.apiBaseUrl?.trim();
  if (fromExtra) {
    return fromExtra.replace(/\/+$/, '');
  }
  return getFixedProductionApiBaseUrl();
}

/**
 * URL efectiva para axios. En release ignora AsyncStorage y variables de entorno
 * (queda fija para el APK de producción).
 */
export function getApiBaseUrl(): string {
  if (!__DEV__) {
    return getFixedProductionApiBaseUrl();
  }
  const fromStored = getStoredApiBaseUrlSync();
  if (fromStored) {
    return fromStored;
  }
  return getDefaultApiBaseUrl();
}
