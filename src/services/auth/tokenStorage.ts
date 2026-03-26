import * as SecureStore from 'expo-secure-store';

import type { SessionUser } from '@/types/auth';

const KEY_ACCESS = 'infravial_access_token';
const KEY_REFRESH = 'infravial_refresh_token';
const KEY_USER = 'infravial_session_user';

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

export async function saveSession(session: StoredSession): Promise<void> {
  await SecureStore.setItemAsync(KEY_ACCESS, session.accessToken);
  await SecureStore.setItemAsync(KEY_REFRESH, session.refreshToken);
  await SecureStore.setItemAsync(KEY_USER, JSON.stringify(session.user));
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_ACCESS);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_REFRESH);
}

export async function getStoredUser(): Promise<SessionUser | null> {
  const raw = await SecureStore.getItemAsync(KEY_USER);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export async function setAccessToken(accessToken: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_ACCESS, accessToken);
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_ACCESS);
  await SecureStore.deleteItemAsync(KEY_REFRESH);
  await SecureStore.deleteItemAsync(KEY_USER);
}

export async function loadStoredSession(): Promise<StoredSession | null> {
  const [accessToken, refreshToken, user] = await Promise.all([
    getAccessToken(),
    getRefreshToken(),
    getStoredUser(),
  ]);
  if (!accessToken || !refreshToken || !user) {
    return null;
  }
  return { accessToken, refreshToken, user };
}
