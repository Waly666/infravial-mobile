import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { DecimalTextField } from '@/components/DecimalTextField';
import { GeoPreviewMap } from '@/components/GeoPreviewMap';
import { WizardChipRow } from '@/components/WizardChipRow';
import { WizardFooterNav } from '@/components/WizardFooterNav';
import { WizardHero } from '@/components/WizardHero';
import { buildSemaforoPayload } from '@/domain/semaforoSubmit';
import { createSemaforoFormState } from '@/domain/semaforoFormDefaults';
import { getApiBaseUrl } from '@/config/env';
import { useJornadaActiva } from '@/hooks/useJornadaActiva';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import type { RootStackParamList } from '@/navigation/types';
import { createSemaforo, fetchSemaforoById, updateSemaforo, updateSemaforoCaras, uploadSemaforoFoto } from '@/services/api/semaforoApi';
import { fetchObsSemaforos } from '@/services/api/semaforoCatalogApi';
import { fetchControlesSem } from '@/services/api/controlSemApi';
import { enqueueOffline } from '@/services/sync/offlineOutbox';
import { sqliteSurveyRepository } from '@/storage/offline/sqliteSurveyRepository';
import { fetchViaTramos } from '@/services/api/viaTramoApi';
import { captureGeolocation } from '@/services/geo/captureLocation';
import { useAppTheme } from '@/theme/ThemeProvider';
import type { ControlSemDto } from '@/types/controlSem';
import type { CaraSemaforoDto, ObsSemaforoDto, SemaforoDto } from '@/types/semaforo';
import type { ViaTramoListItemDto } from '@/types/viaTramo';
import {
  controlSemPickerMatches,
  filtrarTramosPickerPorBusqueda,
  nomenclaturaSearchText,
  rowMongoIdString,
} from '@/utils/tramoSearch';

const FASES = ['Inventario', 'Programación', 'Diseño', 'Por definir'] as const;
const ACCIONES = ['Repintar', 'Borrar', 'Mantenimiento', 'Retiro', 'Reemplazo', 'Reposicion', 'Instalacion', 'Otro'] as const;
const ESTADOS = ['Bueno', 'Regular', 'Malo'] as const;
const IMPLEMENTACIONES = ['Temporal', 'Definitiva'] as const;
const VIS = ['si', 'no', 'N/A'] as const;
const NUM_CARAS = [1, 2, 3, 4] as const;
const CLASES = ['Control Vehicular', 'Control Peatonal Tiempo Fijo', 'Control Peatonal accionado por peaton', 'Semaforo sonoro', 'Semaforo de Destello o Intemitente', 'Regulacion de Carriles', 'Maniobras Vehiculos de emergencia', 'Control Servicio Publico', 'Cruce Ferroviario', 'Semaforo Inteligente', 'Semaforo Portatil'] as const;
const TIPOS_SOPORTE = ['Poste en Angulo de hierro', 'Tubo galvanizado', 'Portico', 'Mensula corta', 'Mensula larga', 'Cable de suspension', 'Postes y pedestales en islas', 'Otro'] as const;
const SISTEMAS_SOP = ['Tipo H', 'Duplex', 'Movil', 'Poste abatible', 'Elevado', 'Simple'] as const;
const TIPOS_MODULO = ['Led', 'Bombilla Incandescente'] as const;
const DIAMETROS = ['30 cms', '20 cms'] as const;
const DESPLIEGUES = ['Vertical', 'Horizontal'] as const;
const NUM_MOD_OPTS = [1, 2, 3, 4, 5] as const;
const COLORES_OPTS = ['Rojo-Amarillo-Verde', 'Rojo-Verde', 'Tecnologia emision señal doble'] as const;
const DANOS_CARA = ['Desgaste', 'Lente roto', 'Lente Opaco', 'Falla Modulo', 'Falla Placa Contraste', 'Poste doblado', 'Tablero doblado', 'Elementos ajenos', 'Bulvo quemado', 'Led quemados', 'Sin información', 'N/A'] as const;
const SI_NO = ['Si', 'No'] as const;

function obsLabelValue(o: ObsSemaforoDto): string {
  const raw = o as unknown as Record<string, unknown>;
  const byKnownType = typeof o.obsSemaforo === 'string' ? o.obsSemaforo : '';
  const byAlt1 = typeof raw.observacion === 'string' ? raw.observacion : '';
  const byAlt2 = typeof raw.txtObs === 'string' ? raw.txtObs : '';
  const direct = (byKnownType || byAlt1 || byAlt2).trim();
  if (direct) return direct;

  const fallback = Object.entries(raw)
    .filter(([key, value]) => key !== '_id' && key !== '__v' && typeof value === 'string')
    .map(([, value]) => String(value).trim())
    .find((value) => value.length > 0 && value !== o._id);

  return fallback || o._id;
}

export function SemaforoWizardScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'SemaforoWizard'>>();
  const editId = route.params?.id;
  const draftLocalId = route.params?.draftLocalId;
  const draftPayload = route.params?.draftPayload as Record<string, unknown> | undefined;
  const online = useOnlineStatus();
  const { jornada } = useJornadaActiva();
  const { colors } = useAppTheme();
  const apiBase = getApiBaseUrl();
  const [form, setForm] = useState<Record<string, unknown>>(() => createSemaforoFormState(null));
  const [tramos, setTramos] = useState<ViaTramoListItemDto[]>([]);
  const [controles, setControles] = useState<ControlSemDto[]>([]);
  const [obs, setObs] = useState<ObsSemaforoDto[]>([]);
  const [tramoOpen, setTramoOpen] = useState(false);
  const [ctrlOpen, setCtrlOpen] = useState(false);
  const [obsPick, setObsPick] = useState<'obs1' | 'obs2' | 'obs3' | 'obs4' | 'obs5' | 'obs6' | null>(null);
  const [qTramo, setQTramo] = useState('');
  const [qCtrl, setQCtrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fotoSem, setFotoSem] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [fotoSop, setFotoSop] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [fotoAnc, setFotoAnc] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [fotoPul, setFotoPul] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [fotoAud, setFotoAud] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [fotosCaras, setFotosCaras] = useState<(ImagePicker.ImagePickerAsset | null)[]>([]);

  useEffect(() => {
    navigation.setOptions?.({
      title: draftLocalId ? 'Editar pendiente semáforo' : editId ? 'Editar semáforo' : 'Nuevo semáforo',
    });
  }, [draftLocalId, editId, navigation]);
  useEffect(() => { if (!jornada) return; setForm((f) => ({ ...f, idJornada: jornada._id, municipio: jornada.municipio ?? '', supervisor: jornada.supervisor ?? '' })); }, [jornada?._id]);
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const [vt, ct, ob] = await Promise.all([fetchViaTramos(), fetchControlesSem(), fetchObsSemaforos()]);
        if (cancel) return;
        setTramos(vt); setControles(ct); setObs(ob);
        if (draftPayload) {
          const body = { ...((draftPayload.body ?? {}) as Record<string, unknown>) };
          const geo = body.ubicacion as
            | { type?: string; coordinates?: [number, number] }
            | undefined;
          if (geo?.type === 'Point' && Array.isArray(geo.coordinates) && geo.coordinates.length === 2) {
            body.lng = Number(geo.coordinates[0]);
            body.lat = Number(geo.coordinates[1]);
          }
          for (const k of ['obs1', 'obs2', 'obs3', 'obs4', 'obs5', 'obs6'] as const) {
            const v = body[k];
            if (v && typeof v === 'object' && '_id' in (v as object)) {
              body[k] = (v as { _id: string })._id;
            }
          }
          setForm({ ...createSemaforoFormState(jornada ?? null), ...body });
          const fotos = (draftPayload.fotos ?? {}) as Record<string, { uri?: string } | null>;
          const fotosCarasDraft = (draftPayload.fotosCaras ?? []) as Array<{ uri?: string } | null>;
          if (fotos.urlFotoSemaforo?.uri) setFotoSem({ uri: fotos.urlFotoSemaforo.uri } as ImagePicker.ImagePickerAsset);
          if (fotos.urlFotoSoporte?.uri) setFotoSop({ uri: fotos.urlFotoSoporte.uri } as ImagePicker.ImagePickerAsset);
          if (fotos.urlFotoAnclaje?.uri) setFotoAnc({ uri: fotos.urlFotoAnclaje.uri } as ImagePicker.ImagePickerAsset);
          if (fotos.urlFotoPulsador?.uri) setFotoPul({ uri: fotos.urlFotoPulsador.uri } as ImagePicker.ImagePickerAsset);
          if (fotos.urlFotoDispAud?.uri) setFotoAud({ uri: fotos.urlFotoDispAud.uri } as ImagePicker.ImagePickerAsset);
          setFotosCaras(fotosCarasDraft.map((f) => (f?.uri ? ({ uri: f.uri } as ImagePicker.ImagePickerAsset) : null)));
          return;
        }
        if (editId) {
          const r = await fetchSemaforoById(editId);
          if (!cancel && r) {
            const next = { ...createSemaforoFormState(jornada ?? null), ...((r as unknown) as Record<string, unknown>) };
            const t = r.idViaTramo;
            if (t && typeof t === 'object' && '_id' in t) next.idViaTramo = t._id;
            const c = r.idControSem;
            if (c && typeof c === 'object' && '_id' in c) next.idControSem = c._id;
            if (r.ubicacion?.coordinates?.length === 2) { next.lng = r.ubicacion.coordinates[0]; next.lat = r.ubicacion.coordinates[1]; }
            for (const k of ['obs1', 'obs2', 'obs3', 'obs4', 'obs5', 'obs6'] as const) {
              const v = ((r as unknown) as Record<string, unknown>)[k];
              if (v && typeof v === 'object' && '_id' in (v as object)) next[k] = (v as { _id: string })._id;
            }
            if (!Array.isArray(next.caras)) next.caras = [];
            setForm(next);
            setFotosCaras(Array.from({ length: Number(next.numCaras ?? 1) }, () => null));
          }
        }
      } finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [draftPayload, editId, jornada?._id]);

  const tramosFiltrados = useMemo(
    () => filtrarTramosPickerPorBusqueda(tramos, qTramo),
    [qTramo, tramos],
  );
  const controlesFiltrados = useMemo(() => {
    const q = qCtrl.trim();
    if (!q) return controles;
    return controles.filter((c) =>
      controlSemPickerMatches(c as unknown as Record<string, unknown>, q),
    );
  }, [qCtrl, controles]);
  const tramoSeleccionado = useMemo(() => {
    const id = String(form.idViaTramo ?? '');
    if (!id) return null;
    return tramos.find((t) => t._id === id) ?? null;
  }, [form.idViaTramo, tramos]);
  const controlSeleccionado = useMemo(() => {
    const id = String(form.idControSem ?? '');
    if (!id) return null;
    return controles.find((c) => c._id === id) ?? null;
  }, [form.idControSem, controles]);

  function chipRow(label: string, value: string, opts: readonly string[], key: string): React.JSX.Element {
    return (
      <WizardChipRow
        label={label}
        value={value}
        options={opts}
        onSelect={(o) => setForm((f) => ({ ...f, [key]: o }))}
      />
    );
  }
  function labelObs(raw: unknown): string {
    if (!raw) return 'Seleccionar...';
    const id = typeof raw === 'string'
      ? raw
      : raw && typeof raw === 'object' && '_id' in (raw as object)
        ? String((raw as { _id?: unknown })._id ?? '')
        : String(raw);
    if (!id) return 'Seleccionar...';
    const found = obs.find((o) => o._id === id);
    return found ? obsLabelValue(found) : id;
  }
  function initCaras(numCaras: number): void {
    setForm((f) => {
      const caras = Array.from({ length: numCaras || 1 }, () => ({
        tipoModulo: '',
        diametroLente: '',
        numeroModulos: null,
        numeroVisceras: null,
        estadoMod1: null,
        estadoViscera1: null,
        estadoMod2: null,
        estadoViscera2: null,
        estadoMod3: null,
        estadoViscera3: null,
        estadoMod4: null,
        estadoViscera4: null,
        despliegue: '',
        estadoCara: '',
        colores: '',
        placaContraste: false,
        estadoPlacaCont: null,
        danos: [] as string[],
        flechaDir: false,
        obs: '',
        urlFoto: '',
      }));
      return { ...f, numCaras, caras };
    });
    setFotosCaras(Array.from({ length: numCaras || 1 }, () => null));
  }

  function updateCara(index: number, patch: Partial<CaraSemaforoDto>): void {
    setForm((f) => {
      const caras = [...(((f.caras as CaraSemaforoDto[]) ?? []))];
      const cur = { ...(caras[index] ?? {}), ...patch };
      caras[index] = cur;
      return { ...f, caras };
    });
  }

  function toggleDanoCara(index: number, dano: string): void {
    setForm((f) => {
      const caras = [...(((f.caras as CaraSemaforoDto[]) ?? []))];
      const cur = { ...(caras[index] ?? {}) };
      const danos = [...(cur.danos ?? [])];
      const p = danos.indexOf(dano);
      if (p === -1) danos.push(dano);
      else danos.splice(p, 1);
      cur.danos = danos;
      caras[index] = cur;
      return { ...f, caras };
    });
  }

  async function takeFoto(which: 'sem' | 'sop' | 'anc' | 'pul' | 'aud' | { cara: number }): Promise<void> {
    const perm = await ImagePicker.requestCameraPermissionsAsync(); if (!perm.granted) return;
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (!res.canceled && res.assets[0]) {
      if (typeof which === 'object') {
        const idx = which.cara;
        setFotosCaras((arr) => {
          const n = [...arr];
          n[idx] = res.assets[0];
          return n;
        });
      } else if (which === 'sem') setFotoSem(res.assets[0]);
      else if (which === 'sop') setFotoSop(res.assets[0]);
      else if (which === 'anc') setFotoAnc(res.assets[0]);
      else if (which === 'pul') setFotoPul(res.assets[0]);
      else setFotoAud(res.assets[0]);
    }
  }
  async function gps(): Promise<void> {
    try { const g = await captureGeolocation(); const [lng, lat] = g.point.coordinates; setForm((f) => ({ ...f, lat, lng })); }
    catch (e) { Alert.alert('GPS', e instanceof Error ? e.message : 'Error'); }
  }
  async function guardar(): Promise<void> {
    if (!String(form.idViaTramo ?? '')) return Alert.alert('Tramo', 'Selecciona tramo de vía');
    if (!String(form.idControSem ?? '')) return Alert.alert('Control', 'Selecciona control semafórico');
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return Alert.alert('Coordenadas', 'Captura o diligencia latitud y longitud');
    }
    const hasFoto =
      Boolean(fotoSem?.uri) ||
      Boolean(fotoSop?.uri) ||
      Boolean(fotoAnc?.uri) ||
      Boolean(fotoPul?.uri) ||
      Boolean(fotoAud?.uri) ||
      Boolean(form.urlFotoSemaforo) ||
      Boolean(form.urlFotoSoporte) ||
      Boolean(form.urlFotoAnclaje) ||
      Boolean(form.urlFotoPulsador) ||
      Boolean(form.urlFotoDispAud);
    if (!hasFoto) {
      return Alert.alert('Fotos', 'Debes registrar al menos una foto del semáforo');
    }
    setSaving(true);
    try {
      const body = buildSemaforoPayload(form);
      if (draftLocalId) {
        await sqliteSurveyRepository.updatePayload(draftLocalId, {
          ...(draftPayload ?? {}),
          _kind: 'semaforo',
          op: String(draftPayload?.op ?? 'create'),
          id: (draftPayload?.id as string | null | undefined) ?? null,
          body,
          fotos: {
            urlFotoSemaforo: fotoSem?.uri ? { uri: fotoSem.uri, name: fotoSem.fileName ?? 'semaforo.jpg', type: fotoSem.mimeType ?? 'image/jpeg' } : null,
            urlFotoSoporte: fotoSop?.uri ? { uri: fotoSop.uri, name: fotoSop.fileName ?? 'soporte.jpg', type: fotoSop.mimeType ?? 'image/jpeg' } : null,
            urlFotoAnclaje: fotoAnc?.uri ? { uri: fotoAnc.uri, name: fotoAnc.fileName ?? 'anclaje.jpg', type: fotoAnc.mimeType ?? 'image/jpeg' } : null,
            urlFotoPulsador: fotoPul?.uri ? { uri: fotoPul.uri, name: fotoPul.fileName ?? 'pulsador.jpg', type: fotoPul.mimeType ?? 'image/jpeg' } : null,
            urlFotoDispAud: fotoAud?.uri ? { uri: fotoAud.uri, name: fotoAud.fileName ?? 'auditivo.jpg', type: fotoAud.mimeType ?? 'image/jpeg' } : null,
          },
          caras: (form.caras as CaraSemaforoDto[]) ?? [],
          fotosCaras: fotosCaras.map((a, i) => (a?.uri ? { uri: a.uri, name: a.fileName ?? `cara-${i + 1}.jpg`, type: a.mimeType ?? 'image/jpeg' } : null)),
        });
        Alert.alert('Listo', 'Pendiente actualizado para sincronización.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }
      if (!online) {
        await enqueueOffline('semaforo', {
          op: editId ? 'update' : 'create',
          id: editId ?? null,
          body,
          fotos: {
            urlFotoSemaforo: fotoSem?.uri
              ? { uri: fotoSem.uri, name: fotoSem.fileName ?? 'semaforo.jpg', type: fotoSem.mimeType ?? 'image/jpeg' }
              : null,
            urlFotoSoporte: fotoSop?.uri
              ? { uri: fotoSop.uri, name: fotoSop.fileName ?? 'soporte.jpg', type: fotoSop.mimeType ?? 'image/jpeg' }
              : null,
            urlFotoAnclaje: fotoAnc?.uri
              ? { uri: fotoAnc.uri, name: fotoAnc.fileName ?? 'anclaje.jpg', type: fotoAnc.mimeType ?? 'image/jpeg' }
              : null,
            urlFotoPulsador: fotoPul?.uri
              ? { uri: fotoPul.uri, name: fotoPul.fileName ?? 'pulsador.jpg', type: fotoPul.mimeType ?? 'image/jpeg' }
              : null,
            urlFotoDispAud: fotoAud?.uri
              ? { uri: fotoAud.uri, name: fotoAud.fileName ?? 'auditivo.jpg', type: fotoAud.mimeType ?? 'image/jpeg' }
              : null,
          },
          caras: (form.caras as CaraSemaforoDto[]) ?? [],
          fotosCaras: fotosCaras.map((a, i) =>
            a?.uri
              ? {
                  uri: a.uri,
                  name: a.fileName ?? `cara-${i + 1}.jpg`,
                  type: a.mimeType ?? 'image/jpeg',
                }
              : null,
          ),
        });
        Alert.alert('Sin conexión', 'Guardado en cola local. Se enviará al sincronizar.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }
      const reg: SemaforoDto = editId ? await updateSemaforo(editId, body) : await createSemaforo(body);
      const subir = async (asset: ImagePicker.ImagePickerAsset | null, campo: string): Promise<void> => {
        if (!asset?.uri) return;
        const u = await uploadSemaforoFoto({ uri: asset.uri, name: asset.fileName ?? `${campo}.jpg`, type: asset.mimeType ?? 'image/jpeg' });
        await updateSemaforo(reg._id, { [campo]: u });
      };
      await subir(fotoSem, 'urlFotoSemaforo');
      await subir(fotoSop, 'urlFotoSoporte');
      await subir(fotoAnc, 'urlFotoAnclaje');
      await subir(fotoPul, 'urlFotoPulsador');
      await subir(fotoAud, 'urlFotoDispAud');

      const carasActualizadas = [...(((form.caras as CaraSemaforoDto[]) ?? []))];
      for (let i = 0; i < fotosCaras.length; i++) {
        const asset = fotosCaras[i];
        if (!asset?.uri) continue;
        const u = await uploadSemaforoFoto({ uri: asset.uri, name: asset.fileName ?? `cara-${i + 1}.jpg`, type: asset.mimeType ?? 'image/jpeg' });
        carasActualizadas[i] = { ...(carasActualizadas[i] ?? {}), urlFoto: u };
      }
      if (fotosCaras.some((f) => f?.uri) && carasActualizadas.length > 0) {
        await updateSemaforoCaras(reg._id, carasActualizadas as unknown[]);
      }
      Alert.alert('Listo', editId ? 'Semáforo actualizado' : 'Semáforo creado', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) { Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar'); }
    finally { setSaving(false); }
  }

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator /></View>;
  const carasList: CaraSemaforoDto[] = ((form.caras as CaraSemaforoDto[]) ?? []).length > 0
    ? ((form.caras as CaraSemaforoDto[]) ?? [])
    : Array.from({ length: Number(form.numCaras ?? 1) }, () => ({} as CaraSemaforoDto));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <WizardHero
        productTitle="Semáforo"
        productSubtitle="Inventario en campo"
        modeLabel={draftLocalId ? 'Pendiente' : editId ? 'Editar' : 'Nuevo'}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 24 }}>
        <Pressable style={[styles.pick, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setTramoOpen(true)}>
          <Text style={{ color: colors.text }}>
            {tramoSeleccionado
              ? `Tramo: ${tramoSeleccionado.via ?? tramoSeleccionado.nomenclatura?.completa ?? tramoSeleccionado._id}`
              : 'Seleccionar tramo'}
          </Text>
        </Pressable>
        <Pressable style={[styles.pick, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setCtrlOpen(true)}>
          <Text style={{ color: colors.text }}>
            {controlSeleccionado
              ? `Control: #${controlSeleccionado.numExterno ?? '—'}`
              : 'Seleccionar control (opcional)'}
          </Text>
        </Pressable>
        <Pressable style={[styles.pick, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => void gps()}><Text style={{ color: colors.text }}>Capturar GPS</Text></Pressable>
        <DecimalTextField label="Lat" value={form.lat} variant="coord" onCommit={(n) => setForm((f) => ({ ...f, lat: n }))} />
        <DecimalTextField label="Lng" value={form.lng} variant="coord" onCommit={(n) => setForm((f) => ({ ...f, lng: n }))} />
        <GeoPreviewMap
          caption="Vista en mapa"
          lat={form.lat}
          lng={form.lng}
          textMuted={colors.textMuted}
          borderColor={colors.border}
          surfaceColor={colors.surfaceAlt}
        />
        <DecimalTextField label="Número externo" value={form.numExterno} variant="medida" onCommit={(n) => setForm((f) => ({ ...f, numExterno: n }))} />
        <Text style={[styles.lbl, { color: colors.textMuted }]}>Control de referencia</Text>
        <TextInput style={[styles.inp, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={String(form.controlRef ?? '')} onChangeText={(v) => setForm((f) => ({ ...f, controlRef: v }))} placeholderTextColor={colors.textMuted} />
        <Text style={[styles.lbl, { color: colors.textMuted }]}>Sitio</Text>
        <TextInput style={[styles.inp, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={String(form.sitio ?? '')} onChangeText={(v) => setForm((f) => ({ ...f, sitio: v }))} placeholderTextColor={colors.textMuted} />
        <Text style={[styles.lbl, { color: colors.textMuted }]}>IP/Radio</Text>
        <TextInput style={[styles.inp, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={String(form.ipRadio ?? '')} onChangeText={(v) => setForm((f) => ({ ...f, ipRadio: v }))} placeholderTextColor={colors.textMuted} />
        <View style={styles.block}>
          <Text style={styles.lbl}>Semáforo funciona</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={[styles.chip, form.semaforoFunciona !== false && styles.chipOn]} onPress={() => setForm((f) => ({ ...f, semaforoFunciona: true }))}><Text style={[styles.chipTxt, form.semaforoFunciona !== false && styles.chipTxtOn]}>Sí</Text></Pressable>
            <Pressable style={[styles.chip, form.semaforoFunciona === false && styles.chipOn]} onPress={() => setForm((f) => ({ ...f, semaforoFunciona: false }))}><Text style={[styles.chipTxt, form.semaforoFunciona === false && styles.chipTxtOn]}>No</Text></Pressable>
          </View>
        </View>
        {chipRow('Clase semáforo', String(form.claseSem ?? ''), CLASES, 'claseSem')}
        <WizardChipRow
          label="Número de caras"
          value={String(Number(form.numCaras ?? 1))}
          options={NUM_CARAS.map(String)}
          onSelect={(v) => initCaras(Number(v))}
        />
        {chipRow('Visibilidad óptima', String(form.visibilidadOptima ?? ''), VIS, 'visibilidadOptima')}
        {chipRow('Fase', String(form.fase ?? ''), FASES, 'fase')}
        {chipRow('Acción', String(form.accion ?? ''), ACCIONES, 'accion')}
        {chipRow('Implementación', String(form.implementacion ?? ''), IMPLEMENTACIONES, 'implementacion')}
        {chipRow('Estado general pintura', String(form.estadoGenPint ?? ''), ESTADOS, 'estadoGenPint')}
        {chipRow('Estado soporte', String(form.estadoSoporte ?? ''), ESTADOS, 'estadoSoporte')}
        {chipRow('Pintura soporte', String(form.pinturaSoporte ?? ''), ESTADOS, 'pinturaSoporte')}
        {chipRow('Estado anclaje', String(form.estadoAnclaje ?? ''), ESTADOS, 'estadoAnclaje')}
        {chipRow('Tipo soporte', String(form.tipoSoporte ?? ''), TIPOS_SOPORTE, 'tipoSoporte')}
        {chipRow('Sistema soporte', String(form.sistemaSoporte ?? ''), SISTEMAS_SOP, 'sistemaSoporte')}
        <View style={styles.block}>
          <Text style={styles.lbl}>Pulsador</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={[styles.chip, form.pulsador === true && styles.chipOn]} onPress={() => setForm((f) => ({ ...f, pulsador: true }))}><Text style={[styles.chipTxt, form.pulsador === true && styles.chipTxtOn]}>Sí</Text></Pressable>
            <Pressable style={[styles.chip, form.pulsador !== true && styles.chipOn]} onPress={() => setForm((f) => ({ ...f, pulsador: false, estadoPulsador: '' }))}><Text style={[styles.chipTxt, form.pulsador !== true && styles.chipTxtOn]}>No</Text></Pressable>
          </View>
        </View>
        {form.pulsador ? chipRow('Estado pulsador', String(form.estadoPulsador ?? ''), ESTADOS, 'estadoPulsador') : null}
        <View style={styles.block}>
          <Text style={styles.lbl}>Temporizador</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={[styles.chip, form.temporizador === true && styles.chipOn]} onPress={() => setForm((f) => ({ ...f, temporizador: true }))}><Text style={[styles.chipTxt, form.temporizador === true && styles.chipTxtOn]}>Sí</Text></Pressable>
            <Pressable style={[styles.chip, form.temporizador !== true && styles.chipOn]} onPress={() => setForm((f) => ({ ...f, temporizador: false, estadoTemp: '' }))}><Text style={[styles.chipTxt, form.temporizador !== true && styles.chipTxtOn]}>No</Text></Pressable>
          </View>
        </View>
        {form.temporizador ? chipRow('Estado temporizador', String(form.estadoTemp ?? ''), ESTADOS, 'estadoTemp') : null}
        <View style={styles.block}>
          <Text style={styles.lbl}>Dispositivo auditivo</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={[styles.chip, form.dispositivoAuditivo === true && styles.chipOn]} onPress={() => setForm((f) => ({ ...f, dispositivoAuditivo: true }))}><Text style={[styles.chipTxt, form.dispositivoAuditivo === true && styles.chipTxtOn]}>Sí</Text></Pressable>
            <Pressable style={[styles.chip, form.dispositivoAuditivo !== true && styles.chipOn]} onPress={() => setForm((f) => ({ ...f, dispositivoAuditivo: false, estadoDispAud: '' }))}><Text style={[styles.chipTxt, form.dispositivoAuditivo !== true && styles.chipTxtOn]}>No</Text></Pressable>
          </View>
        </View>
        {form.dispositivoAuditivo ? chipRow('Estado dispositivo auditivo', String(form.estadoDispAud ?? ''), ESTADOS, 'estadoDispAud') : null}

        <Text style={[styles.lbl, { color: colors.textMuted }]}>Fotos accesorios</Text>
        {fotoSem?.uri ? <Image source={{ uri: fotoSem.uri }} style={[styles.img, { backgroundColor: colors.surfaceAlt }]} /> : form.urlFotoSemaforo && apiBase ? <Image source={{ uri: `${apiBase}${form.urlFotoSemaforo}` }} style={[styles.img, { backgroundColor: colors.surfaceAlt }]} /> : null}
        <Pressable style={styles.cam} onPress={() => void takeFoto('sem')}><Text style={styles.camTxt}>Foto semáforo</Text></Pressable>
        {fotoSop?.uri ? <Image source={{ uri: fotoSop.uri }} style={[styles.img, { backgroundColor: colors.surfaceAlt }]} /> : form.urlFotoSoporte && apiBase ? <Image source={{ uri: `${apiBase}${form.urlFotoSoporte}` }} style={[styles.img, { backgroundColor: colors.surfaceAlt }]} /> : null}
        <Pressable style={styles.cam} onPress={() => void takeFoto('sop')}><Text style={styles.camTxt}>Foto soporte</Text></Pressable>
        {fotoAnc?.uri ? <Image source={{ uri: fotoAnc.uri }} style={[styles.img, { backgroundColor: colors.surfaceAlt }]} /> : form.urlFotoAnclaje && apiBase ? <Image source={{ uri: `${apiBase}${form.urlFotoAnclaje}` }} style={[styles.img, { backgroundColor: colors.surfaceAlt }]} /> : null}
        <Pressable style={styles.cam} onPress={() => void takeFoto('anc')}><Text style={styles.camTxt}>Foto anclaje</Text></Pressable>
        {fotoPul?.uri ? <Image source={{ uri: fotoPul.uri }} style={[styles.img, { backgroundColor: colors.surfaceAlt }]} /> : form.urlFotoPulsador && apiBase ? <Image source={{ uri: `${apiBase}${form.urlFotoPulsador}` }} style={[styles.img, { backgroundColor: colors.surfaceAlt }]} /> : null}
        <Pressable style={styles.cam} onPress={() => void takeFoto('pul')}><Text style={styles.camTxt}>Foto pulsador</Text></Pressable>
        {fotoAud?.uri ? <Image source={{ uri: fotoAud.uri }} style={[styles.img, { backgroundColor: colors.surfaceAlt }]} /> : form.urlFotoDispAud && apiBase ? <Image source={{ uri: `${apiBase}${form.urlFotoDispAud}` }} style={[styles.img, { backgroundColor: colors.surfaceAlt }]} /> : null}
        <Pressable style={styles.cam} onPress={() => void takeFoto('aud')}><Text style={styles.camTxt}>Foto disp. auditivo</Text></Pressable>

        <Text style={[styles.lbl, { marginTop: 8 }]}>Caras</Text>
        {carasList.map((cara, idx) => (
          <View key={idx} style={styles.caraCard}>
            <Text style={styles.caraTit}>Cara {idx + 1}</Text>
            <View style={styles.block}>
              <Text style={styles.lbl}>Tipo módulo</Text>
              <ScrollView horizontal>
                {TIPOS_MODULO.map((o) => <Pressable key={o} style={[styles.chip, String(cara.tipoModulo ?? '') === o && styles.chipOn]} onPress={() => updateCara(idx, { tipoModulo: o })}><Text style={[styles.chipTxt, String(cara.tipoModulo ?? '') === o && styles.chipTxtOn]}>{o}</Text></Pressable>)}
              </ScrollView>
            </View>
            <View style={styles.block}><Text style={styles.lbl}>Diámetro</Text><ScrollView horizontal>{DIAMETROS.map((o) => <Pressable key={o} style={[styles.chip, String(cara.diametroLente ?? '') === o && styles.chipOn]} onPress={() => updateCara(idx, { diametroLente: o })}><Text style={[styles.chipTxt, String(cara.diametroLente ?? '') === o && styles.chipTxtOn]}>{o}</Text></Pressable>)}</ScrollView></View>
            <View style={styles.block}><Text style={styles.lbl}>N° módulos</Text><ScrollView horizontal>{NUM_MOD_OPTS.map((n) => <Pressable key={n} style={[styles.chip, Number(cara.numeroModulos ?? 0) === n && styles.chipOn]} onPress={() => updateCara(idx, { numeroModulos: n })}><Text style={[styles.chipTxt, Number(cara.numeroModulos ?? 0) === n && styles.chipTxtOn]}>{n}</Text></Pressable>)}</ScrollView></View>
            <View style={styles.block}><Text style={styles.lbl}>N° vísceras</Text><ScrollView horizontal>{NUM_MOD_OPTS.map((n) => <Pressable key={n} style={[styles.chip, Number(cara.numeroVisceras ?? 0) === n && styles.chipOn]} onPress={() => updateCara(idx, { numeroVisceras: n })}><Text style={[styles.chipTxt, Number(cara.numeroVisceras ?? 0) === n && styles.chipTxtOn]}>{n}</Text></Pressable>)}</ScrollView></View>
            <View style={styles.block}><Text style={styles.lbl}>Despliegue</Text><ScrollView horizontal>{DESPLIEGUES.map((o) => <Pressable key={o} style={[styles.chip, String(cara.despliegue ?? '') === o && styles.chipOn]} onPress={() => updateCara(idx, { despliegue: o })}><Text style={[styles.chipTxt, String(cara.despliegue ?? '') === o && styles.chipTxtOn]}>{o}</Text></Pressable>)}</ScrollView></View>
            <View style={styles.block}><Text style={styles.lbl}>Estado cara</Text><ScrollView horizontal>{ESTADOS.map((o) => <Pressable key={o} style={[styles.chip, String(cara.estadoCara ?? '') === o && styles.chipOn]} onPress={() => updateCara(idx, { estadoCara: o })}><Text style={[styles.chipTxt, String(cara.estadoCara ?? '') === o && styles.chipTxtOn]}>{o}</Text></Pressable>)}</ScrollView></View>
            <View style={styles.block}><Text style={styles.lbl}>Colores</Text><ScrollView horizontal>{COLORES_OPTS.map((o) => <Pressable key={o} style={[styles.chip, String(cara.colores ?? '') === o && styles.chipOn]} onPress={() => updateCara(idx, { colores: o })}><Text style={[styles.chipTxt, String(cara.colores ?? '') === o && styles.chipTxtOn]}>{o}</Text></Pressable>)}</ScrollView></View>
            <Text style={styles.lbl}>Daños</Text>
            <View style={styles.danosWrap}>{DANOS_CARA.map((d) => <Pressable key={d} style={[styles.danoChip, (cara.danos ?? []).includes(d) && styles.danoChipOn]} onPress={() => toggleDanoCara(idx, d)}><Text style={[styles.danoTxt, (cara.danos ?? []).includes(d) && styles.danoTxtOn]}>{d}</Text></Pressable>)}</View>
            <View style={styles.block}>
              <Text style={styles.lbl}>Flecha direccional</Text>
              <ScrollView horizontal>
                {SI_NO.map((o) => {
                  const on = (o === 'Si' && cara.flechaDir === true) || (o === 'No' && cara.flechaDir !== true);
                  return (
                    <Pressable key={o} style={[styles.chip, on && styles.chipOn]} onPress={() => updateCara(idx, { flechaDir: o === 'Si' })}>
                      <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{o}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
            <View style={styles.block}>
              <Text style={styles.lbl}>Placa contraste</Text>
              <ScrollView horizontal>
                {SI_NO.map((o) => {
                  const on = (o === 'Si' && cara.placaContraste === true) || (o === 'No' && cara.placaContraste !== true);
                  return (
                    <Pressable key={o} style={[styles.chip, on && styles.chipOn]} onPress={() => updateCara(idx, { placaContraste: o === 'Si', estadoPlacaCont: o === 'Si' ? cara.estadoPlacaCont ?? '' : null })}>
                      <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{o}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
            {cara.placaContraste ? (
              <View style={styles.block}>
                <Text style={styles.lbl}>Estado placa contraste</Text>
                <ScrollView horizontal>
                  {ESTADOS.map((o) => (
                    <Pressable key={o} style={[styles.chip, String(cara.estadoPlacaCont ?? '') === o && styles.chipOn]} onPress={() => updateCara(idx, { estadoPlacaCont: o })}>
                      <Text style={[styles.chipTxt, String(cara.estadoPlacaCont ?? '') === o && styles.chipTxtOn]}>{o}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
            <Text style={styles.caraSubTit}>Estado modulos y visceras</Text>
            {[1, 2, 3, 4].map((n) => {
              const keyMod = `estadoMod${n}` as 'estadoMod1' | 'estadoMod2' | 'estadoMod3' | 'estadoMod4';
              const keyVis = `estadoViscera${n}` as 'estadoViscera1' | 'estadoViscera2' | 'estadoViscera3' | 'estadoViscera4';
              return (
                <View key={`diag-${idx}-${n}`} style={styles.diagRow}>
                  <View style={styles.diagCol}>
                    <Text style={styles.lbl}>Estado modulo {n}</Text>
                    <ScrollView horizontal>
                      {ESTADOS.map((o) => (
                        <Pressable key={o} style={[styles.chip, String(cara[keyMod] ?? '') === o && styles.chipOn]} onPress={() => updateCara(idx, { [keyMod]: o })}>
                          <Text style={[styles.chipTxt, String(cara[keyMod] ?? '') === o && styles.chipTxtOn]}>{o}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                  <View style={styles.diagCol}>
                    <Text style={styles.lbl}>Estado viscera {n}</Text>
                    <ScrollView horizontal>
                      {ESTADOS.map((o) => (
                        <Pressable key={o} style={[styles.chip, String(cara[keyVis] ?? '') === o && styles.chipOn]} onPress={() => updateCara(idx, { [keyVis]: o })}>
                          <Text style={[styles.chipTxt, String(cara[keyVis] ?? '') === o && styles.chipTxtOn]}>{o}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              );
            })}
            <Text style={[styles.lbl, { color: colors.textMuted }]}>Observacion cara</Text>
            <TextInput
              style={[styles.inp, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={String(cara.obs ?? '')}
              placeholder="Observacion"
              placeholderTextColor={colors.textMuted}
              onChangeText={(v) => updateCara(idx, { obs: v })}
            />
            {fotosCaras[idx]?.uri ? <Image source={{ uri: fotosCaras[idx]?.uri }} style={[styles.img, { backgroundColor: colors.surfaceAlt }]} /> : cara.urlFoto && apiBase ? <Image source={{ uri: `${apiBase}${cara.urlFoto}` }} style={[styles.img, { backgroundColor: colors.surfaceAlt }]} /> : null}
            <Pressable style={styles.cam} onPress={() => void takeFoto({ cara: idx })}><Text style={styles.camTxt}>Foto cara {idx + 1}</Text></Pressable>
          </View>
        ))}
        {(['obs1', 'obs2', 'obs3', 'obs4', 'obs5', 'obs6'] as const).map((k, idx) => (
          <View key={k} style={styles.block}><Text style={styles.lbl}>Obs {idx + 1}</Text><Pressable style={styles.pick} onPress={() => setObsPick(k)}><Text>{labelObs(form[k])}</Text></Pressable></View>
        ))}
        <Text style={[styles.lbl, { color: colors.textMuted }]}>Notas generales</Text>
        <TextInput style={[styles.inp, { minHeight: 80, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} multiline value={String(form.notasGenerales ?? '')} onChangeText={(v) => setForm((f) => ({ ...f, notasGenerales: v }))} placeholderTextColor={colors.textMuted} />
      </ScrollView>
      <WizardFooterNav
        showPrev={false}
        primaryLabel="Guardar"
        onPrimary={() => void guardar()}
        primaryDisabled={saving}
        primaryLoading={saving}
      />

      <Modal visible={tramoOpen} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.inp, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={qTramo}
              onChangeText={setQTramo}
              placeholder="Nomenclatura (inicio) o ID Mongo del perfil…"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
              {qTramo.trim().length > 0 && tramosFiltrados.length === 0 ? (
                <Text style={{ color: colors.textMuted, padding: 12 }}>Sin coincidencias</Text>
              ) : null}
              {tramosFiltrados.map((t) => (
                <Pressable
                  key={t._id}
                  style={[styles.row, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setForm((f) => ({ ...f, idViaTramo: t._id }));
                    setTramoOpen(false);
                  }}
                >
                  <Text style={{ fontWeight: '700', color: colors.text }}>{t.via ?? '—'}</Text>
                  <Text style={{ color: colors.textMuted }}>
                    {nomenclaturaSearchText(t) || t.nomenclatura?.completa || '—'} · {t.municipio ?? ''}
                  </Text>
                  <Text
                    style={{ fontSize: 10, color: colors.textMuted, marginTop: 4, fontFamily: 'monospace' }}
                    numberOfLines={1}
                  >
                    {t._id}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal visible={ctrlOpen} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.inp, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={qCtrl}
              onChangeText={setQCtrl}
              placeholder="Nº externo, nomenclatura tramo o ID Mongo…"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
              {qCtrl.trim().length > 0 && controlesFiltrados.length === 0 ? (
                <Text style={{ color: colors.textMuted, padding: 12 }}>Sin coincidencias</Text>
              ) : null}
              {controlesFiltrados.map((c) => (
                <Pressable
                  key={c._id}
                  style={[styles.row, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setForm((f) => ({ ...f, idControSem: c._id }));
                    setCtrlOpen(false);
                  }}
                >
                  <Text style={{ fontWeight: '700', color: colors.text }}>Control #{c.numExterno ?? '—'}</Text>
                  <Text style={{ color: colors.textMuted }} numberOfLines={2}>
                    {nomenclaturaSearchText(c) ||
                      (typeof c.idViaTramo === 'object'
                        ? c.idViaTramo?.nomenclatura?.completa ?? c.idViaTramo?.via
                        : '') ||
                      '—'}
                  </Text>
                  <Text
                    style={{ fontSize: 10, color: colors.textMuted, marginTop: 4, fontFamily: 'monospace' }}
                    numberOfLines={1}
                  >
                    {rowMongoIdString(c)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal visible={obsPick != null} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={() => setObsPick(null)}>
          <Pressable style={[styles.modalDark, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={(e) => e.stopPropagation()}>
            <ScrollView style={{ maxHeight: 420 }}>
              {obs.map((o) => (
                <Pressable
                  key={o._id}
                  style={[styles.rowDark, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    if (obsPick) setForm((f) => ({ ...f, [obsPick]: o._id }));
                    setObsPick(null);
                  }}
                >
                  <Text style={[styles.rowDarkText, { color: colors.text }]}>{obsLabelValue(o)}</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  block: { marginBottom: 12 },
  lbl: { fontWeight: '600', marginBottom: 6, color: '#546e7a' },
  inp: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cfd8dc', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, marginBottom: 8, color: '#1a2332' },
  pick: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cfd8dc', borderRadius: 10, padding: 12, marginBottom: 10 },
  chip: { backgroundColor: '#e8edf3', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: '#cfd8dc' },
  chipOn: { backgroundColor: '#c62828' },
  chipTxt: { color: '#1a2332', fontSize: 12 },
  chipTxtOn: { color: '#fff', fontWeight: '700' },
  img: { width: '100%', height: 180, borderRadius: 10, backgroundColor: '#e8edf3', marginBottom: 10 },
  cam: { backgroundColor: '#1565c0', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 10 },
  camTxt: { color: '#fff', fontWeight: '700' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#cfd8dc' },
  modalDark: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#cfd8dc' },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#cfd8dc' },
  rowDark: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#cfd8dc' },
  rowDarkText: { color: '#1a2332' },
  caraCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cfd8dc', borderRadius: 10, padding: 10, marginBottom: 12 },
  caraTit: { fontWeight: '700', color: '#1a2332', marginBottom: 6 },
  caraSubTit: { fontWeight: '700', color: '#c62828', marginTop: 6, marginBottom: 8, textTransform: 'uppercase' },
  diagRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  diagCol: { flex: 1 },
  danosWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  danoChip: { backgroundColor: '#e8edf3', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1, borderColor: '#cfd8dc' },
  danoChipOn: { backgroundColor: '#4a8bc0' },
  danoTxt: { fontSize: 11, color: '#1a2332' },
  danoTxtOn: { color: '#fff', fontWeight: '700' },
});

