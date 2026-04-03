/**
 * Búsqueda de tramos alineada con la app web (`geo-list-filters.ts`):
 * nomenclatura por prefijo desde el inicio (incremental) y ObjectId completo o prefijo hex.
 */

export function normalizeSearchText(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** `_id` del documento como string (JSON o Extended JSON). */
export function rowMongoIdString(row: { _id?: unknown } | null | undefined): string {
  if (!row || row._id == null || row._id === '') return '';
  const id = row._id;
  if (typeof id === 'string') return id;
  if (typeof id === 'object' && id !== null) {
    const o = id as { $oid?: string; toHexString?: () => string };
    if (o.$oid != null) return String(o.$oid);
    if (typeof o.toHexString === 'function') return o.toHexString();
    const s = String(id);
    if (s !== '[object Object]') return s;
  }
  return String(id);
}

/**
 * Normaliza pegados desde Compass / shell: `ObjectId("...")`, `{ "$oid": "..." }`, etc.
 * Devuelve hex 24 chars en minúsculas o `null`.
 */
export function extractMongoObjectId(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;

  const jsonOid = /"?\$oid"?\s*:\s*"?([a-fA-F0-9]{24})"?/i.exec(s);
  if (jsonOid) return jsonOid[1].toLowerCase();

  const oidFn = /^ObjectId\s*\(\s*["']?([a-fA-F0-9]{24})["']?\s*\)\s*$/i.exec(
    s.replace(/\s+/g, ' ').trim(),
  );
  if (oidFn) return oidFn[1].toLowerCase();

  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/[\s\r\n\u00a0]+/g, '');
  if (/^[a-fA-F0-9]{24}$/.test(s)) return s.toLowerCase();
  return null;
}

export function filterListByExactMongoId<T extends { _id?: unknown }>(
  rows: T[],
  qRaw: string,
  filtroIdExtra?: string,
): T[] | null {
  const idExact =
    extractMongoObjectId((filtroIdExtra ?? '').trim()) ||
    extractMongoObjectId((qRaw ?? '').trim());
  if (!idExact) return null;
  const hit = rows.find((r) => rowMongoIdString(r).toLowerCase() === idExact);
  return hit ? [hit] : [];
}

function geoSource(row: unknown): Record<string, unknown> | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as { idViaTramo?: unknown };
  if (r.idViaTramo && typeof r.idViaTramo === 'object') {
    return r.idViaTramo as Record<string, unknown>;
  }
  return row as Record<string, unknown>;
}

/** Texto de nomenclatura: `completa` o partes tipo/número/conector (como en web). */
export function nomenclaturaSearchText(row: unknown): string {
  const src = geoSource(row);
  if (!src) return '';
  const n = src.nomenclatura as Record<string, unknown> | undefined;
  if (!n || typeof n !== 'object') return '';
  const c = String(n.completa ?? '').trim();
  if (c) return c;
  const parts = [
    n.tipoVia1,
    n.numero1,
    n.conector,
    n.tipoVia2,
    n.numero2,
    n.conector2,
    n.tipoVia3,
    n.numero3,
  ];
  return parts
    .filter((x) => x != null && String(x).trim() !== '')
    .map((x) => String(x).trim())
    .join(' ');
}

export function nomenclaturaStartsWithQuery(nom: string, qRaw: string): boolean {
  const q = normalizeSearchText(qRaw);
  if (!q) return true;
  const h = normalizeSearchText(nom);
  return h.length > 0 && h.startsWith(q);
}

function isLikelyObjectIdPrefix(raw: string): string | null {
  const s = String(raw ?? '')
    .trim()
    .replace(/\s/g, '')
    .toLowerCase();
  if (/^[a-f0-9]{4,23}$/.test(s)) return s;
  return null;
}

/** True si la consulta parece ObjectId (24 hex o prefijo 4–23) — útil para no mezclar con códigos de catálogo. */
export function isLikelyMongoIdSearchInput(qRaw: string): boolean {
  const q = String(qRaw ?? '').trim();
  return !!(extractMongoObjectId(q) || isLikelyObjectIdPrefix(q));
}

/**
 * Picker de tramo: prefijo de nomenclatura desde el inicio; ObjectId completo o prefijo hex 4–23.
 */
export function filtrarTramosPickerPorBusqueda<T extends { _id?: unknown }>(
  tramos: T[],
  qRaw: string,
): T[] {
  const q = String(qRaw ?? '').trim();
  if (!q) return tramos;

  const idFull = extractMongoObjectId(q);
  if (idFull) {
    return tramos.filter((t) =>
      rowMongoIdString(t).toLowerCase().startsWith(idFull),
    );
  }
  const idPrefix = isLikelyObjectIdPrefix(q);
  if (idPrefix) {
    return tramos.filter((t) =>
      rowMongoIdString(t).toLowerCase().startsWith(idPrefix),
    );
  }

  return tramos.filter((t) => {
    const nom = nomenclaturaSearchText(t);
    return nom ? nomenclaturaStartsWithQuery(nom, q) : false;
  });
}

/** Una fila de tramo o un `idViaTramo` string (solo coincide por id). */
export function matchesTramoPickerSingle(tramo: unknown, qRaw: string): boolean {
  const q = String(qRaw ?? '').trim();
  if (!q) return true;
  if (!tramo) return false;
  if (typeof tramo === 'string') {
    const s = tramo.trim().toLowerCase().replace(/\s/g, '');
    const idFull = extractMongoObjectId(q);
    if (idFull) return s.startsWith(idFull);
    const pref = isLikelyObjectIdPrefix(q);
    if (pref) return s.startsWith(pref);
    return false;
  }
  return filtrarTramosPickerPorBusqueda([tramo as { _id?: unknown }], q).length > 0;
}

/** Control semafórico (picker): id Mongo, nomenclatura del tramo vinculado, numExterno. */
export function controlSemPickerMatches(c: Record<string, unknown>, qRaw: string): boolean {
  const q = String(qRaw ?? '').trim();
  if (!q) return true;
  const qn = normalizeSearchText(q);

  const idFull = extractMongoObjectId(q);
  if (idFull) {
    return rowMongoIdString(c as { _id?: unknown }).toLowerCase().startsWith(idFull);
  }
  const idPrefix = isLikelyObjectIdPrefix(q);
  if (idPrefix) {
    return rowMongoIdString(c as { _id?: unknown }).toLowerCase().startsWith(idPrefix);
  }

  const nom = nomenclaturaSearchText(c);
  if (nom && normalizeSearchText(nom).startsWith(qn)) return true;

  const ne = String(c.numExterno ?? '').trim();
  if (ne && normalizeSearchText(ne).startsWith(qn)) return true;

  return false;
}

export type ExistListSearchOpts = {
  /** Código de inventario (ej. codSe, codSeHor). Prefijo incremental si la query no es ObjectId. */
  cod?: string | null;
  /** idViaTramo poblado o string con ObjectId del tramo. */
  idViaTramo?: unknown;
  /** Otros campos con prefijo (clase, fase, tipo…). */
  extraPrefixFields?: (string | null | undefined)[];
};

/**
 * Fila de inventario geo: coincide por `_id` del registro, `_id` del tramo vinculado o prefijo de nomenclatura del tramo.
 */
export function matchesExistInventoryListRow(
  qRaw: string,
  row: { _id: string },
  opts: ExistListSearchOpts,
): boolean {
  const q = String(qRaw ?? '').trim();
  if (!q) return true;

  const exact = filterListByExactMongoId([row], q, '');
  if (exact !== null) return exact.length > 0;

  const pref = isLikelyObjectIdPrefix(q);
  if (pref && rowMongoIdString(row).toLowerCase().startsWith(pref)) return true;

  if (matchesTramoPickerSingle(opts.idViaTramo, q)) return true;

  if (!pref && !extractMongoObjectId(q)) {
    const qn = normalizeSearchText(q);
    if (opts.cod && normalizeSearchText(String(opts.cod)).startsWith(qn)) return true;
    for (const x of opts.extraPrefixFields ?? []) {
      if (x != null && String(x).trim() && normalizeSearchText(String(x)).startsWith(qn)) {
        return true;
      }
    }
  }
  return false;
}
