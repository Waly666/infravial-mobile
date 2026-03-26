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
