/** Metro/React Native: false en APK/release, true en desarrollo. */
declare const __DEV__: boolean;

declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_BASE_URL?: string;
  }
}
