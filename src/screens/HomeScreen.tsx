import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '@/hooks/useAuth';
import { useJornadaActiva } from '@/hooks/useJornadaActiva';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useNetworkMode } from '@/connectivity/NetworkModeProvider';
import { useAppTheme } from '@/theme/ThemeProvider';

export function HomeScreen(): React.JSX.Element {
  const { user, logout, busy } = useAuth();
  const { mode, setMode, colors } = useAppTheme();
  const { mode: networkMode, setMode: setNetworkMode } = useNetworkMode();
  const online = useOnlineStatus();
  const { jornada, loading: jornadaLoading, error: jornadaErr, refresh: refreshJornada } =
    useJornadaActiva();
  useFocusEffect(
    useCallback(() => {
      void refreshJornada();
    }, [refreshJornada]),
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.banner, { backgroundColor: colors.surfaceAlt }]}>
        <View
          style={[
            styles.dot,
            { backgroundColor: online ? colors.success : colors.danger },
          ]}
        />
        <Text style={[styles.bannerText, { color: colors.text }]}>
          {online ? 'En línea' : 'Sin conexión / revisando red'}
        </Text>
      </View>

      <Text style={[styles.hello, { color: colors.text }]}>
        {user?.nombres} {user?.apellidos}
      </Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        Cédula: {user?.user} · Rol: {user?.rol}
      </Text>

      <View style={styles.themeRow}>
        <Text style={[styles.section, { marginTop: 0, color: colors.text }]}>Apariencia</Text>
        <View style={styles.themeButtons}>
          <Pressable
            style={[
              styles.themeChip,
              { borderColor: colors.border, backgroundColor: colors.surface },
              mode === 'system' && { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
            ]}
            onPress={() => void setMode('system')}
          >
            <Text style={[styles.themeChipText, { color: colors.text }]}>Sistema</Text>
          </Pressable>
          <Pressable
            style={[
              styles.themeChip,
              { borderColor: colors.border, backgroundColor: colors.surface },
              mode === 'light' && { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
            ]}
            onPress={() => void setMode('light')}
          >
            <Text style={[styles.themeChipText, { color: colors.text }]}>Claro</Text>
          </Pressable>
          <Pressable
            style={[
              styles.themeChip,
              { borderColor: colors.border, backgroundColor: colors.surface },
              mode === 'dark' && { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
            ]}
            onPress={() => void setMode('dark')}
          >
            <Text style={[styles.themeChipText, { color: colors.text }]}>Oscuro</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.themeRow}>
        <Text style={[styles.section, { marginTop: 0, color: colors.text }]}>Modo de trabajo</Text>
        <Text style={[styles.meta, { marginTop: 4, color: colors.textMuted }]}>
          Offline recomendado en campo. Pasa a Online solo para actualizar/sincronizar.
        </Text>
        <View style={styles.themeButtons}>
          <Pressable
            style={[
              styles.themeChip,
              { borderColor: colors.border, backgroundColor: colors.surface },
              networkMode === 'offline' && {
                borderColor: colors.primary,
                backgroundColor: colors.surfaceAlt,
              },
            ]}
            onPress={() => void setNetworkMode('offline')}
          >
            <Text style={[styles.themeChipText, { color: colors.text }]}>Offline</Text>
          </Pressable>
          <Pressable
            style={[
              styles.themeChip,
              { borderColor: colors.border, backgroundColor: colors.surface },
              networkMode === 'online' && {
                borderColor: colors.primary,
                backgroundColor: colors.surfaceAlt,
              },
            ]}
            onPress={() => void setNetworkMode('online')}
          >
            <Text style={[styles.themeChipText, { color: colors.text }]}>Online</Text>
          </Pressable>
        </View>
      </View>

      <Text style={[styles.section, { color: colors.text }]}>Jornada activa</Text>
      {jornadaLoading ? (
        <ActivityIndicator style={{ marginVertical: 8 }} />
      ) : jornada ? (
        <View
          style={[
            styles.jornadaCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.jornadaLine, { color: colors.success }]}>
            {jornada.municipio ?? '—'}, {jornada.dpto ?? '—'}
          </Text>
          <Text style={[styles.jornadaSub, { color: colors.textMuted }]}>
            Supervisor: {jornada.supervisor ?? '—'} · Localidad: {jornada.localidad ?? '—'}
          </Text>
          <Text style={[styles.jornadaSub, { color: colors.textMuted }]}>Id jornada: {jornada._id}</Text>
        </View>
      ) : (
        <View
          style={[
            styles.warnCard,
            { backgroundColor: colors.surface, borderColor: colors.warning },
          ]}
        >
          <Text style={[styles.warnText, { color: colors.textMuted }]}>
            {jornadaErr
              ? jornadaErr
              : 'No hay jornada activa (la web tampoco deja guardar un tramo nuevo sin jornada).'}
          </Text>
        </View>
      )}

      <Text style={[styles.note, { color: colors.textMuted }]}>
        El flujo principal es el inventario de <Text style={{ fontWeight: '700' }}>tramos viales</Text>
        : ve a la pestaña Tramos, registra un nuevo tramo (POST /via-tramos) y, si aplica, la
        encuesta del tramo desde el mismo listado (secundario / cola offline en Sincronización).
      </Text>

      <Pressable
        style={[styles.outline, { borderColor: colors.primary }, busy && styles.outlineDisabled]}
        onPress={() => void logout()}
        disabled={busy}
      >
        <Text style={[styles.outlineText, { color: colors.primary }]}>Cerrar sesión</Text>
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
  themeRow: {
    marginTop: 18,
  },
  themeButtons: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  themeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  themeChipText: {
    fontSize: 13,
    fontWeight: '600',
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
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  outlineDisabled: {
    opacity: 0.5,
  },
  outlineText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
