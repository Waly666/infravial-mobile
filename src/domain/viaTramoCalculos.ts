/**
 * Paridad con `via-tramo-form.ts` (Angular): `calcularAncho`, `calcularClasificacion`, `onCalzadaChange`.
 */

const CALZADA_UNA_RESET_KEYS = [
  'anteJardinDer',
  'andenDer',
  'zonaVerdeDer',
  'areaServDer',
  'sardDerCalzB',
  'cicloRutaDer',
  'bahiaEstDer',
  'sardIzqCalzB',
  'cunetaDer',
  'bermaDer',
  'calzadaDer',
  'separadorZonaVerdeIzq',
  'separadorPeatonal',
  'separadorCicloRuta',
  'separadorZonaVerdeDer',
] as const;

function num(form: Record<string, unknown>, k: string): number {
  const v = form[k];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v !== '') {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function recalcularAnchoTotalPerfil(form: Record<string, unknown>): number {
  const f = form;
  const total =
    num(f, 'andenIzq') +
    num(f, 'zonaVerdeIzq') +
    num(f, 'anteJardinIzq') +
    num(f, 'sardIzqCalzA') +
    num(f, 'cicloRutaIzq') +
    num(f, 'areaServIzq') +
    num(f, 'bahiaEstIzq') +
    num(f, 'sardDerCalzA') +
    num(f, 'cunetaIzq') +
    num(f, 'bermaIzq') +
    num(f, 'calzadaIzq') +
    num(f, 'andenDer') +
    num(f, 'zonaVerdeDer') +
    num(f, 'anteJardinDer') +
    num(f, 'sardIzqCalzB') +
    num(f, 'cicloRutaDer') +
    num(f, 'areaServDer') +
    num(f, 'bahiaEstDer') +
    num(f, 'sardDerCalzB') +
    num(f, 'cunetaDer') +
    num(f, 'bermaDer') +
    num(f, 'calzadaDer') +
    num(f, 'separadorPeatonal') +
    num(f, 'separadorZonaVerdeIzq') +
    num(f, 'separadorCicloRuta') +
    num(f, 'separadorZonaVerdeDer');
  return Math.round(total * 100) / 100;
}

export function recalcularClasificacionVial(form: Record<string, unknown>): {
  clasNacional: string;
  clasPrelacion: string;
} {
  const ancho = num(form, 'anchoTotalPerfil');
  let clasNacional = 'V9';
  if (ancho >= 60) clasNacional = 'V1';
  else if (ancho > 45) clasNacional = 'V2';
  else if (ancho > 30) clasNacional = 'V3';
  else if (ancho > 25) clasNacional = 'V4';
  else if (ancho > 18) clasNacional = 'V5';
  else if (ancho > 16) clasNacional = 'V6';
  else if (ancho > 13) clasNacional = 'V7';
  else if (ancho > 10) clasNacional = 'V8';

  const tipoVia = String(form.tipoVia ?? '');
  let clasPrelacion = '';
  if (tipoVia === 'Urbana') {
    if (ancho >= 30) clasPrelacion = 'Autopistas';
    else if (ancho >= 26) clasPrelacion = 'Arterias';
    else if (ancho >= 20) clasPrelacion = 'Principales';
    else if (ancho >= 17) clasPrelacion = 'Secundarias';
    else if (ancho > 12) clasPrelacion = 'Ordinarias';
    else if (ancho > 8) clasPrelacion = 'Ciclorutas';
    else clasPrelacion = 'Peatonales';
  } else if (tipoVia === 'Rural') {
    if (ancho >= 30) clasPrelacion = 'Autopistas';
    else if (ancho >= 26) clasPrelacion = 'Carreteras principales';
    else if (ancho >= 20) clasPrelacion = 'Carreteras secundarias';
    else if (ancho >= 17) clasPrelacion = 'Carreteables';
    else if (ancho > 12) clasPrelacion = 'Privadas';
    else clasPrelacion = 'Peatonales';
  }

  return { clasNacional, clasPrelacion };
}

export function patchAnchoYClasificacion(form: Record<string, unknown>): Record<string, unknown> {
  const anchoTotalPerfil = recalcularAnchoTotalPerfil(form);
  const { clasNacional, clasPrelacion } = recalcularClasificacionVial({
    ...form,
    anchoTotalPerfil,
  });
  return { ...form, anchoTotalPerfil, clasNacional, clasPrelacion };
}

/** Limpieza como `onCalzadaChange` cuando la calzada pasa a Una (Angular). */
export function aplicarResetCalzadaUna(form: Record<string, unknown>): Record<string, unknown> {
  const next = { ...form };
  for (const k of CALZADA_UNA_RESET_KEYS) {
    next[k] = 0;
  }
  next.perfilEsquema = '';
  return patchAnchoYClasificacion(next);
}

export function recalcPendientePorcentaje(base: number, altura: number): number {
  if (base > 0) {
    return Math.round((altura / base) * 100 * 100) / 100;
  }
  return 0;
}
