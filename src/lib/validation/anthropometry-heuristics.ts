/**
 * Anthropometry Heuristics Validation
 * 
 * Provides biological range validation for anthropometric measurements.
 * Helps prevent "fat finger" errors that could break calculations.
 * 
 * Based on ISAK protocols and population reference data.
 */

// ============================================================================
// TYPES
// ============================================================================

export type ValidationLevel = 'ok' | 'warn' | 'error';

export interface ValidationResult {
    level: ValidationLevel;
    message?: string;
}

export interface BiologicalBounds {
    warn: [number, number];  // Values outside this range trigger warning
    error: [number, number]; // Values outside this range are likely errors
}

// ============================================================================
// BIOLOGICAL BOUNDS (based on ISAK reference data)
// ============================================================================

/**
 * Skinfold bounds in millimeters (mm)
 * - warn: unusual but possible values
 * - error: physiologically impossible or highly unlikely
 */
export const SKINFOLD_BOUNDS: Record<string, BiologicalBounds> = {
    triceps: { warn: [2, 45], error: [0.5, 70] },
    biceps: { warn: [1, 25], error: [0.5, 50] },
    subscapular: { warn: [4, 45], error: [1, 70] },
    iliac_crest: { warn: [3, 50], error: [1, 80] },
    supraspinale: { warn: [3, 40], error: [1, 70] },
    abdominal: { warn: [4, 55], error: [1, 90] },
    thigh: { warn: [4, 50], error: [1, 80] },
    calf: { warn: [2, 35], error: [0.5, 60] },
};

/**
 * Girth/Perimeter bounds in centimeters (cm)
 */
export const GIRTH_BOUNDS: Record<string, BiologicalBounds> = {
    brazoRelajado: { warn: [18, 50], error: [12, 65] },
    brazoFlexionado: { warn: [20, 55], error: [14, 70] },
    cintura: { warn: [55, 140], error: [45, 180] },
    cadera: { warn: [70, 150], error: [55, 180] },
    muslo: { warn: [35, 80], error: [25, 100] },
    pantorrilla: { warn: [25, 55], error: [18, 70] },
    cuello: { warn: [28, 55], error: [22, 65] },
    antebrazo: { warn: [20, 40], error: [15, 50] },
};

/**
 * Bone breadth/diameter bounds in centimeters (cm)
 */
export const BREADTH_BOUNDS: Record<string, BiologicalBounds> = {
    humero: { warn: [5, 9], error: [4, 11] },
    femur: { warn: [7, 12], error: [5.5, 14] },
    biestiloideo: { warn: [4, 7], error: [3.5, 8.5] },
    biacromial: { warn: [32, 48], error: [28, 55] },
    biiliocristal: { warn: [24, 38], error: [20, 45] },
};

/**
 * Basic measurements bounds
 */
export const BASIC_BOUNDS: Record<string, BiologicalBounds> = {
    peso: { warn: [30, 200], error: [15, 350] },   // kg
    talla: { warn: [100, 220], error: [50, 250] },  // cm (height)
    edad: { warn: [5, 100], error: [0, 130] },     // years
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate a single measurement value against biological bounds
 */
export function validateWithHeuristics(
    field: string,
    value: number,
    measurementType: 'skinfold' | 'girth' | 'breadth' | 'basic'
): ValidationResult {
    if (value === undefined || value === null || isNaN(value)) {
        return { level: 'ok' }; // Empty values are handled elsewhere
    }

    let bounds: BiologicalBounds | undefined;

    switch (measurementType) {
        case 'skinfold':
            bounds = SKINFOLD_BOUNDS[field];
            break;
        case 'girth':
            bounds = GIRTH_BOUNDS[field];
            break;
        case 'breadth':
            bounds = BREADTH_BOUNDS[field];
            break;
        case 'basic':
            bounds = BASIC_BOUNDS[field];
            break;
    }

    if (!bounds) {
        return { level: 'ok' }; // No validation defined for this field
    }

    // Check error bounds first (more strict)
    if (value < bounds.error[0]) {
        return {
            level: 'error',
            message: `Valor muy bajo: ${value}. Mínimo esperado: ${bounds.error[0]}`
        };
    }
    if (value > bounds.error[1]) {
        return {
            level: 'error',
            message: `Valor imposible: ${value}. Máximo posible: ${bounds.error[1]}`
        };
    }

    // Check warning bounds
    if (value < bounds.warn[0]) {
        return {
            level: 'warn',
            message: `Valor inusualmente bajo: ${value}. ¿Confirmar?`
        };
    }
    if (value > bounds.warn[1]) {
        return {
            level: 'warn',
            message: `Valor inusualmente alto: ${value}. ¿Confirmar?`
        };
    }

    return { level: 'ok' };
}

/**
 * Validate a skinfold measurement (mm)
 */
export function validateSkinfold(siteKey: string, value: number): ValidationResult {
    return validateWithHeuristics(siteKey, value, 'skinfold');
}

/**
 * Validate a girth/perimeter measurement (cm)
 */
export function validateGirth(field: string, value: number): ValidationResult {
    return validateWithHeuristics(field, value, 'girth');
}

/**
 * Validate a bone breadth measurement (cm)
 */
export function validateBreadth(field: string, value: number): ValidationResult {
    return validateWithHeuristics(field, value, 'breadth');
}

// ============================================================================
// CROSS-VALIDATION (IMC vs Skinfolds consistency)
// ============================================================================

export interface CrossValidationResult {
    isConsistent: boolean;
    warnings: string[];
}

/**
 * Cross-validate IMC against sum of skinfolds for consistency
 * Helps detect measurement errors by checking if data is physiologically coherent
 */
export function crossValidateIMCvsSkinfolds(
    imc: number | undefined,
    skinfolds: {
        triceps?: number;
        subscapular?: number;
        abdominal?: number;
        thigh?: number;
    }
): CrossValidationResult {
    const warnings: string[] = [];

    if (!imc) {
        return { isConsistent: true, warnings };
    }

    // Calculate sum of available skinfolds
    const sumPliegues = (skinfolds.triceps || 0) +
        (skinfolds.subscapular || 0) +
        (skinfolds.abdominal || 0) +
        (skinfolds.thigh || 0);

    // Only validate if we have at least 2 skinfolds
    const skinfoldsCount = [
        skinfolds.triceps,
        skinfolds.subscapular,
        skinfolds.abdominal,
        skinfolds.thigh
    ].filter(v => v && v > 0).length;

    if (skinfoldsCount < 2) {
        return { isConsistent: true, warnings };
    }

    // Heuristic 1: Obese patient (IMC > 30) with very low skinfolds
    if (imc > 30 && sumPliegues < 40) {
        warnings.push(
            `IMC alto (${imc.toFixed(1)}) pero suma de pliegues baja (${sumPliegues}mm). ` +
            'Verificar técnica de medición de pliegues.'
        );
    }

    // Heuristic 2: Thin patient (IMC < 18.5) with high skinfolds
    if (imc < 18.5 && sumPliegues > 80) {
        warnings.push(
            `IMC bajo (${imc.toFixed(1)}) pero suma de pliegues alta (${sumPliegues}mm). ` +
            'Verificar peso/talla o pliegues.'
        );
    }

    // Heuristic 3: Normal weight (IMC 18.5-25) with extreme skinfolds
    if (imc >= 18.5 && imc <= 25) {
        if (sumPliegues > 150) {
            warnings.push(
                `IMC normal (${imc.toFixed(1)}) pero pliegues muy altos (${sumPliegues}mm). ` +
                'Posible error de digitación.'
            );
        }
        if (sumPliegues < 15) {
            warnings.push(
                `IMC normal (${imc.toFixed(1)}) pero pliegues muy bajos (${sumPliegues}mm). ` +
                'Verificar valores ingresados.'
            );
        }
    }

    return {
        isConsistent: warnings.length === 0,
        warnings
    };
}

/**
 * Check for potential digit transposition errors
 * E.g., 75 instead of 7.5
 */
export function detectDigitTransposition(
    field: string,
    value: number,
    measurementType: 'skinfold' | 'girth' | 'breadth'
): ValidationResult {
    // If value seems 10x too high, might be a decimal error
    const potentialCorrectValue = value / 10;
    const correctedValidation = validateWithHeuristics(field, potentialCorrectValue, measurementType);
    const currentValidation = validateWithHeuristics(field, value, measurementType);

    if (currentValidation.level === 'error' && correctedValidation.level === 'ok') {
        return {
            level: 'warn',
            message: `¿Quiso decir ${potentialCorrectValue} en lugar de ${value}?`
        };
    }

    return currentValidation;
}
