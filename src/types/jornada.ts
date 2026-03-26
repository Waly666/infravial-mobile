/** Respuesta de GET /jornadas/activa (alineado con Angular `JornadaService.getActiva`). */
export interface JornadaActivaDto {
  _id: string;
  municipio?: string;
  dpto?: string;
  fechaJornada?: string;
  supervisor?: string;
  localidad?: string;
  tipoLocalidad?: string;
  estado?: string;
  codMunicipio?: string;
  codDepto?: string;
}
