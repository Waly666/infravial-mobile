import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

import { getApiBaseUrl } from '@/config/env';
import * as tokenStorage from '@/services/auth/tokenStorage';
import { emitSessionInvalid } from '@/services/auth/sessionBridge';
import type { ApiErrorBody } from '@/types/api';
import type { LoginRequest, LoginResponseBody, RefreshResponseBody } from '@/types/auth';

const JSON_UTF8 = 'application/json';

function createBareClient(baseURL: string): AxiosInstance {
  return axios.create({
    baseURL,
    timeout: 12_000,
    headers: {
      Accept: JSON_UTF8,
      'Content-Type': JSON_UTF8,
    },
  });
}

let bareClient: AxiosInstance | null = null;
let authClient: AxiosInstance | null = null;

function ensureClients(): { bare: AxiosInstance; auth: AxiosInstance } {
  const baseURL = getApiBaseUrl();
  if (!baseURL) {
    throw new Error(
      'API no configurada: defina EXPO_PUBLIC_API_BASE_URL (ver .env.example).',
    );
  }
  if (!bareClient || bareClient.defaults.baseURL !== baseURL) {
    bareClient = createBareClient(baseURL);
    authClient = createBareClient(baseURL);
    attachAuthInterceptor(authClient);
  }
  return { bare: bareClient, auth: authClient! };
}

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }
  refreshPromise = (async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('Sin sesión');
    }
    const { bare } = ensureClients();
    const { data } = await bare.post<RefreshResponseBody>('/auth/refresh', {
      refreshToken,
    });
    await tokenStorage.setAccessToken(data.accessToken);
    return data.accessToken;
  })();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

function shouldTryRefresh(status: number, body: ApiErrorBody | undefined): boolean {
  if (status === 401) {
    const msg = body?.message ?? '';
    return !msg.includes('Acceso restringido');
  }
  if (status === 403) {
    const msg = body?.message ?? '';
    return msg.includes('Token inválido');
  }
  return false;
}

function attachAuthInterceptor(instance: AxiosInstance): void {
  instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const token = await tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (res) => res,
    async (error: AxiosError<ApiErrorBody>) => {
      const status = error.response?.status;
      const cfg = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
      const body = error.response?.data;

      if (!cfg || cfg._retry || !status) {
        return Promise.reject(error);
      }

      const url = cfg.url ?? '';
      if (url.includes('/auth/login') || url.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      if (!shouldTryRefresh(status, body)) {
        return Promise.reject(error);
      }

      cfg._retry = true;
      try {
        const newAccess = await refreshAccessToken();
        cfg.headers.Authorization = `Bearer ${newAccess}`;
        return instance.request(cfg);
      } catch {
        await tokenStorage.clearSession();
        emitSessionInvalid();
        return Promise.reject(error);
      }
    },
  );
}

export function getAuthApiClient(): AxiosInstance {
  return ensureClients().auth;
}

export async function loginRequest(body: LoginRequest): Promise<LoginResponseBody> {
  const { bare } = ensureClients();
  const { data } = await bare.post<LoginResponseBody>('/auth/login', body);
  return data;
}
