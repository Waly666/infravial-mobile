import type { JornadaActivaDto } from '@/types/jornada';

/**
 * Estado inicial del wizard Angular (`via-tramo-form.ts`), sin enviar respuestas ni fotos al API.
 * El backend calcula anchoTotalPerfil, clasNacional, clasPrelacion al crear/actualizar.
 */
export function createViaTramoFormState(jornada: JornadaActivaDto | null): Record<string, unknown> {
  const base: Record<string, unknown> = {
    idJornada: '',
    fechaInv: '',
    municipio: '',
    departamento: '',
    supervisor: '',
    localidad: '',
    tipoLocalidad: '',

    ubicacion: { type: 'LineString', coordinates: [] as number[][] },
    lat_inicio: null as number | null,
    lng_inicio: null as number | null,
    lat_fin: null as number | null,
    lng_fin: null as number | null,
    longitud_m: 0,
    altitud: null as number | null,

    via: '',
    tipoUbic: '',
    calzada: '',
    tipoVia: '',
    claseVia: '',
    nomenclatura: {
      tipoVia1: '',
      numero1: '',
      conector: '',
      tipoVia2: '',
      numero2: '',
      conector2: '',
      tipoVia3: '',
      numero3: '',
      completa: '',
    },

    entidadVia: 'Municipio',
    respVia: 'Municipio',
    encuestador: '',
    zat: '',
    comuna: '',
    barrio: '',
    ubiCicloRuta: '',
    sentidoCardinal: '',
    carriles: null as number | null,
    perfilEsquema: '',

    anteJardinIzq: 0,
    andenIzq: 0,
    zonaVerdeIzq: 0,
    areaServIzq: 0,
    sardIzqCalzA: 0,
    cicloRutaIzq: 0,
    bahiaEstIzq: 0,
    sardDerCalzA: 0,
    cunetaIzq: 0,
    bermaIzq: 0,
    calzadaIzq: 0,
    anteJardinDer: 0,
    andenDer: 0,
    zonaVerdeDer: 0,
    areaServDer: 0,
    sardDerCalzB: 0,
    cicloRutaDer: 0,
    bahiaEstDer: 0,
    sardIzqCalzB: 0,
    cunetaDer: 0,
    bermaDer: 0,
    calzadaDer: 0,
    separadorZonaVerdeIzq: 0,
    separadorPeatonal: 0,
    separadorCicloRuta: 0,
    separadorZonaVerdeDer: 0,
    anchoTotalPerfil: 0,
    pendiente: 0,

    clasPorCompetencia: '',
    clasPorFuncionalidad: '',
    clasNacional: '',
    clasPrelacion: '',
    clasMunPbot: '',

    disenioGeometrico: '',
    inclinacionVia: '',
    sentidoVial: '',
    capaRodadura: '',
    estadoVia: '',
    estadoVia2: [] as string[],
    condicionesVia: '',
    iluminacArtificial: false,
    estadoIluminacion: '',
    visibilidad: '',
    visDisminuida: '',

    danos: [
      { dano: '', clase: '', tipo: '' },
      { dano: '', clase: '', tipo: '' },
      { dano: '', clase: '', tipo: '' },
      { dano: '', clase: '', tipo: '' },
      { dano: '', clase: '', tipo: '' },
    ],

    obs1: '',
    obs2: '',
    obs3: '',
    obs4: '',
    obs5: '',
    obs6: '',
    notas: '',

    /** Encuesta paso 9: se rellena al cargar /catalogos/preguntas-enc (no va en POST /via-tramos). */
    respuestas: [] as { idPregunta: string; consecutivo?: string; valorRta: string }[],
  };

  if (jornada) {
    base.idJornada = jornada._id;
    base.municipio = jornada.municipio ?? '';
    base.departamento = jornada.dpto ?? '';
    base.supervisor = jornada.supervisor ?? '';
    base.localidad = jornada.localidad ?? '';
    base.tipoLocalidad = jornada.tipoLocalidad ?? '';
    base.fechaInv = jornada.fechaJornada ? String(jornada.fechaJornada) : '';
  }

  return base;
}
