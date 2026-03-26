const OMIT_KEYS = ['lat', 'lng', 'fotos', 'logUltimaMod', 'municipio', 'departamento', 'supervisor'];
const REF_OBS = ['obs1', 'obs2', 'obs3', 'obs4', 'obs5'] as const;

export function buildSenVertPayload(form: Record<string, unknown>): Record<string, unknown> {
  const body: Record<string, unknown> = { ...form };
  const lat = body.lat as number | null | undefined;
  const lng = body.lng as number | null | undefined;
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    body.ubicacion = {
      type: 'Point',
      coordinates: [Number(lng), Number(lat)],
    };
  }
  for (const k of OMIT_KEYS) {
    delete body[k];
  }
  for (const campo of REF_OBS) {
    const v = body[campo];
    if (v === '' || v === undefined) {
      body[campo] = null;
    }
  }
  delete body._id;
  delete body.__v;
  return body;
}
