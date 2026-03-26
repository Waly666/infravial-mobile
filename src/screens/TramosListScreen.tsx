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

import { EncuestaDraftModal } from '@/components/EncuestaDraftModal';
import { useAuth } from '@/hooks/useAuth';
import { useJornadaActiva } from '@/hooks/useJornadaActiva';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import type { RootStackParamList } from '@/navigation/types';
import { deleteViaTramo, fetchViaTramos } from '@/services/api/viaTramoApi';
import type { ViaTramoListItemDto } from '@/types/viaTramo';

export function TramosListScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const { user } = useAuth();
  const online = useOnlineStatus();
  const { jornada, refresh: refreshJornada } = useJornadaActiva();
  const canAdmin = user?.rol === 'admin' || user?.rol === 'supervisor';
  const [tramos, setTramos] = useState<ViaTramoListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [encuestaOpen, setEncuestaOpen] = useState(false);
  const [encuestaTramoId, setEncuestaTramoId] = useState<string | null>(null);
  const [draftKey, setDraftKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTramos(await fetchViaTramos());
    } catch {
      setTramos([]);
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

  function openNewTramo(): void {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('ViaTramoWizard' as keyof RootStackParamList, undefined);
    }
  }

  function openEditTramo(id: string): void {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('ViaTramoWizard' as keyof RootStackParamList, { id });
    }
  }

  async function eliminarTramo(id: string): Promise<void> {
    if (!canAdmin) return;
    Alert.alert('Eliminar tramo', '¿Eliminar este tramo vial? Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteViaTramo(id);
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
    ? tramos.filter(
        (t) =>
          (t.via ?? '').toLowerCase().includes(q) ||
          (t.municipio ?? '').toLowerCase().includes(q) ||
          (t.nomenclatura?.completa ?? '').toLowerCase().includes(q) ||
          t._id.toLowerCase().includes(q),
      )
    : tramos;

  function renderItem({ item }: { item: ViaTramoListItemDto }): React.JSX.Element {
    return (
      <View style={styles.card}>
        <Text style={styles.via}>{item.via || '—'}</Text>
        <Text style={styles.meta} numberOfLines={2}>
          {item.nomenclatura?.completa || '—'} · {item.municipio || '—'}
        </Text>
        <Text style={styles.id}>{item._id}</Text>
        <View style={styles.cardActions}>
          <Pressable
            style={styles.mini}
            onPress={() => {
              setEncuestaTramoId(item._id);
              setEncuestaOpen(true);
            }}
          >
            <Text style={styles.miniTxt}>Encuesta (secundario)</Text>
          </Pressable>
          <Pressable style={styles.miniLink} onPress={() => openEditTramo(item._id)}>
            <Text style={styles.miniLinkTxt}>Editar</Text>
          </Pressable>
          {canAdmin ? (
            <Pressable onPress={() => void eliminarTramo(item._id)}>
              <Text style={styles.miniDel}>Eliminar</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

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
          Sin jornada activa: no podrás registrar tramos nuevos hasta que exista una EN PROCESO
          (admin).
        </Text>
      )}

      <Pressable style={[styles.cta, !jornada && styles.ctaDis]} onPress={openNewTramo} disabled={!jornada}>
        <Text style={styles.ctaTxt}>＋ Nuevo tramo vial</Text>
      </Pressable>
      <Text style={styles.ctaHint}>Prioridad: tabla via_tramos. La encuesta va después.</Text>

      <TextInput
        style={styles.search}
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Buscar vía, municipio, nomenclatura, id…"
        autoCapitalize="none"
      />
      <Text style={styles.count}>{filtrados.length} registros</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
          ListEmptyComponent={<Text style={styles.empty}>No hay tramos o falló la carga.</Text>}
          contentContainerStyle={styles.listPad}
        />
      )}

      <EncuestaDraftModal
        key={draftKey}
        visible={encuestaOpen}
        initialTramoId={encuestaTramoId}
        onClose={() => {
          setEncuestaOpen(false);
          setEncuestaTramoId(null);
        }}
        onSaved={() => setDraftKey((k) => k + 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f8fa', padding: 16 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotOn: { backgroundColor: '#2e7d32' },
  dotOff: { backgroundColor: '#c62828' },
  bannerTxt: { fontWeight: '600', color: '#37474f' },
  jornadaOk: { color: '#2e7d32', fontWeight: '600', marginBottom: 10 },
  jornadaWarn: { color: '#b28704', marginBottom: 10, lineHeight: 20 },
  cta: {
    backgroundColor: '#1e5a8a',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  ctaDis: { opacity: 0.5 },
  ctaTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  ctaHint: { fontSize: 12, color: '#607d8b', marginTop: 6, marginBottom: 12 },
  search: {
    borderWidth: 1,
    borderColor: '#cfd8dc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontSize: 15,
  },
  count: { marginTop: 6, fontSize: 13, color: '#546e7a' },
  listPad: { paddingBottom: 40 },
  empty: { textAlign: 'center', marginTop: 32, color: '#90a4ae' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e0e0e0',
  },
  via: { fontSize: 16, fontWeight: '800', color: '#1a2332' },
  meta: { marginTop: 4, fontSize: 13, color: '#546e7a' },
  id: { marginTop: 6, fontSize: 10, color: '#90a4ae' },
  cardActions: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  mini: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#eceff1', borderRadius: 8 },
  miniTxt: { fontSize: 12, fontWeight: '700', color: '#455a64' },
  miniLink: { paddingVertical: 8, paddingHorizontal: 8 },
  miniLinkTxt: { fontSize: 12, fontWeight: '700', color: '#1565c0' },
  miniDel: { fontSize: 12, fontWeight: '700', color: '#c62828' },
});
