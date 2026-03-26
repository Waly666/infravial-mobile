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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { EncuestaDraftModal } from '@/components/EncuestaDraftModal';
import { useAuth } from '@/hooks/useAuth';
import { useJornadaActiva } from '@/hooks/useJornadaActiva';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import type { RootStackParamList } from '@/navigation/types';
import { deleteViaTramo, fetchViaTramos } from '@/services/api/viaTramoApi';
import { useAppTheme } from '@/theme/ThemeProvider';
import type { ViaTramoListItemDto } from '@/types/viaTramo';

export function TramosListScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const { colors, theme } = useAppTheme();
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
        <View style={[styles.cardAccent, { backgroundColor: '#1565c0' }]} />
        <View style={styles.titleRow}>
          <MaterialCommunityIcons name="road-variant" size={18} color={colors.primary} />
          <Text style={[styles.via, { color: colors.text }]}>{item.via || '—'}</Text>
        </View>
        <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={2}>
          {item.nomenclatura?.completa || '—'} · {item.municipio || '—'}
        </Text>
        <Text style={[styles.id, { color: colors.textMuted }]}>{item._id}</Text>
        <View style={styles.cardActions}>
          <Pressable
            style={[styles.mini, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            onPress={() => {
              setEncuestaTramoId(item._id);
              setEncuestaOpen(true);
            }}
          >
            <Text style={[styles.miniTxt, { color: colors.text }]}>Encuesta (secundario)</Text>
          </Pressable>
          <Pressable
            style={[styles.miniLink, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            onPress={() => openEditTramo(item._id)}
          >
            <Text style={[styles.miniLinkTxt, { color: colors.primary }]}>Editar</Text>
          </Pressable>
          {canAdmin ? (
            <Pressable
              style={[styles.miniLink, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              onPress={() => void eliminarTramo(item._id)}
            >
              <Text style={[styles.miniDel, { color: colors.danger }]}>Eliminar</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.dot, online ? styles.dotOn : styles.dotOff]} />
        <Text style={[styles.bannerTxt, { color: colors.text }]}>
          {online ? 'En línea' : 'Sin conexión'}
        </Text>
        <View style={[styles.countPill, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.countPillTxt, { color: colors.primary }]}>{filtrados.length}</Text>
        </View>
      </View>

      {jornada ? (
        <Text style={[styles.jornadaOk, { color: colors.success }]}>
          Jornada: {jornada.municipio} — {jornada.supervisor}
        </Text>
      ) : (
        <Text style={[styles.jornadaWarn, { color: colors.warning }]}>
          Sin jornada activa: no podrás registrar tramos nuevos hasta que exista una EN PROCESO
          (admin).
        </Text>
      )}

      <Pressable
        style={[
          styles.cta,
          { backgroundColor: '#1565c0', borderColor: '#1565c0', shadowColor: '#1565c0' },
          !jornada && styles.ctaDis,
        ]}
        onPress={openNewTramo}
        disabled={!jornada}
      >
        <Text style={styles.ctaTxt}>＋ Nuevo tramo vial</Text>
      </Pressable>
      <Text style={[styles.ctaHint, { color: colors.textMuted }]}>
        Prioridad: tabla via_tramos. La encuesta va después.
      </Text>

      <TextInput
        style={[
          styles.search,
          { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
        ]}
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Buscar vía, municipio, nomenclatura, id…"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
      />
      <Text style={[styles.count, { color: colors.textMuted }]}>{filtrados.length} registros</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              No hay tramos o falló la carga.
            </Text>
          }
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
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  countPill: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  countPillTxt: { fontWeight: '800', fontSize: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotOn: { backgroundColor: '#2e7d32' },
  dotOff: { backgroundColor: '#c62828' },
  bannerTxt: { fontWeight: '600', color: '#37474f' },
  jornadaOk: { color: '#2e7d32', fontWeight: '600', marginBottom: 10 },
  jornadaWarn: { color: '#b28704', marginBottom: 10, lineHeight: 20 },
  cta: {
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    elevation: 5,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
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
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 3,
  },
  cardAccent: { width: 52, height: 4, borderRadius: 999, marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  mini: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#eceff1',
    borderRadius: 999,
    borderWidth: 1,
  },
  miniTxt: { fontSize: 12, fontWeight: '700', color: '#455a64' },
  miniLink: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  miniLinkTxt: { fontSize: 12, fontWeight: '700', color: '#1565c0' },
  miniDel: { fontSize: 12, fontWeight: '700', color: '#c62828' },
});
