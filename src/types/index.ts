import type { ReactNode } from "react";

/**
 * Core domain types for NutriKallpa
 * These models representan la estructura principal de datos de la aplicación.
 */

/* -------------------------------------------------------------------------- */
/* USUARIO Y PACIENTE                                                        */
/* -------------------------------------------------------------------------- */

export type UserRole = "admin" | "usuario";

export interface User {
  id: string;
  email: string;
  nombre: string;
  rol: UserRole;
  especialidad?: string;
  cmp?: string;
  telefono?: string;
  bio?: string;
  photoUrl?: string;
  // Nutritionist / profile preferences
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface InvitationCode {
  code: string;
  rol: UserRole;
  status: 'active' | 'used';
  createdAt: string;
  usedBy?: string; // email of user who used it
}

export interface DatosPersonales {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  fechaNacimiento: string | Date;
  sexo?: "masculino" | "femenino" | "otro";
  documentoIdentidad?: string;
  peso?: number; // Centralized weight
  talla?: number; // Centralized height
  avatarUrl?: string; // URL de foto o identificador de icono (ej: "icon-1", "icon-2", o una URL de imagen)
}

export interface BiochemistryRecord {
  id: string;
  pacienteId: string;
  fecha: string | Date;
  glucosa?: number;
  hba1c?: number; // Hemoglobina Glicosilada
  colesterolTotal?: number;
  trigliceridos?: number;
  hdl?: number;
  ldl?: number;
  hemoglobina?: number;
  ferritina?: number;
  observaciones?: string;
  createdAt?: string;
}

export type Pathologies = 'diabetes_t1' | 'diabetes_t2' | 'hipertension' | 'dislipidemia' | 'obesidad' | 'hipotiroidismo' | 'hipertiroidismo' | 'sop' | 'gastritis' | 'reflujo' | 'renal_cr' | 'anemia' | 'celiaquia' | string;

export interface HistoriaClinica {
  // Anamnesis Estructurada (Medical Grade)
  motivoConsulta?: string;
  patologias?: Pathologies[]; // Typed Array
  alergias?: string[];
  medicamentos?: string[];
  antecedentesFamiliares?: string[];
  estiloVida?: {
    fuma: boolean;
    alcohol: 'nunca' | 'ocasional' | 'frecuente';
    suenoHoras: number;
    actividadFisicaTipo?: string;
  };
  // Legacy fields (kept for migration)
  antecedentesPersonales?: string;
  diagnosticos?: string;
  objetivos?: string;
  // Bioquímica is now a separate relation or array, but we keep a summary here if needed
  bioquimicaReciente?: Partial<BiochemistryRecord>;
}

/* -------------------------------------------------------------------------- */
/* CONFIGURACIÓN NUTRICIONAL                                                 */
/* -------------------------------------------------------------------------- */

export type NivelActividad = 'sedentaria' | 'sedentario' | 'ligera' | 'moderada' | 'activa' | 'muy_activa' | 'intensa' | 'muy_intensa';
export type ObjetivoPeso = 'perdida' | 'perder' | 'mantenimiento' | 'ganar' | 'ganancia';
export type FormulaGET = 'harris' | 'mifflin' | 'katch' | 'fao';

export interface ConfiguracionNutricional {
  nivelActividad?: NivelActividad;
  objetivoPeso?: ObjetivoPeso;
  formulaGET?: FormulaGET;
  proteinaRatio?: number;
  kcalAjuste?: number;
  macroProteina?: number;
  macroCarbohidratos?: number;
  macroGrasa?: number;
}

export interface Preferencias {
  restricciones?: string[];
  gustos?: string[];
  alergias?: string[];
  likedFoods?: string[];
  dislikedFoods?: string[];
}

/* -------------------------------------------------------------------------- */
/* CASOS CLÍNICOS ESPECIALES (UDD)                                           */
/* -------------------------------------------------------------------------- */

/** Tipos de amputación con porcentajes de peso corporal */
export type AmputationType =
  | 'mano_izq' | 'mano_der'
  | 'antebrazo_izq' | 'antebrazo_der'
  | 'brazo_izq' | 'brazo_der'
  | 'pie_izq' | 'pie_der'
  | 'pierna_bajo_rodilla_izq' | 'pierna_bajo_rodilla_der'
  | 'pierna_completa_izq' | 'pierna_completa_der';

/** Información de amputaciones del paciente */
export interface AmputationInfo {
  amputations: AmputationType[];
  pesoCorregido?: number; // Peso si tuviera miembros completos
  pesoIdealAjustado?: number; // Peso ideal ajustado
}

/** Estadío de Tanner (desarrollo puberal) */
export type TannerStage = 1 | 2 | 3 | 4 | 5;

/** Información pediátrica avanzada */
export interface PediatricInfo {
  semanasGestacion?: number; // <37 = prematuro
  tannerStage?: TannerStage; // Para adolescentes 8-15 años
  usarEdadBiologica?: boolean; // Calculado automáticamente
  edadCorregidaMeses?: number; // Para prematuros <2 años
}

/** Antropometría geriátrica (Chumlea) */
export interface GeriatricAnthropometry {
  alturaRodilla?: number; // cm - para estimar talla
  circunferenciaPantorrilla?: number; // cm
  pesoEstimado?: number; // kg - calculado con Chumlea
  tallaEstimada?: number; // cm - calculada desde altura rodilla
  usarPesoEstimado?: boolean;
}

/** Evaluación MNA-SF para adultos mayores */
export interface MNASFAssessment {
  id: string;
  pacienteId: string;
  fecha: string | Date;
  q1_ingesta: 0 | 1 | 2;
  q2_perdidaPeso: 0 | 1 | 2 | 3;
  q3_movilidad: 0 | 1 | 2;
  q4_estres: 0 | 2;
  q5_neuropsicologico: 0 | 1 | 2;
  q6_imcOPantorrilla: 0 | 1 | 2 | 3;
  puntajeTotal: number;
  clasificacion: 'normal' | 'riesgo_desnutricion' | 'desnutricion';
  createdAt?: string;
}

/* -------------------------------------------------------------------------- */
/* ANTROPOMETRÍA (ISAK PROTOCOL COMPLIANT)                                   */
/* -------------------------------------------------------------------------- */

export interface ISAKValue {
  val1: number;
  val2: number;
  val3?: number; // Requiere tercera toma si |val1 - val2| > tolerancia
  final: number; // Mediana o Promedio
}

// Helper for backward compatibility (union type)
export type AnthroValue = number | ISAKValue;

/**
 * Helper function to extract numeric value from AnthroValue.
 * If the value is an ISAKValue object, returns the 'final' property.
 * If undefined, returns the defaultValue (default: 0).
 */
export function getAnthroNumber(value: AnthroValue | undefined, defaultValue: number = 0): number {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'number') return value;
  return value.final ?? defaultValue;
}

export interface PlieguesCutaneos {
  triceps?: AnthroValue;
  subscapular?: AnthroValue;
  biceps?: AnthroValue;
  iliac_crest?: AnthroValue;
  supraspinale?: AnthroValue;
  abdominal?: AnthroValue;
  thigh?: AnthroValue;
  calf?: AnthroValue;
}

export interface Perimetros {
  cintura?: AnthroValue;
  cadera?: AnthroValue;
  brazoRelax?: AnthroValue;
  brazoRelajado?: AnthroValue; // Alias for backward compatibility
  brazoFlex?: AnthroValue;
  musloMedio?: AnthroValue;
  pantorrilla?: AnthroValue;
  cuello?: AnthroValue;
}

export interface Diametros {
  humero?: AnthroValue;
  femur?: AnthroValue;
  biestiloideo?: AnthroValue;
  biacromial?: AnthroValue;
  biiliocristal?: AnthroValue;
}

export interface MedidasAntropometricas {
  id: string;
  pacienteId: string;
  fecha: string | Date;

  // Basic
  peso: number;
  talla: number;

  // Detailed
  pliegues?: PlieguesCutaneos;
  perimetros?: Perimetros;
  diametros?: Diametros;

  imc?: number; // Calculated result

  // Metadata
  edad: number;
  sexo: "masculino" | "femenino" | "otro";
  protocolo?: "isak_l1" | "isak_l2" | "basic";
  tipoPaciente?: "adulto" | "pediatrico" | "adulto_mayor" | "general" | "atleta" | "fitness" | "control" | "rapida";

  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/* -------------------------------------------------------------------------- */
/* COMPOSICIÓN CORPORAL Y SOMATOTIPO (Alineado)                              */
/* -------------------------------------------------------------------------- */

export interface ImcResultado {
  valor: number;
  diagnostico: string;
}

export interface ModeloDosComponentes {
  masaGrasa?: number;
  masaLibreDeGrasa?: number;
  porcentajeGrasa?: number;
}

export interface Somatotipo {
  endo: number; // Alineado a la función de cálculo
  meso: number; // Alineado a la función de cálculo
  ecto: number; // Alineado a la función de cálculo
}

export interface ResultadoGrasa {
  DC: number;
  gc: number;
  metodo: string;
}

export interface ResultadoFormula {
  metodo: string;
  resultado: {
    DC: number;
    gc: number;
  };
}

export interface ResultadosComposicion {
  densidadCorporal: number;
  porcentajeGrasa: number;
  masaGrasa: number; // 2C (Lipid Mass) or Adipose depending on context, usually 2C for dashboard
  masaAdiposa: number; // 5C (Adipose Tissue) - Kerr
  masaMuscular: number;
  masaOsea: number;
  masaResidual: number;
  masaPiel: number; // Nuevo campo
  somatotipo: Somatotipo;
}

export interface ComposicionCorporal {
  id: string;
  pacienteId: string;
  fecha: string | Date;
  imc?: ImcResultado;
  modelo2C?: ModeloDosComponentes;
  somatotipo?: Somatotipo;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/* -------------------------------------------------------------------------- */
/* ALIMENTOS Y DIETAS                                                        */
/* -------------------------------------------------------------------------- */

export interface Macronutrientes {
  calorias: number;
  proteina: number;
  carbohidratos: number;
  grasas: number;
  fibra?: number;
}

export interface Micronutrientes {
  calcio?: number;
  hierro?: number;
  sodio?: number;
  potasio?: number;
  vitaminaA?: number;
  vitaminaC?: number;
  [key: string]: number | undefined;
}

export interface Alimento {
  id: string;
  nombre: string;
  descripcion?: string;
  unidadBase: "gramos" | "mililitros" | "unidad";
  cantidadBase: number;
  macronutrientes: Macronutrientes;
  micronutrientes?: Micronutrientes;
  categoria?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type TiempoComidaTipo =
  | "desayuno"
  | "media_manana"
  | "almuerzo"
  | "media_tarde"
  | "cena"
  | "snack";

export interface DietaAlimento {
  id: string;
  alimentoId: string;
  cantidad: number;
  unidad?: string;
  notas?: string;
}

export interface TiempoComida {
  id: string;
  nombre: string;
  tipo: TiempoComidaTipo;
  hora?: string;
  alimentos: DietaAlimento[];
}

export interface TotalesMacros {
  calorias: number;
  proteina: number;
  carbohidratos: number;
  grasas: number;
  fibra?: number;
}

export interface Dieta {
  id: string;
  pacienteId: string;
  nombre: string;
  descripcion?: string;
  fechaInicio?: string | Date;
  fechaFin?: string | Date;
  tiemposComida: TiempoComida[];
  totales?: TotalesMacros;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/* -------------------------------------------------------------------------- */
/* CITAS                                                                     */
/* -------------------------------------------------------------------------- */

export interface Cita {
  id: string;
  pacienteId: string;
  fecha: string;
  hora: string;
  motivo: string;
  estado: "pendiente" | "confirmada" | "completada" | "cancelada";
  modalidad?: "presencial" | "virtual";
  enlaceReunion?: string;
  categoria?: "trabajo" | "personal" | "urgente";
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Util types for components
 */
export interface WithChildren {
  children: ReactNode;
}

/* -------------------------------------------------------------------------- */
/* POBLACIONES ESPECIALES - EVALUACIÓN CLÍNICA AVANZADA                      */
/* -------------------------------------------------------------------------- */

/** Clasificación Atalah para embarazadas */
export type AtalahClassification = 'Bajo Peso' | 'Normal' | 'Sobrepeso' | 'Obesidad';

/** Información de embarazo para curva de Atalah y metas IOM */
export interface PregnancyInfo {
  isPregnant: boolean;
  gestationalWeeks?: number;
  prePregnancyWeight?: number;
  isMultiplePregnancy?: boolean;
}

/** Niveles de GMFCS para Parálisis Cerebral */
export type GMFCSLevel = 'I' | 'II' | 'III' | 'IV' | 'V';

/** Información para pacientes con Parálisis Cerebral */
export interface CerebralPalsyInfo {
  gmfcsLevel?: GMFCSLevel;
  tibiaLength?: number;
  estimatedHeight?: number;
  isNutritionalRisk?: boolean;
}

/** Niveles de riesgo cardiometabólico */
export type CardiometabolicRiskLevel = 'minimo' | 'bajo' | 'moderado' | 'alto' | 'muy_alto';

/** Indicadores de riesgo cardiometabólico calculados */
export interface CardiometabolicRisk {
  waistToHeightRatio?: number;
  waistToHeightRisk?: CardiometabolicRiskLevel;
  hasAbdominalObesity?: boolean;
  waistHipRatio?: number;
  waistHipRisk?: CardiometabolicRiskLevel;
}

/* -------------------------------------------------------------------------- */
/* PACIENTE (ROOT AGGREGATE)                                                 */
/* -------------------------------------------------------------------------- */

export interface Paciente {
  id: string;
  usuarioId: string; // Nutritionist / Owner ID
  datosPersonales: DatosPersonales;
  historiaClinica?: HistoriaClinica;
  configuracionNutricional?: ConfiguracionNutricional;
  preferencias?: Preferencias;

  // Casos clínicos especiales (UDD)
  amputationInfo?: AmputationInfo;
  pediatricInfo?: PediatricInfo;
  geriatricAnthropometry?: GeriatricAnthropometry;

  // Poblaciones especiales - Evaluación clínica avanzada
  pregnancyInfo?: PregnancyInfo;
  cerebralPalsyInfo?: CerebralPalsyInfo;

  // Relations
  medidas?: MedidasAntropometricas[];
  dietas?: Dieta[];
  citas?: Cita[];
  mnaAssessments?: MNASFAssessment[];

  isActive?: boolean; // Virtual field
  lastVisit?: string | Date; // Virtual field

  createdAt?: string | Date;
  updatedAt?: string | Date;
}

