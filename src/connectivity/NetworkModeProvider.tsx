import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type NetworkMode = 'offline' | 'online';

type Ctx = {
  mode: NetworkMode;
  setMode: (next: NetworkMode) => Promise<void>;
};

const STORAGE_KEY = 'infravial_network_mode';
const NetworkModeContext = createContext<Ctx | undefined>(undefined);

export function NetworkModeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [mode, setModeState] = useState<NetworkMode>('offline');

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancel) return;
        if (raw === 'offline' || raw === 'online') {
          setModeState(raw);
        }
      } catch {
        // noop
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  async function setMode(next: NetworkMode): Promise<void> {
    setModeState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch {
      // noop
    }
  }

  const value = useMemo(() => ({ mode, setMode }), [mode]);
  return <NetworkModeContext.Provider value={value}>{children}</NetworkModeContext.Provider>;
}

export function useNetworkMode(): Ctx {
  const ctx = useContext(NetworkModeContext);
  if (!ctx) throw new Error('useNetworkMode debe usarse dentro de NetworkModeProvider');
  return ctx;
}

