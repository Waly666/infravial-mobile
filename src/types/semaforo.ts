import type { ControlSemDto } from '@/types/controlSem';
import type { ViaTramoListItemDto } from '@/types/viaTramo';

export interface SemaforoDto {
  _id: string;
  idJornada?: string;
  idViaTramo?: ViaTramoListItemDto | string;
  idControSem?: ControlSemDto | string;
  ubicacion?: { type: string; coordinates: number[] };
  numExterno?: number | null;
  controlRef?: string;
  ipRadio?: string;
  sitio?: string;
  semaforoFunciona?: boolean;
  claseSem?: string;
  numCaras?: number;
  obstruccion?: string;
  visibilidadOptima?: string;
  fase?: string;
  accion?: string;
  estadoGenPint?: string;
  implementacion?: string;
  pulsador?: boolean;
  estadoPulsador?: string;
  temporizador?: boolean;
  estadoTemp?: string;
  dispositivoAuditivo?: boolean;
  estadoDispAud?: string;
  tipoSoporte?: string;
  estadoSoporte?: string;
  pinturaSoporte?: string;
  sistemaSoporte?: string;
  estadoAnclaje?: string;
  urlFotoSoporte?: string;
  urlFotoAnclaje?: string;
  urlFotoPulsador?: string;
  urlFotoDispAud?: string;
  caras?: CaraSemaforoDto[];
  obs1?: { _id: string } | string | null;
  obs2?: { _id: string } | string | null;
  obs3?: { _id: string } | string | null;
  obs4?: { _id: string } | string | null;
  obs5?: { _id: string } | string | null;
  obs6?: { _id: string } | string | null;
  notasGenerales?: string;
  urlFotoSemaforo?: string;
}

export interface CaraSemaforoDto {
  tipoModulo?: string;
  diametroLente?: string;
  numeroModulos?: number | null;
  numeroVisceras?: number | null;
  estadoMod1?: string | null;
  estadoViscera1?: string | null;
  estadoMod2?: string | null;
  estadoViscera2?: string | null;
  estadoMod3?: string | null;
  estadoViscera3?: string | null;
  estadoMod4?: string | null;
  estadoViscera4?: string | null;
  despliegue?: string;
  estadoCara?: string;
  colores?: string;
  placaContraste?: boolean;
  estadoPlacaCont?: string | null;
  danos?: string[];
  flechaDir?: boolean;
  obs?: string;
  urlFoto?: string;
}

export interface ObsSemaforoDto {
  _id: string;
  obsSemaforo: string;
}

