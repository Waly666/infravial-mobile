import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { DecimalTextField } from '@/components/DecimalTextField';
import {
  SH_ACCIONES,
  SH_CLASES_LINEA,
  SH_CLASES_PUNTO,
  SH_ESTADOS_DEM,
  SH_FASES,
  SH_MATERIALES,
  SH_REFLECT_OPTS,
  SH_TIPOS_DEM,
  SH_TIPOS_PINTURA,
} from '@/constants/senHorEnums';
import { createSenHorFormState } from '@/domain/senHorFormDefaults';
import { buildSenHorPayload } from '@/domain/senHorSubmit';
import { useJornadaActiva } from '@/hooks/useJornadaActiva';
import { getApiBaseUrl } from '@/config/env';
import type { RootStackParamList } from '@/navigation/types';
import { fetchViaTramos } from '@/services/api/viaTramoApi';
import { fetchDemarcaciones, fetchObsSh, fetchUbicSenHor } from '@/services/api/senHorCatalogApi';
import {
  createExistSenHor,
  fetchExistSenHorById,
  updateExistSenHor,
  uploadSenHorFoto,
} from '@/services/api/senHorApi';
import { captureGeolocation } from '@/services/geo/captureLocation';
import { useAppTheme } from '@/theme/ThemeProvider';
import type { DemarcacionDto, ExistSenHorListItemDto, ObsShDto, UbicSenHorDto } from '@/types/senHor';
import type { JornadaActivaDto } from '@/types/jornada';
import type { ViaTramoListItemDto } from '@/types/viaTramo';

const TOTAL_PASOS = 4;

type Nav = NativeStackNavigationProp<RootStackParamList, 'SenHorWizard'>;
type Route = RouteProp<RootStackParamList, 'SenHorWizard'>;

function applyRegistroToState(
  raw: Record<string, unknown>,
  jornadaActiva: JornadaActivaDto | null,
  setForm: React.Dispatch<React.SetStateAction<Record<string, unknown>>>,
  setTramo: (t: ViaTramoListItemDto | null) => void,
  setDem: (d: DemarcacionDto | null) => void,
  catalogo: DemarcacionDto[],
): void {
  const next = createSenHorFormState(jornadaActiva) as Record<string, unknown>;
  const assignKeys = [
    'idJornada',
    'idViaTramo',
    'codSeHor',
    'tipoDem',
    'estadoDem',
    'tipoPintura',
    'material',
    'fechaInst',
    'fase',
    'accion',
    'fechaAccion',
    'ubicResTramo',
    'reflectOptima',
    'retroreflectividad',
    'color',
    'claseDemLinea',
    'claseDemPunto',
    'notas',
    'urlFotoSH',
  ] as const;
  for (const k of assignKeys) {
    if (raw[k] !== undefined) next[k] = raw[k];
  }
  for (const f of ['fechaInst', 'fechaAccion'] as const) {
    const v = next[f];
    if (typeof v === 'string' && v.includes('T')) next[f] = v.split('T')[0];
  }
  const idVt = raw.idViaTramo as ViaTramoListItemDto | string | undefined;
  if (idVt && typeof idVt === 'object' && '_id' in idVt) {
    next.idViaTramo = idVt._id;
    setTramo(idVt as ViaTramoListItemDto);
  } else {
    next.idViaTramo = idVt ?? '';
    setTramo(null);
  }
  if (raw.ubicacion && typeof raw.ubicacion === 'object') {
    const coords = (raw.ubicacion as { coordinates?: number[] }).coordinates;
    if (coords?.length === 2) {
      next.lng = coords[0];
      next.lat = coords[1];
    }
  }
  for (const o of ['obs1', 'obs2', 'obs3', 'obs4', 'obs5', 'obs6'] as const) {
    const v = raw[o];
    if (v && typeof v === 'object' && '_id' in (v as object)) next[o] = (v as { _id: string })._id;
    else next[o] = v ?? '';
  }
  const cod = String(raw.codSeHor ?? '');
  setDem(catalogo.find((d) => d.codDem === cod) ?? null);
  setForm(next);
}

export function SenHorWizardScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const editId = route.params?.id;
  const { jornada } = useJornadaActiva();
  const { colors } = useAppTheme();
  const apiBase = getApiBaseUrl();

  const [paso, setPaso] = useState(1);
  const [form, setForm] = useState<Record<string, unknown>>(() => createSenHorFormState(null));
  const [dems, setDems] = useState<DemarcacionDto[]>([]);
  const [ubicCats, setUbicCats] = useState<UbicSenHorDto[]>([]);
  const [obsCats, setObsCats] = useState<ObsShDto[]>([]);
  const [tramos, setTramos] = useState<ViaTramoListItemDto[]>([]);
  const [tramoSel, setTramoSel] = useState<ViaTramoListItemDto | null>(null);
  const [demSel, setDemSel] = useState<DemarcacionDto | null>(null);

  const [demOpen, setDemOpen] = useState(false);
  const [busqDem, setBusqDem] = useState('');
  const [tramoOpen, setTramoOpen] = useState(false);
  const [busqTramo, setBusqTramo] = useState('');
  const [obsPick, setObsPick] = useState<'obs1' | 'obs2' | 'obs3' | 'obs4' | 'obs5' | 'obs6' | null>(null);

  const [initLoading, setInitLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [fotoNueva, setFotoNueva] = useState<ImagePicker.ImagePickerAsset | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: editId ? 'Editar señal horizontal' : 'Nueva señal horizontal' });
  }, [editId, navigation]);

  useEffect(() => {
    if (!jornada) return;
    setForm((f) => ({
      ...f,
      idJornada: jornada._id,
      municipio: jornada.municipio ?? '',
      supervisor: jornada.supervisor ?? '',
    }));
  }, [jornada?._id]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setInitLoading(true);
      try {
        const [d, u, o, t] = await Promise.all([fetchDemarcaciones(), fetchUbicSenHor(), fetchObsSh(), fetchViaTramos()]);
        if (cancel) return;
        setDems(d);
        setUbicCats(u);
        setObsCats(o);
        setTramos(t);
        if (editId) {
          const r = await fetchExistSenHorById(editId);
          if (!cancel && r) {
            applyRegistroToState(r as unknown as Record<string, unknown>, jornada ?? null, setForm, setTramoSel, setDemSel, d);
          } else if (!cancel && !r) {
            Alert.alert('Registro', 'No se encontró la señal', [{ text: 'OK', onPress: () => navigation.goBack() }]);
          }
        }
      } catch {
        if (!cancel) Alert.alert('Carga', 'Error al cargar datos');
      } finally {
        if (!cancel) setInitLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [editId, jornada, navigation]);

  function setField(key: string, value: unknown): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function chipRow<T extends string>(label: string, value: string, options: readonly T[], onSelect: (v: T) => void): React.JSX.Element {
    return (
      <View style={styles.block}>
        <Text style={[styles.lbl, { color: colors.textMuted }]}>{label}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {options.map((o) => (
            <Pressable key={o} style={[styles.chip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, value === o && styles.chipOn]} onPress={() => onSelect(o)}>
              <Text style={[styles.chipTxt, { color: colors.text }, value === o && styles.chipTxtOn]} numberOfLines={2}>
                {o}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  const demFiltrado = useMemo(() => {
    const q = busqDem.trim().toLowerCase();
    if (!q) return dems;
    return dems.filter(
      (d) =>
        (d.codDem ?? '').toLowerCase().includes(q) ||
        (d.descripcion ?? '').toLowerCase().includes(q) ||
        (d.claseDem ?? '').toLowerCase().includes(q),
    );
  }, [busqDem, dems]);

  const tramosFiltrados = useMemo(() => {
    const q = busqTramo.trim().toLowerCase();
    if (!q) return tramos;
    return tramos.filter((t) => (t.via ?? '').toLowerCase().includes(q) || (t.nomenclatura?.completa ?? '').toLowerCase().includes(q));
  }, [busqTramo, tramos]);

  function seleccionarDem(d: DemarcacionDto): void {
    setDemSel(d);
    setField('codSeHor', d.codDem);
    setDemOpen(false);
    setBusqDem('');
  }

  function seleccionarTramo(t: ViaTramoListItemDto): void {
    setTramoSel(t);
    setField('idViaTramo', t._id);
    setTramoOpen(false);
    setBusqTramo(t.via ?? t.nomenclatura?.completa ?? '');
  }

  async function tomarFoto(): Promise<void> {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permisos', 'Se necesita la cámara para la foto de la señal.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (!res.canceled && res.assets[0]) setFotoNueva(res.assets[0]);
  }

  async function capturarGps(): Promise<void> {
    setGpsBusy(true);
    try {
      const g = await captureGeolocation();
      const [lng, lat] = g.point.coordinates;
      setField('lng', lng);
      setField('lat', lat);
    } catch (e) {
      Alert.alert('GPS', e instanceof Error ? e.message : 'Error de ubicación');
    } finally {
      setGpsBusy(false);
    }
  }

  function labelObs(field: 'obs1' | 'obs2' | 'obs3' | 'obs4' | 'obs5' | 'obs6'): string {
    const id = String(form[field] ?? '');
    if (!id) return 'Seleccionar…';
    const o = obsCats.find((x) => x._id === id);
    return o?.obsSH ?? id;
  }

  async function guardar(): Promise<void> {
    const idVt = String(form.idViaTramo ?? '');
    if (!idVt) {
      Alert.alert('Tramo', 'Selecciona el tramo de vía (paso 1).');
      return;
    }
    setSaving(true);
    try {
      const body = buildSenHorPayload(form);
      const reg: ExistSenHorListItemDto = editId ? await updateExistSenHor(editId, body) : await createExistSenHor(body);
      const regId = reg._id;

      if (fotoNueva?.uri) {
        try {
          const url = await uploadSenHorFoto({
            uri: fotoNueva.uri,
            name: fotoNueva.fileName ?? 'sen-hor.jpg',
            type: fotoNueva.mimeType ?? 'image/jpeg',
          });
          await updateExistSenHor(regId, { urlFotoSH: url });
        } catch (e) {
          Alert.alert('Foto', e instanceof Error ? e.message : 'No se subió la foto; el registro sí se guardó.');
        }
      }

      Alert.alert('Listo', editId ? 'Señal actualizada.' : 'Señal creada.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  if (initLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
        <Text style={[styles.loadTxt, { color: colors.textMuted }]}>Cargando…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.progress, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.progressTxt, { color: colors.primary }]}>
          Paso {paso} / {TOTAL_PASOS} — ExistSenHor
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {paso === 1 ? (
          <>
            <Text style={[styles.h2, { color: colors.text }]}>Tramo y demarcación</Text>
            <Text style={[styles.lbl, { color: colors.textMuted }]}>Tramo seleccionado</Text>
            <Pressable style={styles.secBtn} onPress={() => setTramoOpen(true)}>
              <Text style={styles.secBtnTxt}>{tramoSel ? `${tramoSel.via ?? tramoSel.nomenclatura?.completa ?? '—'}` : 'Elegir tramo'}</Text>
            </Pressable>

            <Text style={styles.lbl}>Código (demarcación)</Text>
            {demSel ? (
              <View style={styles.selCard}>
                {demSel.urlDemImg && apiBase ? (
                  <Image source={{ uri: `${apiBase}${demSel.urlDemImg}` }} style={styles.selImg} resizeMode="contain" />
                ) : null}
                <Text style={styles.selCod}>{demSel.codDem}</Text>
                <Text style={styles.selDesc} numberOfLines={3}>
                  {demSel.descripcion ?? demSel.claseDem ?? '—'}
                </Text>
                <Pressable onPress={() => setDemOpen(true)}>
                  <Text style={styles.link}>Cambiar demarcación</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.secBtn} onPress={() => setDemOpen(true)}>
                <Text style={styles.secBtnTxt}>Elegir del catálogo (imagen)</Text>
              </Pressable>
            )}
          </>
        ) : null}

        {paso === 2 ? (
          <>
            <Text style={styles.h2}>Características</Text>
            {chipRow('Tipo', String(form.tipoDem ?? ''), SH_TIPOS_DEM, (v) => setField('tipoDem', v))}
            {chipRow('Estado', String(form.estadoDem ?? ''), SH_ESTADOS_DEM, (v) => setField('estadoDem', v))}
            {chipRow('Material', String(form.material ?? ''), SH_MATERIALES, (v) => setField('material', v))}
            {chipRow('Tipo pintura', String(form.tipoPintura ?? ''), SH_TIPOS_PINTURA, (v) => setField('tipoPintura', v))}
            {chipRow('Reflectividad óptima', String(form.reflectOptima ?? ''), SH_REFLECT_OPTS, (v) => setField('reflectOptima', v))}

            <Text style={styles.lbl}>Retroreflectividad</Text>
            <TextInput style={styles.inp} value={String(form.retroreflectividad ?? '')} onChangeText={(t) => setField('retroreflectividad', t)} />
            <Text style={styles.lbl}>Color</Text>
            <TextInput style={styles.inp} value={String(form.color ?? '')} onChangeText={(t) => setField('color', t)} />
            {chipRow('Clase línea', String(form.claseDemLinea ?? ''), SH_CLASES_LINEA, (v) => setField('claseDemLinea', v))}
            {chipRow('Clase punto', String(form.claseDemPunto ?? ''), SH_CLASES_PUNTO, (v) => setField('claseDemPunto', v))}

            <Text style={styles.section}>Fase y acción</Text>
            {chipRow('Fase', String(form.fase ?? ''), SH_FASES, (v) => setField('fase', v))}
            {chipRow('Acción', String(form.accion ?? ''), SH_ACCIONES, (v) => setField('accion', v))}
            <Text style={styles.lbl}>Fecha instalación (YYYY-MM-DD)</Text>
            <TextInput style={styles.inp} value={String(form.fechaInst ?? '')} onChangeText={(t) => setField('fechaInst', t)} placeholder="2024-01-15" />
            <Text style={styles.lbl}>Fecha acción (YYYY-MM-DD)</Text>
            <TextInput style={styles.inp} value={String(form.fechaAccion ?? '')} onChangeText={(t) => setField('fechaAccion', t)} placeholder="2024-01-15" />
            <Text style={styles.lbl}>Ubicación respecto al tramo</Text>
            <View style={styles.block}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {ubicCats.map((u) => (
                  <Pressable key={u._id} style={[styles.chip, String(form.ubicResTramo ?? '') === u.ubicacion && styles.chipOn]} onPress={() => setField('ubicResTramo', u.ubicacion)}>
                    <Text style={[styles.chipTxt, String(form.ubicResTramo ?? '') === u.ubicacion && styles.chipTxtOn]}>{u.ubicacion}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </>
        ) : null}

        {paso === 3 ? (
          <>
            <Text style={styles.h2}>Ubicación (GPS)</Text>
            <Pressable style={[styles.secBtn, gpsBusy && styles.dis]} disabled={gpsBusy} onPress={() => void capturarGps()}>
              <Text style={styles.secBtnTxt}>Capturar GPS</Text>
            </Pressable>
            <DecimalTextField label="Lat" value={form.lat} variant="coord" onCommit={(n) => setField('lat', n)} />
            <DecimalTextField label="Lng" value={form.lng} variant="coord" onCommit={(n) => setField('lng', n)} />
          </>
        ) : null}

        {paso === 4 ? (
          <>
            <Text style={styles.h2}>Observaciones y foto</Text>
            {(['obs1', 'obs2', 'obs3', 'obs4', 'obs5', 'obs6'] as const).map((k, idx) => (
              <View key={k} style={styles.block}>
                <Text style={styles.lbl}>Observación {idx + 1}</Text>
                <Pressable style={styles.pickBtn} onPress={() => setObsPick(k)}>
                  <Text style={styles.pickTxt}>{labelObs(k)}</Text>
                </Pressable>
              </View>
            ))}
            <Text style={styles.lbl}>Notas</Text>
            <TextInput
              style={[styles.inp, { minHeight: 80, textAlignVertical: 'top' }]}
              multiline
              value={String(form.notas ?? '')}
              onChangeText={(t) => setField('notas', t)}
            />
            <Text style={styles.section}>Foto (opcional)</Text>
            {fotoNueva?.uri ? (
              <Image source={{ uri: fotoNueva.uri }} style={styles.fotoPrev} />
            ) : form.urlFotoSH && apiBase ? (
              <Image source={{ uri: `${apiBase}${form.urlFotoSH}` }} style={styles.fotoPrev} />
            ) : null}
            <Pressable style={styles.camBtn} onPress={() => void tomarFoto()}>
              <Text style={styles.camBtnTxt}>{fotoNueva || form.urlFotoSH ? 'Cambiar foto (cámara)' : 'Tomar foto (cámara)'}</Text>
            </Pressable>
            {(fotoNueva || form.urlFotoSH) && (
              <Pressable onPress={() => { setFotoNueva(null); setField('urlFotoSH', ''); }}>
                <Text style={styles.warnLink}>Quitar foto nueva / URL</Text>
              </Pressable>
            )}
          </>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={[styles.navBtn, paso === 1 && styles.dis]} disabled={paso === 1} onPress={() => setPaso((p) => Math.max(1, p - 1))}>
          <Text>Anterior</Text>
        </Pressable>
        {paso < TOTAL_PASOS ? (
          <Pressable style={styles.navPri} onPress={() => setPaso((p) => Math.min(TOTAL_PASOS, p + 1))}>
            <Text style={styles.navPriTxt}>Siguiente</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.navPri, saving && styles.dis]} disabled={saving} onPress={() => void guardar()}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.navPriTxt}>Guardar</Text>}
          </Pressable>
        )}
      </View>

      <Modal visible={demOpen} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTit}>Catálogo demarcaciones</Text>
            <TextInput style={styles.inp} placeholder="Buscar código o descripción…" value={busqDem} onChangeText={setBusqDem} />
            <Pressable style={styles.modalClose} onPress={() => setDemOpen(false)}>
              <Text style={styles.link}>Cerrar</Text>
            </Pressable>
            <ScrollView style={{ maxHeight: 420 }}>
              {demFiltrado.map((d) => (
                <Pressable key={d._id} style={styles.galRow} onPress={() => seleccionarDem(d)}>
                  {d.urlDemImg && apiBase ? (
                    <Image source={{ uri: `${apiBase}${d.urlDemImg}` }} style={styles.galThumb} />
                  ) : (
                    <View style={[styles.galThumb, styles.galPh]} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.galCod}>{d.codDem}</Text>
                    <Text style={styles.galDesc} numberOfLines={2}>
                      {d.descripcion ?? d.claseDem ?? '—'}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={tramoOpen} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTit}>Seleccionar tramo</Text>
            <TextInput style={styles.inp} placeholder="Buscar vía o nomenclatura…" value={busqTramo} onChangeText={setBusqTramo} />
            <Pressable style={styles.modalClose} onPress={() => setTramoOpen(false)}>
              <Text style={styles.link}>Cerrar</Text>
            </Pressable>
            <ScrollView style={{ maxHeight: 420 }}>
              {tramosFiltrados.map((t) => (
                <Pressable key={t._id} style={styles.galRow} onPress={() => seleccionarTramo(t)}>
                  <View style={[styles.galThumb, styles.galPh]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.galCod}>{t.via ?? '—'}</Text>
                    <Text style={styles.galDesc} numberOfLines={2}>
                      {t.nomenclatura?.completa ?? '—'} · {t.municipio ?? ''}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={obsPick != null} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={() => setObsPick(null)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTit}>Observación catálogo</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {obsCats.map((o) => (
                <Pressable
                  key={o._id}
                  style={styles.modalRow}
                  onPress={() => {
                    if (obsPick) setField(obsPick, o._id);
                    setObsPick(null);
                  }}
                >
                  <Text style={styles.modalRowTxt}>{o.obsSH}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.modalClose} onPress={() => setObsPick(null)}>
              <Text style={styles.link}>Cerrar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f141a' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f141a' },
  loadTxt: { marginTop: 10, color: '#a7bacb' },
  progress: { padding: 12, backgroundColor: '#18212b', borderBottomWidth: 1, borderBottomColor: '#2d3b49' },
  progressTxt: { fontWeight: '700', color: '#4a8bc0' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  h2: { fontSize: 18, fontWeight: '700', color: '#e8eef5', marginBottom: 10 },
  section: { marginTop: 14, marginBottom: 8, fontWeight: '700', color: '#4a8bc0' },
  block: { marginBottom: 12 },
  lbl: { fontSize: 13, fontWeight: '600', color: '#a7bacb', marginBottom: 6 },
  inp: {
    borderWidth: 1,
    borderColor: '#2d3b49',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#18212b',
    color: '#e8eef5',
  },
  chip: { marginRight: 8, marginBottom: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20, backgroundColor: '#202b36', maxWidth: 240, borderWidth: 1, borderColor: '#2d3b49' },
  chipOn: { backgroundColor: '#4a8bc0' },
  chipTxt: { fontSize: 12, color: '#a7bacb' },
  chipTxtOn: { color: '#fff', fontWeight: '700' },
  secBtn: { borderWidth: 1, borderColor: '#2d3b49', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 12, backgroundColor: '#18212b' },
  secBtnTxt: { color: '#4a8bc0', fontWeight: '700' },
  selCard: { backgroundColor: '#18212b', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#2d3b49', marginBottom: 12 },
  selImg: { width: '100%', height: 180, backgroundColor: '#202b36', borderRadius: 8 },
  selCod: { marginTop: 10, fontSize: 16, fontWeight: '800', color: '#e8eef5' },
  selDesc: { marginTop: 6, color: '#a7bacb' },
  link: { color: '#1565c0', fontWeight: '700', marginTop: 10 },
  footer: { flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: '#2d3b49', backgroundColor: '#18212b' },
  navBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#2d3b49' },
  navPri: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#4a8bc0' },
  navPriTxt: { fontWeight: '700', color: '#fff' },
  dis: { opacity: 0.45 },
  pickBtn: { borderWidth: 1, borderColor: '#2d3b49', borderRadius: 8, padding: 12, backgroundColor: '#18212b' },
  pickTxt: { fontSize: 14, color: '#e8eef5' },
  fotoPrev: { width: '100%', height: 180, borderRadius: 10, backgroundColor: '#202b36', marginBottom: 10 },
  camBtn: { backgroundColor: '#1565c0', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  camBtnTxt: { color: '#fff', fontWeight: '700' },
  warnLink: { color: '#c62828', fontWeight: '700', marginTop: 10 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: '#18212b', borderRadius: 12, padding: 12, maxHeight: '85%', borderWidth: 1, borderColor: '#2d3b49' },
  modalTit: { fontSize: 17, fontWeight: '700', marginBottom: 10, color: '#e8eef5' },
  modalClose: { marginTop: 10, alignItems: 'center', padding: 10 },
  galRow: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#2d3b49' },
  galThumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#202b36' },
  galPh: { backgroundColor: '#202b36' },
  galCod: { fontWeight: '800', color: '#e8eef5' },
  galDesc: { color: '#a7bacb', marginTop: 4 },
  modalRow: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#2d3b49' },
  modalRowTxt: { fontSize: 15, color: '#e8eef5' },
});

