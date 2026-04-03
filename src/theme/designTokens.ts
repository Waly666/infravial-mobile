import type { ResolvedTheme } from '@/theme/appTheme';

/** Radios consistentes (look más suave y “app 2024+”). */
export const radii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const space = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
} as const;

/** Sombra tarjetas: iOS + Android elevation */
export function shadowCard(theme: ResolvedTheme): {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
} {
  if (theme === 'dark') {
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.45,
      shadowRadius: 20,
      elevation: 10,
    };
  }
  return {
    shadowColor: '#3730a3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 6,
  };
}

export function shadowTabBar(theme: ResolvedTheme): {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
} {
  if (theme === 'dark') {
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 16,
    };
  }
  return {
    shadowColor: '#4338ca',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 12,
  };
}
