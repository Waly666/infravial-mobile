import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '@/hooks/useAuth';
import { useJornadaActiva } from '@/hooks/useJornadaActiva';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function HomeScreen(): React.JSX.Element {
  const { user, logout, busy } = useAuth();
  const online = useOnlineStatus();
  const { jornada, loading: jornadaLoading, error: jornadaErr, refresh: refreshJornada } =
    useJornadaActiva();
  useFocusEffect(
    useCallback(() => {
      void refreshJornada();
    }, [refreshJornada]),
  );

  return (
    <View style={styles.root}>
      <View style={styles.banner}>
        <View style={[styles.dot, online ? styles.dotOn : styles.dotOff]} />
        <Text style={styles.bannerText}>{online ? 'En línea' : 'Sin conexión / revisando red'}</Text>
      </View>

      <Text style={styles.hello}>
        {user?.nombres} {user?.apellidos}
      </Text>
      <Text style={styles.meta}>
        Cédula: {user?.user} · Rol: {user?.rol}
      </Text>

      <Text style={styles.section}>Jornada activa</Text>
      {jornadaLoading ? (
        <ActivityIndicator style={{ marginVertical: 8 }} />
      ) : jornada ? (
        <View style={styles.jornadaCard}>
          <Text style={styles.jornadaLine}>
            {jornada.municipio ?? '—'}, {jornada.dpto ?? '—'}
          </Text>
          <Text style={styles.jornadaSub}>
            Supervisor: {jornada.supervisor ?? '—'} · Localidad: {jornada.localidad ?? '—'}
          </Text>
          <Text style={styles.jornadaSub}>Id jornada: {jornada._id}</Text>
        </View>
      ) : (
        <View style={styles.warnCard}>
          <Text style={styles.warnText}>
            {jornadaErr
              ? jornadaErr
              : 'No hay jornada activa (la web tampoco deja guardar un tramo nuevo sin jornada).'}
          </Text>
        </View>
      )}

      <Text style={styles.note}>
        El flujo principal es el inventario de <Text style={{ fontWeight: '700' }}>tramos viales</Text>
        : ve a la pestaña Tramos, registra un nuevo tramo (POST /via-tramos) y, si aplica, la
        encuesta del tramo desde el mismo listado (secundario / cola offline en Sincronización).
      </Text>

      <Pressable
        style={[styles.outline, busy && styles.outlineDisabled]}
        onPress={() => void logout()}
        disabled={busy}
      >
        <Text style={styles.outlineText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f7f8fa',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#e8edf3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotOn: {
    backgroundColor: '#2e7d32',
  },
  dotOff: {
    backgroundColor: '#c62828',
  },
  bannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#37474f',
  },
  hello: {
    marginTop: 28,
    fontSize: 22,
    fontWeight: '700',
    color: '#1a2332',
  },
  meta: {
    marginTop: 8,
    fontSize: 15,
    color: '#546e7a',
  },
  section: {
    marginTop: 20,
    fontSize: 15,
    fontWeight: '700',
    color: '#37474f',
  },
  jornadaCard: {
    marginTop: 8,
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  jornadaLine: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1b5e20',
  },
  jornadaSub: {
    marginTop: 4,
    fontSize: 13,
    color: '#2e7d32',
  },
  warnCard: {
    marginTop: 8,
    backgroundColor: '#fff8e1',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ffe082',
  },
  warnText: {
    fontSize: 14,
    color: '#6d4c41',
    lineHeight: 20,
  },
  note: {
    marginTop: 24,
    fontSize: 14,
    lineHeight: 20,
    color: '#607d8b',
  },
  outline: {
    marginTop: 'auto',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1e5a8a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  outlineDisabled: {
    opacity: 0.5,
  },
  outlineText: {
    color: '#1e5a8a',
    fontSize: 16,
    fontWeight: '600',
  },
});
