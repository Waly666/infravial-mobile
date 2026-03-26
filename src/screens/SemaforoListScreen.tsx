import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { useAuth } from '@/hooks/useAuth';
import { useJornadaActiva } from '@/hooks/useJornadaActiva';
import type { RootStackParamList } from '@/navigation/types';
import { deleteSemaforo, fetchSemaforos } from '@/services/api/semaforoApi';
import { useAppTheme } from '@/theme/ThemeProvider';
import type { SemaforoDto } from '@/types/semaforo';

function tramoLabel(r: SemaforoDto): string {
  const t = r.idViaTramo;
  if (t && typeof t === 'object') return `${t.via ?? t.nomenclatura?.completa ?? '—'} · ${t.municipio ?? ''}`;
  return String(t ?? '—');
}

export function SemaforoListScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const { colors, theme } = useAppTheme();
  const { user } = useAuth();
  const { jornada, refresh: refreshJornada } = useJornadaActiva();
  const [rows, setRows] = useState<SemaforoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const canAdmin = user?.rol === 'admin' || user?.rol === 'supervisor';

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await fetchSemaforos()); } catch { setRows([]); } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); void refreshJornada(); }, [load, refreshJornada]));

  function openWizard(id?: string): void {
    const parent = navigation.getParent();
    if (parent) parent.navigate('SemaforoWizard' as keyof RootStackParamList, id ? { id } : undefined);
  }
  function eliminar(id: string): void {
    if (!canAdmin) return;
    Alert.alert('Eliminar', '¿Eliminar este semáforo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { try { await deleteSemaforo(id); void load(); } catch (e) { Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo eliminar'); } } },
    ]);
  }

  const t = q.trim().toLowerCase();
  const data = t ? rows.filter((r) => tramoLabel(r).toLowerCase().includes(t) || (r.claseSem ?? '').toLowerCase().includes(t) || (r.fase ?? '').toLowerCase().includes(t) || r._id.toLowerCase().includes(t)) : rows;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {jornada ? <Text style={[styles.ok, { color: colors.success }]}>Jornada: {jornada.municipio}</Text> : <Text style={[styles.warn, { color: colors.warning }]}>Sin jornada activa.</Text>}
      <Pressable
        style={[
          styles.cta,
          { backgroundColor: '#c62828', borderColor: '#c62828', shadowColor: '#c62828' },
          !jornada && styles.dis,
        ]}
        disabled={!jornada}
        onPress={() => openWizard()}
      >
        <Text style={styles.ctaTxt}>＋ Nuevo semáforo</Text>
      </Pressable>
      <TextInput style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={q} onChangeText={setQ} placeholder="Buscar vía, clase, fase, id..." placeholderTextColor={colors.textMuted} autoCapitalize="none" />
      {loading ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}
      <FlatList
        data={data}
        keyExtractor={(i) => i._id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
        ListEmptyComponent={!loading ? <Text style={[styles.empty, { color: colors.textMuted }]}>No hay registros.</Text> : null}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: theme === 'dark' ? '#000' : '#8aa3bb' }]}>
            <View style={[styles.cardAccent, { backgroundColor: '#c62828' }]} />
            <View style={styles.titleRow}>
              <MaterialCommunityIcons name="traffic-light-outline" size={18} color={colors.secondary} />
              <Text style={[styles.title, { color: colors.text }]}>{tramoLabel(item)}</Text>
            </View>
            <Text style={[styles.meta, { color: colors.textMuted }]}>Clase: {item.claseSem || '—'} · Fase: {item.fase || '—'} · Caras: {item.numCaras ?? '—'}</Text>
            <View style={styles.row}>
              <Pressable style={[styles.btn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]} onPress={() => openWizard(item._id)}><Text style={[styles.edit, { color: colors.primary }]}>Editar</Text></Pressable>
              {canAdmin ? <Pressable style={[styles.btn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]} onPress={() => eliminar(item._id)}><Text style={[styles.del, { color: colors.danger }]}>Eliminar</Text></Pressable> : null}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f8fa', padding: 12 },
  ok: { color: '#1b5e20', marginBottom: 8, fontWeight: '700' },
  warn: { color: '#b71c1c', marginBottom: 8 },
  cta: {
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 5,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
  },
  ctaTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  dis: { opacity: 0.5 },
  search: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cfd8dc', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 },
  empty: { textAlign: 'center', color: '#90a4ae', marginTop: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 12,
    padding: 14,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 3,
  },
  cardAccent: { width: 52, height: 4, borderRadius: 999, marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontWeight: '700', color: '#263238' },
  meta: { marginTop: 4, color: '#546e7a' },
  row: { marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  btn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  edit: { color: '#1565c0', fontWeight: '700' },
  del: { color: '#c62828', fontWeight: '700' },
});

