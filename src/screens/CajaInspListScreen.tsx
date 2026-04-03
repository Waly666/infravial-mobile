import type { JSX } from 'react';
import { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Package } from 'phosphor-react-native';

import {
  LIST_HORIZONTAL_PAD,
  ListCardActions,
  ListEmptyState,
  ListGradientCta,
  ListJornadaStripe,
  ListLoadingBlock,
  ListOnlineBanner,
  ListPillButton,
  ListRecordCard,
  ListResultCount,
  ListSearchField,
} from '@/components/inventory/InventoryListChrome';
import { useAuth } from '@/hooks/useAuth';
import { useJornadaActiva } from '@/hooks/useJornadaActiva';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { PHOSPHOR_TAB_VISUAL } from '@/navigation/phosphorTabIcons';
import type { RootStackParamList } from '@/navigation/types';
import { deleteCajaInsp, fetchCajasInsp } from '@/services/api/cajaInspApi';
import { useAppTheme } from '@/theme/ThemeProvider';
import type { CajaInspDto } from '@/types/cajaInsp';
import { matchesExistInventoryListRow } from '@/utils/tramoSearch';

function tramoLabel(r: CajaInspDto): string {
  const t = r.idViaTramo;
  if (t && typeof t === 'object') return `${t.via ?? t.nomenclatura?.completa ?? '—'} · ${t.municipio ?? ''}`;
  return String(t ?? '—');
}

export function CajaInspListScreen(): JSX.Element {
  const navigation = useNavigation();
  const { colors } = useAppTheme();
  const online = useOnlineStatus();
  const { user } = useAuth();
  const { jornada, refresh: refreshJornada } = useJornadaActiva();
  const [rows, setRows] = useState<CajaInspDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const canAdmin = user?.rol === 'admin' || user?.rol === 'supervisor';

  const fetchList = useCallback(async () => {
    try {
      setRows(await fetchCajasInsp());
    } catch {
      setRows([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await fetchList();
    } finally {
      setLoading(false);
    }
  }, [fetchList]);

  useFocusEffect(useCallback(() => {
    void load();
    void refreshJornada();
  }, [load, refreshJornada]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchList().finally(() => setRefreshing(false));
  }, [fetchList]);

  function openWizard(id?: string): void {
    const parent = navigation.getParent();
    if (parent) parent.navigate('CajaInspWizard' as keyof RootStackParamList, id ? { id } : undefined);
  }

  function eliminar(id: string): void {
    if (!canAdmin) return;
    Alert.alert('Eliminar', '¿Eliminar esta caja de inspección?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCajaInsp(id);
            void load();
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo eliminar');
          }
        },
      },
    ]);
  }

  const qTrim = q.trim();
  const data = qTrim
    ? rows.filter((r) =>
        matchesExistInventoryListRow(q, r, {
          idViaTramo: r.idViaTramo,
          extraPrefixFields: [r.materialCaja, r.estadoCaja, r.fase],
        }),
      )
    : rows;

  const listEmpty = (): JSX.Element | null => {
    if (loading && !refreshing) return <ListLoadingBlock />;
    if (data.length > 0) return null;
    if (qTrim.length > 0 && rows.length > 0) {
      return (
        <ListEmptyState icon="filter-remove-outline" title="Sin coincidencias" hint="Prueba otro término." />
      );
    }
    return (
      <ListEmptyState
        iconHaloColor="rgba(234,88,12,0.18)"
        iconNode={<Package size={48} color={PHOSPHOR_TAB_VISUAL.CajasInsp.active} weight="fill" />}
        title="No hay cajas de inspección"
        hint="Registra la primera con jornada activa."
      />
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={{ paddingHorizontal: LIST_HORIZONTAL_PAD, paddingTop: LIST_HORIZONTAL_PAD }}>
        <ListOnlineBanner online={online} count={data.length} />
        <View style={{ marginTop: 12 }}>
          <ListJornadaStripe jornada={jornada} warnMessage="Sin jornada activa: el alta puede no estar permitida." />
        </View>
        <View style={{ marginTop: 14 }}>
          <ListGradientCta
            label="Nueva caja de inspección"
            leading={<Package size={22} color="#fff" weight="fill" />}
            onPress={() => openWizard()}
            disabled={!jornada}
          />
        </View>
        <View style={{ height: 12 }} />
        <ListSearchField
          value={q}
          onChangeText={setQ}
          placeholder="Nomenclatura / ID tramo, ID registro, material…"
          autoCapitalize="none"
        />
        <ListResultCount total={rows.length} filtered={data.length} />
      </View>

      <FlatList
        data={data}
        keyExtractor={(i) => i._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={[
          styles.listPad,
          { paddingHorizontal: LIST_HORIZONTAL_PAD, flexGrow: 1 },
        ]}
        ListEmptyComponent={listEmpty}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ListRecordCard>
            <View style={styles.titleRow}>
              <Package size={22} color={PHOSPHOR_TAB_VISUAL.CajasInsp.active} weight="fill" />
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                {tramoLabel(item)}
              </Text>
            </View>
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              {item.materialCaja || '—'} · {item.estadoCaja || '—'} · {item.fase || '—'}
            </Text>
            <ListCardActions>
              <ListPillButton label="Editar" variant="primary" onPress={() => openWizard(item._id)} />
              {canAdmin ? (
                <ListPillButton label="Eliminar" variant="danger" onPress={() => eliminar(item._id)} />
              ) : null}
            </ListCardActions>
          </ListRecordCard>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  listPad: { paddingBottom: 32 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { flex: 1, fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  meta: { marginTop: 8, fontSize: 13, lineHeight: 19 },
});
