import type { GeolocationCapture } from '@/types/geo';

/** Ítem de respuesta según `guardarRespuestas` del backend. */
export interface EncuestaRespuestaItem {
  idPregunta: string;
  consecutivo?: string;
  valorRta: string;
  observacion?: string;
}

/** Cuerpo exacto de POST /encuesta-vial. */
export interface EncuestaVialApiBody {
  idTramoVia: string;
  respuestas: EncuestaRespuestaItem[];
}

/** Payload guardado en SQLite; `_meta` no se envía tal cual al API. */
export interface EncuestaLocalPayload extends EncuestaVialApiBody {
  _meta?: {
    capturaGps?: GeolocationCapture;
  };
}

export interface PreguntaEncViaDto {
  _id: string;
  consecutivo: string;
  enunciado: string;
}

export function toApiValorRta(value: unknown): string {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'si' || raw === 'sí') return 'Si';
  if (raw === 'no') return 'No';
  if (raw === 'na' || raw === 'n/a') return 'N/A';
  return String(value ?? '').trim();
}

export function fromApiValorRta(value: unknown): string {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'si' || raw === 'sí') return 'si';
  if (raw === 'no') return 'no';
  if (raw === 'na' || raw === 'n/a') return 'na';
  return '';
}
