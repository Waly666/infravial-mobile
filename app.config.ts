import type { ExpoConfig } from 'expo/config';

/**
 * Variables públicas: usar prefijo EXPO_PUBLIC_ (ver `.env.example`).
 * `extra` permite lectura vía expo-constants si hiciera falta en runtime nativo custom.
 */
export default (): ExpoConfig => ({
  name: 'InfraVial Mobile',
  slug: 'infravial-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
  },
  android: {
    package: 'com.nis00227.infravialmobile',
    /** Manifest: permitir `http://` en desarrollo (tipos de Expo pueden no listarlo). */
    // @ts-expect-error Android manifest — ver https://docs.expo.dev/versions/latest/config/app/#usescleartexttraffic
    usesCleartextTraffic: true,
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    './plugins/withAndroidCleartext',
    'expo-asset',
    'expo-secure-store',
    'expo-sqlite',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'InfraVial usa tu ubicación solo para asociar coordenadas al registro de campo.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'InfraVial adjunta fotos al inventario de tramo vial.',
        cameraPermission:
          'InfraVial puede usar la cámara para fotos del tramo.',
      },
    ],
  ],
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
    eas: {
      projectId: 'f19d04ae-c6f2-4322-997b-3c0dc129b7cd',
    },
  },
});
