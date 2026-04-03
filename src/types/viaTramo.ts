/** Ítem de GET /via-tramos (lista como `via-tramo-lista`). */
export interface ViaTramoListItemDto {
  _id: string;
  via?: string;
  municipio?: string;
  nomenclatura?: {
    completa?: string;
    tipoVia1?: string;
    numero1?: string;
    conector?: string;
    tipoVia2?: string;
    numero2?: string;
    conector2?: string;
    tipoVia3?: string;
    numero3?: string;
  };
  calzada?: string;
  tipoVia?: string;
  /** Campo API `tipoUbic` — etiqueta en formulario: Diseño */
  tipoUbic?: string;
  sector?: string;
  zona?: string;
  estadoVia?: string;
  longitud_m?: number;
  fechaCreacion?: string;
  idJornada?: { _id?: string; municipio?: string; dpto?: string } | string;
}
