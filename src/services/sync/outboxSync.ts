import { postEncuestaVial } from '@/services/api/encuestaApi';
import {
  createViaTramo,
  updateViaTramo,
  updateViaTramoFotos,
  uploadViaTramoFotos,
} from '@/services/api/viaTramoApi';
import {
  createCajaInsp,
  updateCajaInsp,
  uploadCajaInspFoto,
} from '@/services/api/cajaInspApi';
import {
  createControlSem,
  updateControlSem,
  uploadControlSemFoto,
} from '@/services/api/controlSemApi';
import {
  createSemaforo,
  updateSemaforo,
  updateSemaforoCaras,
  uploadSemaforoFoto,
} from '@/services/api/semaforoApi';
import { localPayloadToApiBody } from '@/services/sync/encuestaPayload';
import type { AxiosError } from 'axios';
import type { IOfflineSurveyRepository } from '@/storage/offline/OfflineSurveyRepository';
import { sqliteSurveyRepository } from '@/storage/offline/sqliteSurveyRepository';
import type { OfflineSurveyDraft } from '@/types/offline';

type SyncResult = { enviados: number; errores: number };

type UploadFile = { uri: string; name: string; type: string };

function asTrue(v: unknown): boolean {
  return v === true || v === 'true' || v === 1 || v === '1';
}

function syncErrorMessage(e: unknown): string {
  if (e && typeof e === 'object') {
    const ax = e as AxiosError<{ message?: string; error?: string }>;
    const status = ax.response?.status;
    const msg = ax.response?.data?.message ?? ax.response?.data?.error;
    if (status && msg) return `${status}: ${msg}`;
    if (status) return `${status}: ${ax.message}`;
  }
  return e instanceof Error ? e.message : String(e);
}

function normalizeRespuestas(raw: Record<string, unknown>[]): {
  idPregunta: string;
  consecutivo: string;
  valorRta: string;
  observacion?: string;
}[] {
  const out: {
    idPregunta: string;
    consecutivo: string;
    valorRta: string;
    observacion?: string;
  }[] = [];
  for (const r of raw) {
    const idPregunta = String(r.idPregunta ?? '').trim();
    const valorRta = String(r.valorRta ?? '').trim();
    if (!idPregunta || !valorRta) continue;
    const consecutivo = String(r.consecutivo ?? '').trim();
    const observacion = typeof r.observacion === 'string' ? r.observacion : undefined;
    out.push({ idPregunta, consecutivo, valorRta, observacion });
  }
  return out;
}

async function syncViaTramo(item: OfflineSurveyDraft): Promise<void> {
  const op = String(item.payload.op ?? 'create');
  const body = (item.payload.body ?? {}) as Record<string, unknown>;
  const id = item.payload.id ? String(item.payload.id) : null;
  const respuestas = Array.isArray(item.payload.respuestas)
    ? (item.payload.respuestas as Record<string, unknown>[])
    : [];
  const fotos = Array.isArray(item.payload.fotos)
    ? (item.payload.fotos as UploadFile[])
    : [];

  const reg = op === 'update' && id ? await updateViaTramo(id, body) : await createViaTramo(body);
  const idTramo = reg.tramo._id;

  if (respuestas.length > 0) {
    try {
      const respuestasApi = normalizeRespuestas(respuestas);
      if (respuestasApi.length > 0) {
        await postEncuestaVial({
          idTramoVia: idTramo,
          respuestas: respuestasApi,
        });
      }
    } catch {
      // Igual que flujo online: encuesta es secundaria y no debe bloquear el envío del tramo.
    }
  }

  if (fotos.length > 0) {
    try {
      const urls = await uploadViaTramoFotos(fotos);
      if (urls.length > 0) {
        await updateViaTramoFotos(idTramo, urls);
      }
    } catch {
      // Igual que flujo online: fotos secundarias, no bloquean la sincronización del tramo.
    }
  }
}

async function syncCaja(item: OfflineSurveyDraft): Promise<void> {
  const op = String(item.payload.op ?? 'create');
  const body = (item.payload.body ?? {}) as Record<string, unknown>;
  const id = item.payload.id ? String(item.payload.id) : null;
  const foto = (item.payload.foto ?? null) as UploadFile | null;
  const reg = op === 'update' && id ? await updateCajaInsp(id, body) : await createCajaInsp(body);
  if (foto?.uri) {
    const u = await uploadCajaInspFoto(foto);
    await updateCajaInsp(reg._id, { urlFotoCaja: u });
  }
}

async function syncControl(item: OfflineSurveyDraft): Promise<void> {
  const op = String(item.payload.op ?? 'create');
  const body = { ...((item.payload.body ?? {}) as Record<string, unknown>) };
  if (!asTrue(body.temporizador) || body.estadoTemp === '' || body.estadoTemp === undefined) {
    body.estadoTemp = null;
  }
  const id = item.payload.id ? String(item.payload.id) : null;
  const fotoCtrl = (item.payload.fotoCtrl ?? null) as UploadFile | null;
  const fotoArm = (item.payload.fotoArm ?? null) as UploadFile | null;
  const reg =
    op === 'update' && id ? await updateControlSem(id, body) : await createControlSem(body);
  if (fotoCtrl?.uri) {
    const u = await uploadControlSemFoto(fotoCtrl);
    await updateControlSem(reg._id, { urlFotoControlador: u });
  }
  if (fotoArm?.uri) {
    const u = await uploadControlSemFoto(fotoArm);
    await updateControlSem(reg._id, { urlFotoArmario: u });
  }
}

async function syncSemaforo(item: OfflineSurveyDraft): Promise<void> {
  const op = String(item.payload.op ?? 'create');
  const body = { ...((item.payload.body ?? {}) as Record<string, unknown>) };
  if (!asTrue(body.pulsador) || body.estadoPulsador === '' || body.estadoPulsador === undefined) {
    body.estadoPulsador = null;
  }
  if (!asTrue(body.temporizador) || body.estadoTemp === '' || body.estadoTemp === undefined) {
    body.estadoTemp = null;
  }
  const id = item.payload.id ? String(item.payload.id) : null;
  const reg = op === 'update' && id ? await updateSemaforo(id, body) : await createSemaforo(body);
  const fotos = (item.payload.fotos ?? {}) as Record<string, UploadFile | null>;
  for (const campo of [
    'urlFotoSemaforo',
    'urlFotoSoporte',
    'urlFotoAnclaje',
    'urlFotoPulsador',
    'urlFotoDispAud',
  ]) {
    const file = fotos[campo];
    if (file?.uri) {
      const u = await uploadSemaforoFoto(file);
      await updateSemaforo(reg._id, { [campo]: u });
    }
  }
  const caras = Array.isArray(item.payload.caras) ? [...(item.payload.caras as Record<string, unknown>[])] : [];
  const fotosCaras = (item.payload.fotosCaras ?? []) as (UploadFile | null)[];
  if (caras.length > 0 && fotosCaras.length > 0) {
    for (let i = 0; i < fotosCaras.length; i++) {
      const file = fotosCaras[i];
      if (!file?.uri) continue;
      const u = await uploadSemaforoFoto(file);
      caras[i] = { ...(caras[i] ?? {}), urlFoto: u };
    }
    if (fotosCaras.some((f) => f?.uri)) {
      await updateSemaforoCaras(reg._id, caras);
    }
  }
}

export async function syncOutbox(
  repo: IOfflineSurveyRepository = sqliteSurveyRepository,
): Promise<SyncResult> {
  const items = await repo.listForSync();
  let enviados = 0;
  let errores = 0;
  for (const item of items) {
    try {
      const kind = String(item.payload._kind ?? 'encuesta_vial');
      if (kind === 'encuesta_vial') {
        const body = localPayloadToApiBody(item.payload);
        await postEncuestaVial(body, item.localId);
      } else if (kind === 'via_tramo') {
        await syncViaTramo(item);
      } else if (kind === 'caja_insp') {
        await syncCaja(item);
      } else if (kind === 'control_sem') {
        await syncControl(item);
      } else if (kind === 'semaforo') {
        await syncSemaforo(item);
      } else {
        throw new Error(`Tipo de cola no soportado: ${kind}`);
      }
      await repo.markStatus(item.localId, 'enviado');
      enviados += 1;
    } catch (e) {
      const msg = syncErrorMessage(e);
      await repo.bumpAttempt(item.localId, msg.slice(0, 500));
      errores += 1;
    }
  }
  return { enviados, errores };
}

