import type { JSX } from 'react';
import { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { PersonSimpleWalk } from 'phosphor-react-native';

import {
  LIST_HORIZONTAL_PAD,
  ListCardActions,
  ListEmptyState,
  ListGradientCta,
  ListHint,
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
import { LIST_SEN_HOR_VIVID } from '@/navigation/phosphorTabIcons';
import type { RootStackParamList } from '@/navigation/types';
import { deleteExistSenHor, fetchExistSenHorRegistros } from '@/services/api/senHorApi';
import { useAppTheme } from '@/theme/ThemeProvider';
import type { ExistSenHorListItemDto } from '@/types/senHor';
import { matchesExistInventoryListRow } from '@/utils/tramoSearch';

function tramoLabel(r: ExistSenHorListItemDto): string {
  const t = r.idViaTramo;
  if (t && typeof t === 'object') {
    return `${t.via ?? t.nomenclatura?.completa ?? '—'} · ${t.municipio ?? ''}`;
  }
  return String(t ?? '—');
}

export function SenHorListScreen(): JSX.Element {
  const navigation = useNavigation();
  const { colors } = useAppTheme();
  const online = useOnlineStatus();
  const { user } = useAuth();
  const { jornada, refresh: refreshJornada } = useJornadaActiva();
  const [registros, setRegistros] = useState<ExistSenHorListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const canAdmin = user?.rol === 'admin' || user?.rol === 'supervisor';

  const fetchList = useCallback(async () => {
    try {
      setRegistros(await fetchExistSenHorRegistros());
    } catch {
      setRegistros([]);
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

  useFocusEffect(
    useCallback(() => {
      void load();
      void refreshJornada();
    }, [load, refreshJornada]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchList().finally(() => setRefreshing(false));
  }, [fetchList]);

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

  const qTrim = busqueda.trim();
  const filtrados = qTrim
    ? registros.filter((r) =>
        matchesExistInventoryListRow(busqueda, r, {
          cod: r.codSeHor,
          idViaTramo: r.idViaTramo,
          extraPrefixFields: [r.estadoDem, r.material],
        }),
      )
    : registros;

  const listEmpty = (): JSX.Element | null => {
    if (loading && !refreshing) return <ListLoadingBlock />;
    if (filtrados.length > 0) return null;
    if (qTrim.length > 0 && registros.length > 0) {
      return (
        <ListEmptyState icon="filter-remove-outline" title="Sin coincidencias" hint="Ajusta la búsqueda." />
      );
    }
    return (
      <ListEmptyState
        iconHaloColor="rgba(245,158,11,0.2)"
        iconNode={<PersonSimpleWalk size={48} color={LIST_SEN_HOR_VIVID} weight="fill" />}
        title="No hay señales horizontales"
        hint="Crea el primer registro desde el botón superior."
      />
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={{ paddingHorizontal: LIST_HORIZONTAL_PAD, paddingTop: LIST_HORIZONTAL_PAD }}>
        <ListOnlineBanner online={online} count={filtrados.length} />
        <View style={{ marginTop: 12 }}>
          <ListJornadaStripe
            jornada={jornada}
            warnMessage="Sin jornada activa: el alta puede estar bloqueada en el servidor."
          />
        </View>
        <View style={{ marginTop: 14 }}>
          <ListGradientCta
            label="Nueva señal horizontal"
            leading={<PersonSimpleWalk size={22} color="#fff" weight="fill" />}
            onPress={() => openWizard()}
            disabled={!jornada}
          />
        </View>
        <ListHint>ExistSenHor — enlazada a perfil vial y catálogos de demarcación.</ListHint>
        <ListSearchField
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Código dem., nomenclatura / ID tramo, ID registro…"
          autoCapitalize="none"
        />
        <ListResultCount total={registros.length} filtered={filtrados.length} />
      </View>

      <FlatList
        data={filtrados}
        keyExtractor={(item) => item._id}
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
              <PersonSimpleWalk size={24} color={LIST_SEN_HOR_VIVID} weight="fill" />
              <Text style={[styles.cod, { color: colors.text }]}>{item.codSeHor || '—'}</Text>
            </View>
            <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={2}>
              {tramoLabel(item)}
            </Text>
            <View style={[styles.estPill, { backgroundColor: colors.accentSoft }]}>
              <Text style={[styles.estTxt, { color: colors.accent }]}>{item.estadoDem || 'Sin estado'}</Text>
            </View>
            <Text style={[styles.id, { color: colors.textMuted }]} numberOfLines={1}>
              {item._id}
            </Text>
            <ListCardActions>
              <ListPillButton label="Editar" variant="primary" onPress={() => openWizard(item._id)} />
              {canAdmin ? (
                <ListPillButton label="Eliminar" variant="danger" onPress={() => void eliminar(item._id)} />
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cod: { flex: 1, fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  meta: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  estPill: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  estTxt: { fontSize: 12, fontWeight: '800' },
  id: { marginTop: 8, fontSize: 10, opacity: 0.85 },
});
