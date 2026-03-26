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

import { useAuth } from '@/hooks/useAuth';
import { useJornadaActiva } from '@/hooks/useJornadaActiva';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import type { RootStackParamList } from '@/navigation/types';
import { deleteExistSenVert, fetchExistSenVertRegistros } from '@/services/api/senVertApi';
import type { ExistSenVertListItemDto } from '@/types/senVert';

function tramoLabel(r: ExistSenVertListItemDto): string {
  const t = r.idViaTramo;
  if (t && typeof t === 'object') {
    return `${t.via ?? t.nomenclatura?.completa ?? '—'} · ${t.municipio ?? ''}`;
  }
  return String(t ?? '—');
}

export function SenVertListScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const online = useOnlineStatus();
  const { user } = useAuth();
  const { jornada, refresh: refreshJornada } = useJornadaActiva();
  const [registros, setRegistros] = useState<ExistSenVertListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const canAdmin = user?.rol === 'admin' || user?.rol === 'supervisor';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRegistros(await fetchExistSenVertRegistros());
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
      parent.navigate('SenVertWizard' as keyof RootStackParamList, id ? { id } : undefined);
    }
  }

  async function eliminar(id: string): Promise<void> {
    if (!canAdmin) return;
    Alert.alert('Eliminar', '¿Eliminar esta señal vertical?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteExistSenVert(id);
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
          (r.codSe ?? '').toLowerCase().includes(q) ||
          tramoLabel(r).toLowerCase().includes(q) ||
          (r.estado ?? '').toLowerCase().includes(q) ||
          r._id.toLowerCase().includes(q),
      )
    : registros;

  return (
    <View style={styles.root}>
      <View style={styles.banner}>
        <View style={[styles.dot, online ? styles.dotOn : styles.dotOff]} />
        <Text style={styles.bannerTxt}>{online ? 'En línea' : 'Sin conexión'}</Text>
      </View>

      {jornada ? (
        <Text style={styles.jornadaOk}>
          Jornada: {jornada.municipio} — {jornada.supervisor}
        </Text>
      ) : (
        <Text style={styles.jornadaWarn}>
          Sin jornada activa: el alta de señales verticales puede estar bloqueada en el servidor.
        </Text>
      )}

      <Pressable style={[styles.cta, !jornada && styles.ctaDis]} onPress={() => openWizard()} disabled={!jornada}>
        <Text style={styles.ctaTxt}>＋ Nueva señal vertical</Text>
      </Pressable>
      <Text style={styles.hint}>Tabla ExistSenVert — requiere tramo (`via_tramos`) y catálogo.</Text>

      <TextInput
        style={styles.search}
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Buscar código, vía, estado, id…"
        autoCapitalize="none"
      />

      {loading ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null}

      <FlatList
        data={filtrados}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No hay registros o no coinciden con la búsqueda.</Text> : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cod}>{item.codSe || '—'}</Text>
            <Text style={styles.meta} numberOfLines={2}>
              {tramoLabel(item)}
            </Text>
            <Text style={styles.est}>{item.estado || '— estado'}</Text>
            <Text style={styles.id}>{item._id}</Text>
            <View style={styles.row}>
              <Pressable style={styles.link} onPress={() => openWizard(item._id)}>
                <Text style={styles.linkTxt}>Editar</Text>
              </Pressable>
              {canAdmin ? (
                <Pressable onPress={() => void eliminar(item._id)}>
                  <Text style={styles.del}>Eliminar</Text>
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
  banner: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#fff', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { backgroundColor: '#2e7d32' },
  dotOff: { backgroundColor: '#c62828' },
  bannerTxt: { fontSize: 13, color: '#455a64' },
  jornadaOk: { paddingHorizontal: 12, paddingVertical: 8, color: '#1b5e20', fontWeight: '600' },
  jornadaWarn: { paddingHorizontal: 12, paddingVertical: 8, color: '#b71c1c', fontSize: 13 },
  cta: {
    marginHorizontal: 12,
    marginTop: 8,
    backgroundColor: '#7b1fa2',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  ctaDis: { opacity: 0.45 },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
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
    marginBottom: 10,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cod: { fontSize: 17, fontWeight: '700', color: '#4a148c' },
  meta: { fontSize: 14, color: '#455a64', marginTop: 4 },
  est: { fontSize: 13, color: '#6a1b9a', marginTop: 4 },
  id: { fontSize: 11, color: '#90a4ae', marginTop: 6 },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 10 },
  link: { paddingVertical: 6, paddingHorizontal: 10 },
  linkTxt: { color: '#1565c0', fontWeight: '700' },
  del: { color: '#c62828', fontWeight: '700', paddingVertical: 6 },
});
