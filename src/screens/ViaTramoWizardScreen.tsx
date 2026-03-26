import { useCallback, useEffect, useMemo, useState } from 'react';
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

import {
  CALZADAS,
  CAPA_RODADURAS,
  CLAS_POR_COMPETENCIA,
  CLAS_POR_FUNCIONALIDAD,
  CLASES_DANO,
  CLASES_VIA,
  CONECTOR2_NOM,
  CONECTORES,
  CONDICIONES_VIA,
  DANOS_OPCIONES,
  DISENIO_GEOM,
  ESTADOS_VIA,
  ESTADOS_VIA2,
  INCLINACION_VIA,
  SENTIDO_VIAL,
  TIPOS_DANO,
  TIPOS_LOCALIDAD,
  TIPOS_NOMENCLATURA,
  TIPOS_UBIC,
  TIPOS_VIA,
  UBI_CICLO_RUTAS,
  VIS_DISMINUIDAS,
  VISIBILIDAD,
} from '@/constants/viaTramoEnums';
import { aplicarResetCalzadaUna, patchAnchoYClasificacion, recalcPendientePorcentaje } from '@/domain/viaTramoCalculos';
import { mergeEncuestaIntoRespuestas, mergeViaTramoFromApi } from '@/domain/viaTramoEditMerge';
import { createViaTramoFormState } from '@/domain/viaTramoFormDefaults';
import { buildViaTramoCreatePayload, recalcularLongitudDesdeCoords } from '@/domain/viaTramoSubmit';
import { useAuth } from '@/hooks/useAuth';
import { useJornadaActiva } from '@/hooks/useJornadaActiva';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { getApiBaseUrl } from '@/config/env';
import type { RootStackParamList } from '@/navigation/types';
import type { BarrioDto, ComunaDto, EsquemaPerfilDto, ObsViaDto, ZatDto } from '@/services/api/catalogViaTramoApi';
import {
  fetchBarrios,
  fetchComunas,
  fetchEsquemasPerfil,
  fetchObsVias,
  fetchPreguntasEncuestaTramo,
  fetchZats,
} from '@/services/api/catalogViaTramoApi';
import { DecimalTextField } from '@/components/DecimalTextField';
import { fetchRespuestasEncuestaPorTramo, postEncuestaVial } from '@/services/api/encuestaApi';
import {
  createViaTramo,
  fetchViaTramoById,
  updateViaTramo,
  updateViaTramoFotos,
  uploadViaTramoFotos,
} from '@/services/api/viaTramoApi';
import { captureGeolocation } from '@/services/geo/captureLocation';
import { enqueueOffline } from '@/services/sync/offlineOutbox';
import { sqliteSurveyRepository } from '@/storage/offline/sqliteSurveyRepository';
import type { EncuestaRespuestaItem, PreguntaEncViaDto } from '@/types/encuesta';

const TOTAL_PASOS = 10;
const TRAMO_FOTOS_REQUERIDAS = 3;

const ENC_OPCIONES = [
  { k: 'si', label: 'SÍ' },
  { k: 'no', label: 'NO' },
  { k: 'na', label: 'N/A' },
] as const;

type PickField = 'zat' | 'comuna' | 'barrio' | 'perfilEsquema' | 'obs1' | 'obs2' | 'obs3' | 'obs4' | 'obs5' | 'obs6';

interface PickState {
  field: PickField;
  title: string;
  options: { id: string; label: string }[];
}

export function ViaTramoWizardScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'ViaTramoWizard'>>();
  const editId = route.params?.id;
  const draftLocalId = route.params?.draftLocalId;
  const draftPayload = route.params?.draftPayload as Record<string, unknown> | undefined;
  const { user } = useAuth();
  const online = useOnlineStatus();
  const { jornada, loading: jornadaLoading } = useJornadaActiva();
  const [paso, setPaso] = useState(1);
  const [form, setForm] = useState<Record<string, unknown>>(() => createViaTramoFormState(null));
  const [saving, setSaving] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);

  const [zats, setZats] = useState<ZatDto[]>([]);
  const [comunas, setComunas] = useState<ComunaDto[]>([]);
  const [barrios, setBarrios] = useState<BarrioDto[]>([]);
  const [esquemas, setEsquemas] = useState<EsquemaPerfilDto[]>([]);
  const [obsVias, setObsVias] = useState<ObsViaDto[]>([]);
  const [preguntas, setPreguntas] = useState<PreguntaEncViaDto[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [pick, setPick] = useState<PickState | null>(null);

  const [pendBase, setPendBase] = useState(0);
  const [pendAlt, setPendAlt] = useState(0);
  const [fotoSlots, setFotoSlots] = useState<(ImagePicker.ImagePickerAsset | null)[]>([
    null,
    null,
    null,
  ]);

  const apiBase = getApiBaseUrl();

  useEffect(() => {
    if (editId || draftPayload) return;
    setForm(createViaTramoFormState(jornada));
    setPendBase(0);
    setPendAlt(0);
    setFotoSlots([null, null, null]);
  }, [jornada?._id, editId, draftPayload]);

  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      setCatalogLoading(true);
      try {
        const filtro = jornada?.codMunicipio ? { munDivipol: jornada.codMunicipio } : undefined;
        const [z, c, b, e, o, p] = await Promise.all([
          fetchZats(filtro),
          fetchComunas(filtro),
          fetchBarrios(filtro),
          fetchEsquemasPerfil(),
          fetchObsVias(),
          fetchPreguntasEncuestaTramo(),
        ]);
        if (cancelled) return;
        setZats(z);
        setComunas(c);
        setBarrios(b);
        setEsquemas(e);
        setObsVias(o);
        setPreguntas(p);
        setForm((f) => {
          if (editId || draftPayload) return f;
          return {
            ...f,
            respuestas: p.map((q) => ({
              idPregunta: q._id,
              consecutivo: q.consecutivo,
              valorRta: '',
            })),
          };
        });
      } catch {
        if (!cancelled) {
          Alert.alert('Catálogos', 'No se pudieron cargar todos los catálogos; revisa la conexión.');
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [jornada?._id, jornada?.codMunicipio, editId, draftPayload]);

  useEffect(() => {
    if (!draftPayload || catalogLoading || preguntas.length === 0) return;
    const body = { ...((draftPayload.body ?? {}) as Record<string, unknown>) };
    const geo = body.ubicacion as
      | { type?: string; coordinates?: [number, number][] }
      | undefined;
    if (geo?.type === 'LineString' && Array.isArray(geo.coordinates) && geo.coordinates.length >= 2) {
      const inicio = geo.coordinates[0];
      const fin = geo.coordinates[1];
      if (Array.isArray(inicio) && inicio.length === 2) {
        body.lng_inicio = Number(inicio[0]);
        body.lat_inicio = Number(inicio[1]);
      }
      if (Array.isArray(fin) && fin.length === 2) {
        body.lng_fin = Number(fin[0]);
        body.lat_fin = Number(fin[1]);
      }
    }
    const respuestas = Array.isArray(draftPayload.respuestas)
      ? (draftPayload.respuestas as EncuestaRespuestaItem[])
      : [];
    const fotos = Array.isArray(draftPayload.fotos)
      ? (draftPayload.fotos as Array<{ uri?: string }>)
      : [];
    setForm({
      ...createViaTramoFormState(jornada),
      ...body,
      respuestas: respuestas.length > 0 ? respuestas : preguntas.map((q) => ({ idPregunta: q._id, consecutivo: q.consecutivo, valorRta: '' })),
    });
    const nextSlots: (ImagePicker.ImagePickerAsset | null)[] = [null, null, null];
    fotos.slice(0, 3).forEach((f, idx) => {
      if (f?.uri) nextSlots[idx] = { uri: f.uri } as ImagePicker.ImagePickerAsset;
    });
    setFotoSlots(nextSlots);
    setPendBase(0);
    setPendAlt(0);
  }, [draftPayload, catalogLoading, preguntas, jornada]);

  useEffect(() => {
    if (!editId || catalogLoading || preguntas.length === 0) return;
    let cancelled = false;
    (async () => {
      setEditLoading(true);
      try {
        const { tramo } = await fetchViaTramoById(editId);
        const respuestasApi = await fetchRespuestasEncuestaPorTramo(editId);
        if (cancelled) return;
        setForm(() => {
          const base = createViaTramoFormState(jornada);
          const merged = mergeViaTramoFromApi(base, tramo);
          merged.respuestas = mergeEncuestaIntoRespuestas(preguntas, respuestasApi);
          return merged;
        });
        setFotoSlots([null, null, null]);
        setPendBase(0);
        setPendAlt(0);
      } catch (e) {
        if (!cancelled) {
          Alert.alert('Tramo', e instanceof Error ? e.message : 'No se pudo cargar el tramo');
        }
      } finally {
        if (!cancelled) setEditLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId, catalogLoading, preguntas, jornada?._id]);

  const esquemasFiltrados = useMemo(() => {
    const c = String(form.calzada ?? '');
    if (!c) return esquemas;
    return esquemas.filter((e) => e.calzada === c);
  }, [esquemas, form.calzada]);

  const esquemaSel = useMemo(() => {
    const id = String(form.perfilEsquema ?? '');
    if (!id) return null;
    return esquemas.find((e) => e._id === id) ?? null;
  }, [esquemas, form.perfilEsquema]);

  function setField(key: string, value: unknown): void {
    if (key === 'calzada') {
      const calzada = String(value ?? '');
      setForm((f) => {
        let next: Record<string, unknown> = { ...f, calzada, perfilEsquema: '' };
        if (calzada === 'Una') next = aplicarResetCalzadaUna(next);
        else next = patchAnchoYClasificacion(next);
        return next;
      });
      return;
    }
    if (key === 'tipoVia') {
      setForm((f) => patchAnchoYClasificacion({ ...f, tipoVia: value }));
      return;
    }
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setMedida(key: string, numVal: number): void {
    setForm((f) => patchAnchoYClasificacion({ ...f, [key]: numVal }));
  }

  function setNomenclatura(patch: Record<string, string>): void {
    setForm((f) => {
      const n = { ...((f.nomenclatura as Record<string, string>) || {}), ...patch };
      let completa = '';
      if (n.tipoVia1 && n.numero1) completa += `${n.tipoVia1} ${n.numero1}`;
      if (n.conector) completa += ` ${n.conector} `;
      if (n.tipoVia2 && n.numero2) completa += `${n.tipoVia2} ${n.numero2}`;
      if (n.conector2) completa += ` ${n.conector2} `;
      if (n.tipoVia3 && n.numero3) completa += `${n.tipoVia3} ${n.numero3}`;
      n.completa = completa.trim();

      let sentidoCardinal = f.sentidoCardinal as string;
      if (patch.tipoVia1 != null) {
        const tipo = patch.tipoVia1;
        if (tipo === 'Calle' || tipo === 'Diagonal') sentidoCardinal = 'Oriente - Occidente';
        else if (tipo === 'Carrera' || tipo === 'Transversal') sentidoCardinal = 'Norte - Sur';
        else sentidoCardinal = '';
      }

      let via = f.via as string;
      if (n.tipoVia1 && n.numero1) via = `${n.tipoVia1} ${n.numero1}`;

      return { ...f, nomenclatura: n, via, ...(patch.tipoVia1 != null ? { sentidoCardinal } : {}) };
    });
  }

  async function capturarPunto(which: 'inicio' | 'fin'): Promise<void> {
    setGpsBusy(true);
    try {
      const g = await captureGeolocation();
      const [lng, lat] = g.point.coordinates;
      const altRaw = g.altitudeMeters;
      const altitudGps =
        altRaw != null && Number.isFinite(altRaw) ? Math.round(altRaw * 100) / 100 : null;
      if (which === 'inicio') {
        setForm((f) => ({
          ...f,
          lat_inicio: lat,
          lng_inicio: lng,
          longitud_m: recalcularLongitudDesdeCoords({
            ...f,
            lat_inicio: lat,
            lng_inicio: lng,
          }),
          ...(altitudGps != null ? { altitud: altitudGps } : {}),
        }));
      } else {
        setForm((f) => ({
          ...f,
          lat_fin: lat,
          lng_fin: lng,
          longitud_m: recalcularLongitudDesdeCoords({
            ...f,
            lat_fin: lat,
            lng_fin: lng,
          }),
          ...(altitudGps != null ? { altitud: altitudGps } : {}),
        }));
      }
    } catch (e) {
      Alert.alert('GPS', e instanceof Error ? e.message : 'Error de ubicación');
    } finally {
      setGpsBusy(false);
    }
  }

  function aplicarLongitudCalculada(): void {
    setForm((f) => ({
      ...f,
      longitud_m: recalcularLongitudDesdeCoords(f),
    }));
  }

  function labelForField(field: PickField): string {
    const id = String(form[field] ?? '');
    if (!id) return 'Seleccionar…';
    if (field === 'zat') {
      const z = zats.find((x) => x._id === id);
      return z ? `${z.zatNumero ?? ''} - ${z.zatLetra ?? ''}` : id;
    }
    if (field === 'comuna') {
      const c = comunas.find((x) => x._id === id);
      return c ? `${c.comunaNumero ?? ''} - ${c.comunaLetra ?? ''}` : id;
    }
    if (field === 'barrio') {
      const b = barrios.find((x) => x._id === id);
      return b?.nombre ?? id;
    }
    if (field === 'perfilEsquema') {
      const e = esquemas.find((x) => x._id === id);
      return e ? `${e.codEsquema ?? ''} — ${e.calzada ?? ''}` : id;
    }
    const o = obsVias.find((x) => x._id === id);
    return o?.txtObs ?? id;
  }

  function openPick(field: PickField): void {
    if (field === 'zat') {
      setPick({
        field,
        title: 'ZAT',
        options: zats.map((z) => ({
          id: z._id,
          label: `${z.zatNumero ?? ''} - ${z.zatLetra ?? ''}`,
        })),
      });
      return;
    }
    if (field === 'comuna') {
      setPick({
        field,
        title: 'Comuna',
        options: comunas.map((c) => ({
          id: c._id,
          label: `${c.comunaNumero ?? ''} - ${c.comunaLetra ?? ''}`,
        })),
      });
      return;
    }
    if (field === 'barrio') {
      setPick({
        field,
        title: 'Barrio',
        options: barrios.map((b) => ({ id: b._id, label: b.nombre ?? b._id })),
      });
      return;
    }
    if (field === 'perfilEsquema') {
      setPick({
        field,
        title: 'Esquema perfil',
        options: esquemasFiltrados.map((e) => ({
          id: e._id,
          label: `${e.codEsquema ?? ''} — ${e.calzada ?? ''}`,
        })),
      });
      return;
    }
    setPick({
      field,
      title: `Observación catálogo (${field})`,
      options: obsVias.map((o) => ({ id: o._id, label: o.txtObs ?? o._id })),
    });
  }

  function toggleEstadoVia2(val: string): void {
    setForm((f) => {
      const cur = [...((f.estadoVia2 as string[]) || [])];
      const i = cur.indexOf(val);
      if (i === -1) cur.push(val);
      else cur.splice(i, 1);
      return { ...f, estadoVia2: cur };
    });
  }

  const setDano = useCallback((index: number, key: 'dano' | 'clase' | 'tipo', value: string) => {
    setForm((f) => {
      const danos = [...((f.danos as { dano: string; clase: string; tipo: string }[]) || [])];
      const row = { ...danos[index], [key]: value };
      danos[index] = row;
      return { ...f, danos };
    });
  }, []);

  async function tomarFotoCamara(slotIndex: number): Promise<void> {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permisos', 'Se necesita acceso a la cámara para las 3 fotos del tramo.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (res.canceled || !res.assets[0]?.uri) return;
    setFotoSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = res.assets[0];
      return next;
    });
  }

  function quitarFotoSlot(slotIndex: number): void {
    setFotoSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
  }

  async function enviar(): Promise<void> {
    if (!form.idJornada) {
      Alert.alert(
        'Jornada',
        'No hay jornada activa; no se puede crear el tramo (salvo permisos admin en servidor).',
      );
      return;
    }
    const latI = form.lat_inicio as number | null;
    const lngI = form.lng_inicio as number | null;
    const latF = form.lat_fin as number | null;
    const lngF = form.lng_fin as number | null;
    if (latI == null || lngI == null || latF == null || lngF == null) {
      Alert.alert(
        'Georreferencia',
        'Faltan coordenadas de inicio o fin. Complétalas en el paso 2.',
      );
      return;
    }

    const fotosList = fotoSlots.filter((x): x is ImagePicker.ImagePickerAsset => x != null);
    if (!editId && fotosList.length !== TRAMO_FOTOS_REQUERIDAS) {
      Alert.alert(
        'Fotos',
        `Debes tomar las ${TRAMO_FOTOS_REQUERIDAS} fotos con la cámara (paso 10), una por cada casilla.`,
      );
      return;
    }

    const encuestador = `${user?.nombres ?? ''} ${user?.apellidos ?? ''}`.trim();
    setSaving(true);
    try {
      const payload = buildViaTramoCreatePayload(form, encuestador || 'encuestador');
      const rawResp = (form.respuestas as EncuestaRespuestaItem[] | undefined) ?? [];
      const respuestas = rawResp.filter((r) => Boolean(r.valorRta));
      const files = fotosList.map((a, idx) => ({
        uri: a.uri,
        name: a.fileName ?? `tramo-foto-${idx + 1}.jpg`,
        type: a.mimeType ?? 'image/jpeg',
      }));

      if (draftLocalId) {
        await sqliteSurveyRepository.updatePayload(draftLocalId, {
          ...(draftPayload ?? {}),
          _kind: 'via_tramo',
          op: String(draftPayload?.op ?? 'create'),
          id: (draftPayload?.id as string | null | undefined) ?? null,
          body: payload,
          respuestas,
          fotos: files,
        });
        Alert.alert('Listo', 'Pendiente actualizado para sincronización.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }

      if (!online) {
        await enqueueOffline('via_tramo', {
          op: editId ? 'update' : 'create',
          id: editId ?? null,
          body: payload,
          respuestas,
          fotos: files,
        });
        Alert.alert('Sin conexión', 'Guardado en cola local. Se enviará al sincronizar.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }

      let idTramo: string;
      if (editId) {
        await updateViaTramo(editId, payload);
        idTramo = editId;
      } else {
        const res = await createViaTramo(payload);
        idTramo = res.tramo._id;
      }
      const warnings: string[] = [];

      if (respuestas.length > 0) {
        try {
          await postEncuestaVial({ idTramoVia: idTramo, respuestas });
        } catch (e) {
          warnings.push(e instanceof Error ? e.message : 'Encuesta no guardada');
        }
      }

      if (fotosList.length > 0) {
        try {
          const urls = await uploadViaTramoFotos(files);
          await updateViaTramoFotos(idTramo, urls);
        } catch (e) {
          warnings.push(e instanceof Error ? e.message : 'Fotos no subidas');
        }
      }

      Alert.alert(
        editId ? 'Tramo actualizado' : 'Tramo registrado',
        `Id: ${idTramo}${warnings.length ? `\n\nAvisos:\n${warnings.join('\n')}` : ''}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar el tramo');
    } finally {
      setSaving(false);
    }
  }

  function chipRow<T extends string>(
    label: string,
    value: string,
    options: readonly T[],
    onSelect: (v: T) => void,
  ): React.JSX.Element {
    return (
      <View style={styles.block}>
        <Text style={styles.lbl}>{label}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {options.map((o) => (
            <Pressable
              key={o}
              style={[styles.chip, value === o && styles.chipOn]}
              onPress={() => onSelect(o)}
            >
              <Text style={[styles.chipTxt, value === o && styles.chipTxtOn]} numberOfLines={2}>
                {o}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  function inp(
    label: string,
    key: string,
    keyboard: 'default' | 'numeric' | 'decimal-pad' = 'default',
    multiline = false,
  ): React.JSX.Element {
    const v = form[key];
    const str = v == null ? '' : String(v);
    return (
      <View style={styles.block}>
        <Text style={styles.lbl}>{label}</Text>
        <TextInput
          style={[styles.inp, multiline && styles.inpMulti]}
          value={str}
          onChangeText={(t) => {
            if (keyboard === 'numeric' || keyboard === 'decimal-pad') {
              const n = t === '' ? null : parseFloat(t.replace(',', '.'));
              setField(key, Number.isFinite(n) ? n : null);
            } else {
              setField(key, t);
            }
          }}
          keyboardType={keyboard}
          multiline={multiline}
        />
      </View>
    );
  }

  function medRow(label: string, key: string): React.JSX.Element {
    return (
      <DecimalTextField
        label={label}
        small
        value={form[key]}
        variant="medida"
        onCommit={(n) => setMedida(key, n ?? 0)}
      />
    );
  }

  function refPickRow(label: string, field: PickField): React.JSX.Element {
    return (
      <View style={styles.block}>
        <Text style={styles.lbl}>{label}</Text>
        <Pressable style={styles.pickBtn} onPress={() => openPick(field)}>
          <Text style={styles.pickBtnTxt} numberOfLines={2}>
            {labelForField(field)}
          </Text>
        </Pressable>
      </View>
    );
  }

  const nom = (form.nomenclatura as Record<string, string>) || {};
  const calzada = String(form.calzada ?? '');
  const respuestasList = (form.respuestas as EncuestaRespuestaItem[]) || [];
  const estaVia2 = (form.estadoVia2 as string[]) || [];
  const danos = (form.danos as { dano: string; clase: string; tipo: string }[]) || [];

  return (
    <View style={styles.root}>
      <View style={styles.progress}>
        <Text style={styles.progressTxt}>
          Paso {paso} / {TOTAL_PASOS} — {draftLocalId ? 'Revisar pendiente' : editId ? 'Editar inventario' : 'Inventario (via_tramos)'}
        </Text>
        {catalogLoading ? <Text style={styles.progressSub}>Cargando catálogos…</Text> : null}
        {editLoading ? <Text style={styles.progressSub}>Cargando tramo…</Text> : null}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {jornadaLoading ? <ActivityIndicator /> : null}

        {paso === 1 ? (
          <>
            <Text style={styles.h2}>Datos de jornada</Text>
            <Text style={styles.sub}>Paso 1 (como la web): datos heredados de la jornada activa.</Text>
            {chipRow('Tipo de localidad *', String(form.tipoLocalidad ?? ''), TIPOS_LOCALIDAD, (v) =>
              setField('tipoLocalidad', v),
            )}
            <Text style={styles.readonly}>Municipio: {String(form.municipio ?? '—')}</Text>
            <Text style={styles.readonly}>Departamento: {String(form.departamento ?? '—')}</Text>
            <Text style={styles.readonly}>Supervisor: {String(form.supervisor ?? '—')}</Text>
            <Text style={styles.readonly}>Localidad: {String(form.localidad ?? '—')}</Text>
            <Text style={styles.readonly}>Fecha inventario: {String(form.fechaInv ?? '—')}</Text>
          </>
        ) : null}

        {paso === 2 ? (
          <>
            <Text style={styles.h2}>Georreferenciación</Text>
            <Text style={styles.sub}>LineString inicio → fin.</Text>
            <View style={styles.rowGps}>
              <Pressable
                style={[styles.gpsBtn, gpsBusy && styles.dis]}
                onPress={() => void capturarPunto('inicio')}
                disabled={gpsBusy}
              >
                <Text style={styles.gpsTxt}>GPS inicio</Text>
              </Pressable>
              <Pressable
                style={[styles.gpsBtn, gpsBusy && styles.dis]}
                onPress={() => void capturarPunto('fin')}
                disabled={gpsBusy}
              >
                <Text style={styles.gpsTxt}>GPS fin</Text>
              </Pressable>
            </View>
            <Text style={styles.sub}>
              Al usar GPS se rellenan lat/lng y, si el equipo lo permite, la altitud; si no, indícala abajo.
            </Text>
            <DecimalTextField
              label="Lat inicio"
              value={form.lat_inicio}
              variant="coord"
              onCommit={(n) => setField('lat_inicio', n)}
            />
            <DecimalTextField
              label="Lng inicio"
              value={form.lng_inicio}
              variant="coord"
              onCommit={(n) => setField('lng_inicio', n)}
            />
            <DecimalTextField
              label="Lat fin"
              value={form.lat_fin}
              variant="coord"
              onCommit={(n) => setField('lat_fin', n)}
            />
            <DecimalTextField
              label="Lng fin"
              value={form.lng_fin}
              variant="coord"
              onCommit={(n) => setField('lng_fin', n)}
            />
            <Pressable style={styles.secBtn} onPress={aplicarLongitudCalculada}>
              <Text style={styles.secBtnTxt}>Calcular longitud (Haversine)</Text>
            </Pressable>
            <DecimalTextField
              label="Longitud tramo (m)"
              value={form.longitud_m}
              variant="medida"
              onCommit={(n) => setField('longitud_m', n ?? 0)}
            />
            <DecimalTextField
              label="Altitud (msnm)"
              value={form.altitud}
              variant="coord"
              onCommit={(n) => setField('altitud', n)}
            />
          </>
        ) : null}

        {paso === 3 ? (
          <>
            <Text style={styles.h2}>Identificación de la vía</Text>
            <Text style={styles.lbl}>Nomenclatura</Text>
            {chipRow('Tipo vía 1', nom.tipoVia1 ?? '', TIPOS_NOMENCLATURA, (v) => setNomenclatura({ tipoVia1: v }))}
            <TextInput
              style={styles.inp}
              placeholder="Número 1"
              value={nom.numero1 ?? ''}
              onChangeText={(t) => setNomenclatura({ numero1: t })}
              keyboardType="number-pad"
            />
            {chipRow('Conector', nom.conector ?? '', CONECTORES, (v) => setNomenclatura({ conector: v }))}
            {chipRow('Tipo vía 2', nom.tipoVia2 ?? '', TIPOS_NOMENCLATURA, (v) => setNomenclatura({ tipoVia2: v }))}
            <TextInput
              style={styles.inp}
              placeholder="Número 2"
              value={nom.numero2 ?? ''}
              onChangeText={(t) => setNomenclatura({ numero2: t })}
              keyboardType="number-pad"
            />
            {chipRow('Conector 2', nom.conector2 ?? '', CONECTOR2_NOM, (v) => setNomenclatura({ conector2: v }))}
            {chipRow('Tipo vía 3', nom.tipoVia3 ?? '', TIPOS_NOMENCLATURA, (v) => setNomenclatura({ tipoVia3: v }))}
            <TextInput
              style={styles.inp}
              placeholder="Número 3"
              value={nom.numero3 ?? ''}
              onChangeText={(t) => setNomenclatura({ numero3: t })}
              keyboardType="number-pad"
            />
            {nom.completa ? (
              <Text style={styles.nomPreview}>📍 {nom.completa}</Text>
            ) : null}

            {inp('Nombre de la vía *', 'via')}
            {chipRow('Tipo ubicación', String(form.tipoUbic ?? ''), TIPOS_UBIC, (v) => setField('tipoUbic', v))}
            {chipRow('Calzada *', calzada, CALZADAS, (v) => setField('calzada', v))}
            {chipRow('Área (tipo vía) *', String(form.tipoVia ?? ''), TIPOS_VIA, (v) => setField('tipoVia', v))}
            {chipRow('Clase vía', String(form.claseVia ?? ''), CLASES_VIA, (v) => setField('claseVia', v))}
          </>
        ) : null}

        {paso === 4 ? (
          <>
            <Text style={styles.h2}>Datos generales</Text>
            {inp('Entidad vía', 'entidadVia')}
            {inp('Responsable vía', 'respVia')}
            {refPickRow('ZAT', 'zat')}
            {refPickRow('Comuna', 'comuna')}
            {refPickRow('Barrio', 'barrio')}
            {chipRow('Ubicación ciclorruta', String(form.ubiCicloRuta ?? ''), UBI_CICLO_RUTAS, (v) =>
              setField('ubiCicloRuta', v),
            )}
            {inp('Sentido cardinal', 'sentidoCardinal')}
            {inp('Número de carriles', 'carriles', 'numeric')}
            {refPickRow('Esquema perfil (filtrado por calzada)', 'perfilEsquema')}
            {esquemaSel?.urlImgEsq && apiBase ? (
              <View style={styles.block}>
                <Text style={styles.lbl}>Vista esquema</Text>
                <Image
                  source={{ uri: `${apiBase}${esquemaSel.urlImgEsq}` }}
                  style={styles.esquemaImg}
                  resizeMode="contain"
                />
              </View>
            ) : null}
          </>
        ) : null}

        {paso === 5 ? (
          <>
            <Text style={styles.h2}>Medidas del perfil (m)</Text>
            {!calzada ? (
              <Text style={styles.warn}>Selecciona la calzada en el paso 3.</Text>
            ) : (
              <Text style={styles.sub}>Calzada: {calzada}</Text>
            )}
            {calzada === 'Una' ? (
              <>
                <Text style={styles.medSection}>Lado izquierdo</Text>
                {medRow('Andén izq.', 'andenIzq')}
                {medRow('Zona verde izq.', 'zonaVerdeIzq')}
                {medRow('Antejardín izq.', 'anteJardinIzq')}
                {medRow('Sardinel izq.', 'sardIzqCalzA')}
                {medRow('Ciclorruta izq.', 'cicloRutaIzq')}
                {medRow('Área servicio izq.', 'areaServIzq')}
                {medRow('Bahía est. izq.', 'bahiaEstIzq')}
                {medRow('Sardinel der. (1ª calzada)', 'sardDerCalzA')}
                {medRow('Cuneta izq.', 'cunetaIzq')}
                {medRow('Berma izq.', 'bermaIzq')}
                {medRow('Ancho calzada', 'calzadaIzq')}
                <Text style={styles.medSection}>Lado derecho</Text>
                {medRow('Andén der.', 'andenDer')}
                {medRow('Zona verde der.', 'zonaVerdeDer')}
                {medRow('Antejardín der.', 'anteJardinDer')}
                {medRow('Sardinel der.', 'sardDerCalzA')}
                {medRow('Ciclorruta der.', 'cicloRutaDer')}
                {medRow('Área servicio der.', 'areaServDer')}
                {medRow('Bahía est. der.', 'bahiaEstDer')}
                {medRow('Cuneta der.', 'cunetaDer')}
                {medRow('Berma der.', 'bermaDer')}
              </>
            ) : calzada === 'Dos' || calzada === 'Tres' ? (
              <>
                <Text style={styles.medSection}>Calzada izquierda</Text>
                {medRow('Antejardín izq.', 'anteJardinIzq')}
                {medRow('Andén izq.', 'andenIzq')}
                {medRow('Zona verde izq.', 'zonaVerdeIzq')}
                {medRow('Área servicio izq.', 'areaServIzq')}
                {medRow('Sardinel izq. 1ª calzada', 'sardIzqCalzA')}
                {medRow('Ciclorruta izq.', 'cicloRutaIzq')}
                {medRow('Bahía est. izq.', 'bahiaEstIzq')}
                {medRow('Sardinel der. 1ª calzada', 'sardDerCalzA')}
                {medRow('Cuneta izq.', 'cunetaIzq')}
                {medRow('Berma izq.', 'bermaIzq')}
                {medRow('Ancho calzada izq.', 'calzadaIzq')}
                <Text style={styles.medSection}>Separador</Text>
                {medRow('Ancho separador', 'separadorPeatonal')}
                {medRow('Zona verde izq. sep.', 'separadorZonaVerdeIzq')}
                {medRow('Ciclorruta sep.', 'separadorCicloRuta')}
                {medRow('Zona verde der. sep.', 'separadorZonaVerdeDer')}
                <Text style={styles.lblSmall}>Pendiente % (base / altura en metros)</Text>
                <DecimalTextField
                  label="Base (m)"
                  small
                  value={pendBase}
                  variant="pend"
                  onCommit={(n) => {
                    const b = n ?? 0;
                    setPendBase(b);
                    setForm((f) => ({ ...f, pendiente: recalcPendientePorcentaje(b, pendAlt) }));
                  }}
                />
                <DecimalTextField
                  label="Altura (m)"
                  small
                  value={pendAlt}
                  variant="pend"
                  onCommit={(n) => {
                    const a = n ?? 0;
                    setPendAlt(a);
                    setForm((f) => ({ ...f, pendiente: recalcPendientePorcentaje(pendBase, a) }));
                  }}
                />
                <Text style={styles.sub}>Pendiente: {String(form.pendiente ?? 0)} %</Text>
                <Text style={styles.medSection}>Calzada derecha</Text>
                {medRow('Antejardín der.', 'anteJardinDer')}
                {medRow('Andén der.', 'andenDer')}
                {medRow('Zona verde der.', 'zonaVerdeDer')}
                {medRow('Área servicio der.', 'areaServDer')}
                {medRow('Sardinel izq. 2ª calzada', 'sardIzqCalzB')}
                {medRow('Ciclorruta der.', 'cicloRutaDer')}
                {medRow('Bahía est. der.', 'bahiaEstDer')}
                {medRow('Sardinel der. 2ª calzada', 'sardDerCalzB')}
                {medRow('Cuneta der.', 'cunetaDer')}
                {medRow('Berma der.', 'bermaDer')}
                {medRow('Ancho calzada der.', 'calzadaDer')}
              </>
            ) : null}
            <View style={styles.totalRow}>
              <Text style={styles.totalLbl}>Ancho total perfil</Text>
              <Text style={styles.totalVal}>{String(form.anchoTotalPerfil ?? 0)} m</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLbl}>Longitud tramo</Text>
              <Text style={styles.totalVal}>{String(form.longitud_m ?? 0)} m</Text>
            </View>
          </>
        ) : null}

        {paso === 6 ? (
          <>
            <Text style={styles.h2}>Clasificación vial</Text>
            <View style={styles.clasBox}>
              <Text style={styles.clasLine}>Nacional: {String(form.clasNacional ?? '—')}</Text>
              <Text style={styles.clasLine}>Prelación: {String(form.clasPrelacion ?? '—')}</Text>
              <Text style={styles.clasHint}>
                Según ancho {String(form.anchoTotalPerfil ?? 0)} m y tipo vía {String(form.tipoVia || '—')}.
              </Text>
            </View>
            {chipRow(
              'Clas. competencia',
              String(form.clasPorCompetencia ?? ''),
              CLAS_POR_COMPETENCIA,
              (v) => setField('clasPorCompetencia', v),
            )}
            {chipRow(
              'Clas. funcionalidad',
              String(form.clasPorFuncionalidad ?? ''),
              CLAS_POR_FUNCIONALIDAD,
              (v) => setField('clasPorFuncionalidad', v),
            )}
            {inp('Clasificación PBOT municipal', 'clasMunPbot')}
          </>
        ) : null}

        {paso === 7 ? (
          <>
            <Text style={styles.h2}>Características</Text>
            {chipRow('Diseño geométrico', String(form.disenioGeometrico ?? ''), DISENIO_GEOM, (v) =>
              setField('disenioGeometrico', v),
            )}
            {chipRow('Inclinación', String(form.inclinacionVia ?? ''), INCLINACION_VIA, (v) =>
              setField('inclinacionVia', v),
            )}
            {chipRow('Sentido vial', String(form.sentidoVial ?? ''), SENTIDO_VIAL, (v) =>
              setField('sentidoVial', v),
            )}
            {chipRow('Capa rodadura', String(form.capaRodadura ?? ''), CAPA_RODADURAS, (v) =>
              setField('capaRodadura', v),
            )}
            {chipRow('Estado vía', String(form.estadoVia ?? ''), ESTADOS_VIA, (v) =>
              setField('estadoVia', v),
            )}
            {chipRow('Condiciones', String(form.condicionesVia ?? ''), CONDICIONES_VIA, (v) =>
              setField('condicionesVia', v),
            )}
            {chipRow('Visibilidad', String(form.visibilidad ?? ''), VISIBILIDAD, (v) =>
              setField('visibilidad', v),
            )}
            {form.visibilidad === 'Disminuida'
              ? chipRow(
                  'Causa vis. disminuida',
                  String(form.visDisminuida ?? ''),
                  VIS_DISMINUIDAS,
                  (v) => setField('visDisminuida', v),
                )
              : null}
            <Text style={styles.lbl}>Iluminación artificial</Text>
            <View style={styles.rowGps}>
              <Pressable
                style={[styles.gpsBtn, !form.iluminacArtificial && styles.chipOn]}
                onPress={() => setField('iluminacArtificial', false)}
              >
                <Text style={[styles.gpsTxt, !form.iluminacArtificial && styles.chipTxtOn]}>No</Text>
              </Pressable>
              <Pressable
                style={[styles.gpsBtn, form.iluminacArtificial === true && styles.chipOn]}
                onPress={() => setField('iluminacArtificial', true)}
              >
                <Text style={[styles.gpsTxt, form.iluminacArtificial === true && styles.chipTxtOn]}>Sí</Text>
              </Pressable>
            </View>
            {form.iluminacArtificial
              ? chipRow('Estado iluminación', String(form.estadoIluminacion ?? ''), ['Bueno', 'Malo'] as const, (v) =>
                  setField('estadoIluminacion', v),
                )
              : null}
            <Text style={styles.lbl}>Estado vía (detalle)</Text>
            <View style={styles.gridChips}>
              {ESTADOS_VIA2.map((e) => (
                <Pressable
                  key={e}
                  style={[styles.dChip, estaVia2.includes(e) && styles.dChipOn]}
                  onPress={() => toggleEstadoVia2(e)}
                >
                  <Text style={[styles.dChipTxt, estaVia2.includes(e) && styles.dChipTxtOn]}>{e}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {paso === 8 ? (
          <>
            <Text style={styles.h2}>Daños en capa de rodadura</Text>
            {danos.map((d, i) => (
              <View key={i} style={styles.danoCard}>
                <Text style={styles.danoTitle}>Daño {i + 1}</Text>
                {chipRow('Daño', d.dano ?? '', DANOS_OPCIONES, (v) => setDano(i, 'dano', v))}
                {chipRow('Clase', d.clase ?? '', CLASES_DANO, (v) => setDano(i, 'clase', v))}
                {chipRow('Tipo', d.tipo ?? '', TIPOS_DANO, (v) => setDano(i, 'tipo', v))}
              </View>
            ))}
          </>
        ) : null}

        {paso === 9 ? (
          <>
            <Text style={styles.h2}>Encuesta de seguridad vial</Text>
            <Text style={styles.sub}>Opcional; mismas respuestas que la web (si/no/na).</Text>
            {preguntas.length === 0 ? <Text style={styles.warn}>Sin preguntas cargadas.</Text> : null}
            {preguntas.map((p, idx) => {
              const r = respuestasList[idx];
              const v = r?.valorRta ?? '';
              return (
                <View key={p._id} style={styles.qCard}>
                  <Text style={styles.qConsec}>Pregunta {p.consecutivo}</Text>
                  <Text style={styles.qText}>{p.enunciado}</Text>
                  <View style={styles.encRow}>
                    {ENC_OPCIONES.map((op) => (
                      <Pressable
                        key={op.k}
                        style={[styles.encBtn, v === op.k && styles.encBtnOn]}
                        onPress={() => {
                          const nextV = v === op.k ? '' : op.k;
                          setForm((f) => {
                            const list = [...((f.respuestas as EncuestaRespuestaItem[]) || [])];
                            if (list[idx]) {
                              list[idx] = { ...list[idx], valorRta: nextV };
                            }
                            return { ...f, respuestas: list };
                          });
                        }}
                      >
                        <Text style={[styles.encBtnTxt, v === op.k && styles.encBtnTxtOn]}>{op.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              );
            })}
          </>
        ) : null}

        {paso === 10 ? (
          <>
            <Text style={styles.h2}>Fotos y observaciones</Text>
            {([1, 2, 3, 4, 5, 6] as const).map((n) => {
              const key = `obs${n}` as PickField;
              return <View key={n}>{refPickRow(`Observación ${n}`, key)}</View>;
            })}
            {inp('Notas adicionales', 'notas', 'default', true)}
            <Text style={styles.lbl}>
              Fotos del tramo (
              {editId
                ? 'opcional al editar; si tomas fotos nuevas se suben como en la web'
                : `${TRAMO_FOTOS_REQUERIDAS} con la cámara, obligatorias para guardar`}
              )
            </Text>
            {fotoSlots.map((asset, slotIndex) => (
              <View key={slotIndex} style={styles.fotoSlotCard}>
                <Text style={styles.fotoSlotTitle}>Foto {slotIndex + 1}</Text>
                {asset?.uri ? (
                  <Image source={{ uri: asset.uri }} style={styles.fotoSlotPreview} resizeMode="cover" />
                ) : (
                  <Text style={styles.fotoSlotEmpty}>Sin foto</Text>
                )}
                <View style={styles.fotoSlotActions}>
                  <Pressable
                    style={styles.camBtn}
                    onPress={() => void tomarFotoCamara(slotIndex)}
                  >
                    <Text style={styles.camBtnTxt}>{asset ? 'Volver a tomar' : 'Tomar con cámara'}</Text>
                  </Pressable>
                  {asset ? (
                    <Pressable onPress={() => quitarFotoSlot(slotIndex)}>
                      <Text style={styles.fotoDel}>Quitar</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.navBtn, paso === 1 && styles.dis]}
          disabled={paso === 1}
          onPress={() => setPaso((p) => Math.max(1, p - 1))}
        >
          <Text style={styles.navTxt}>Anterior</Text>
        </Pressable>
        {paso < TOTAL_PASOS ? (
          <Pressable style={styles.navBtnPri} onPress={() => setPaso((p) => Math.min(TOTAL_PASOS, p + 1))}>
            <Text style={styles.navTxtPri}>Siguiente</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.navBtnPri, (saving || editLoading) && styles.dis]}
            disabled={saving || editLoading}
            onPress={() => void enviar()}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.navTxtPri}>{editId ? 'Guardar cambios' : 'Guardar tramo'}</Text>
            )}
          </Pressable>
        )}
      </View>

      <Modal visible={pick != null} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setPick(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{pick?.title}</Text>
            <ScrollView style={{ maxHeight: 420 }}>
              {(pick?.options ?? []).map((opt) => (
                <Pressable
                  key={opt.id}
                  style={styles.modalRow}
                  onPress={() => {
                    if (pick) setField(pick.field, opt.id);
                    setPick(null);
                  }}
                >
                  <Text style={styles.modalRowTxt}>{opt.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.modalClose} onPress={() => setPick(null)}>
              <Text style={styles.modalCloseTxt}>Cerrar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f141a' },
  progress: { padding: 12, backgroundColor: '#18212b', borderBottomWidth: 1, borderBottomColor: '#2d3b49' },
  progressTxt: { fontWeight: '700', color: '#4a8bc0' },
  progressSub: { fontSize: 12, color: '#8ea2b4', marginTop: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  h2: { fontSize: 18, fontWeight: '700', color: '#e8eef5', marginBottom: 6 },
  sub: { fontSize: 13, color: '#a7bacb', marginBottom: 12, lineHeight: 18 },
  block: { marginBottom: 12 },
  lbl: { fontSize: 13, fontWeight: '600', color: '#37474f', marginBottom: 6 },
  lblSmall: { fontSize: 12, fontWeight: '600', color: '#546e7a', marginBottom: 4 },
  readonly: { fontSize: 14, color: '#455a64', marginBottom: 4 },
  inp: {
    borderWidth: 1,
    borderColor: '#cfd8dc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  inpMulti: { minHeight: 72, textAlignVertical: 'top' },
  chipScroll: { flexGrow: 0 },
  chip: {
    marginRight: 8,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#eceff1',
    maxWidth: 220,
  },
  chipOn: { backgroundColor: '#1e5a8a' },
  chipTxt: { fontSize: 12, color: '#37474f' },
  chipTxtOn: { color: '#fff', fontWeight: '700' },
  rowGps: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  gpsBtn: {
    flex: 1,
    backgroundColor: '#2e7d32',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  gpsTxt: { color: '#fff', fontWeight: '700' },
  secBtn: {
    borderWidth: 1,
    borderColor: '#1e5a8a',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  secBtnTxt: { color: '#1e5a8a', fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#2d3b49',
    backgroundColor: '#18212b',
  },
  navBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#90a4ae',
  },
  navBtnPri: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#4a8bc0',
  },
  navTxt: { fontWeight: '700', color: '#455a64' },
  navTxtPri: { fontWeight: '700', color: '#fff' },
  dis: { opacity: 0.45 },
  nomPreview: { fontSize: 15, fontWeight: '600', color: '#1e5a8a', marginBottom: 12 },
  pickBtn: {
    borderWidth: 1,
    borderColor: '#90a4ae',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  pickBtnTxt: { fontSize: 14, color: '#263238' },
  esquemaImg: { width: '100%', height: 180, backgroundColor: '#eceff1', borderRadius: 8 },
  medSection: {
    fontWeight: '700',
    color: '#37474f',
    marginTop: 12,
    marginBottom: 8,
  },
  warn: { color: '#c62828', marginBottom: 12 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#cfd8dc',
  },
  totalLbl: { fontSize: 15, fontWeight: '600', color: '#37474f' },
  totalVal: { fontSize: 16, fontWeight: '700', color: '#1e5a8a' },
  clasBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cfd8dc',
    marginBottom: 14,
  },
  clasLine: { fontSize: 15, fontWeight: '600', color: '#263238', marginBottom: 6 },
  clasHint: { fontSize: 12, color: '#78909c', marginTop: 6 },
  gridChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#eceff1',
    marginBottom: 4,
  },
  dChipOn: { backgroundColor: '#3949ab' },
  dChipTxt: { fontSize: 11, color: '#37474f' },
  dChipTxtOn: { color: '#fff', fontWeight: '600' },
  danoCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  danoTitle: { fontWeight: '700', marginBottom: 8, color: '#37474f' },
  qCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  qConsec: { fontSize: 12, fontWeight: '700', color: '#1e5a8a', marginBottom: 4 },
  qText: { fontSize: 14, color: '#263238', marginBottom: 8 },
  encRow: { flexDirection: 'row', gap: 8 },
  encBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#eceff1',
    alignItems: 'center',
  },
  encBtnOn: { backgroundColor: '#2e7d32' },
  encBtnTxt: { fontWeight: '700', color: '#455a64', fontSize: 13 },
  encBtnTxtOn: { color: '#fff' },
  fotoSlotCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  fotoSlotTitle: { fontWeight: '700', color: '#37474f', marginBottom: 8 },
  fotoSlotPreview: { width: '100%', height: 160, borderRadius: 8, backgroundColor: '#eceff1' },
  fotoSlotEmpty: { fontSize: 14, color: '#90a4ae', marginBottom: 8 },
  fotoSlotActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  camBtn: {
    backgroundColor: '#1565c0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginRight: 12,
  },
  camBtnTxt: { color: '#fff', fontWeight: '700', textAlign: 'center', fontSize: 14 },
  fotoDel: { color: '#c62828', fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalSheet: { backgroundColor: '#fff', borderRadius: 12, padding: 12, maxHeight: '85%' },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10, color: '#263238' },
  modalRow: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eceff1' },
  modalRowTxt: { fontSize: 15, color: '#37474f' },
  modalClose: { marginTop: 12, alignItems: 'center', padding: 12 },
  modalCloseTxt: { color: '#1e5a8a', fontWeight: '700' },
});
