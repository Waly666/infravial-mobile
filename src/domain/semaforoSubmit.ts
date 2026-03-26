const OMIT_KEYS = ['lat', 'lng', 'logUltimaMod', 'municipio', 'supervisor'];
const REF_OBS = ['obs1', 'obs2', 'obs3', 'obs4', 'obs5', 'obs6'] as const;

export function buildSemaforoPayload(form: Record<string, unknown>): Record<string, unknown> {
  const body: Record<string, unknown> = { ...form };
  const lat = body.lat as number | null | undefined;
  const lng = body.lng as number | null | undefined;
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    body.ubicacion = { type: 'Point', coordinates: [Number(lng), Number(lat)] };
  }
  for (const k of OMIT_KEYS) delete body[k];
  for (const campo of REF_OBS) {
    const v = body[campo];
    if (v === '' || v === undefined) body[campo] = null;
  }

  // Si no hay pulsador, su estado no aplica.
  if (body.pulsador !== true) {
    body.estadoPulsador = null;
  } else if (body.estadoPulsador === '' || body.estadoPulsador === undefined) {
    body.estadoPulsador = null;
  }

  // Si no hay temporizador, su estado no aplica.
  if (body.temporizador !== true) {
    body.estadoTemp = null;
  } else if (body.estadoTemp === '' || body.estadoTemp === undefined) {
    body.estadoTemp = null;
  }

  delete body._id;
  delete body.__v;
  return body;
}

