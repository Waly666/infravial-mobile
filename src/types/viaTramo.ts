/** Ítem de GET /via-tramos (lista como `via-tramo-lista`). */
export interface ViaTramoListItemDto {
  _id: string;
  via?: string;
  municipio?: string;
  nomenclatura?: { completa?: string };
  calzada?: string;
  tipoVia?: string;
  estadoVia?: string;
  longitud_m?: number;
  fechaCreacion?: string;
  idJornada?: { _id?: string; municipio?: string; dpto?: string } | string;
}
