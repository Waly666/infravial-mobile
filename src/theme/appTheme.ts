export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export type AppColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  tabInactive: string;
  /** Acento juvenil (cyan) — chips, highlights */
  accent: string;
  accentSoft: string;
  /** Fondo suave detrás de primary (pills activos) */
  primarySoft: string;
  /** Campos de texto */
  inputBg: string;
  /** Barra inferior tabs */
  tabBar: string;
  /** Degradado login / hero (inicio) */
  gradientHeroStart: string;
  gradientHeroEnd: string;
  /** Botón principal degradado */
  gradientCtaStart: string;
  gradientCtaEnd: string;
  successSoft: string;
  warningSoft: string;
  dangerSoft: string;
};

/** Claro: base lavanda suave + índigo vivo + cyan */
export const webLightColors: AppColors = {
  background: '#eef2ff',
  surface: '#ffffff',
  surfaceAlt: '#e0e7ff',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#c7d2fe',
  primary: '#4f46e5',
  secondary: '#7c3aed',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  tabInactive: '#94a3b8',
  accent: '#06b6d4',
  accentSoft: 'rgba(6, 182, 212, 0.18)',
  primarySoft: 'rgba(79, 70, 229, 0.12)',
  inputBg: '#f8fafc',
  tabBar: '#ffffff',
  gradientHeroStart: '#6366f1',
  gradientHeroEnd: '#22d3ee',
  gradientCtaStart: '#4f46e5',
  gradientCtaEnd: '#0891b2',
  successSoft: 'rgba(5, 150, 105, 0.12)',
  warningSoft: 'rgba(217, 119, 6, 0.14)',
  dangerSoft: 'rgba(220, 38, 38, 0.1)',
};

/** Oscuro: azul noche + neón suave */
export const webDarkColors: AppColors = {
  background: '#0b1020',
  surface: '#131a2e',
  surfaceAlt: '#1c2640',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  border: '#334155',
  primary: '#818cf8',
  secondary: '#c084fc',
  success: '#34d399',
  warning: '#fbbf24',
  danger: '#f87171',
  tabInactive: '#64748b',
  accent: '#22d3ee',
  accentSoft: 'rgba(34, 211, 238, 0.15)',
  primarySoft: 'rgba(129, 140, 248, 0.18)',
  inputBg: '#0f172a',
  tabBar: '#131a2e',
  gradientHeroStart: '#4338ca',
  gradientHeroEnd: '#0e7490',
  gradientCtaStart: '#6366f1',
  gradientCtaEnd: '#06b6d4',
  successSoft: 'rgba(52, 211, 153, 0.14)',
  warningSoft: 'rgba(251, 191, 36, 0.12)',
  dangerSoft: 'rgba(248, 113, 113, 0.12)',
};

export function getColors(theme: ResolvedTheme): AppColors {
  return theme === 'dark' ? webDarkColors : webLightColors;
}
