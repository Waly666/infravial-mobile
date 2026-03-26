import { fromApiValorRta, type EncuestaRespuestaItem, type PreguntaEncViaDto } from '@/types/encuesta';

function refId(v: unknown): string {
  if (v == null || v === '') return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null && '_id' in v) {
    const id = (v as { _id?: unknown })._id;
    return typeof id === 'string' ? id : '';
  }
  return '';
}

function normalizeFechaInv(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/** Claves que no se copian tal cual del documento API (refs, GeoJSON, metadatos). */
const OMIT_FROM_TRAMO_SPREAD = new Set([
  '_id',
  '__v',
  'ubicacion',
  'zat',
  'comuna',
  'barrio',
  'perfilEsquema',
  'obs1',
  'obs2',
  'obs3',
  'obs4',
  'obs5',
  'obs6',
  'idJornada',
  'respuestas',
  'fotos',
  'fechaCreacion',
  'logUltimaMod',
]);

/**
 * Fusiona el tramo del GET `/via-tramos/:id` en el estado del wizard móvil (como `loadTramo` en Angular).
 */
export function mergeViaTramoFromApi(
  base: Record<string, unknown>,
  tramo: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...base, ...tramo };
  for (const k of OMIT_FROM_TRAMO_SPREAD) {
    delete next[k];
  }

  next.idJornada = refId(tramo.idJornada) || String(base.idJornada ?? '');
  next.zat = refId(tramo.zat);
  next.comuna = refId(tramo.comuna);
  next.barrio = refId(tramo.barrio);
  next.perfilEsquema = refId(tramo.perfilEsquema);
  next.obs1 = refId(tramo.obs1);
  next.obs2 = refId(tramo.obs2);
  next.obs3 = refId(tramo.obs3);
  next.obs4 = refId(tramo.obs4);
  next.obs5 = refId(tramo.obs5);
  next.obs6 = refId(tramo.obs6);

  const ubi = tramo.ubicacion as { coordinates?: number[][] } | undefined;
  if (ubi?.coordinates?.length === 2) {
    next.lat_inicio = ubi.coordinates[0][1];
    next.lng_inicio = ubi.coordinates[0][0];
    next.lat_fin = ubi.coordinates[1][1];
    next.lng_fin = ubi.coordinates[1][0];
  }

  if (tramo.fechaInv != null && tramo.fechaInv !== '') {
    next.fechaInv = normalizeFechaInv(tramo.fechaInv);
  }

  const nomBase = (base.nomenclatura as Record<string, string>) || {};
  const nomTramo =
    tramo.nomenclatura && typeof tramo.nomenclatura === 'object'
      ? (tramo.nomenclatura as Record<string, string>)
      : {};
  next.nomenclatura = { ...nomBase, ...nomTramo };

  const ev2 = tramo.estadoVia2;
  next.estadoVia2 = Array.isArray(ev2) ? ev2.map((x) => String(x)) : [];

  const rawDanos = Array.isArray(tramo.danos) ? tramo.danos : [];
  const danos: { dano: string; clase: string; tipo: string }[] = [];
  for (let i = 0; i < 5; i++) {
    const d = rawDanos[i];
    if (d && typeof d === 'object') {
      const o = d as { dano?: unknown; clase?: unknown; tipo?: unknown };
      danos.push({
        dano: String(o.dano ?? ''),
        clase: String(o.clase ?? ''),
        tipo: String(o.tipo ?? ''),
      });
    } else {
      danos.push({ dano: '', clase: '', tipo: '' });
    }
  }
  next.danos = danos;

  return next;
}

export function mergeEncuestaIntoRespuestas(
  preguntas: PreguntaEncViaDto[],
  respuestasApi: unknown[],
): EncuestaRespuestaItem[] {
  return preguntas.map((p) => {
    const r = respuestasApi.find((row) => {
      if (!row || typeof row !== 'object') return false;
      const o = row as Record<string, unknown>;
      const idP = o.idPregunta;
      if (idP && typeof idP === 'object' && idP !== null && '_id' in idP) {
        return (idP as { _id: string })._id === p._id;
      }
      return idP === p._id;
    }) as Record<string, unknown> | undefined;
    return {
      idPregunta: p._id,
      consecutivo: p.consecutivo,
      valorRta: fromApiValorRta(r?.valorRta),
    };
  });
}
