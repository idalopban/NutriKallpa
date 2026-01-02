/**
 * patient-stage.ts
 *
 * Utilidad central para categorización de pacientes por edad.
 * Reglas de negocio:
 * - Pediátrico: edad < 18 años
 * - Adulto: 18 ≤ edad < 60 años
 * - Geriátrico: edad ≥ 60 años
 */

import { differenceInYears } from "date-fns";

// ============================================================================
// TYPES
// ============================================================================

export type PatientStage = "PEDIATRIC" | "ADULT" | "GERIATRIC";

export type CalculationMethod = {
    /** Si permite cálculo de Z-Scores OMS (solo pediátricos) */
    allowZScores: boolean;
    /** Si permite composición corporal con fórmulas de adultos */
    allowBodyComposition: boolean;
    /** Tipo de IMC a usar */
    bmiType: "percentile" | "standard" | "geriatric";
    /** Fórmula sugerida para % grasa */
    suggestedFormula: "slaughter" | "durnin" | "jackson" | "chumlea";
};

// ============================================================================
// CONSTANTS
// ============================================================================

/** Umbral de edad para paciente pediátrico (exclusivo) */
export const PEDIATRIC_AGE_THRESHOLD = 18;

/** Umbral de edad para paciente geriátrico (inclusivo) */
export const GERIATRIC_AGE_THRESHOLD = 60;

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Determina la etapa/categoría del paciente basado en su fecha de nacimiento.
 * Usa date-fns para cálculo preciso de años.
 *
 * @param birthDate - Fecha de nacimiento del paciente
 * @returns 'PEDIATRIC' | 'ADULT' | 'GERIATRIC'
 */
export function getPatientStage(birthDate: Date | string): PatientStage {
    const birth = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
    const age = differenceInYears(new Date(), birth);

    if (age < PEDIATRIC_AGE_THRESHOLD) return "PEDIATRIC";
    if (age >= GERIATRIC_AGE_THRESHOLD) return "GERIATRIC";
    return "ADULT";
}

/**
 * Calcula la edad en años a partir de la fecha de nacimiento.
 *
 * @param birthDate - Fecha de nacimiento
 * @returns Edad en años enteros
 */
export function getAgeFromBirthDate(birthDate: Date | string): number {
    const birth = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
    return differenceInYears(new Date(), birth);
}

/**
 * Verifica si la edad corresponde a un paciente pediátrico.
 * Pediátrico: edad < 18 años
 *
 * @param age - Edad en años
 * @returns true si es pediátrico
 */
export function isPediatric(age: number): boolean {
    return age < PEDIATRIC_AGE_THRESHOLD;
}

/**
 * Verifica si la edad corresponde a un paciente adulto.
 * Adulto: 18 ≤ edad < 60 años
 *
 * @param age - Edad en años
 * @returns true si es adulto
 */
export function isAdult(age: number): boolean {
    return age >= PEDIATRIC_AGE_THRESHOLD && age < GERIATRIC_AGE_THRESHOLD;
}

/**
 * Verifica si la edad corresponde a un paciente geriátrico.
 * Geriátrico: edad ≥ 60 años
 *
 * @param age - Edad en años
 * @returns true si es geriátrico
 */
export function isGeriatric(age: number): boolean {
    return age >= GERIATRIC_AGE_THRESHOLD;
}

// ============================================================================
// FORMULA SELECTION
// ============================================================================

/**
 * Selecciona el método de cálculo apropiado basado en la edad del paciente.
 *
 * - Pediátricos (<18): Z-Scores OMS, IMC percentil, fórmula Slaughter
 * - Adultos (18-59): Composición corporal, IMC estándar, Jackson/Pollock o Durnin
 * - Geriátricos (60+): Composición corporal, IMC geriátrico, Chumlea
 *
 * @param age - Edad en años
 * @param sex - Sexo del paciente
 * @returns Configuración del método de cálculo
 */
export function selectCalculationMethod(
    age: number,
    sex: "masculino" | "femenino"
): CalculationMethod {
    if (age < PEDIATRIC_AGE_THRESHOLD) {
        return {
            allowZScores: true,
            allowBodyComposition: false,
            bmiType: "percentile",
            suggestedFormula: "slaughter",
        };
    }

    if (age >= GERIATRIC_AGE_THRESHOLD) {
        return {
            allowZScores: false,
            allowBodyComposition: true,
            bmiType: "geriatric",
            suggestedFormula: "chumlea",
        };
    }

    // Adulto (18-59)
    return {
        allowZScores: false,
        allowBodyComposition: true,
        bmiType: "standard",
        suggestedFormula: sex === "masculino" ? "jackson" : "durnin",
    };
}

/**
 * Convierte PatientStage a tipoPaciente legacy.
 *
 * @param stage - Etapa del paciente
 * @returns Tipo de paciente compatible con el sistema existente
 */
export function stageToTipoPaciente(
    stage: PatientStage
): "pediatrico" | "adulto" | "adulto_mayor" {
    switch (stage) {
        case "PEDIATRIC":
            return "pediatrico";
        case "GERIATRIC":
            return "adulto_mayor";
        default:
            return "adulto";
    }
}

/**
 * Convierte tipoPaciente legacy a PatientStage.
 *
 * @param tipo - Tipo de paciente legacy
 * @returns Etapa del paciente
 */
export function tipoPacienteToStage(
    tipo: "pediatrico" | "adulto" | "adulto_mayor" | string
): PatientStage {
    switch (tipo) {
        case "pediatrico":
            return "PEDIATRIC";
        case "adulto_mayor":
            return "GERIATRIC";
        default:
            return "ADULT";
    }
}
