import type { JornadaActivaDto } from '@/types/jornada';

export function createControlSemFormState(jornada: JornadaActivaDto | null): Record<string, unknown> {
  return {
    idJornada: jornada?._id ?? '',
    idViaTramo: '',
    municipio: jornada?.municipio ?? '',
    supervisor: jornada?.supervisor ?? '',
    numExterno: null as number | null,
    ubicacion: { type: 'Point', coordinates: [] as number[] },
    lat: null as number | null,
    lng: null as number | null,
    fase: '',
    accion: '',
    implementacion: '',
    tipoControlador: '',
    claseControlador: '',
    serialControlador: '',
    modelo: '',
    fabricante: '',
    estadoControlador: '',
    falla: '',
    ups: false,
    tipoBateria: '',
    estadoUps: '',
    enlazadoCentralSem: false,
    materialArmario: '',
    estadoArmario: '',
    cerradura: '',
    estadoCerradura: '',
    estadoPintura: '',
    notas: '',
    urlFotoControlador: '',
    urlFotoArmario: '',
  };
}

