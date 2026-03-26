import type { EncuestaLocalPayload, EncuestaVialApiBody } from '@/types/encuesta';
import type { GeolocationCapture } from '@/types/geo';

function formatGeoNote(g: GeolocationCapture): string {
  const [lng, lat] = g.point.coordinates;
  const acc = g.accuracyMeters != null ? ` ±${Math.round(g.accuracyMeters)}m` : '';
  return `GPS [${lng.toFixed(6)}, ${lat.toFixed(6)}]${acc}`;
}

/** Quita `_meta` y vuelca GPS en `observacion` de la primera respuesta (el modelo API no tiene campo geo). */
export function localPayloadToApiBody(payload: Record<string, unknown>): EncuestaVialApiBody {
  const p = payload as unknown as EncuestaLocalPayload;
  const idTramoVia = String(p.idTramoVia ?? '').trim();
  const respuestas = Array.isArray(p.respuestas) ? p.respuestas.map((r) => ({ ...r })) : [];
  const geo = p._meta?.capturaGps;
  if (geo && respuestas.length > 0) {
    const note = formatGeoNote(geo);
    const first = respuestas[0]!;
    respuestas[0] = {
      ...first,
      observacion: [first.observacion, note].filter(Boolean).join(' | '),
    };
  }
  return { idTramoVia, respuestas };
}
