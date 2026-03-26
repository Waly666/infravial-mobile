import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { fetchPreguntasEncuesta } from '@/services/api/encuestaApi';
import { fetchViaTramos } from '@/services/api/viaTramoApi';
import { captureGeolocation } from '@/services/geo/captureLocation';
import { persistPreguntasEncCache, loadPreguntasEncCache } from '@/storage/preguntasEncCache';
import { sqliteSurveyRepository } from '@/storage/offline/sqliteSurveyRepository';
import type { EncuestaLocalPayload, PreguntaEncViaDto } from '@/types/encuesta';
import type { GeolocationCapture } from '@/types/geo';
import type { ViaTramoListItemDto } from '@/types/viaTramo';
import { newLocalId } from '@/utils/id';

type ValorRta = '' | 'si' | 'no' | 'na';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Si viene de la lista de tramos, rellena el id al abrir. */
  initialTramoId?: string | null;
};

const TRAMOS_LIST_CAP = 100;

function tramoMatchesBusqueda(t: ViaTramoListItemDto, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) {
    return true;
  }
  const id = String(t._id).toLowerCase();
  return (
    id.includes(s) ||
    (t.via ?? '').toLowerCase().includes(s) ||
    (t.municipio ?? '').toLowerCase().includes(s) ||
    (t.nomenclatura?.completa ?? '').toLowerCase().includes(s)
  );
}

export function EncuestaDraftModal({
  visible,
  onClose,
  onSaved,
  initialTramoId = null,
}: Props): React.JSX.Element {
  const [idTramoVia, setIdTramoVia] = useState('');
  const [tramosAll, setTramosAll] = useState<ViaTramoListItemDto[]>([]);
  const [tramosLoading, setTramosLoading] = useState(false);
  const [tramosError, setTramosError] = useState<string | null>(null);
  const [tramoBusqueda, setTramoBusqueda] = useState('');
  /** idPregunta → valor (igual que `form.respuestas` en via-tramo-form). */
  const [respuestaPorPregunta, setRespuestaPorPregunta] = useState<Record<string, ValorRta>>({});
  const [preguntas, setPreguntas] = useState<PreguntaEncViaDto[]>([]);
  const [loadNote, setLoadNote] = useState<string | null>(null);
  const [loadPreguntasError, setLoadPreguntasError] = useState<string | null>(null);
  const [loadingPreguntas, setLoadingPreguntas] = useState(false);
  const [capturaGps, setCapturaGps] = useState<GeolocationCapture | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const setValor = useCallback((idPregunta: string, v: ValorRta) => {
    setRespuestaPorPregunta((prev) => ({ ...prev, [idPregunta]: v }));
  }, []);

  const tramosVista = useMemo(() => {
    const f = tramosAll.filter((t) => tramoMatchesBusqueda(t, tramoBusqueda));
    return { list: f.slice(0, TRAMOS_LIST_CAP), totalCoincidencias: f.length };
  }, [tramosAll, tramoBusqueda]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    (async () => {
      setTramosLoading(true);
      setTramosError(null);
      try {
        const list = await fetchViaTramos();
        if (!cancelled) {
          setTramosAll(list);
        }
      } catch (e) {
        if (!cancelled) {
          setTramosError(e instanceof Error ? e.message : 'Error al cargar /via-tramos');
          setTramosAll([]);
        }
      } finally {
        if (!cancelled) {
          setTramosLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingPreguntas(true);
      setLoadPreguntasError(null);
      setLoadNote(null);
      try {
        const list = await fetchPreguntasEncuesta();
        if (cancelled) {
          return;
        }
        setPreguntas(list);
        await persistPreguntasEncCache(list);
        setRespuestaPorPregunta((prev) => {
          const next: Record<string, ValorRta> = { ...prev };
          for (const p of list) {
            if (next[p._id] === undefined) {
              next[p._id] = '';
            }
          }
          for (const k of Object.keys(next)) {
            if (!list.some((q) => q._id === k)) {
              delete next[k];
            }
          }
          return next;
        });
      } catch {
        if (cancelled) {
          return;
        }
        const cached = await loadPreguntasEncCache();
        if (cached && cached.length > 0) {
          setPreguntas(cached);
          setLoadNote('Catálogo sin conexión: usando última copia guardada en el dispositivo.');
          setRespuestaPorPregunta((prev) => {
            const next: Record<string, ValorRta> = { ...prev };
            for (const p of cached) {
              if (next[p._id] === undefined) {
                next[p._id] = '';
              }
            }
            return next;
          });
        } else {
          setLoadPreguntasError(
            'No se pudo cargar /catalogos/preguntas-enc y no hay caché. Conéctate una vez.',
          );
          setPreguntas([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingPreguntas(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  useEffect(() => {
    if (visible && initialTramoId) {
      setIdTramoVia(initialTramoId);
    }
  }, [visible, initialTramoId]);

  function resetForm(): void {
    setIdTramoVia('');
    setTramoBusqueda('');
    setRespuestaPorPregunta((prev) => {
      const cleared: Record<string, ValorRta> = {};
      for (const k of Object.keys(prev)) {
        cleared[k] = '';
      }
      return cleared;
    });
    setCapturaGps(null);
    setGpsError(null);
    setSaveError(null);
  }

  async function onPressGps(): Promise<void> {
    setGpsError(null);
    setGpsBusy(true);
    try {
      const g = await captureGeolocation();
      setCapturaGps(g);
    } catch (e) {
      setGpsError(e instanceof Error ? e.message : 'No se pudo obtener GPS');
    } finally {
      setGpsBusy(false);
    }
  }

  function conteoRespondidas(): number {
    return preguntas.filter((p) => !!respuestaPorPregunta[p._id]).length;
  }

  async function save(asQueue: boolean): Promise<void> {
    setSaveError(null);
    const tramo = idTramoVia.trim();
    if (!tramo) {
      setSaveError('Indica el ID del tramo (ViaTramo) ya registrado en el inventario.');
      return;
    }
    if (preguntas.length === 0) {
      setSaveError('No hay preguntas cargadas.');
      return;
    }
    const respuestas = preguntas
      .map((p) => {
        const valorRta = respuestaPorPregunta[p._id] ?? '';
        if (!valorRta) {
          return null;
        }
        return {
          idPregunta: p._id,
          consecutivo: p.consecutivo,
          valorRta,
          observacion: '',
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (respuestas.length === 0) {
      setSaveError('Responde al menos una pregunta (como en la web al filtrar por valorRta).');
      return;
    }

    setSaveBusy(true);
    try {
      const now = new Date().toISOString();
      const payload: EncuestaLocalPayload = {
        idTramoVia: tramo,
        respuestas,
        _meta: capturaGps ? { capturaGps } : undefined,
      };
      await sqliteSurveyRepository.saveDraft({
        localId: newLocalId(),
        status: asQueue ? 'pendiente' : 'borrador',
        createdAt: now,
        updatedAt: now,
        payload: { _kind: 'encuesta_vial', ...(payload as unknown as Record<string, unknown>) },
        attemptCount: 0,
      });
      resetForm();
      onSaved();
      onClose();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Encuesta vial (todas las preguntas)</Text>
          <Text style={styles.hint}>
            Mismo origen que Angular: GET /catalogos/preguntas-enc. Al guardar se arma un único POST
            /encuesta-vial con idTramoVia y respuestas (solo las que tengan valor), igual que
            via-tramo-form.ts.
          </Text>

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Tramo del inventario</Text>
            <Text style={styles.subHint}>
              Mismo listado que la web (`GET /via-tramos`). Busca por vía, municipio, nomenclatura o
              _id.
            </Text>
            <TextInput
              style={styles.input}
              value={tramoBusqueda}
              onChangeText={setTramoBusqueda}
              placeholder="🔍 Buscar…"
              autoCapitalize="none"
            />
            {tramosLoading ? (
              <ActivityIndicator style={{ marginVertical: 8 }} />
            ) : null}
            {tramosError ? <Text style={styles.warn}>{tramosError}</Text> : null}
            {!tramosLoading && tramosAll.length > 0 ? (
              <Text style={styles.tramoCount}>
                {tramosVista.totalCoincidencias === tramosAll.length && !tramoBusqueda.trim()
                  ? `${tramosAll.length} tramos`
                  : `${tramosVista.totalCoincidencias} coincidencias`}
                {tramosVista.totalCoincidencias > TRAMOS_LIST_CAP
                  ? ` · mostrando ${TRAMOS_LIST_CAP}`
                  : ''}
              </Text>
            ) : null}
            <View style={styles.tramoList}>
              {tramosVista.list.map((t) => {
                const selected = idTramoVia === t._id;
                return (
                  <Pressable
                    key={t._id}
                    style={[styles.tramoRow, selected && styles.tramoRowOn]}
                    onPress={() => setIdTramoVia(t._id)}
                  >
                    <Text style={styles.tramoVia} numberOfLines={1}>
                      {t.via || '—'}
                    </Text>
                    <Text style={styles.tramoMeta} numberOfLines={1}>
                      {t.nomenclatura?.completa || '—'} · {t.municipio || '—'}
                    </Text>
                    <Text style={styles.tramoId} numberOfLines={1}>
                      {t._id}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>ID tramo (editable)</Text>
            <TextInput
              style={styles.input}
              value={idTramoVia}
              onChangeText={setIdTramoVia}
              placeholder="Se rellena al elegir arriba o pégalo a mano"
              autoCapitalize="none"
            />

            {loadingPreguntas ? (
              <ActivityIndicator style={{ marginVertical: 12 }} />
            ) : null}
            {loadNote ? <Text style={styles.note}>{loadNote}</Text> : null}
            {loadPreguntasError ? <Text style={styles.warn}>{loadPreguntasError}</Text> : null}

            {!loadingPreguntas && preguntas.length > 0 ? (
              <Text style={styles.progress}>
                Respondidas: {conteoRespondidas()} / {preguntas.length}
              </Text>
            ) : null}

            {preguntas.map((p) => {
              const v = respuestaPorPregunta[p._id] ?? '';
              return (
                <View key={p._id} style={styles.qCard}>
                  <Text style={styles.qConsec}>Pregunta {p.consecutivo}</Text>
                  <Text style={styles.qText}>{p.enunciado}</Text>
                  <View style={styles.row}>
                    {(['si', 'no', 'na'] as const).map((opt) => (
                      <Pressable
                        key={opt}
                        style={[styles.valBtn, v === opt && styles.valBtnOn]}
                        onPress={() => setValor(p._id, v === opt ? '' : opt)}
                      >
                        <Text style={[styles.valBtnText, v === opt && styles.valBtnTextOn]}>
                          {opt.toUpperCase()}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.qHint}>
                    Pulsa de nuevo la misma opción para dejar sin respuesta (no se envía).
                  </Text>
                </View>
              );
            })}

            <Text style={styles.label}>Ubicación (opcional)</Text>
            <Pressable
              style={[styles.gpsBtn, gpsBusy && styles.disabled]}
              onPress={() => void onPressGps()}
              disabled={gpsBusy}
            >
              {gpsBusy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.gpsBtnText}>
                  {capturaGps ? 'GPS capturado ✓' : 'Capturar GPS ahora'}
                </Text>
              )}
            </Pressable>
            {gpsError ? <Text style={styles.err}>{gpsError}</Text> : null}
            {capturaGps ? (
              <Text style={styles.metaGps}>
                {capturaGps.point.coordinates[1].toFixed(5)},{' '}
                {capturaGps.point.coordinates[0].toFixed(5)}
              </Text>
            ) : null}

            {saveError ? <Text style={styles.err}>{saveError}</Text> : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.secondary} onPress={onClose} disabled={saveBusy}>
              <Text style={styles.secondaryText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.secondary, saveBusy && styles.disabled]}
              onPress={() => void save(false)}
              disabled={saveBusy}
            >
              <Text style={styles.secondaryText}>Borrador</Text>
            </Pressable>
            <Pressable
              style={[styles.primary, saveBusy && styles.disabled]}
              onPress={() => void save(true)}
              disabled={saveBusy}
            >
              {saveBusy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>En cola</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '94%',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a2332',
  },
  hint: {
    marginTop: 6,
    fontSize: 13,
    color: '#607d8b',
    lineHeight: 18,
  },
  subHint: {
    marginTop: 4,
    fontSize: 12,
    color: '#78909c',
    lineHeight: 16,
  },
  tramoCount: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#546e7a',
  },
  tramoList: {
    maxHeight: 220,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  tramoRow: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  tramoRowOn: {
    backgroundColor: '#e3f2fd',
  },
  tramoVia: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a2332',
  },
  tramoMeta: {
    marginTop: 2,
    fontSize: 12,
    color: '#546e7a',
  },
  tramoId: {
    marginTop: 4,
    fontSize: 10,
    color: '#90a4ae',
    fontFamily: 'monospace',
  },
  scroll: {
    marginTop: 12,
    flexGrow: 0,
    maxHeight: '72%',
  },
  label: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#37474f',
  },
  input: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#cfd8dc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 15,
  },
  note: {
    marginTop: 8,
    fontSize: 13,
    color: '#1565c0',
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 8,
  },
  warn: {
    marginTop: 8,
    color: '#a66a00',
    fontSize: 13,
  },
  progress: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#37474f',
  },
  qCard: {
    marginTop: 14,
    padding: 12,
    backgroundColor: '#f5f7fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  qConsec: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e5a8a',
  },
  qText: {
    marginTop: 6,
    fontSize: 14,
    color: '#263238',
    lineHeight: 20,
  },
  qHint: {
    marginTop: 8,
    fontSize: 11,
    color: '#78909c',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  valBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#b0bec5',
    alignItems: 'center',
  },
  valBtnOn: {
    backgroundColor: '#1e5a8a',
    borderColor: '#1e5a8a',
  },
  valBtnText: {
    fontWeight: '700',
    color: '#455a64',
    fontSize: 13,
  },
  valBtnTextOn: {
    color: '#fff',
  },
  gpsBtn: {
    marginTop: 8,
    backgroundColor: '#2e7d32',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  gpsBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  metaGps: {
    marginTop: 6,
    fontSize: 12,
    color: '#546e7a',
  },
  err: {
    marginTop: 8,
    color: '#c62828',
    fontSize: 13,
  },
  disabled: {
    opacity: 0.6,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  secondary: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#90a4ae',
  },
  secondaryText: {
    color: '#455a64',
    fontWeight: '600',
    fontSize: 13,
  },
  primary: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#1e5a8a',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
