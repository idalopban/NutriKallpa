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
}

export interface HistoriaClinica {
  antecedentesPersonales?: string;
  antecedentesFamiliares?: string;
  alergias?: string;
  medicamentos?: string;
  diagnosticos?: string;
  objetivos?: string;
}

export type NivelActividad = 'sedentario' | 'ligera' | 'moderada' | 'intensa' | 'muy_intensa';
export type ObjetivoPeso = 'perder' | 'mantenimiento' | 'ganar';
export type FormulaGET = 'mifflin' | 'harris' | 'fao';

export interface ConfiguracionNutricional {
  nivelActividad?: NivelActividad;
  objetivoPeso?: ObjetivoPeso;
  formulaGET?: FormulaGET;
  proteinaRatio?: number;  // g/kg
  kcalAjuste?: number;     // +/- kcal
}

export interface Paciente {
  id: string;
  usuarioId: string;
  datosPersonales: DatosPersonales;
  historiaClinica?: HistoriaClinica;
  configuracionNutricional?: ConfiguracionNutricional;
  preferencias?: {
    likedFoods: string[];
    dislikedFoods: string[];
  };
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/* -------------------------------------------------------------------------- */
/* ANTROPOMETRÍA (Corregido y Alineado)                                      */
/* -------------------------------------------------------------------------- */

export interface PlieguesCutaneos {
  triceps?: number;
  subscapular?: number;
  biceps?: number;
  iliac_crest?: number; // ISAK: Cresta Ilíaca
  supraspinale?: number; // ISAK: Supraespinal
  abdominal?: number;
  thigh?: number; // ISAK: Muslo Frontal
  calf?: number; // ISAK: Pantorrilla Medial
}

export interface Perimetros {
  cintura?: number;
  cadera?: number;
  brazoRelax?: number;
  brazoFlex?: number;
  brazoRelajado?: number;
  musloMedio?: number;
  pantorrilla?: number;
  cuello?: number;
}

export interface Diametros {
  biestiloideo?: number;
  humero?: number; // CORREGIDO: 'humero'
  femur?: number; // CORREGIDO: 'femur'
  biacromial?: number;
  bitrocantéreo?: number;
  biiliocristal?: number; // Added for Kerr
}

export interface MedidasAntropometricas {
  id: string;
  pacienteId: string;
  fecha: string | Date;
  peso?: number;
  talla?: number;
  pliegues?: PlieguesCutaneos;
  perimetros?: Perimetros;
  diametros?: Diametros;
  imc?: number;

  // AÑADIDO: Propiedades necesarias para los cálculos
  edad: number;
  sexo: "masculino" | "femenino" | "otro";
  tipoPaciente?: "general" | "control" | "fitness" | "atleta" | "rapida"; // Nuevo campo para persistir el perfil

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
