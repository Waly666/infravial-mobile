/** Deben coincidir con `backend/models/ViaTramo.js` (TIPOS_UBIC_VALIDOS, SECTORES_VIA_VALIDOS, ZONAS_VIA_VALIDOS). */
export const TIPOS_LOCALIDAD = [
  'Cabecera Municipal',
  'Corregimiento',
  'Inspección',
  'Centro Poblado',
] as const;

/** Campo API tipoUbic — en formulario web la etiqueta es "Diseño" */
export const TIPOS_UBIC = [
  'Glorieta',
  'Interseccion',
  'Paso A Nivel',
  'Ponton',
  'Cicloruta',
  'Paso elevado',
  'Paso Inferior',
  'Peatonal',
  'Puente',
  'Tramo de Via',
  'Tunel',
] as const;

export const TIPOS_VIA = ['Urbana', 'Rural'] as const;

export const SECTORES_VIA = ['Residencial', 'Industrial', 'Comercial'] as const;

export const ZONAS_VIA = ['Escolar', 'Deportiva', 'Turística', 'Privada', 'Militar', 'Hospitalaria'] as const;

export const CLASES_VIA = [
  'Autopista',
  'Via rural sin separador',
  'Via rural con separador',
  'Via convencional urbana sin separador',
  'Via convencional urbana con separador',
  'Via Urbana peatonal',
  'Fuera de clasificacion',
] as const;

export const TIPOS_NOMENCLATURA = [
  'Calle',
  'Carrera',
  'Diagonal',
  'Transversal',
  'Avenida',
  'Manzana',
  'Sin_Nomenclatura',
] as const;

export const CONECTORES = ['con', 'entre'] as const;

export const UBI_CICLO_RUTAS = ['En el separador', 'En la calzada', 'Al lado del Anden', 'N/A'] as const;

export const CALZADAS = ['Una', 'Dos', 'Tres'] as const;

export const CAPA_RODADURAS = [
  'Asfalto',
  'Afirmado',
  'Adoquin',
  'Empedrado',
  'Concreto Rigido',
  'Tierra',
  'Vegetación',
  'Gravilla',
  'Otro',
] as const;

export const ESTADOS_VIA = ['Bueno', 'Regular', 'Malo'] as const;

export const DISENIO_GEOM = ['Curva', 'Recta'] as const;

export const INCLINACION_VIA = ['Plano', 'Pendiente'] as const;

export const SENTIDO_VIAL_NUEVOS = [
  'Un sentido',
  'Doble Sentido',
  'Reversible',
  'Contraflujo',
  'Ciclo vía',
] as const;

export const SENTIDO_VIAL_LEGADO = ['Unidireccional', 'Bidireccional', 'Sin_Definir'] as const;

/** Nuevos primero; legado para tramos ya guardados */
export const SENTIDO_VIAL = [...SENTIDO_VIAL_NUEVOS, ...SENTIDO_VIAL_LEGADO] as const;

export const CONDICIONES_VIA = [
  'Aceite',
  'Húmeda',
  'Lodo',
  'Alcantarilla destapada',
  'Material organico',
  'Material suelto',
  'Seca',
  'Otra',
] as const;

export const VISIBILIDAD = ['Normal', 'Disminuida'] as const;

export const ESTADOS_VIA2 = [
  'Con huecos',
  'Derrumbe',
  'En reparación',
  'Hundimiento',
  'Inundada',
  'Parchada',
  'Rizada',
  'Fisurada',
] as const;

export const VIS_DISMINUIDAS = [
  'Caseta',
  'Construccion',
  'Vallas',
  'Árbol',
  'Vegetación',
  'Vehículos Estacionados',
  'Poste',
  'Otro',
] as const;

export const DANOS_OPCIONES = [
  'Perdida De Agregado En Tratamiento Superficial',
  'Descascaramiento (Peladuras)',
  'Ojo De Pescado',
  'Exudacion De Asfalto',
  'Pulimento (Agregado)',
  'Cabeza Dura',
  'Baches Profundos',
  'Ondulaciones',
  'Grieta Longitudinal',
  'Grieta Transversal',
  'Falla De Bloque',
  'Piel de cocodrilo',
] as const;

export const CLASES_DANO = ['Deterioro Superficie', 'Deterioro Estructura'] as const;

export const TIPOS_DANO = [
  'Desprendimiento',
  'Alisamiento',
  'Exposicion de agregados',
  'Deformaciones',
  'Agrietamientos',
] as const;

export const CLAS_POR_COMPETENCIA = [
  'Carreteras Nacionales',
  'Carreteras departamentales - Red de segundo orden',
  'Carreteras veredales o caminos vecinales - Red Terciaria',
  'Carreteras distritales y municipales',
] as const;

export const CLAS_POR_FUNCIONALIDAD = ['Primarias', 'Secundarias', 'Terciarias'] as const;

export const CONECTOR2_NOM = ['y'] as const;
