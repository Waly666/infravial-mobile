import type { JornadaActivaDto } from '@/types/jornada';

export function createCajaInspFormState(jornada: JornadaActivaDto | null): Record<string, unknown> {
  return {
    idJornada: jornada?._id ?? '',
    idViaTramo: '',
    municipio: jornada?.municipio ?? '',
    supervisor: jornada?.supervisor ?? '',
    ubicacion: { type: 'Point', coordinates: [] as number[] },
    lat: null as number | null,
    lng: null as number | null,
    materialCaja: '',
    fase: '',
    accion: '',
    implementacion: '',
    estadoCaja: '',
    tapa: false,
    estadoTapa: '',
    notas: '',
    urlFotoCaja: '',
  };
}

