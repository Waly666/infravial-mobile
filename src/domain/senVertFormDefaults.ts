import type { JornadaActivaDto } from '@/types/jornada';

export function createSenVertFormState(jornada: JornadaActivaDto | null): Record<string, unknown> {
  return {
    idJornada: jornada?._id ?? '',
    idViaTramo: '',
    municipio: jornada?.municipio ?? '',
    departamento: jornada?.dpto ?? '',
    supervisor: jornada?.supervisor ?? '',

    ubicacion: { type: 'Point', coordinates: [] as number[] },
    lat: null as number | null,
    lng: null as number | null,

    codSe: '',
    estado: '',
    matPlaca: '',
    ubicEspacial: '',
    obstruccion: '',
    fechaInst: '',
    forma: '',
    orientacion: '',
    reflecOptima: '',
    dimTablero: '',
    ubicPerVial: '',
    fase: '',
    accion: '',
    ubicLateral: null as number | null,
    diagUbicLat: '',
    altura: null as number | null,
    diagAltura: '',
    banderas: '',
    leyendas: '',

    falla1: '',
    falla2: '',
    falla3: '',
    falla4: '',
    falla5: '',
    tipoSoporte: '',
    sistemaSoporte: '',
    estadoSoporte: '',
    estadoAnclaje: '',

    obs1: '',
    obs2: '',
    obs3: '',
    obs4: '',
    obs5: '',
    notas: '',
    urlFotoSenVert: '',
  };
}
