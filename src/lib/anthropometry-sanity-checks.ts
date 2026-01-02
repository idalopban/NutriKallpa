/**
 * Anthropometry Sanity Checks
 * 
 * Validaciones de cordura biomédicas para detectar errores de medición
 * o cálculo antes de guardar resultados en la base de datos.
 * 
 * Basado en límites fisiológicos establecidos en literatura ISAK y ACSM.
 * 
 * @author NutriKallpa Biomedical Engineering Team
 */

import { FiveComponentResult } from './fiveComponentMath';
import { RouterInput } from './body-composition-router';

// ============================================================================
// TYPES
// ============================================================================

export interface SanityError {
    code: string;
    field: string;
    value: number;
    expectedRange: [number, number];
    message: string;
    severity: 'critical' | 'high';
}

export interface SanityWarning {
    code: string;
    message: string;
    recommendation: string;
}

export interface SanityCheckResult {
    isValid: boolean;
    errors: SanityError[];
    warnings: SanityWarning[];
    confidenceScore: number;
}

// ============================================================================
// PHYSIOLOGICAL LIMITS (Based on ISAK/ACSM literature)
// ============================================================================

/**
 * Límites fisiológicos para composición corporal.
 * 
 * Referencias:
 * - ACSM Guidelines for Exercise Testing and Prescription (11th ed.)
 * - ISAK International Standards for Anthropometric Assessment
 * - Lohman TG. Advances in Body Composition Assessment (1992)
 */
export const PHYSIOLOGICAL_LIMITS = {
    // Porcentaje de grasa corporal
    fatPercent: {
        male: {
            essential: 2,      // Grasa esencial mínima (atletas élite)
            athletic: 6,       // Atletas típicos
            fitness: 14,       // Fitness general
            acceptable: 24,    // Aceptable
            obese: 50,         // Límite superior obesidad extrema
        },
        female: {
            essential: 8,      // Grasa esencial mínima (atletas élite)
            athletic: 14,      // Atletas típicas
            fitness: 21,       // Fitness general
            acceptable: 31,    // Aceptable
            obese: 55,         // Límite superior obesidad extrema
        }
    },

    // Masa ósea como % del peso corporal
    boneMassPercent: {
        min: 5,   // ~3.5kg para persona de 70kg
        max: 20,  // Valor extremo alto
    },

    // Masa residual como % del peso corporal
    residualMassPercent: {
        min: 8,   // ~5.6kg para persona de 70kg
        max: 20,  // Valor típico alto
    },

    // Proporción músculo:hueso
    muscleToBoneRatio: {
        min: 3.0,  // Bajo (sedentario, sarcopenia)
        max: 8.0,  // Alto (culturista)
    },

    // Suma de pliegues cutáneos (mm)
    skinfoldSum: {
        warning: 200,    // Compresibilidad reducida
        critical: 300,   // Mediciones muy poco fiables
    },

    // Tolerancia para suma de 5 componentes (% del peso total)
    massBalanceTolerance: {
        min: 95,   // 5% de error permite datos de campo
        max: 105,
    },
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Ejecuta validaciones de cordura en resultados de composición corporal.
 * 
 * @param result - Resultado del cálculo de 5 componentes
 * @param input - Datos de entrada originales
 * @returns Resultado de la validación con errores y advertencias
 */
export function runSanityChecks(
    result: FiveComponentResult,
    input: RouterInput
): SanityCheckResult {
    const errors: SanityError[] = [];
    const warnings: SanityWarning[] = [];
    let confidenceScore = 100;

    const gender = input.gender;
    const limits = PHYSIOLOGICAL_LIMITS;

    // ========================================================================
    // CHECK 1: Mass Balance (Suma de 5 componentes ≈ peso total)
    // ========================================================================
    const totalCalculatedMass =
        result.adipose.kg +
        result.muscle.kg +
        result.bone.kg +
        result.residual.kg +
        result.skin.kg;

    const massBalancePercent = (totalCalculatedMass / input.weight) * 100;

    if (massBalancePercent < limits.massBalanceTolerance.min ||
        massBalancePercent > limits.massBalanceTolerance.max) {
        errors.push({
            code: 'MASS_SUM_OOB',
            field: 'totalMass',
            value: massBalancePercent,
            expectedRange: [limits.massBalanceTolerance.min, limits.massBalanceTolerance.max],
            message: `Suma de masas (${massBalancePercent.toFixed(1)}%) fuera de rango. Posible error de cálculo o medición.`,
            severity: 'critical'
        });
        confidenceScore -= 30;
    }

    // ========================================================================
    // CHECK 2: Fat Percentage Range
    // ========================================================================
    const fatPercent = result.lipidFatPercent;
    const fatLimits = limits.fatPercent[gender];

    // Advertencia para valores muy bajos (atletas élite)
    if (fatPercent < fatLimits.essential) {
        warnings.push({
            code: 'FAT_PERCENT_VERY_LOW',
            message: `% Grasa (${fatPercent.toFixed(1)}%) por debajo del mínimo esencial. Posible atleta de élite o error de medición.`,
            recommendation: 'Verificar mediciones de pliegues. En atletas de competición, valores <3% son posibles pero requieren confirmación.'
        });
        confidenceScore -= 10;
    }

    // Error para valores imposiblemente bajos
    if (fatPercent < 1) {
        errors.push({
            code: 'FAT_PERCENT_IMPOSSIBLE',
            field: 'fatPercent',
            value: fatPercent,
            expectedRange: [fatLimits.essential, fatLimits.obese],
            message: `% Grasa (${fatPercent.toFixed(1)}%) es fisiológicamente imposible.`,
            severity: 'critical'
        });
        confidenceScore -= 25;
    }

    // Advertencia para obesidad extrema
    if (fatPercent > fatLimits.obese) {
        warnings.push({
            code: 'FAT_PERCENT_VERY_HIGH',
            message: `% Grasa (${fatPercent.toFixed(1)}%) indica obesidad severa. Considerar métodos alternativos.`,
            recommendation: 'En casos de obesidad severa, considerar bioimpedancia segmentaria o DXA para mayor precisión.'
        });
        confidenceScore -= 5;
    }

    // ========================================================================
    // CHECK 3: Negative or Zero Masses
    // ========================================================================
    const masses = [
        { name: 'adipose', value: result.adipose.kg },
        { name: 'muscle', value: result.muscle.kg },
        { name: 'bone', value: result.bone.kg },
        { name: 'residual', value: result.residual.kg },
        { name: 'skin', value: result.skin.kg },
    ];

    for (const mass of masses) {
        if (mass.value <= 0) {
            errors.push({
                code: 'NEGATIVE_MASS',
                field: mass.name,
                value: mass.value,
                expectedRange: [0.1, Infinity],
                message: `Masa ${mass.name} (${mass.value.toFixed(2)} kg) es negativa o cero. Error de cálculo.`,
                severity: 'critical'
            });
            confidenceScore -= 15;
        }
    }

    // ========================================================================
    // CHECK 4: Bone Mass Percentage
    // ========================================================================
    const bonePercent = (result.bone.kg / input.weight) * 100;

    if (bonePercent < limits.boneMassPercent.min) {
        warnings.push({
            code: 'BONE_MASS_LOW',
            message: `Masa ósea (${bonePercent.toFixed(1)}% del peso) inusualmente baja. Posible osteopenia.`,
            recommendation: 'Verificar mediciones de diámetros óseos. Considerar densitometría si clínicamente indicado.'
        });
        confidenceScore -= 5;
    }

    if (bonePercent > limits.boneMassPercent.max) {
        errors.push({
            code: 'BONE_MASS_HIGH',
            field: 'boneMass',
            value: bonePercent,
            expectedRange: [limits.boneMassPercent.min, limits.boneMassPercent.max],
            message: `Masa ósea (${bonePercent.toFixed(1)}%) excesivamente alta. Verificar diámetros óseos.`,
            severity: 'high'
        });
        confidenceScore -= 15;
    }

    // ========================================================================
    // CHECK 5: Muscle to Bone Ratio
    // ========================================================================
    const muscleToBoneRatio = result.muscle.kg / result.bone.kg;

    if (muscleToBoneRatio < limits.muscleToBoneRatio.min) {
        warnings.push({
            code: 'MUSCLE_BONE_RATIO_LOW',
            message: `Proporción músculo/hueso (${muscleToBoneRatio.toFixed(1)}:1) baja. Posible sarcopenia o error en perímetros.`,
            recommendation: 'Revisar mediciones de perímetros corregidos. En adultos mayores, valores bajos pueden indicar sarcopenia.'
        });
        confidenceScore -= 5;
    }

    if (muscleToBoneRatio > limits.muscleToBoneRatio.max) {
        warnings.push({
            code: 'MUSCLE_BONE_RATIO_HIGH',
            message: `Proporción músculo/hueso (${muscleToBoneRatio.toFixed(1)}:1) muy alta. Típico de culturistas o posible error.`,
            recommendation: 'Si el paciente no es atleta de fuerza, revisar mediciones de perímetros y diámetros.'
        });
        confidenceScore -= 3;
    }

    // ========================================================================
    // CHECK 6: Skinfold Sum (if available)
    // ========================================================================
    const skinfoldSum = (input.triceps || 0) + (input.subscapular || 0) +
        (input.suprailiac || 0) + (input.abdominal || 0) +
        (input.thigh || 0) + (input.calf || 0);

    if (skinfoldSum > limits.skinfoldSum.critical) {
        errors.push({
            code: 'SKINFOLD_SUM_CRITICAL',
            field: 'skinfoldSum',
            value: skinfoldSum,
            expectedRange: [0, limits.skinfoldSum.warning],
            message: `Suma de pliegues (${skinfoldSum}mm) extremadamente alta. Antropometría poco fiable.`,
            severity: 'high'
        });
        confidenceScore -= 20;
    } else if (skinfoldSum > limits.skinfoldSum.warning) {
        warnings.push({
            code: 'SKINFOLD_SUM_HIGH',
            message: `Suma de pliegues (${skinfoldSum}mm) alta. Compresibilidad del tejido puede afectar precisión.`,
            recommendation: 'Considerar método de 2 componentes (BIA, DXA) para mayor precisión en pacientes con obesidad.'
        });
        confidenceScore -= 10;
    }

    // ========================================================================
    // FINAL RESULT
    // ========================================================================
    confidenceScore = Math.max(0, confidenceScore);

    return {
        isValid: errors.filter(e => e.severity === 'critical').length === 0,
        errors,
        warnings,
        confidenceScore
    };
}

// ============================================================================
// INDIVIDUAL CHECK FUNCTIONS (for granular testing)
// ============================================================================

/**
 * Verifica si el porcentaje de grasa está dentro de rangos fisiológicos
 */
export function checkFatPercentRange(
    fatPercent: number,
    gender: 'male' | 'female'
): { valid: boolean; level: 'ok' | 'warning' | 'error'; message?: string } {
    const limits = PHYSIOLOGICAL_LIMITS.fatPercent[gender];

    if (fatPercent < 1) {
        return { valid: false, level: 'error', message: 'Valor fisiológicamente imposible' };
    }
    if (fatPercent < limits.essential) {
        return { valid: true, level: 'warning', message: 'Por debajo de grasa esencial' };
    }
    if (fatPercent > limits.obese) {
        return { valid: true, level: 'warning', message: 'Indica obesidad severa' };
    }
    return { valid: true, level: 'ok' };
}

/**
 * Verifica el balance de masas (suma ≈ peso total)
 */
export function checkMassBalance(
    totalMassKg: number,
    weightKg: number,
    tolerancePercent: number = 5
): { valid: boolean; percentDiff: number } {
    const percentDiff = Math.abs((totalMassKg - weightKg) / weightKg * 100);
    return {
        valid: percentDiff <= tolerancePercent,
        percentDiff
    };
}
