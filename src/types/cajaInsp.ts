import type { ViaTramoListItemDto } from '@/types/viaTramo';

export interface CajaInspDto {
  _id: string;
  idJornada?: string;
  idViaTramo?: ViaTramoListItemDto | string;
  ubicacion?: { type: string; coordinates: number[] };
  materialCaja?: string;
  fase?: string;
  accion?: string;
  implementacion?: string;
  estadoCaja?: string;
  tapa?: boolean;
  estadoTapa?: string | null;
  notas?: string;
  urlFotoCaja?: string;
}

