import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { DecimalTextField } from '@/components/DecimalTextField';
import { buildCajaInspPayload } from '@/domain/cajaInspSubmit';
import { createCajaInspFormState } from '@/domain/cajaInspFormDefaults';
import { getApiBaseUrl } from '@/config/env';
import { useJornadaActiva } from '@/hooks/useJornadaActiva';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import type { RootStackParamList } from '@/navigation/types';
import { createCajaInsp, fetchCajaInspById, updateCajaInsp, uploadCajaInspFoto } from '@/services/api/cajaInspApi';
import { captureGeolocation } from '@/services/geo/captureLocation';
import { enqueueOffline } from '@/services/sync/offlineOutbox';
import { sqliteSurveyRepository } from '@/storage/offline/sqliteSurveyRepository';
import { fetchViaTramos } from '@/services/api/viaTramoApi';
import type { ViaTramoListItemDto } from '@/types/viaTramo';

const MATERIALES = ['Concreto', 'Plastico', 'Otro material'] as const;
const FASES = ['Inventario', 'Programación', 'Diseño', 'Por definir'] as const;
const IMPLEMENTACIONES = ['Temporal', 'Definitiva'] as const;
const ESTADOS = ['Bueno', 'Regular', 'Malo'] as const;
const ESTADOS_TAPA = ['Bueno', 'Regular', 'Malo', 'No existe tapa'] as const;

export function CajaInspWizardScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'CajaInspWizard'>>();
  const editId = route.params?.id;
  const draftLocalId = route.params?.draftLocalId;
  const draftPayload = route.params?.draftPayload as Record<string, unknown> | undefined;
  const online = useOnlineStatus();
  const { jornada } = useJornadaActiva();
  const apiBase = getApiBaseUrl();
  const [form, setForm] = useState<Record<string, unknown>>(() => createCajaInspFormState(null));
  const [tramos, setTramos] = useState<ViaTramoListItemDto[]>([]);
  const [tramoOpen, setTramoOpen] = useState(false);
  const [qTramo, setQTramo] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [foto, setFoto] = useState<ImagePicker.ImagePickerAsset | null>(null);

  useEffect(() => {
    navigation.setOptions?.({
      title: draftLocalId ? 'Editar pendiente caja' : editId ? 'Editar caja inspección' : 'Nueva caja inspección',
    });
  }, [draftLocalId, editId, navigation]);

  useEffect(() => {
    if (!jornada) return;
    setForm((f) => ({ ...f, idJornada: jornada._id, municipio: jornada.municipio ?? '', supervisor: jornada.supervisor ?? '' }));
  }, [jornada?._id]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const vt = await fetchViaTramos();
        if (cancel) return;
        setTramos(vt);
        if (draftPayload) {
          const body = (draftPayload.body ?? {}) as Record<string, unknown>;
          setForm({ ...createCajaInspFormState(jornada ?? null), ...body });
          const fotoPayload = draftPayload.foto as { uri?: string } | null | undefined;
          if (fotoPayload?.uri) setFoto({ uri: fotoPayload.uri } as ImagePicker.ImagePickerAsset);
          return;
        }
        if (editId) {
          const r = await fetchCajaInspById(editId);
          if (!cancel && r) {
            const next = { ...createCajaInspFormState(jornada ?? null), ...((r as unknown) as Record<string, unknown>) };
            const t = r.idViaTramo;
            if (t && typeof t === 'object' && '_id' in t) next.idViaTramo = t._id;
            if (r.ubicacion?.coordinates?.length === 2) {
              next.lng = r.ubicacion.coordinates[0];
              next.lat = r.ubicacion.coordinates[1];
            }
            setForm(next);
          }
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [draftPayload, editId, jornada?._id]);

  const tramosFiltrados = useMemo(() => {
    const q = qTramo.trim().toLowerCase();
    if (!q) return tramos;
    return tramos.filter((t) => (t.via ?? '').toLowerCase().includes(q) || (t.nomenclatura?.completa ?? '').toLowerCase().includes(q));
  }, [qTramo, tramos]);

  function chipRow(label: string, value: string, opts: readonly string[], key: string): React.JSX.Element {
    return (
      <View style={styles.block}>
        <Text style={styles.lbl}>{label}</Text>
        <ScrollView horizontal>
          {opts.map((o) => (
            <Pressable key={o} style={[styles.chip, value === o && styles.chipOn]} onPress={() => setForm((f) => ({ ...f, [key]: o }))}>
              <Text style={[styles.chipTxt, value === o && styles.chipTxtOn]}>{o}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  async function takeFoto(): Promise<void> {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (!res.canceled && res.assets[0]) setFoto(res.assets[0]);
  }

  async function gps(): Promise<void> {
    try {
      const g = await captureGeolocation();
      const [lng, lat] = g.point.coordinates;
      setForm((f) => ({ ...f, lat, lng }));
    } catch (e) {
      Alert.alert('GPS', e instanceof Error ? e.message : 'Error');
    }
  }

  async function guardar(): Promise<void> {
    if (!String(form.idViaTramo ?? '')) {
      Alert.alert('Tramo', 'Selecciona tramo de vía');
      return;
    }
    setSaving(true);
    try {
      const payload = buildCajaInspPayload(form);
      if (draftLocalId) {
        await sqliteSurveyRepository.updatePayload(draftLocalId, {
          ...(draftPayload ?? {}),
          _kind: 'caja_insp',
          op: String(draftPayload?.op ?? 'create'),
          id: (draftPayload?.id as string | null | undefined) ?? null,
          body: payload,
          foto: foto?.uri
            ? {
                uri: foto.uri,
                name: foto.fileName ?? 'caja.jpg',
                type: foto.mimeType ?? 'image/jpeg',
              }
            : null,
        });
        Alert.alert('Listo', 'Pendiente actualizado para sincronización.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }
      if (!online) {
        await enqueueOffline('caja_insp', {
          op: editId ? 'update' : 'create',
          id: editId ?? null,
          body: payload,
          foto: foto?.uri
            ? {
                uri: foto.uri,
                name: foto.fileName ?? 'caja.jpg',
                type: foto.mimeType ?? 'image/jpeg',
              }
            : null,
        });
        Alert.alert('Sin conexión', 'Guardado en cola local. Se enviará al sincronizar.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }
      const reg = editId ? await updateCajaInsp(editId, payload) : await createCajaInsp(payload);
      if (foto?.uri) {
        const url = await uploadCajaInspFoto({ uri: foto.uri, name: foto.fileName ?? 'caja.jpg', type: foto.mimeType ?? 'image/jpeg' });
        await updateCajaInsp(reg._id, { urlFotoCaja: url });
      }
      Alert.alert('Listo', editId ? 'Caja actualizada' : 'Caja creada', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator /></View>;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ padding: 14 }}>
        <Text style={styles.h}>Caja de inspección</Text>
        <Pressable style={styles.pick} onPress={() => setTramoOpen(true)}>
          <Text>{String(form.idViaTramo ? `Tramo: ${form.idViaTramo}` : 'Seleccionar tramo')}</Text>
        </Pressable>
        <Pressable style={styles.pick} onPress={() => void gps()}><Text>Capturar GPS</Text></Pressable>
        <DecimalTextField label="Lat" value={form.lat} variant="coord" onCommit={(n) => setForm((f) => ({ ...f, lat: n }))} />
        <DecimalTextField label="Lng" value={form.lng} variant="coord" onCommit={(n) => setForm((f) => ({ ...f, lng: n }))} />
        {chipRow('Material', String(form.materialCaja ?? ''), MATERIALES, 'materialCaja')}
        {chipRow('Fase', String(form.fase ?? ''), FASES, 'fase')}
        {chipRow('Implementación', String(form.implementacion ?? ''), IMPLEMENTACIONES, 'implementacion')}
        {chipRow('Estado caja', String(form.estadoCaja ?? ''), ESTADOS, 'estadoCaja')}
        <View style={styles.block}>
          <Text style={styles.lbl}>Tapa</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={[styles.chip, form.tapa === true && styles.chipOn]} onPress={() => setForm((f) => ({ ...f, tapa: true }))}><Text style={[styles.chipTxt, form.tapa === true && styles.chipTxtOn]}>Sí</Text></Pressable>
            <Pressable style={[styles.chip, form.tapa !== true && styles.chipOn]} onPress={() => setForm((f) => ({ ...f, tapa: false, estadoTapa: null }))}><Text style={[styles.chipTxt, form.tapa !== true && styles.chipTxtOn]}>No</Text></Pressable>
          </View>
        </View>
        {form.tapa ? chipRow('Estado tapa', String(form.estadoTapa ?? ''), ESTADOS_TAPA, 'estadoTapa') : null}
        <Text style={styles.lbl}>Notas</Text>
        <TextInput style={[styles.inp, { minHeight: 70 }]} multiline value={String(form.notas ?? '')} onChangeText={(v) => setForm((f) => ({ ...f, notas: v }))} />
        {foto?.uri ? <Image source={{ uri: foto.uri }} style={styles.img} /> : form.urlFotoCaja && apiBase ? <Image source={{ uri: `${apiBase}${form.urlFotoCaja}` }} style={styles.img} /> : null}
        <Pressable style={styles.cam} onPress={() => void takeFoto()}><Text style={styles.camTxt}>Tomar foto</Text></Pressable>
      </ScrollView>
      <View style={styles.footer}><Pressable style={[styles.save, saving && styles.dis]} onPress={() => void guardar()} disabled={saving}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveTxt}>Guardar</Text>}</Pressable></View>

      <Modal visible={tramoOpen} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <TextInput style={styles.inp} value={qTramo} onChangeText={setQTramo} placeholder="Buscar tramo..." />
            <ScrollView style={{ maxHeight: 420 }}>
              {tramosFiltrados.map((t) => (
                <Pressable key={t._id} style={styles.row} onPress={() => { setForm((f) => ({ ...f, idViaTramo: t._id })); setTramoOpen(false); }}>
                  <Text style={{ fontWeight: '700' }}>{t.via ?? '—'}</Text>
                  <Text>{t.nomenclatura?.completa ?? '—'}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f141a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  h: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#e8eef5' },
  block: { marginBottom: 12 },
  lbl: { fontWeight: '600', marginBottom: 6, color: '#a7bacb' },
  inp: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#2d3b49', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 },
  pick: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#2d3b49', borderRadius: 10, padding: 12, marginBottom: 10 },
  chip: { backgroundColor: '#202b36', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: '#2d3b49' },
  chipOn: { backgroundColor: '#4a8bc0' },
  chipTxt: { color: '#a7bacb', fontSize: 12 },
  chipTxtOn: { color: '#fff', fontWeight: '700' },
  img: { width: '100%', height: 180, borderRadius: 10, backgroundColor: '#202b36', marginBottom: 10 },
  cam: { backgroundColor: '#1565c0', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  camTxt: { color: '#fff', fontWeight: '700' },
  footer: { padding: 12, borderTopWidth: 1, borderTopColor: '#2d3b49', backgroundColor: '#18212b' },
  save: { backgroundColor: '#4a8bc0', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveTxt: { color: '#fff', fontWeight: '700' },
  dis: { opacity: 0.45 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#2d3b49' },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2d3b49' },
});

