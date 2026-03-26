const OMIT_KEYS = ['lat', 'lng', 'logUltimaMod', 'municipio', 'supervisor'];

export function buildCajaInspPayload(form: Record<string, unknown>): Record<string, unknown> {
  const body: Record<string, unknown> = { ...form };
  const lat = body.lat as number | null | undefined;
  const lng = body.lng as number | null | undefined;
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    body.ubicacion = { type: 'Point', coordinates: [Number(lng), Number(lat)] };
  }
  for (const k of OMIT_KEYS) delete body[k];
  if (!body.tapa) body.estadoTapa = null;
  delete body._id;
  delete body.__v;
  return body;
}

