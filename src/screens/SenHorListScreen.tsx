import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '@/hooks/useAuth';
import { useJornadaActiva } from '@/hooks/useJornadaActiva';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import type { RootStackParamList } from '@/navigation/types';
import { deleteExistSenHor, fetchExistSenHorRegistros } from '@/services/api/senHorApi';
import { useAppTheme } from '@/theme/ThemeProvider';
import type { ExistSenHorListItemDto } from '@/types/senHor';

function tramoLabel(r: ExistSenHorListItemDto): string {
  const t = r.idViaTramo;
  if (t && typeof t === 'object') {
    return `${t.via ?? t.nomenclatura?.completa ?? '—'} · ${t.municipio ?? ''}`;
  }
  return String(t ?? '—');
}

export function SenHorListScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const { colors, theme } = useAppTheme();
  const online = useOnlineStatus();
  const { user } = useAuth();
  const { jornada, refresh: refreshJornada } = useJornadaActiva();
  const [registros, setRegistros] = useState<ExistSenHorListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const canAdmin = user?.rol === 'admin' || user?.rol === 'supervisor';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRegistros(await fetchExistSenHorRegistros());
    } catch {
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      void refreshJornada();
    }, [load, refreshJornada]),
  );

  function openWizard(id?: string): void {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('SenHorWizard' as keyof RootStackParamList, id ? { id } : undefined);
    }
  }

  async function eliminar(id: string): Promise<void> {
    if (!canAdmin) return;
    Alert.alert('Eliminar', '¿Eliminar esta señal horizontal?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteExistSenHor(id);
            void load();
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo eliminar');
          }
        },
      },
    ]);
  }

  const q = busqueda.trim().toLowerCase();
  const filtrados = q
    ? registros.filter(
        (r) =>
          (r.codSeHor ?? '').toLowerCase().includes(q) ||
          tramoLabel(r).toLowerCase().includes(q) ||
          (r.estadoDem ?? '').toLowerCase().includes(q) ||
          (r.material ?? '').toLowerCase().includes(q) ||
          r._id.toLowerCase().includes(q),
      )
    : registros;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.dot, online ? styles.dotOn : styles.dotOff]} />
        <Text style={[styles.bannerTxt, { color: colors.text }]}>
          {online ? 'En línea' : 'Sin conexión'}
        </Text>
      </View>

      {jornada ? (
        <Text style={[styles.jornadaOk, { color: colors.success }]}>
          Jornada: {jornada.municipio} — {jornada.supervisor}
        </Text>
      ) : (
        <Text style={[styles.jornadaWarn, { color: colors.warning }]}>
          Sin jornada activa: el alta de señales horizontales puede estar bloqueada en el servidor.
        </Text>
      )}

      <Pressable
        style={[
          styles.cta,
          { backgroundColor: '#111827', borderColor: '#111827', shadowColor: '#111827' },
          !jornada && styles.ctaDis,
        ]}
        onPress={() => openWizard()}
        disabled={!jornada}
      >
        <Text style={styles.ctaTxt}>＋ Nueva señal horizontal</Text>
      </Pressable>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        Tabla ExistSenHor — requiere tramo (`via_tramos`) y catálogos.
      </Text>

      <TextInput
        style={[
          styles.search,
          { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
        ]}
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Buscar código, vía, estado, material, id…"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
      />

      {loading ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null}

      <FlatList
        data={filtrados}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          !loading ? (
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              No hay registros o no coinciden con la búsqueda.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: theme === 'dark' ? '#000' : '#8aa3bb',
              },
            ]}
          >
            <View style={[styles.cardAccent, { backgroundColor: '#111827' }]} />
            <View style={styles.titleRow}>
              <MaterialCommunityIcons name="minus-circle-outline" size={17} color={colors.secondary} />
              <Text style={[styles.cod, { color: colors.secondary }]}>{item.codSeHor || '—'}</Text>
            </View>
            <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={2}>
              {tramoLabel(item)}
            </Text>
            <Text style={[styles.est, { color: colors.primary }]}>{item.estadoDem || '— estado'}</Text>
            <Text style={[styles.id, { color: colors.textMuted }]}>{item._id}</Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.link, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                onPress={() => openWizard(item._id)}
              >
                <Text style={[styles.linkTxt, { color: colors.primary }]}>Editar</Text>
              </Pressable>
              {canAdmin ? (
                <Pressable
                  style={[styles.link, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                  onPress={() => void eliminar(item._id)}
                >
                  <Text style={[styles.del, { color: colors.danger }]}>Eliminar</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f8fa' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { backgroundColor: '#2e7d32' },
  dotOff: { backgroundColor: '#c62828' },
  bannerTxt: { fontSize: 13, color: '#455a64' },
  jornadaOk: { paddingHorizontal: 12, paddingVertical: 8, color: '#1b5e20', fontWeight: '600' },
  jornadaWarn: { paddingHorizontal: 12, paddingVertical: 8, color: '#b71c1c', fontSize: 13 },
  cta: {
    marginHorizontal: 12,
    marginTop: 8,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    elevation: 5,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
  },
  ctaDis: { opacity: 0.45 },
  ctaTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  hint: { fontSize: 12, color: '#78909c', marginHorizontal: 12, marginTop: 6, marginBottom: 8 },
  search: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#cfd8dc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  empty: { textAlign: 'center', color: '#78909c', marginTop: 24 },
  card: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 3,
  },
  cardAccent: { width: 52, height: 4, borderRadius: 999, marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cod: { fontSize: 17, fontWeight: '700', color: '#004d40' },
  meta: { fontSize: 14, color: '#455a64', marginTop: 4 },
  est: { fontSize: 13, color: '#00695c', marginTop: 4 },
  id: { fontSize: 11, color: '#90a4ae', marginTop: 6 },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 10 },
  link: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderRadius: 999 },
  linkTxt: { color: '#1565c0', fontWeight: '700' },
  del: { color: '#c62828', fontWeight: '700', paddingVertical: 6 },
});

