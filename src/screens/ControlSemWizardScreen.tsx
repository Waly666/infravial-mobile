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
import { buildControlSemPayload } from '@/domain/controlSemSubmit';
import { createControlSemFormState } from '@/domain/controlSemFormDefaults';
import { getApiBaseUrl } from '@/config/env';
import { useJornadaActiva } from '@/hooks/useJornadaActiva';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import type { RootStackParamList } from '@/navigation/types';
import { createControlSem, fetchControlSemById, updateControlSem, uploadControlSemFoto } from '@/services/api/controlSemApi';
import { captureGeolocation } from '@/services/geo/captureLocation';
import { enqueueOffline } from '@/services/sync/offlineOutbox';
import { sqliteSurveyRepository } from '@/storage/offline/sqliteSurveyRepository';
import { fetchViaTramos } from '@/services/api/viaTramoApi';
import { useAppTheme } from '@/theme/ThemeProvider';
import type { ViaTramoListItemDto } from '@/types/viaTramo';
import { filtrarTramosPickerPorBusqueda, nomenclaturaSearchText } from '@/utils/tramoSearch';

const FASES = ['Inventario', 'Programación', 'Diseño', 'Por definir'] as const;
const ESTADOS = ['Bueno', 'Regular', 'Malo'] as const;
const IMPLEMENTACIONES = ['Temporal', 'Definitiva'] as const;
const TIPOS_CTRL = ['Mecanismo Electronico', 'Mecanismo Electromecanico'] as const;
const BATERIAS = ['Plomo Ácido', 'Níquel Cadmio', 'Litio'] as const;
const MAT_ARM = ['Concreto', 'Metalico', 'Marco concreto-Gabinete metalico'] as const;

export function ControlSemWizardScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'ControlSemWizard'>>();
  const editId = route.params?.id;
  const draftLocalId = route.params?.draftLocalId;
  const draftPayload = route.params?.draftPayload as Record<string, unknown> | undefined;
  const online = useOnlineStatus();
  const { jornada } = useJornadaActiva();
  const { colors } = useAppTheme();
  const apiBase = getApiBaseUrl();
  const [form, setForm] = useState<Record<string, unknown>>(() => createControlSemFormState(null));
  const [tramos, setTramos] = useState<ViaTramoListItemDto[]>([]);
  const [tramoOpen, setTramoOpen] = useState(false);
  const [qTramo, setQTramo] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fotoCtrl, setFotoCtrl] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [fotoArm, setFotoArm] = useState<ImagePicker.ImagePickerAsset | null>(null);

  useEffect(() => {
    navigation.setOptions?.({
      title: draftLocalId ? 'Editar pendiente control' : editId ? 'Editar control semafórico' : 'Nuevo control semafórico',
    });
  }, [draftLocalId, editId, navigation]);
  useEffect(() => { if (!jornada) return; setForm((f) => ({ ...f, idJornada: jornada._id, municipio: jornada.municipio ?? '', supervisor: jornada.supervisor ?? '' })); }, [jornada?._id]);

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
          setForm({ ...createControlSemFormState(jornada ?? null), ...body });
          const fotoCtrlPayload = draftPayload.fotoCtrl as { uri?: string } | null | undefined;
          const fotoArmPayload = draftPayload.fotoArm as { uri?: string } | null | undefined;
          if (fotoCtrlPayload?.uri) setFotoCtrl({ uri: fotoCtrlPayload.uri } as ImagePicker.ImagePickerAsset);
          if (fotoArmPayload?.uri) setFotoArm({ uri: fotoArmPayload.uri } as ImagePicker.ImagePickerAsset);
          return;
        }
        if (editId) {
          const r = await fetchControlSemById(editId);
          if (!cancel && r) {
            const next = { ...createControlSemFormState(jornada ?? null), ...((r as unknown) as Record<string, unknown>) };
            const t = r.idViaTramo;
            if (t && typeof t === 'object' && '_id' in t) next.idViaTramo = t._id;
            if (r.ubicacion?.coordinates?.length === 2) { next.lng = r.ubicacion.coordinates[0]; next.lat = r.ubicacion.coordinates[1]; }
            setForm(next);
          }
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [draftPayload, editId, jornada?._id]);

  const tramosFiltrados = useMemo(
    () => filtrarTramosPickerPorBusqueda(tramos, qTramo),
    [qTramo, tramos],
  );

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
  async function takeFoto(which: 'ctrl' | 'arm'): Promise<void> {
    const perm = await ImagePicker.requestCameraPermissionsAsync(); if (!perm.granted) return;
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (!res.canceled && res.assets[0]) { if (which === 'ctrl') setFotoCtrl(res.assets[0]); else setFotoArm(res.assets[0]); }
  }
  async function gps(): Promise<void> {
    try { const g = await captureGeolocation(); const [lng, lat] = g.point.coordinates; setForm((f) => ({ ...f, lat, lng })); }
    catch (e) { Alert.alert('GPS', e instanceof Error ? e.message : 'Error'); }
  }
  async function guardar(): Promise<void> {
    if (!String(form.idViaTramo ?? '')) return Alert.alert('Tramo', 'Selecciona tramo de vía');
    setSaving(true);
    try {
      const body = buildControlSemPayload(form);
      if (draftLocalId) {
        await sqliteSurveyRepository.updatePayload(draftLocalId, {
          ...(draftPayload ?? {}),
          _kind: 'control_sem',
          op: String(draftPayload?.op ?? 'create'),
          id: (draftPayload?.id as string | null | undefined) ?? null,
          body,
          fotoCtrl: fotoCtrl?.uri
            ? {
                uri: fotoCtrl.uri,
                name: fotoCtrl.fileName ?? 'controlador.jpg',
                type: fotoCtrl.mimeType ?? 'image/jpeg',
              }
            : null,
          fotoArm: fotoArm?.uri
            ? {
                uri: fotoArm.uri,
                name: fotoArm.fileName ?? 'armario.jpg',
                type: fotoArm.mimeType ?? 'image/jpeg',
              }
            : null,
        });
        Alert.alert('Listo', 'Pendiente actualizado para sincronización.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }
      if (!online) {
        await enqueueOffline('control_sem', {
          op: editId ? 'update' : 'create',
          id: editId ?? null,
          body,
          fotoCtrl: fotoCtrl?.uri
            ? {
                uri: fotoCtrl.uri,
                name: fotoCtrl.fileName ?? 'controlador.jpg',
                type: fotoCtrl.mimeType ?? 'image/jpeg',
              }
            : null,
          fotoArm: fotoArm?.uri
            ? {
                uri: fotoArm.uri,
                name: fotoArm.fileName ?? 'armario.jpg',
                type: fotoArm.mimeType ?? 'image/jpeg',
              }
            : null,
        });
        Alert.alert('Sin conexión', 'Guardado en cola local. Se enviará al sincronizar.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }
      const reg = editId ? await updateControlSem(editId, body) : await createControlSem(body);
      if (fotoCtrl?.uri) {
        const u1 = await uploadControlSemFoto({ uri: fotoCtrl.uri, name: fotoCtrl.fileName ?? 'controlador.jpg', type: fotoCtrl.mimeType ?? 'image/jpeg' });
        await updateControlSem(reg._id, { urlFotoControlador: u1 });
      }
      if (fotoArm?.uri) {
        const u2 = await uploadControlSemFoto({ uri: fotoArm.uri, name: fotoArm.fileName ?? 'armario.jpg', type: fotoArm.mimeType ?? 'image/jpeg' });
        await updateControlSem(reg._id, { urlFotoArmario: u2 });
      }
      Alert.alert('Listo', editId ? 'Control actualizado' : 'Control creado', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar');
    } finally { setSaving(false); }
  }

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator /></View>;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <WizardHero
        productTitle="Control semafórico"
        productSubtitle="Inventario en campo"
        modeLabel={draftLocalId ? 'Pendiente' : editId ? 'Editar' : 'Nuevo'}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 24 }}>
        <Pressable style={[styles.pick, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setTramoOpen(true)}><Text style={{ color: colors.text }}>{String(form.idViaTramo ? `Tramo: ${form.idViaTramo}` : 'Seleccionar tramo')}</Text></Pressable>
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
        {chipRow('Fase', String(form.fase ?? ''), FASES, 'fase')}
        {chipRow('Implementación', String(form.implementacion ?? ''), IMPLEMENTACIONES, 'implementacion')}
        {chipRow('Tipo controlador', String(form.tipoControlador ?? ''), TIPOS_CTRL, 'tipoControlador')}
        {chipRow('Estado controlador', String(form.estadoControlador ?? ''), ESTADOS, 'estadoControlador')}
        <Text style={[styles.lbl, { color: colors.textMuted }]}>Clase controlador</Text>
        <TextInput style={[styles.inp, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={String(form.claseControlador ?? '')} onChangeText={(v) => setForm((f) => ({ ...f, claseControlador: v }))} placeholderTextColor={colors.textMuted} />
        <Text style={[styles.lbl, { color: colors.textMuted }]}>Serial</Text>
        <TextInput style={[styles.inp, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={String(form.serialControlador ?? '')} onChangeText={(v) => setForm((f) => ({ ...f, serialControlador: v }))} placeholderTextColor={colors.textMuted} />
        <View style={styles.block}><Text style={[styles.lbl, { color: colors.textMuted }]}>UPS</Text><View style={{ flexDirection: 'row', gap: 8 }}><Pressable style={[styles.chip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, form.ups === true && styles.chipOn]} onPress={() => setForm((f) => ({ ...f, ups: true }))}><Text style={[styles.chipTxt, { color: colors.textMuted }, form.ups === true && styles.chipTxtOn]}>Sí</Text></Pressable><Pressable style={[styles.chip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }, form.ups !== true && styles.chipOn]} onPress={() => setForm((f) => ({ ...f, ups: false, estadoUps: '', tipoBateria: '' }))}><Text style={[styles.chipTxt, { color: colors.textMuted }, form.ups !== true && styles.chipTxtOn]}>No</Text></Pressable></View></View>
        {form.ups ? <>{chipRow('Tipo batería', String(form.tipoBateria ?? ''), BATERIAS, 'tipoBateria')}{chipRow('Estado UPS', String(form.estadoUps ?? ''), ESTADOS, 'estadoUps')}</> : null}
        {chipRow('Material armario', String(form.materialArmario ?? ''), MAT_ARM, 'materialArmario')}
        {chipRow('Estado armario', String(form.estadoArmario ?? ''), ESTADOS, 'estadoArmario')}
        <Text style={[styles.lbl, { color: colors.textMuted }]}>Notas</Text>
        <TextInput style={[styles.inp, { minHeight: 70, backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} multiline value={String(form.notas ?? '')} onChangeText={(v) => setForm((f) => ({ ...f, notas: v }))} placeholderTextColor={colors.textMuted} />
        <Text style={[styles.lbl, { color: colors.textMuted }]}>Foto controlador</Text>
        {fotoCtrl?.uri ? <Image source={{ uri: fotoCtrl.uri }} style={[styles.img, { backgroundColor: colors.surfaceAlt }]} /> : form.urlFotoControlador && apiBase ? <Image source={{ uri: `${apiBase}${form.urlFotoControlador}` }} style={[styles.img, { backgroundColor: colors.surfaceAlt }]} /> : null}
        <Pressable style={styles.cam} onPress={() => void takeFoto('ctrl')}><Text style={styles.camTxt}>Tomar foto controlador</Text></Pressable>
        <Text style={[styles.lbl, { color: colors.textMuted }]}>Foto armario</Text>
        {fotoArm?.uri ? <Image source={{ uri: fotoArm.uri }} style={[styles.img, { backgroundColor: colors.surfaceAlt }]} /> : form.urlFotoArmario && apiBase ? <Image source={{ uri: `${apiBase}${form.urlFotoArmario}` }} style={[styles.img, { backgroundColor: colors.surfaceAlt }]} /> : null}
        <Pressable style={styles.cam} onPress={() => void takeFoto('arm')}><Text style={styles.camTxt}>Tomar foto armario</Text></Pressable>
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
            <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
              {qTramo.trim().length > 0 && tramosFiltrados.length === 0 ? (
                <Text style={{ color: colors.textMuted, padding: 12 }}>Sin coincidencias</Text>
              ) : null}
              {tramosFiltrados.map((t) => (
                <Pressable
                  key={t._id}
                  style={styles.row}
                  onPress={() => {
                    setForm((f) => ({ ...f, idViaTramo: t._id }));
                    setTramoOpen(false);
                  }}
                >
                  <Text style={{ fontWeight: '700', color: colors.text }}>{t.via ?? '—'}</Text>
                  <Text style={{ color: colors.textMuted }}>
                    {nomenclaturaSearchText(t) || t.nomenclatura?.completa || '—'} · {t.municipio ?? ''}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 4, fontFamily: 'monospace' }} numberOfLines={1}>
                    {t._id}
                  </Text>
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
  block: { marginBottom: 12 },
  lbl: { fontWeight: '600', marginBottom: 6, color: '#a7bacb' },
  inp: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#2d3b49', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, marginBottom: 8 },
  pick: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#2d3b49', borderRadius: 10, padding: 12, marginBottom: 10 },
  chip: { backgroundColor: '#202b36', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: '#2d3b49' },
  chipOn: { backgroundColor: '#a06ac8' },
  chipTxt: { color: '#a7bacb', fontSize: 12 },
  chipTxtOn: { color: '#fff', fontWeight: '700' },
  img: { width: '100%', height: 160, borderRadius: 10, backgroundColor: '#202b36', marginBottom: 10 },
  cam: { backgroundColor: '#1565c0', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 10 },
  camTxt: { color: '#fff', fontWeight: '700' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#2d3b49' },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2d3b49' },
});

