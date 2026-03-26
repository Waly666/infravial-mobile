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
};

export const webLightColors: AppColors = {
  background: '#f7f8fa',
  surface: '#ffffff',
  surfaceAlt: '#e8edf3',
  text: '#1a2332',
  textMuted: '#546e7a',
  border: '#cfd8dc',
  primary: '#1e5a8a',
  secondary: '#7b1fa2',
  success: '#2e7d32',
  warning: '#b28704',
  danger: '#c62828',
  tabInactive: '#78909c',
};

export const webDarkColors: AppColors = {
  background: '#0f141a',
  surface: '#18212b',
  surfaceAlt: '#202b36',
  text: '#e8eef5',
  textMuted: '#a7bacb',
  border: '#2d3b49',
  primary: '#4a8bc0',
  secondary: '#a06ac8',
  success: '#5bbd66',
  warning: '#d8b253',
  danger: '#ef6b6b',
  tabInactive: '#8ea2b4',
};

export function getColors(theme: ResolvedTheme): AppColors {
  return theme === 'dark' ? webDarkColors : webLightColors;
}

