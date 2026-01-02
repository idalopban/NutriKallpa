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
  isActive?: boolean; // Account activation status (controlled by admin)
  // Nutritionist / profile preferences
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  // Subscription fields
  subscriptionExpiresAt?: string | Date;
  subscriptionStatus?: 'active' | 'expired' | 'trial' | 'unlimited';
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface InvitationCode {
  code: string;
  rol: UserRole;
  status: 'active' | 'used';
  subscriptionDays?: number; // Duration in days (7, 30, 90, 365)
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
    aguaDiaria?: number; // Litros de agua que consume actualmente el paciente
    deporte?: {
      pesoPreEntreno?: number;
      pesoPostEntreno?: number;
      liquidoIngerido?: number; // ml
      duracionEjercicio?: number; // minutos
      orina?: number; // ml (opcional)
      tasaSudoracion?: number; // L/h (calculado)
    };
  };
  // Legacy fields (kept for migration)
  antecedentesPersonales?: string;
  diagnosticos?: string;
  objetivos?: string;
  // Bioquímica is now a separate relation or array, but we keep a summary here if needed
  bioquimicaReciente?: Partial<BiochemistryRecord>;
  altitudResidencia?: number; // Metros sobre el nivel del mar (m.s.n.m.)

  // Pediatric Clinical Data
  antecedentes?: {
    nacimientoPrematuro?: boolean;
    pesoNacimiento?: number;
    semanasGestacion?: number;
    partoTipo?: 'natural' | 'cesarea';
    lactanciaMaterna?: boolean;
  };

  datosClinicos?: {
    hemoglobina?: number; // g/dL
    diagnosticoAnemia?: string;
    suplementoHierro?: boolean;
    suplementoVitaminaA?: boolean;
    suplementoZinc?: boolean;
  };
}

/* -------------------------------------------------------------------------- */
/* CONFIGURACIÓN NUTRICIONAL                                                 */
/* -------------------------------------------------------------------------- */

// Activity levels with as const for better autocomplete and type safety
export const ACTIVITY_LEVELS = {
  SEDENTARY: 'sedentary',
  LIGHT: 'light',
  MODERATE: 'moderate',
  ACTIVE: 'active',
  VERY_ACTIVE: 'very_active',
  INTENSE: 'intense',
  ELITE: 'elite',           // 2.2x - Atleta élite, doble sesión
  ULTRA: 'ultra',           // 2.5x - Ultra-resistencia, triatletas
} as const;
export type ActivityLevel = typeof ACTIVITY_LEVELS[keyof typeof ACTIVITY_LEVELS];

// Extended activity factor labels for UI
export const ACTIVITY_LABELS: Record<string, string> = {
  sedentaria: 'Sedentario (x1.2)',
  sedentario: 'Sedentario (x1.2)',
  ligera: 'Ligera (x1.375)',
  moderada: 'Moderada (x1.55)',
  activa: 'Activa (x1.725)',
  muy_activa: 'Muy Activa (x1.9)',
  intensa: 'Intensa (x1.9)',
  muy_intensa: 'Muy Intensa (x1.9)',
  elite: 'Élite (x2.2)',
  ultra: 'Ultra (x2.5)',
};

// Legacy type for backwards compatibility
export type NivelActividad = 'sedentaria' | 'sedentario' | 'ligera' | 'moderada' | 'activa' | 'muy_activa' | 'intensa' | 'muy_intensa' | 'elite' | 'ultra';

// Weight objectives with as const
export const WEIGHT_OBJECTIVES = {
  LOSE: 'lose',
  MAINTAIN: 'maintain',
  GAIN: 'gain',
} as const;
export type WeightObjective = typeof WEIGHT_OBJECTIVES[keyof typeof WEIGHT_OBJECTIVES];

// Legacy type for backwards compatibility
export type ObjetivoPeso = 'perdida' | 'perder' | 'mantenimiento' | 'ganar' | 'ganancia';

// GET formulas with as const
export const GET_FORMULAS = {
  HARRIS_BENEDICT: 'harris',
  MIFFLIN: 'mifflin',
  KATCH_MCARDLE: 'katch',
  FAO: 'fao',
  IOM: 'iom',
  HENRY: 'henry',
} as const;
export type GETFormula = typeof GET_FORMULAS[keyof typeof GET_FORMULAS];
export type FormulaGET = 'harris' | 'mifflin' | 'katch' | 'fao' | 'iom' | 'henry'; // Legacy

// ============================================================================
// PROTEIN CALCULATION BASIS (Clinical Audit Fix)
// ============================================================================

/**
 * Basis for protein calculation:
 * - total: Total body weight (default, but risky for obesity)
 * - ideal: Ideal body weight (Devine formula) - recommended for obesity
 * - adjusted: Adjusted body weight for obesity (IBW + 0.25 × excess)
 * - lean: Lean body mass (requires body composition data)
 */
export type ProteinBasis = 'total' | 'ideal' | 'adjusted' | 'lean';

export const PROTEIN_BASIS_LABELS: Record<ProteinBasis, string> = {
  total: 'Peso Total',
  ideal: 'Peso Ideal (Devine)',
  adjusted: 'Peso Ajustado (Obesidad)',
  lean: 'Masa Magra',
};

// ============================================================================
// CALORIE GOAL PRESETS (Clinical Audit Fix)
// ============================================================================

/**
 * Predefined calorie adjustment presets as percentage of TDEE
 */
export type CalorieGoalPreset =
  | 'aggressive_deficit'  // -25%
  | 'moderate_deficit'    // -20%
  | 'mild_deficit'        // -15%
  | 'maintenance'         // ±0%
  | 'mild_surplus'        // +10%
  | 'moderate_surplus';   // +15%

export const CALORIE_GOAL_PRESETS: Record<CalorieGoalPreset, {
  label: string;
  percentage: number;
  description: string;
  color: string;
}> = {
  aggressive_deficit: {
    label: 'Déficit Agresivo',
    percentage: -25,
    description: 'Pérdida rápida (máx. 1kg/sem)',
    color: 'red'
  },
  moderate_deficit: {
    label: 'Déficit Moderado',
    percentage: -20,
    description: 'Pérdida sostenible (0.5-0.75kg/sem)',
    color: 'orange'
  },
  mild_deficit: {
    label: 'Déficit Leve',
    percentage: -15,
    description: 'Pérdida gradual (0.25-0.5kg/sem)',
    color: 'yellow'
  },
  maintenance: {
    label: 'Mantenimiento',
    percentage: 0,
    description: 'Mantener peso actual',
    color: 'green'
  },
  mild_surplus: {
    label: 'Superávit Leve',
    percentage: 10,
    description: 'Ganancia muscular limpia',
    color: 'blue'
  },
  moderate_surplus: {
    label: 'Superávit Moderado',
    percentage: 15,
    description: 'Fase de volumen',
    color: 'purple'
  },
};

// ============================================================================
// MEAL MOMENT CONFIGURATION
// ============================================================================

export interface MealMomentConfig {
  id: string;
  name: string;
  type: 'desayuno' | 'almuerzo' | 'cena' | 'snack';
  ratio: number; // 0.0 to 1.0 (distribution percentage)
  enabled: boolean;
}

export interface ConfiguracionNutricional {
  nivelActividad?: NivelActividad;
  objetivoPeso?: ObjetivoPeso;
  formulaGET?: FormulaGET;
  proteinaRatio?: number;
  kcalAjuste?: number;
  macroProteina?: number;
  macroCarbohidratos?: number;
  macroGrasa?: number;
  // NEW: Clinical Audit additions
  proteinBasis?: ProteinBasis;         // Weight basis for protein calculation
  caloriePreset?: CalorieGoalPreset;   // Predefined caloric adjustment
  // NEW: Dynamic Meal Management
  mealMoments?: MealMomentConfig[];    // Custom moments distribution
}

/* -------------------------------------------------------------------------- */
/* ALERGIAS E INTOLERANCIAS (Medical Grade)                                   */
/* -------------------------------------------------------------------------- */

/**
 * Allergy Severity Levels:
 * - fatal: IgE-mediated allergy - can cause anaphylaxis. MUST exclude all traces and derivatives.
 * - intolerance: Causes discomfort (digestive, skin, etc.) but not life-threatening. Exclude direct sources.
 * - preference: Patient prefers to avoid but can tolerate. Use alternatives when available.
 */
export type AllergySeverity = 'fatal' | 'intolerance' | 'preference';

/**
 * Medical allergy entry with severity classification
 */
export interface AllergyEntry {
  allergen: string;          // Common name (e.g., "Lácteos", "Maní", "Gluten")
  severity: AllergySeverity;
  notes?: string;            // Additional clinical notes
  confirmedBy?: 'patient' | 'test' | 'doctor';  // Source of diagnosis
}

/**
 * Allergen derivatives map - for fatal allergies, these must also be excluded
 */
export const ALLERGEN_DERIVATIVES: Record<string, string[]> = {
  'Lácteos': ['leche', 'queso', 'yogur', 'mantequilla', 'crema', 'caseína', 'suero', 'whey', 'lactosa', 'nata', 'requesón'],
  'Huevo': ['huevo', 'clara', 'yema', 'mayonesa', 'albumina', 'ovoalbumina', 'lecitina'],
  'Maní': ['maní', 'cacahuete', 'crema de maní', 'mantequilla de maní'],
  'Frutos Secos': ['nuez', 'almendra', 'avellana', 'castaña', 'pistacho', 'pecana', 'marañón', 'anacardo'],
  'Trigo': ['trigo', 'harina', 'pan', 'fideo', 'galleta', 'sémola', 'cuscús', 'gluten'],
  'Gluten': ['trigo', 'avena', 'cebada', 'centeno', 'espelta', 'kamut', 'gluten'],
  'Mariscos': ['camarón', 'langostino', 'cangrejo', 'langosta', 'mejillón', 'almeja', 'ostra', 'calamar', 'pulpo'],
  'Pescado': ['pescado', 'atún', 'salmón', 'tilapia', 'bonito', 'jurel', 'caballa', 'anchoa'],
  'Soya': ['soya', 'soja', 'tofu', 'tempeh', 'edamame', 'miso', 'leche de soya'],
};

export interface Preferencias {
  restricciones?: string[];
  gustos?: string[];
  alergias?: string[];                    // Legacy: simple string array
  alergiasDetalladas?: AllergyEntry[];    // New: detailed allergy entries with severity
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
  isPremature?: boolean;
  pesoNacer?: number; // en gramos
  isLowBirthWeight?: boolean; // <2500g
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

/**
 * Pliegues Cutáneos (Skinfolds) - ISAK Protocol
 * 
 * NOTA IMPORTANTE sobre nomenclatura:
 * - supraspinale (Supraespinal): Línea axilar media-anterior, 5-7cm sobre cresta ilíaca
 *   → Usado para Somatotipo Heath-Carter
 * - iliac_crest (Cresta Ilíaca): Línea axilar anterior, justo sobre cresta
 *   → Usado para algunas fórmulas de %GC
 * 
 * Ambos sitios son diferentes y no deben confundirse.
 */
export interface PlieguesCutaneos {
  triceps?: AnthroValue;
  subscapular?: AnthroValue;
  biceps?: AnthroValue;
  /** Pliegue Cresta Ilíaca (Iliac Crest) - Línea axilar anterior */
  iliac_crest?: AnthroValue;
  /** Pliegue Supraespinal (Supraspinale) - Para somatotipo Heath-Carter */
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
  headCircumference?: AnthroValue;
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

  // Basic measurements
  peso: number;
  talla: number;
  /** Talla Sentado (Sitting Height) - Para Índice Córmico */
  tallaSentado?: number;
  /** Perímetro Cefálico (Head Circumference) - Para Masa Residual en Kerr 5C */
  headCircumference?: number;

  // Detailed measurements
  pliegues?: PlieguesCutaneos;
  perimetros?: Perimetros;
  diametros?: Diametros;

  // Calculated results
  imc?: number;
  /** Índice Córmico = (tallaSentado / talla) × 100 */
  cormicIndex?: number;
  /** Main body fat result (from selected formula) */
  porcentajeGrasa?: number;
  /** Muscle mass in kg (from Kerr 5C or other model) */
  masaMuscular?: number;
  /** Somatotype (Endo, Meso, Ecto) */
  somatotype?: {
    endo: number;
    meso: number;
    ecto: number;
  };

  // Measurement quality (TEM-based)
  measurementQuality?: {
    overallRating: 'excellent' | 'acceptable' | 'poor';
    temPercent: number; // Average TEM %
    meetsISAKStandard: boolean;
    sitesNeedingRemeasurement?: string[];
  };

  // Clinical notes
  observaciones?: string;  // Clinical observations about the evaluation

  // Metadata
  edad: number;
  sexo: "masculino" | "femenino" | "otro";
  protocolo?: "isak_l1" | "isak_l2" | "isak_l3" | "basic";
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

export interface ClinicalSafetyFlag {
  level: 'info' | 'warning' | 'critical';
  message: string;
  code: string;
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
  flags?: ClinicalSafetyFlag[];
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
  notas?: string;
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

