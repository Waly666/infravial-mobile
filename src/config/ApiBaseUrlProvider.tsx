import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { getApiBaseUrl, getDefaultApiBaseUrl } from '@/config/env';
import { getStoredApiBaseUrlSync, loadStoredApiBaseUrl, saveStoredApiBaseUrl } from '@/config/apiBaseUrlStorage';

type ApiBaseUrlContextValue = {
  apiBaseUrl: string;
  defaultApiBaseUrl: string;
  hasCustomApiBaseUrl: boolean;
  ready: boolean;
  setApiBaseUrl: (value: string) => Promise<void>;
  resetApiBaseUrl: () => Promise<void>;
};

const ApiBaseUrlContext = createContext<ApiBaseUrlContextValue | undefined>(undefined);

export function ApiBaseUrlProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const defaultApiBaseUrl = getDefaultApiBaseUrl();
  const [apiBaseUrl, setApiBaseUrlState] = useState(() => getApiBaseUrl());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadStoredApiBaseUrl();
      if (cancelled) return;
      setApiBaseUrlState(stored || defaultApiBaseUrl);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [defaultApiBaseUrl]);

  async function setApiBaseUrl(value: string): Promise<void> {
    const next = await saveStoredApiBaseUrl(value);
    setApiBaseUrlState(next || defaultApiBaseUrl);
  }

  async function resetApiBaseUrl(): Promise<void> {
    await saveStoredApiBaseUrl('');
    setApiBaseUrlState(defaultApiBaseUrl);
  }

  const value = useMemo(
    () => ({
      apiBaseUrl,
      defaultApiBaseUrl,
      hasCustomApiBaseUrl: Boolean(getStoredApiBaseUrlSync()),
      ready,
      setApiBaseUrl,
      resetApiBaseUrl,
    }),
    [apiBaseUrl, defaultApiBaseUrl, ready],
  );

  return <ApiBaseUrlContext.Provider value={value}>{children}</ApiBaseUrlContext.Provider>;
}

export function useApiBaseUrlConfig(): ApiBaseUrlContextValue {
  const ctx = useContext(ApiBaseUrlContext);
  if (!ctx) {
    throw new Error('useApiBaseUrlConfig debe usarse dentro de ApiBaseUrlProvider');
  }
  return ctx;
}
