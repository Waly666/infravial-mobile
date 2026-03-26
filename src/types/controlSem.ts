import type { ViaTramoListItemDto } from '@/types/viaTramo';

export interface ControlSemDto {
  _id: string;
  idJornada?: string;
  idViaTramo?: ViaTramoListItemDto | string;
  numExterno?: number | null;
  ubicacion?: { type: string; coordinates: number[] };
  fase?: string;
  accion?: string;
  implementacion?: string;
  tipoControlador?: string;
  claseControlador?: string;
  serialControlador?: string;
  modelo?: string;
  fabricante?: string;
  estadoControlador?: string;
  falla?: string;
  ups?: boolean;
  tipoBateria?: string;
  estadoUps?: string;
  enlazadoCentralSem?: boolean;
  materialArmario?: string;
  estadoArmario?: string;
  cerradura?: string;
  estadoCerradura?: string;
  estadoPintura?: string;
  notas?: string;
  urlFotoControlador?: string;
  urlFotoArmario?: string;
}

