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
  SV_ACCIONES,
  SV_BANDERAS_OPTS,
  SV_DIAG_OPTS,
  SV_ESTADOS,
  SV_ESTADOS_SOP,
  SV_FALLAS_OPTS,
  SV_FASES,
  SV_FORMAS,
  SV_MAT_PLACAS,
  SV_OBSTRUCCIONES,
  SV_ORIENTACIONES,
  SV_REFLEC_OPTS,
  SV_SISTEMAS_SOP,
  SV_TIPOS_SOPORTE,
  SV_UBIC_ESPACIALES,
  SV_UBIC_PER_VIALES,
} from '@/constants/senVertEnums';
import { createSenVertFormState } from '@/domain/senVertFormDefaults';
import { buildSenVertPayload } from '@/domain/senVertSubmit';
import { useJornadaActiva } from '@/hooks/useJornadaActiva';
import { getApiBaseUrl } from '@/config/env';
import type { RootStackParamList } from '@/navigation/types';
import { fetchViaTramos } from '@/services/api/viaTramoApi';
import { fetchObsSvCatalogo, fetchSenVertCatalogo } from '@/services/api/senVertCatalogApi';
import {
  createExistSenVert,
  fetchExistSenVertById,
  updateExistSenVert,
  uploadSenVertFoto,
} from '@/services/api/senVertApi';
import { captureGeolocation } from '@/services/geo/captureLocation';
import { useAppTheme } from '@/theme/ThemeProvider';
import type { ObsSvDto, SenVertCatalogoDto } from '@/types/senVert';
import type { JornadaActivaDto } from '@/types/jornada';
import type { ViaTramoListItemDto } from '@/types/viaTramo';

const TOTAL_PASOS = 5;

type Nav = NativeStackNavigationProp<RootStackParamList, 'SenVertWizard'>;
type Route = RouteProp<RootStackParamList, 'SenVertWizard'>;

function applyRegistroToState(
  raw: Record<string, unknown>,
  jornadaActiva: JornadaActivaDto | null,
  setForm: React.Dispatch<React.SetStateAction<Record<string, unknown>>>,
  setTramo: (t: ViaTramoListItemDto | null) => void,
  setSen: (s: SenVertCatalogoDto | null) => void,
  catalogo: SenVertCatalogoDto[],
): void {
  const next = createSenVertFormState(jornadaActiva) as Record<string, unknown>;
  const assignKeys = [
    'idJornada',
    'idViaTramo',
    'codSe',
    'estado',
    'matPlaca',
    'ubicEspacial',
    'obstruccion',
    'fechaInst',
    'forma',
    'orientacion',
    'reflecOptima',
    'dimTablero',
    'ubicPerVial',
    'fase',
    'accion',
    'ubicLateral',
    'diagUbicLat',
    'altura',
    'diagAltura',
    'banderas',
    'leyendas',
    'falla1',
    'falla2',
    'falla3',
    'falla4',
    'falla5',
    'tipoSoporte',
    'sistemaSoporte',
    'estadoSoporte',
    'estadoAnclaje',
    'notas',
    'urlFotoSenVert',
  ] as const;
  for (const k of assignKeys) {
    if (raw[k] !== undefined) next[k] = raw[k];
  }
  if (typeof next.fechaInst === 'string' && next.fechaInst.includes('T')) {
    next.fechaInst = next.fechaInst.split('T')[0];
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
  for (const o of ['obs1', 'obs2', 'obs3', 'obs4', 'obs5'] as const) {
    const v = raw[o];
    if (v && typeof v === 'object' && '_id' in (v as object)) {
      next[o] = (v as { _id: string })._id;
    } else {
      next[o] = v ?? '';
    }
  }
  const cod = String(raw.codSe ?? '');
  setSen(catalogo.find((s) => s.codSenVert === cod) ?? null);
  setForm(next);
}

export function SenVertWizardScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const editId = route.params?.id;
  const { jornada } = useJornadaActiva();
  const { colors } = useAppTheme();
  const apiBase = getApiBaseUrl();

  const [paso, setPaso] = useState(1);
  const [form, setForm] = useState<Record<string, unknown>>(() => createSenVertFormState(null));
  const [catalogo, setCatalogo] = useState<SenVertCatalogoDto[]>([]);
  const [obsSv, setObsSv] = useState<ObsSvDto[]>([]);
  const [tramos, setTramos] = useState<ViaTramoListItemDto[]>([]);
  const [tramoSel, setTramoSel] = useState<ViaTramoListItemDto | null>(null);
  const [senSel, setSenSel] = useState<SenVertCatalogoDto | null>(null);
  const [galeriaOpen, setGaleriaOpen] = useState(false);
  const [busqCat, setBusqCat] = useState('');
  const [busqTramo, setBusqTramo] = useState('');
  const [tramoMenu, setTramoMenu] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [fotoNueva, setFotoNueva] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [obsPick, setObsPick] = useState<'obs1' | 'obs2' | 'obs3' | 'obs4' | 'obs5' | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: editId ? 'Editar señal vertical' : 'Nueva señal vertical' });
  }, [editId, navigation]);

  useEffect(() => {
    if (!jornada) return;
    setForm((f) => ({
      ...f,
      idJornada: jornada._id,
      municipio: jornada.municipio ?? '',
      departamento: jornada.dpto ?? '',
      supervisor: jornada.supervisor ?? '',
    }));
  }, [jornada?._id]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setInitLoading(true);
      try {
        const [cat, obs, tr] = await Promise.all([
          fetchSenVertCatalogo(),
          fetchObsSvCatalogo(),
          fetchViaTramos(),
        ]);
        if (cancel) return;
        setCatalogo(cat);
        setObsSv(obs);
        setTramos(tr);
        if (editId) {
          const r = await fetchExistSenVertById(editId);
          if (!cancel && r) {
            applyRegistroToState(
              r as unknown as Record<string, unknown>,
              jornada ?? null,
              setForm,
              setTramoSel,
              setSenSel,
              cat,
            );
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

  function chipRow<T extends string>(
    label: string,
    value: string,
    options: readonly T[],
    onSelect: (v: T) => void,
  ): React.JSX.Element {
    return (
      <View style={styles.block}>
        <Text style={[styles.lbl, { color: colors.textMuted }]}>{label}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {options.map((o) => (
            <Pressable
              key={o}
              style={[styles.chip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, value === o && styles.chipOn]}
              onPress={() => onSelect(o)}
            >
              <Text style={[styles.chipTxt, { color: colors.text }, value === o && styles.chipTxtOn]} numberOfLines={2}>
                {o}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  async function capturarGps(): Promise<void> {
    setGpsBusy(true);
    try {
      const g = await captureGeolocation();
      const [lng, lat] = g.point.coordinates;
      setForm((f) => ({ ...f, lat, lng }));
    } catch (e) {
      Alert.alert('GPS', e instanceof Error ? e.message : 'Error');
    } finally {
      setGpsBusy(false);
    }
  }

  const catalogoFiltrado = useMemo(() => {
    const q = busqCat.trim().toLowerCase();
    if (!q) return catalogo;
    return catalogo.filter(
      (s) =>
        s.codSenVert?.toLowerCase().includes(q) ||
        s.descSenVert?.toLowerCase().includes(q) ||
        (s.clasificacion ?? '').toLowerCase().includes(q),
    );
  }, [busqCat, catalogo]);

  const tramosFiltrados = useMemo(() => {
    const q = busqTramo.trim().toLowerCase();
    if (!q) return tramos;
    return tramos.filter(
      (t) =>
        (t.via ?? '').toLowerCase().includes(q) ||
        (t.municipio ?? '').toLowerCase().includes(q) ||
        (t.nomenclatura?.completa ?? '').toLowerCase().includes(q),
    );
  }, [busqTramo, tramos]);

  function seleccionarTramo(t: ViaTramoListItemDto): void {
    setTramoSel(t);
    setField('idViaTramo', t._id);
    setBusqTramo(t.via ?? t.nomenclatura?.completa ?? '');
    setTramoMenu(false);
  }

  function seleccionarSen(s: SenVertCatalogoDto): void {
    setSenSel(s);
    setField('codSe', s.codSenVert);
    setGaleriaOpen(false);
    setBusqCat('');
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

  async function guardar(): Promise<void> {
    const idVt = String(form.idViaTramo ?? '');
    if (!idVt) {
      Alert.alert('Tramo', 'Selecciona el tramo de vía (paso 1).');
      return;
    }
    if (!String(form.codSe ?? '')) {
      Alert.alert('Señal', 'Selecciona la señal del catálogo (paso 3).');
      return;
    }
    setSaving(true);
    try {
      const body = buildSenVertPayload(form);
      const reg = editId
        ? await updateExistSenVert(editId, body)
        : await createExistSenVert(body);
      const regId = reg._id;

      if (fotoNueva?.uri) {
        try {
          const url = await uploadSenVertFoto({
            uri: fotoNueva.uri,
            name: fotoNueva.fileName ?? 'sen-vert.jpg',
            type: fotoNueva.mimeType ?? 'image/jpeg',
          });
          await updateExistSenVert(regId, { urlFotoSenVert: url });
        } catch (e) {
          Alert.alert('Foto', e instanceof Error ? e.message : 'No se subió la foto; el registro sí se guardó.');
        }
      }

      Alert.alert('Listo', editId ? 'Señal actualizada.' : 'Señal creada.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  function labelObs(field: 'obs1' | 'obs2' | 'obs3' | 'obs4' | 'obs5'): string {
    const id = String(form[field] ?? '');
    if (!id) return 'Seleccionar…';
    const o = obsSv.find((x) => x._id === id);
    return o?.observacion ?? id;
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
        <Text style={[styles.progressTxt, { color: colors.secondary }]}>
          Paso {paso} / {TOTAL_PASOS} — ExistSenVert
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollPad}>
        {paso === 1 ? (
          <>
            <Text style={[styles.h2, { color: colors.text }]}>Tramo de vía</Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>La señal debe asociarse a un inventario `via_tramos`.</Text>
            {tramoSel ? (
              <View style={styles.tramoCard}>
                <Text style={styles.tramoMain}>{tramoSel.via || tramoSel.nomenclatura?.completa || '—'}</Text>
                <Text style={styles.tramoSub}>
                  {tramoSel.nomenclatura?.completa} · {tramoSel.municipio}
                </Text>
                <Pressable onPress={() => { setTramoSel(null); setField('idViaTramo', ''); setBusqTramo(''); }}>
                  <Text style={[styles.link, { color: colors.primary }]}>Cambiar tramo</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.inp}
                  placeholder="Buscar tramo…"
                  value={busqTramo}
                  onChangeText={(t) => {
                    setBusqTramo(t);
                    setTramoMenu(true);
                  }}
                  onFocus={() => setTramoMenu(true)}
                />
                {tramoMenu && tramosFiltrados.length > 0 ? (
                  <View style={styles.drop}>
                    {tramosFiltrados.slice(0, 12).map((t) => (
                      <Pressable key={t._id} style={styles.dropRow} onPress={() => seleccionarTramo(t)}>
                        <Text style={styles.dropMain}>{t.via || '—'}</Text>
                        <Text style={styles.dropSub}>{t.nomenclatura?.completa} · {t.municipio}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </>
            )}
          </>
        ) : null}

        {paso === 2 ? (
          <>
            <Text style={styles.h2}>Ubicación (punto)</Text>
            <Pressable style={[styles.gpsBtn, gpsBusy && styles.dis]} onPress={() => void capturarGps()} disabled={gpsBusy}>
              <Text style={styles.gpsTxt}>Capturar GPS</Text>
            </Pressable>
            <DecimalTextField
              label="Latitud"
              value={form.lat}
              variant="coord"
              onCommit={(n) => setField('lat', n)}
            />
            <DecimalTextField
              label="Longitud"
              value={form.lng}
              variant="coord"
              onCommit={(n) => setField('lng', n)}
            />
          </>
        ) : null}

        {paso === 3 ? (
          <>
            <Text style={styles.h2}>Señal del catálogo</Text>
            {senSel ? (
              <View style={styles.senCard}>
                {senSel.urlImgSenVert && apiBase ? (
                  <Image source={{ uri: `${apiBase}${senSel.urlImgSenVert}` }} style={styles.senImg} resizeMode="contain" />
                ) : null}
                <Text style={styles.senCod}>{senSel.codSenVert}</Text>
                <Text style={styles.senDesc}>{senSel.descSenVert}</Text>
                <Pressable onPress={() => setGaleriaOpen(true)}>
                  <Text style={styles.link}>Cambiar señal</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.secBtn} onPress={() => setGaleriaOpen(true)}>
                <Text style={styles.secBtnTxt}>Elegir del catálogo (imagen)</Text>
              </Pressable>
            )}

            <Text style={styles.section}>Características</Text>
            {chipRow('Estado señal', String(form.estado ?? ''), SV_ESTADOS, (v) => setField('estado', v))}
            {chipRow('Material placa', String(form.matPlaca ?? ''), SV_MAT_PLACAS, (v) => setField('matPlaca', v))}
            {chipRow('Ubicación espacial', String(form.ubicEspacial ?? ''), SV_UBIC_ESPACIALES, (v) =>
              setField('ubicEspacial', v),
            )}
            {chipRow('Obstrucción', String(form.obstruccion ?? ''), SV_OBSTRUCCIONES, (v) => setField('obstruccion', v))}
            {chipRow('Forma', String(form.forma ?? ''), SV_FORMAS, (v) => setField('forma', v))}
            {chipRow('Orientación', String(form.orientacion ?? ''), SV_ORIENTACIONES, (v) => setField('orientacion', v))}
            {chipRow('Reflectividad óptima', String(form.reflecOptima ?? ''), SV_REFLEC_OPTS, (v) =>
              setField('reflecOptima', v),
            )}
            <Text style={styles.lbl}>Dimensiones tablero</Text>
            <TextInput
              style={styles.inp}
              value={String(form.dimTablero ?? '')}
              onChangeText={(t) => setField('dimTablero', t)}
              placeholder="Ej: 60x60 cm"
            />
            {chipRow('Ubicación perfil vial', String(form.ubicPerVial ?? ''), SV_UBIC_PER_VIALES, (v) =>
              setField('ubicPerVial', v),
            )}
            {chipRow('Banderas', String(form.banderas ?? ''), SV_BANDERAS_OPTS, (v) => setField('banderas', v))}
            <Text style={styles.lbl}>Fecha instalación (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.inp}
              value={String(form.fechaInst ?? '')}
              onChangeText={(t) => setField('fechaInst', t)}
              placeholder="2024-01-15"
            />
            <Text style={styles.lbl}>Leyendas</Text>
            <TextInput style={styles.inp} value={String(form.leyendas ?? '')} onChangeText={(t) => setField('leyendas', t)} />

            <Text style={styles.section}>Ubicación lateral y altura</Text>
            <DecimalTextField
              label="Ubicación lateral (m)"
              small
              value={form.ubicLateral}
              variant="medida"
              onCommit={(n) => setField('ubicLateral', n ?? 0)}
            />
            {chipRow('Diagnóstico ubic. lateral', String(form.diagUbicLat ?? ''), SV_DIAG_OPTS, (v) =>
              setField('diagUbicLat', v),
            )}
            <DecimalTextField
              label="Altura (m)"
              small
              value={form.altura}
              variant="medida"
              onCommit={(n) => setField('altura', n ?? 0)}
            />
            {chipRow('Diagnóstico altura', String(form.diagAltura ?? ''), SV_DIAG_OPTS, (v) => setField('diagAltura', v))}

            <Text style={styles.section}>Fase y acción</Text>
            {chipRow('Fase', String(form.fase ?? ''), SV_FASES, (v) => setField('fase', v))}
            {chipRow('Acción', String(form.accion ?? ''), SV_ACCIONES, (v) => setField('accion', v))}
          </>
        ) : null}

        {paso === 4 ? (
          <>
            <Text style={styles.h2}>Fallas y soporte</Text>
            {([1, 2, 3, 4, 5] as const).map((i) => (
              <View key={i}>
                {chipRow(`Falla ${i}`, String(form[`falla${i}`] ?? ''), SV_FALLAS_OPTS, (v) =>
                  setField(`falla${i}`, v),
                )}
              </View>
            ))}
            <Text style={styles.section}>Soporte</Text>
            {chipRow('Tipo soporte', String(form.tipoSoporte ?? ''), SV_TIPOS_SOPORTE, (v) => setField('tipoSoporte', v))}
            {chipRow('Sistema soporte', String(form.sistemaSoporte ?? ''), SV_SISTEMAS_SOP, (v) =>
              setField('sistemaSoporte', v),
            )}
            {chipRow('Estado soporte', String(form.estadoSoporte ?? ''), SV_ESTADOS_SOP, (v) =>
              setField('estadoSoporte', v),
            )}
            {chipRow('Estado anclaje', String(form.estadoAnclaje ?? ''), SV_ESTADOS_SOP, (v) =>
              setField('estadoAnclaje', v),
            )}
          </>
        ) : null}

        {paso === 5 ? (
          <>
            <Text style={styles.h2}>Observaciones y foto</Text>
            {(['obs1', 'obs2', 'obs3', 'obs4', 'obs5'] as const).map((k, idx) => (
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
            <Text style={styles.section}>Foto de la señal (opcional)</Text>
            {fotoNueva?.uri ? (
              <Image source={{ uri: fotoNueva.uri }} style={styles.fotoPrev} />
            ) : form.urlFotoSenVert && apiBase ? (
              <Image source={{ uri: `${apiBase}${form.urlFotoSenVert}` }} style={styles.fotoPrev} />
            ) : null}
            <Pressable style={styles.camBtn} onPress={() => void tomarFoto()}>
              <Text style={styles.camBtnTxt}>{fotoNueva || form.urlFotoSenVert ? 'Cambiar foto (cámara)' : 'Tomar foto (cámara)'}</Text>
            </Pressable>
            {(fotoNueva || form.urlFotoSenVert) && (
              <Pressable onPress={() => { setFotoNueva(null); setField('urlFotoSenVert', ''); }}>
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

      <Modal visible={galeriaOpen} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTit}>Catálogo señales verticales</Text>
            <TextInput style={styles.inp} placeholder="Buscar código o descripción…" value={busqCat} onChangeText={setBusqCat} />
            <Pressable style={styles.modalClose} onPress={() => setGaleriaOpen(false)}>
              <Text style={styles.link}>Cerrar</Text>
            </Pressable>
            <ScrollView style={{ maxHeight: 420 }}>
              {catalogoFiltrado.map((s) => (
                <Pressable key={s._id} style={styles.galRow} onPress={() => seleccionarSen(s)}>
                  {s.urlImgSenVert && apiBase ? (
                    <Image source={{ uri: `${apiBase}${s.urlImgSenVert}` }} style={styles.galThumb} />
                  ) : (
                    <View style={[styles.galThumb, styles.galPh]} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.galCod}>{s.codSenVert}</Text>
                    <Text style={styles.galDesc} numberOfLines={2}>{s.descSenVert}</Text>
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
              <Pressable style={styles.dropRow} onPress={() => { if (obsPick) setField(obsPick, ''); setObsPick(null); }}>
                <Text>(Sin selección)</Text>
              </Pressable>
              {obsSv.map((o) => (
                <Pressable
                  key={o._id}
                  style={styles.dropRow}
                  onPress={() => {
                    if (obsPick) setField(obsPick, o._id);
                    setObsPick(null);
                  }}
                >
                  <Text>{o.observacion}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f141a' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f141a' },
  loadTxt: { marginTop: 8, color: '#a7bacb' },
  progress: { padding: 10, backgroundColor: '#18212b', borderBottomWidth: 1, borderBottomColor: '#2d3b49' },
  progressTxt: { fontWeight: '700', color: '#a06ac8' },
  scroll: { flex: 1 },
  scrollPad: { padding: 16, paddingBottom: 28 },
  h2: { fontSize: 18, fontWeight: '700', color: '#e8eef5', marginBottom: 6 },
  sub: { fontSize: 13, color: '#a7bacb', marginBottom: 12 },
  block: { marginBottom: 12 },
  lbl: { fontSize: 13, fontWeight: '600', color: '#a7bacb', marginBottom: 6 },
  section: { fontSize: 15, fontWeight: '700', color: '#a06ac8', marginTop: 16, marginBottom: 8 },
  inp: {
    borderWidth: 1,
    borderColor: '#2d3b49',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#18212b',
    fontSize: 15,
    color: '#e8eef5',
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#202b36',
    borderWidth: 1,
    borderColor: '#2d3b49',
    maxWidth: 260,
  },
  chipOn: { backgroundColor: '#a06ac8' },
  chipTxt: { fontSize: 11, color: '#a7bacb' },
  chipTxtOn: { color: '#fff', fontWeight: '700' },
  tramoCard: {
    backgroundColor: '#18212b',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2d3b49',
  },
  tramoMain: { fontSize: 17, fontWeight: '700', color: '#e8eef5' },
  tramoSub: { fontSize: 14, color: '#a7bacb', marginTop: 4 },
  link: { color: '#1565c0', fontWeight: '700', marginTop: 8 },
  drop: {
    backgroundColor: '#18212b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2d3b49',
    maxHeight: 220,
    marginTop: 4,
  },
  dropRow: { padding: 12, borderBottomWidth: 1, borderColor: '#f5f5f5' },
  dropMain: { fontWeight: '700' },
  dropSub: { fontSize: 12, color: '#a7bacb' },
  gpsBtn: { backgroundColor: '#a06ac8', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  gpsTxt: { color: '#fff', fontWeight: '700' },
  dis: { opacity: 0.5 },
  senCard: { backgroundColor: '#18212b', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#2d3b49' },
  senImg: { width: '100%', height: 140, marginBottom: 8 },
  senCod: { fontSize: 16, fontWeight: '700', color: '#e8eef5' },
  senDesc: { fontSize: 14, color: '#a7bacb' },
  secBtn: { borderWidth: 1, borderColor: '#2d3b49', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 12, backgroundColor: '#18212b' },
  secBtnTxt: { color: '#a06ac8', fontWeight: '700' },
  pickBtn: { borderWidth: 1, borderColor: '#2d3b49', borderRadius: 8, padding: 12, backgroundColor: '#18212b' },
  pickTxt: { fontSize: 14, color: '#e8eef5' },
  fotoPrev: { width: '100%', height: 180, borderRadius: 8, marginBottom: 10, backgroundColor: '#202b36' },
  camBtn: { backgroundColor: '#4a8bc0', padding: 14, borderRadius: 10, alignItems: 'center' },
  camBtnTxt: { color: '#fff', fontWeight: '700' },
  warnLink: { color: '#c62828', marginTop: 8, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1, borderColor: '#2d3b49', backgroundColor: '#18212b' },
  navBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#2d3b49' },
  navPri: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 10, backgroundColor: '#a06ac8' },
  navPriTxt: { color: '#fff', fontWeight: '700' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#18212b', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '88%', borderWidth: 1, borderColor: '#2d3b49' },
  modalTit: { fontSize: 17, fontWeight: '700', marginBottom: 10, color: '#e8eef5' },
  modalClose: { alignSelf: 'flex-end', marginBottom: 8 },
  galRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#2d3b49', gap: 10 },
  galThumb: { width: 56, height: 56, borderRadius: 6 },
  galPh: { backgroundColor: '#202b36' },
  galCod: { fontWeight: '700', color: '#e8eef5' },
  galDesc: { fontSize: 12, color: '#a7bacb' },
});
