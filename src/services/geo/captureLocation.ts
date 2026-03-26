import * as Location from 'expo-location';

import type { GeolocationCapture } from '@/types/geo';

export async function captureGeolocation(): Promise<GeolocationCapture> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== Location.PermissionStatus.GRANTED) {
    throw new Error('Permiso de ubicación denegado. Actívalo en ajustes del teléfono.');
  }
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return {
    point: {
      type: 'Point',
      coordinates: [pos.coords.longitude, pos.coords.latitude],
    },
    accuracyMeters: pos.coords.accuracy ?? undefined,
    altitudeMeters: pos.coords.altitude ?? null,
    capturedAtIso: new Date(pos.timestamp).toISOString(),
  };
}
