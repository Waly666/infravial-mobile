/**
 * GeoJSON RFC 7946 — Point. Alineación con campos que el backend ya expone/consuma.
 * (Iteración E: captura con expo-location + permisos.)
 */
export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface GeolocationCapture {
  point: GeoJsonPoint;
  accuracyMeters?: number;
  /** Metros sobre el elipsoide WGS84 (expo-location `coords.altitude`). */
  altitudeMeters?: number | null;
  capturedAtIso: string;
}
