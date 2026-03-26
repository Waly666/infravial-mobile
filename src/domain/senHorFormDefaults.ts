import type { JornadaActivaDto } from '@/types/jornada';

export function createSenHorFormState(jornada: JornadaActivaDto | null): Record<string, unknown> {
  return {
    idJornada: jornada?._id ?? '',
    idViaTramo: '',
    municipio: jornada?.municipio ?? '',
    supervisor: jornada?.supervisor ?? '',

    ubicacion: { type: 'Point', coordinates: [] as number[] },
    lat: null as number | null,
    lng: null as number | null,

    codSeHor: '',
    tipoDem: '',
    estadoDem: '',
    tipoPintura: '',
    material: '',
    fechaInst: '',
    fase: '',
    accion: '',
    fechaAccion: '',
    ubicResTramo: '',
    reflectOptima: '',
    retroreflectividad: '',
    color: '',
    claseDemLinea: '',
    claseDemPunto: '',

    obs1: '',
    obs2: '',
    obs3: '',
    obs4: '',
    obs5: '',
    obs6: '',
    notas: '',
    urlFotoSH: '',
  };
}

