import { haversineDistanceMeters } from '@/utils/haversine';

const REF_FIELDS = ['zat', 'comuna', 'barrio', 'perfilEsquema', 'obs1', 'obs2', 'obs3', 'obs4', 'obs5', 'obs6'];

/** `respuestas` y `fotos` se envían aparte (Angular `via-tramo-form.ts`). */
const OMIT_KEYS = [
  'respuestas',
  'fotos',
  'logUltimaMod',
  'lat_inicio',
  'lng_inicio',
  'lat_fin',
  'lng_fin',
];

/**
 * Igual que `guardar()` en `via-tramo-form.ts`: GeoJSON LineString, limpieza de refs vacías, daños, encuestador.
 */
export function buildViaTramoCreatePayload(
  form: Record<string, unknown>,
  encuestadorNombre: string,
): Record<string, unknown> {
  const body: Record<string, unknown> = { ...form };

  const latI = body.lat_inicio as number | null;
  const lngI = body.lng_inicio as number | null;
  const latF = body.lat_fin as number | null;
  const lngF = body.lng_fin as number | null;
  if (latI != null && lngI != null && latF != null && lngF != null) {
    body.ubicacion = {
      type: 'LineString',
      coordinates: [
        [Number(lngI), Number(latI)],
        [Number(lngF), Number(latF)],
      ],
    };
  }

  body.encuestador = encuestadorNombre.trim();

  for (const k of OMIT_KEYS) {
    delete body[k];
  }

  delete body._id;
  delete body.__v;

  for (const campo of REF_FIELDS) {
    const v = body[campo];
    if (v === '' || v === undefined) {
      body[campo] = null;
    }
  }

  const danos = Array.isArray(body.danos) ? body.danos : [];
  body.danos = danos.filter((d: unknown) => {
    if (d && typeof d === 'object' && 'dano' in d) {
      return Boolean((d as { dano?: string }).dano);
    }
    return false;
  });

  return body;
}

export function recalcularLongitudDesdeCoords(form: Record<string, unknown>): number {
  const latI = form.lat_inicio as number | null;
  const lngI = form.lng_inicio as number | null;
  const latF = form.lat_fin as number | null;
  const lngF = form.lng_fin as number | null;
  if (latI == null || lngI == null || latF == null || lngF == null) {
    return 0;
  }
  return haversineDistanceMeters(latI, lngI, latF, lngF);
}
