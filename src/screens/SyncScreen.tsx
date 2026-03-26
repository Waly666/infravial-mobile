import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineEncuestas } from '@/hooks/useOfflineEncuestas';
import { syncEncuestaOutbox } from '@/services/sync/encuestaSync';
import { sqliteSurveyRepository } from '@/storage/offline/sqliteSurveyRepository';
import type { OfflineSurveyDraft } from '@/types/offline';

function statusLabel(s: OfflineSurveyDraft['status']): string {
  switch (s) {
    case 'borrador':
      return 'Borrador';
    case 'pendiente':
      return 'Pendiente';
    case 'enviado':
      return 'Enviado';
    case 'error':
      return 'Error';
    default:
      return s;
  }
}

export function SyncScreen(): React.JSX.Element {
  const online = useOnlineStatus();
  const { list, loading, refresh } = useOfflineEncuestas();
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  async function onSync(): Promise<void> {
    setSyncMsg(null);
    if (!online) {
      setSyncMsg('Sin red: espera conexión o usa WiFi/datos.');
      return;
    }
    setSyncing(true);
    try {
      const { enviados, errores } = await syncEncuestaOutbox();
      setSyncMsg(`Listo: ${enviados} enviados, ${errores} con error.`);
      await refresh();
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : 'Falló la sincronización');
    } finally {
      setSyncing(false);
    }
  }

  async function toQueue(item: OfflineSurveyDraft): Promise<void> {
    setActionId(item.localId);
    try {
      await sqliteSurveyRepository.markStatus(item.localId, 'pendiente');
      await refresh();
    } finally {
      setActionId(null);
    }
  }

  function renderItem({ item }: { item: OfflineSurveyDraft }): React.JSX.Element {
    const tramo = String((item.payload as { idTramoVia?: string }).idTramoVia ?? '—');
    const shortId = item.localId.slice(0, 8);
    return (
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>#{shortId}…</Text>
          <Text style={[styles.badge, badgeStyle(item.status)]}>{statusLabel(item.status)}</Text>
        </View>
        <Text style={styles.cardMeta}>Tramo: {tramo.slice(0, 28)}{tramo.length > 28 ? '…' : ''}</Text>
        <Text style={styles.cardMeta}>
          Intentos: {item.attemptCount}
          {item.lastError ? ` · ${item.lastError.slice(0, 80)}` : ''}
        </Text>
        {item.status === 'borrador' ? (
          <Pressable
            style={[styles.miniBtn, actionId === item.localId && styles.disabled]}
            onPress={() => void toQueue(item)}
            disabled={actionId === item.localId}
          >
            <Text style={styles.miniBtnText}>Pasar a cola de envío</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.banner}>
        <View style={[styles.dot, online ? styles.dotOn : styles.dotOff]} />
        <Text style={styles.bannerText}>{online ? 'En línea' : 'Sin conexión'}</Text>
      </View>

      <Pressable
        style={[styles.syncBtn, (!online || syncing) && styles.disabled]}
        onPress={() => void onSync()}
        disabled={!online || syncing}
      >
        {syncing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.syncBtnText}>Sincronizar encuestas</Text>
        )}
      </Pressable>
      {syncMsg ? <Text style={styles.syncMsg}>{syncMsg}</Text> : null}

      <Text style={styles.sub}>Registros locales</Text>
      {loading && list.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(i) => i.localId}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} />}
          ListEmptyComponent={
            <Text style={styles.empty}>No hay borradores ni cola. Crea uno desde Inicio.</Text>
          }
          contentContainerStyle={list.length === 0 ? styles.emptyBox : styles.listPad}
        />
      )}
    </View>
  );
}

function badgeStyle(s: OfflineSurveyDraft['status']): object {
  switch (s) {
    case 'enviado':
      return { backgroundColor: '#e8f5e9', color: '#2e7d32' };
    case 'error':
      return { backgroundColor: '#ffebee', color: '#c62828' };
    case 'pendiente':
      return { backgroundColor: '#fff8e1', color: '#f57f17' };
    default:
      return { backgroundColor: '#eceff1', color: '#546e7a' };
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f7f8fa',
    padding: 16,
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
    marginBottom: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotOn: { backgroundColor: '#2e7d32' },
  dotOff: { backgroundColor: '#c62828' },
  bannerText: { fontSize: 14, fontWeight: '600', color: '#37474f' },
  syncBtn: {
    backgroundColor: '#1e5a8a',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  syncBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  syncMsg: { marginTop: 8, fontSize: 14, color: '#37474f' },
  disabled: { opacity: 0.55 },
  sub: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '700',
    color: '#1a2332',
  },
  listPad: { paddingBottom: 32 },
  emptyBox: { flexGrow: 1, justifyContent: 'center' },
  empty: { textAlign: 'center', color: '#78909c', marginTop: 24, fontSize: 15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontWeight: '700', color: '#263238' },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  cardMeta: { marginTop: 6, fontSize: 13, color: '#546e7a' },
  miniBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#e3f2fd',
  },
  miniBtnText: { color: '#1565c0', fontWeight: '600', fontSize: 13 },
});
