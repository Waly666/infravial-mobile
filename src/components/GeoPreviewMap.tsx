import { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { radii } from '@/theme/designTokens';

function parseCoord(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (s === '') return null;
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export type GeoPreviewMapProps = {
  lat: unknown;
  lng: unknown;
  lat2?: unknown;
  lng2?: unknown;
  caption?: string;
  textMuted: string;
  borderColor: string;
  surfaceColor: string;
};

/**
 * Vista previa embebida (solo lectura) bajo lat/lng, alineada con la web (Leaflet).
 * En web (Expo) muestra resumen textual; en iOS/Android usa react-native-maps.
 */
export function GeoPreviewMap(props: GeoPreviewMapProps): React.JSX.Element {
  const { lat, lng, lat2, lng2, caption = 'Vista en mapa', textMuted, borderColor, surfaceColor } = props;

  const la1 = parseCoord(lat);
  const lo1 = parseCoord(lng);
  const la2 = parseCoord(lat2);
  const lo2 = parseCoord(lng2);

  const has1 = la1 != null && lo1 != null;
  const has2 = has1 && la2 != null && lo2 != null;

  const mapRef = useRef<MapView | null>(null);

  const initialRegion = useMemo(() => {
    if (has2) {
      const midLat = (la1! + la2!) / 2;
      const midLng = (lo1! + lo2!) / 2;
      const dLat = Math.max(Math.abs(la1! - la2!) * 2.2, 0.003);
      const dLng = Math.max(Math.abs(lo1! - lo2!) * 2.2, 0.003);
      return { latitude: midLat, longitude: midLng, latitudeDelta: dLat, longitudeDelta: dLng };
    }
    if (has1) {
      return { latitude: la1!, longitude: lo1!, latitudeDelta: 0.004, longitudeDelta: 0.004 };
    }
    return { latitude: 4.6, longitude: -74.08, latitudeDelta: 0.5, longitudeDelta: 0.5 };
  }, [has1, has2, la1, lo1, la2, lo2]);

  useEffect(() => {
    if (Platform.OS === 'web' || !has2) return;
    const t = setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        [
          { latitude: la1!, longitude: lo1! },
          { latitude: la2!, longitude: lo2! },
        ],
        { edgePadding: { top: 44, right: 32, bottom: 44, left: 32 }, animated: true },
      );
    }, 350);
    return () => clearTimeout(t);
  }, [has2, la1, lo1, la2, lo2]);

  if (!has1) {
    return (
      <View style={styles.wrap}>
        <Text style={[styles.caption, { color: textMuted }]}>{caption}</Text>
        <View style={[styles.placeholder, { borderColor, backgroundColor: surfaceColor }]}>
          <Text style={[styles.placeholderTxt, { color: textMuted }]}>
            Sin coordenadas. Usa GPS o escribe latitud y longitud arriba.
          </Text>
        </View>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.wrap}>
        <Text style={[styles.caption, { color: textMuted }]}>{caption}</Text>
        <View style={[styles.placeholder, { borderColor, backgroundColor: surfaceColor }]}>
          <Text style={[styles.placeholderTxt, { color: textMuted }]}>
            {has2
              ? `Inicio: ${la1!.toFixed(6)}, ${lo1!.toFixed(6)}\nFin: ${la2!.toFixed(6)}, ${lo2!.toFixed(6)}`
              : `Punto: ${la1!.toFixed(6)}, ${lo1!.toFixed(6)}`}
          </Text>
          <Text style={[styles.webHint, { color: textMuted }]}>
            Mapa interactivo en la app iOS / Android.
          </Text>
        </View>
      </View>
    );
  }

  const mapKey = has2 ? `L-${la1}-${lo1}-${la2}-${lo2}` : `P-${la1}-${lo1}`;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.caption, { color: textMuted }]}>{caption}</Text>
      <MapView
        key={mapKey}
        ref={mapRef}
        style={[styles.map, { borderColor }]}
        initialRegion={initialRegion}
        scrollEnabled
        rotateEnabled={false}
        pitchEnabled={false}
        zoomEnabled
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        <Marker coordinate={{ latitude: la1!, longitude: lo1! }} title={has2 ? 'Inicio' : 'Ubicación'} pinColor={has2 ? 'green' : 'blue'} />
        {has2 ? (
          <>
            <Marker coordinate={{ latitude: la2!, longitude: lo2! }} title="Fin" pinColor="red" />
            <Polyline
              coordinates={[
                { latitude: la1!, longitude: lo1! },
                { latitude: la2!, longitude: lo2! },
              ]}
              strokeColor="#4a9eff"
              strokeWidth={4}
            />
          </>
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    marginBottom: 8,
  },
  caption: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  map: {
    width: '100%',
    height: 220,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
  },
  placeholder: {
    minHeight: 120,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'center',
  },
  placeholderTxt: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  webHint: {
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.85,
  },
});
