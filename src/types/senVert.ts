import type { ViaTramoListItemDto } from '@/types/viaTramo';

/** Ítem de GET /sen-vert → registros (ExistSenVert poblado). */
export interface ExistSenVertListItemDto {
  _id: string;
  idJornada?: string;
  idViaTramo?: ViaTramoListItemDto | string;
  codSe?: string;
  estado?: string;
  ubicacion?: { type: string; coordinates: number[] };
  urlFotoSenVert?: string;
  fechaCreacion?: string;
}

export interface SenVertCatalogoDto {
  _id: string;
  codSenVert: string;
  descSenVert: string;
  clasificacion?: string;
  urlImgSenVert?: string;
}

export interface ObsSvDto {
  _id: string;
  observacion: string;
}
