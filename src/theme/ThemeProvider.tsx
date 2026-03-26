import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { getColors, type AppColors, type ResolvedTheme, type ThemeMode } from '@/theme/appTheme';

const STORAGE_KEY = 'infravial_theme_mode';

type ThemeCtx = {
  mode: ThemeMode;
  theme: ResolvedTheme;
  colors: AppColors;
  setMode: (m: ThemeMode) => Promise<void>;
};

const Ctx = createContext<ThemeCtx | undefined>(undefined);

function resolveTheme(mode: ThemeMode, system: 'light' | 'dark' | null | undefined): ResolvedTheme {
  if (mode === 'light') return 'light';
  if (mode === 'dark') return 'dark';
  return system === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancel || !raw) return;
        if (raw === 'system' || raw === 'light' || raw === 'dark') {
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

  async function setMode(m: ThemeMode): Promise<void> {
    setModeState(m);
    await AsyncStorage.setItem(STORAGE_KEY, m);
  }

  const theme = resolveTheme(mode, systemScheme);
  const colors = getColors(theme);

  const value = useMemo(() => ({ mode, theme, colors, setMode }), [mode, theme, colors]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppTheme debe usarse dentro de ThemeProvider');
  return ctx;
}

