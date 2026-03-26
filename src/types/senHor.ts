import type { ViaTramoListItemDto } from '@/types/viaTramo';

/** Ítem de GET /sen-hor → registros (ExistSenHor poblado). */
export interface ExistSenHorListItemDto {
  _id: string;
  idJornada?: string;
  idViaTramo?: ViaTramoListItemDto | string;
  ubicacion?: { type: string; coordinates: number[] };

  codSeHor?: string;
  tipoDem?: string;
  estadoDem?: string;
  tipoPintura?: string;
  material?: string;
  fechaInst?: string;
  fase?: string;
  accion?: string;
  fechaAccion?: string;
  ubicResTramo?: string;
  reflectOptima?: string;
  retroreflectividad?: string;
  color?: string;
  claseDemLinea?: string;
  claseDemPunto?: string;

  obs1?: { _id: string } | string | null;
  obs2?: { _id: string } | string | null;
  obs3?: { _id: string } | string | null;
  obs4?: { _id: string } | string | null;
  obs5?: { _id: string } | string | null;
  obs6?: { _id: string } | string | null;
  notas?: string;
  urlFotoSH?: string;
  fechaCreacion?: string;
}

export interface DemarcacionDto {
  _id: string;
  codDem: string;
  claseDem?: string;
  descripcion?: string;
  urlDemImg?: string;
}

export interface UbicSenHorDto {
  _id: string;
  ubicacion: string;
  urlImgUbic: string;
}

export interface ObsShDto {
  _id: string;
  obsSH: string;
}

