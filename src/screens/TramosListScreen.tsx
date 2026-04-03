import type { JSX } from 'react';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { PlusCircle, RoadHorizon } from 'phosphor-react-native';

import { EncuestaDraftModal } from '@/components/EncuestaDraftModal';
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
import { PHOSPHOR_TAB_VISUAL } from '@/navigation/phosphorTabIcons';
import type { RootStackParamList } from '@/navigation/types';
import { deleteViaTramo, fetchViaTramos } from '@/services/api/viaTramoApi';
import { useAppTheme } from '@/theme/ThemeProvider';
import type { ViaTramoListItemDto } from '@/types/viaTramo';
import { filtrarTramosPickerPorBusqueda } from '@/utils/tramoSearch';

function lineaDisenioSectorZona(t: ViaTramoListItemDto): string | null {
  const parts: string[] = [];
  if (t.tipoUbic) parts.push(`Diseño: ${t.tipoUbic}`);
  if (t.sector) parts.push(`Sector: ${t.sector}`);
  if (t.zona) parts.push(`Zona: ${t.zona}`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function TramosListScreen(): JSX.Element {
  const navigation = useNavigation();
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const online = useOnlineStatus();
  const { jornada, refresh: refreshJornada } = useJornadaActiva();
  const canAdmin = user?.rol === 'admin' || user?.rol === 'supervisor';
  const [tramos, setTramos] = useState<ViaTramoListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [encuestaOpen, setEncuestaOpen] = useState(false);
  const [encuestaTramoId, setEncuestaTramoId] = useState<string | null>(null);
  const [draftKey, setDraftKey] = useState(0);

  const fetchList = useCallback(async (): Promise<void> => {
    try {
      setTramos(await fetchViaTramos());
    } catch {
      setTramos([]);
    }
  }, []);

  const load = useCallback(async (): Promise<void> => {
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
    Alert.alert('Eliminar perfil', '¿Eliminar este perfil vial? Esta acción no se puede deshacer.', [
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

  const filtrados = filtrarTramosPickerPorBusqueda(tramos, busqueda);
  const q = busqueda.trim();

  function renderItem({ item }: { item: ViaTramoListItemDto }): JSX.Element {
    const attrs = lineaDisenioSectorZona(item);
    return (
      <ListRecordCard>
        <View style={styles.titleRow}>
          <RoadHorizon
            size={22}
            color={PHOSPHOR_TAB_VISUAL.Tramos.active}
            weight="fill"
          />
          <Text style={[styles.via, { color: colors.text }]}>{item.via || '—'}</Text>
        </View>
        <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={2}>
          {item.nomenclatura?.completa || '—'} · {item.municipio || '—'}
        </Text>
        {attrs ? (
          <Text style={[styles.attrs, { color: colors.textMuted }]} numberOfLines={3}>
            {attrs}
          </Text>
        ) : null}
        <Text style={[styles.id, { color: colors.textMuted }]} numberOfLines={1}>
          {item._id}
        </Text>
        <ListCardActions>
          <ListPillButton
            label="Encuesta"
            variant="neutral"
            onPress={() => {
              setEncuestaTramoId(item._id);
              setEncuestaOpen(true);
            }}
          />
          <ListPillButton label="Editar" variant="primary" onPress={() => openEditTramo(item._id)} />
          {canAdmin ? (
            <ListPillButton label="Eliminar" variant="danger" onPress={() => void eliminarTramo(item._id)} />
          ) : null}
        </ListCardActions>
      </ListRecordCard>
    );
  }

  const listEmpty = (): JSX.Element | null => {
    if (loading && !refreshing) return <ListLoadingBlock />;
    if (filtrados.length > 0) return null;
    if (q.length > 0 && tramos.length > 0) {
      return (
        <ListEmptyState
          icon="filter-remove-outline"
          title="Sin coincidencias"
          hint="Prueba otras palabras o borra el filtro."
        />
      );
    }
    return (
      <ListEmptyState
        iconHaloColor="rgba(14,165,233,0.18)"
        iconNode={
          <RoadHorizon size={48} color={PHOSPHOR_TAB_VISUAL.Tramos.active} weight="fill" />
        }
        title="No hay perfiles cargados"
        hint="Tira hacia abajo para actualizar o crea uno nuevo con la jornada activa."
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
            warnMessage="Sin jornada activa: no podrás registrar perfiles nuevos hasta que exista una EN PROCESO (admin)."
          />
        </View>

        <View style={{ marginTop: 14 }}>
          <ListGradientCta
            label="Nuevo perfil vial"
            leading={<PlusCircle size={22} color="#fff" weight="fill" />}
            onPress={openNewTramo}
            disabled={!jornada}
          />
        </View>
        <ListHint>Prioridad: inventario base (via_tramos). La encuesta es un paso aparte.</ListHint>

        <ListSearchField
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Nomenclatura (desde el inicio) o ID Mongo del perfil…"
          autoCapitalize="none"
        />
        <ListResultCount total={tramos.length} filtered={filtrados.length} />
      </View>

      <FlatList
        data={filtrados}
        keyExtractor={(i) => i._id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={listEmpty}
        contentContainerStyle={[
          styles.listPad,
          { paddingHorizontal: LIST_HORIZONTAL_PAD, flexGrow: 1 },
        ]}
        showsVerticalScrollIndicator={false}
      />

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
  root: { flex: 1 },
  listPad: { paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  via: { flex: 1, fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  meta: { marginTop: 6, fontSize: 14, lineHeight: 20 },
  attrs: { marginTop: 8, fontSize: 12, lineHeight: 17 },
  id: { marginTop: 8, fontSize: 10, opacity: 0.85 },
});
