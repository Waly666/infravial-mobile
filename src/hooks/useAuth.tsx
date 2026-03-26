import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { loginRequest } from '@/services/api/client';
import * as tokenStorage from '@/services/auth/tokenStorage';
import { setSessionInvalidHandler } from '@/services/auth/sessionBridge';
import type { LoginRequest, SessionUser } from '@/types/auth';
import { getApiErrorMessage } from '@/types/api';

type AuthContextValue = {
  user: SessionUser | null;
  ready: boolean;
  busy: boolean;
  login: (creds: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await tokenStorage.loadStoredSession();
        if (!cancelled && session) {
          setUser(session.user);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSessionInvalidHandler(() => {
      setUser(null);
    });
    return () => setSessionInvalidHandler(null);
  }, []);

  const login = useCallback(async (creds: LoginRequest) => {
    setBusy(true);
    try {
      const data = await loginRequest(creds);
      await tokenStorage.saveSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.usuario,
      });
      setUser(data.usuario);
    } catch (e) {
      throw new Error(getApiErrorMessage(e, 'No se pudo iniciar sesión.'));
    } finally {
      setBusy(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await tokenStorage.clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, busy, login, logout }),
    [user, ready, busy, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}
