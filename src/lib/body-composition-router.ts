/**
 * Body Composition Router
 * 
 * Implements Graceful Degradation for body composition calculations.
 * When data is insufficient for high-precision methods (Kerr 5C),
 * the system automatically falls back to simpler formulas while
 * clearly communicating the precision level to the user.
 * 
 * Hierarchy:
 * 1. Kerr 5-Component (ISAK L3) - Highest precision
 * 2. Durnin-Womersley (4 skinfolds) - Good precision
 * 3. Sloan (2 skinfolds) - Rapid assessment
 * 4. BMI-based estimation (Deurenberg) - Last resort
 */

import {
    calculateFiveComponentFractionation,
    FiveComponentInput,
    FiveComponentResult
} from './fiveComponentMath';
import {
    calculateBodyComposition,
    FormulaType,
    BodyCompositionResult,
    SkinfoldData,
    Gender
} from './bodyCompositionMath';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Precision levels for body composition calculation
 */
export type CompositionLevel =
    | 'kerr_5c'       // Level 1: 5-Component Fractionation (ISAK L3)
    | 'durnin_4sf'    // Level 2: Durnin-Womersley 4 Skinfolds
    | 'sloan_2sf'     // Level 3: Sloan 2 Skinfolds (Rapid)
    | 'bmi_only'      // Level 4: BMI only (No skinfolds)
    | 'error';        // Could not calculate

export interface CompositionLevelInfo {
    id: CompositionLevel;
    name: string;
    description: string;
    requiredMeasurements: string[];
    confidenceRange: [number, number]; // min, max confidence
    color: string;
}

export const LEVEL_INFO: Record<CompositionLevel, CompositionLevelInfo> = {
    kerr_5c: {
        id: 'kerr_5c',
        name: 'Fraccionamiento 5 Componentes (Kerr)',
        description: 'Máxima precisión. Requiere medición ISAK L3 completa.',
        requiredMeasurements: [
            '6 pliegues cutáneos',
            '3+ perímetros corregidos',
            '2+ diámetros óseos'
        ],
        confidenceRange: [90, 100],
        color: 'green'
    },
    durnin_4sf: {
        id: 'durnin_4sf',
        name: 'Durnin-Womersley (4 Pliegues)',
        description: 'Buena precisión para población general.',
        requiredMeasurements: [
            'Pliegue tríceps',
            'Pliegue bíceps',
            'Pliegue subescapular',
            'Pliegue supraespinal'
        ],
        confidenceRange: [75, 89],
        color: 'blue'
    },
    sloan_2sf: {
        id: 'sloan_2sf',
        name: 'Sloan (2 Pliegues - Rápida)',
        description: 'Evaluación rápida con precisión limitada.',
        requiredMeasurements: [
            'Hombres: Muslo + Subescapular',
            'Mujeres: Cresta Ilíaca + Tríceps'
        ],
        confidenceRange: [55, 74],
        color: 'amber'
    },
    bmi_only: {
        id: 'bmi_only',
        name: 'Estimación por IMC (Deurenberg)',
        description: 'Último recurso. Baja precisión (~±8% vs DXA).',
        requiredMeasurements: ['Solo peso y talla'],
        confidenceRange: [25, 54],
        color: 'red'
    },
    error: {
        id: 'error',
        name: 'Error',
        description: 'No se pudo calcular.',
        requiredMeasurements: [],
        confidenceRange: [0, 0],
        color: 'gray'
    }
};

/**
 * Result of graceful degradation calculation
 */
export interface GracefulResult {
    // Level and metadata
    level: CompositionLevel;
    levelName: string;
    isDowngraded: boolean;
    downgradeReason?: string;

    // Results (depending on level)
    fiveComponent?: FiveComponentResult;
    twoComponent?: BodyCompositionResult;

    // Unified values for UI
    fatPercent: number;
    leanMassKg: number;
    fatMassKg: number;

    // For 5C model
    muscleMassKg?: number;
    boneMassKg?: number;
    residualMassKg?: number;
    skinMassKg?: number;

    // Quality metadata
    confidenceScore: number; // 0-100
    warnings: string[];
    recommendations: string[];

    // For UI rendering
    levelInfo: CompositionLevelInfo;
}

/**
 * Input for the router - partial 5C data
 */
export interface RouterInput {
    // Required
    weight: number;      // kg
    height: number;      // cm
    age: number;
    gender: 'male' | 'female';

    // Skinfolds (optional)
    triceps?: number;
    subscapular?: number;
    biceps?: number;
    suprailiac?: number;  // Supraespinal
    abdominal?: number;
    thigh?: number;
    calf?: number;

    // Girths (optional)
    armRelaxedGirth?: number;
    armFlexedGirth?: number;
    forearmGirth?: number;
    thighGirth?: number;
    calfGirth?: number;
    waistGirth?: number;

    // Breadths (optional)
    humerusBreadth?: number;
    femurBreadth?: number;
    wristBreadth?: number;
    ankleBreadth?: number;
    biacromialBreadth?: number;
    biiliocristalBreadth?: number;

    // Advanced (optional)
    sittingHeight?: number;
    headCircumference?: number;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

interface ValidationResult {
    canCalculate: boolean;
    reason: string;
    missingFields: string[];
}

/**
 * Check if we can calculate Kerr 5-Component
 */
function canCalculateKerr(data: RouterInput): ValidationResult {
    const requiredSkinfolds = ['triceps', 'subscapular', 'suprailiac', 'abdominal', 'thigh', 'calf'];
    const requiredGirths = ['armRelaxedGirth', 'thighGirth', 'calfGirth'];
    const requiredBreadths = ['humerusBreadth', 'femurBreadth'];

    const missingSkinfolds: string[] = [];
    const missingGirths: string[] = [];
    const missingBreadths: string[] = [];

    // Check skinfolds
    for (const sf of requiredSkinfolds) {
        const value = data[sf as keyof RouterInput] as number | undefined;
        if (!value || value <= 0) {
            missingSkinfolds.push(sf);
        }
    }

    // Check girths
    for (const g of requiredGirths) {
        const value = data[g as keyof RouterInput] as number | undefined;
        if (!value || value <= 0) {
            missingGirths.push(g);
        }
    }

    // Check breadths
    for (const b of requiredBreadths) {
        const value = data[b as keyof RouterInput] as number | undefined;
        if (!value || value <= 0) {
            missingBreadths.push(b);
        }
    }

    const allMissing = [...missingSkinfolds, ...missingGirths, ...missingBreadths];

    if (allMissing.length > 0) {
        return {
            canCalculate: false,
            reason: `Faltan datos para Kerr 5C: ${allMissing.slice(0, 3).join(', ')}${allMissing.length > 3 ? '...' : ''}`,
            missingFields: allMissing
        };
    }

    // Check for obesity limitation (skinfold sum > 200mm makes measurement unreliable)
    const sfSum = (data.triceps || 0) + (data.subscapular || 0) + (data.suprailiac || 0) +
        (data.abdominal || 0) + (data.thigh || 0) + (data.calf || 0);

    if (sfSum > 200) {
        return {
            canCalculate: false,
            reason: `Suma de pliegues muy alta (${sfSum}mm). Mediciones poco fiables por alta adiposidad.`,
            missingFields: []
        };
    }

    return { canCalculate: true, reason: '', missingFields: [] };
}

/**
 * Check if we can calculate Durnin-Womersley (4 skinfolds)
 */
function canCalculateDurnin(data: RouterInput): ValidationResult {
    const required = ['triceps', 'biceps', 'subscapular', 'suprailiac'];
    const missing: string[] = [];

    for (const sf of required) {
        const value = data[sf as keyof RouterInput] as number | undefined;
        if (!value || value <= 0) {
            missing.push(sf);
        }
    }

    if (missing.length > 0) {
        return {
            canCalculate: false,
            reason: `Faltan pliegues para Durnin-Womersley: ${missing.join(', ')}`,
            missingFields: missing
        };
    }

    return { canCalculate: true, reason: '', missingFields: [] };
}

/**
 * Check if we can calculate Sloan (2 skinfolds)
 */
function canCalculateSloan(data: RouterInput): ValidationResult {
    if (data.gender === 'male') {
        // Males: thigh + subscapular
        if ((data.thigh && data.thigh > 0) && (data.subscapular && data.subscapular > 0)) {
            return { canCalculate: true, reason: '', missingFields: [] };
        }
        return {
            canCalculate: false,
            reason: 'Faltan pliegues muslo y/o subescapular (requeridos para hombres)',
            missingFields: ['thigh', 'subscapular'].filter(f => !data[f as keyof RouterInput])
        };
    } else {
        // Females: iliac_crest (suprailiac) + triceps
        if ((data.suprailiac && data.suprailiac > 0) && (data.triceps && data.triceps > 0)) {
            return { canCalculate: true, reason: '', missingFields: [] };
        }
        return {
            canCalculate: false,
            reason: 'Faltan pliegues supraespinal y/o tríceps (requeridos para mujeres)',
            missingFields: ['suprailiac', 'triceps'].filter(f => !data[f as keyof RouterInput])
        };
    }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Calculate body composition with graceful degradation
 * 
 * Automatically selects the best available formula based on input data,
 * falling back to simpler methods when necessary.
 */
export function calculateWithGracefulDegradation(data: RouterInput): GracefulResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Ensure basic data is present
    if (!data.weight || data.weight <= 0 || !data.height || data.height <= 0 || !data.age) {
        return {
            level: 'error',
            levelName: LEVEL_INFO.error.name,
            isDowngraded: true,
            downgradeReason: 'Faltan datos básicos (peso, talla o edad)',
            fatPercent: 0,
            leanMassKg: 0,
            fatMassKg: 0,
            confidenceScore: 0,
            warnings: ['Faltan datos básicos para cualquier cálculo'],
            recommendations: ['Ingrese peso, talla y edad del paciente'],
            levelInfo: LEVEL_INFO.error
        };
    }

    // ====== LEVEL 1: Try Kerr 5-Component ======
    const kerrCheck = canCalculateKerr(data);

    if (kerrCheck.canCalculate) {
        const input: FiveComponentInput = {
            weight: data.weight,
            height: data.height,
            age: data.age,
            gender: data.gender,
            triceps: data.triceps!,
            subscapular: data.subscapular!,
            biceps: data.biceps || 0,
            suprailiac: data.suprailiac!,
            abdominal: data.abdominal!,
            thigh: data.thigh!,
            calf: data.calf!,
            armRelaxedGirth: data.armRelaxedGirth!,
            armFlexedGirth: data.armFlexedGirth,
            forearmGirth: data.forearmGirth,
            thighGirth: data.thighGirth!,
            calfGirth: data.calfGirth!,
            waistGirth: data.waistGirth,
            humerusBreadth: data.humerusBreadth!,
            femurBreadth: data.femurBreadth!,
            wristBreadth: data.wristBreadth,
            ankleBreadth: data.ankleBreadth,
            biacromialBreadth: data.biacromialBreadth,
            biiliocristalBreadth: data.biiliocristalBreadth,
            sittingHeight: data.sittingHeight,
            headCircumference: data.headCircumference,
        };

        const result = calculateFiveComponentFractionation(input);

        if (result.isValid) {
            // Check obesity warning
            if (result.obesityWarning) {
                warnings.push(result.obesityWarning.message);
                recommendations.push(...result.obesityWarning.alternativeFormulas);
            }

            // Add any validation warnings
            if (result.warnings) {
                warnings.push(...result.warnings.map(w => w.message));
            }

            return {
                level: 'kerr_5c',
                levelName: LEVEL_INFO.kerr_5c.name,
                isDowngraded: false,
                fiveComponent: result,
                fatPercent: result.lipidFatPercent,
                leanMassKg: data.weight - result.adipose.kg,
                fatMassKg: result.adipose.kg * 0.8, // Adipose → Lipid conversion
                muscleMassKg: result.muscle.kg,
                boneMassKg: result.bone.kg,
                residualMassKg: result.residual.kg,
                skinMassKg: result.skin.kg,
                confidenceScore: 95,
                warnings,
                recommendations,
                levelInfo: LEVEL_INFO.kerr_5c
            };
        }
    }

    // ====== LEVEL 2: Degrade to Durnin-Womersley (4 skinfolds) ======
    warnings.push(`⚠️ ${kerrCheck.reason}. Usando fórmula alternativa.`);

    const durninCheck = canCalculateDurnin(data);

    if (durninCheck.canCalculate) {
        const skinfolds: SkinfoldData = {
            triceps: data.triceps,
            subscapular: data.subscapular,
            biceps: data.biceps,
            supraspinale: data.suprailiac // Map suprailiac → supraspinale
        };

        const gender: Gender = data.gender === 'male' ? 'male' : 'female';
        const result = calculateBodyComposition('control', gender, skinfolds, data.weight, data.height, data.age);

        if (result.isValid) {
            return {
                level: 'durnin_4sf',
                levelName: LEVEL_INFO.durnin_4sf.name,
                isDowngraded: true,
                downgradeReason: kerrCheck.reason,
                twoComponent: result,
                fatPercent: result.fatPercent,
                leanMassKg: result.leanMassKg,
                fatMassKg: result.fatMassKg,
                confidenceScore: 80,
                warnings,
                recommendations: ['Considerar evaluación ISAK completa para mayor precisión.'],
                levelInfo: LEVEL_INFO.durnin_4sf
            };
        }
    }

    // ====== LEVEL 3: Degrade to Sloan (2 skinfolds) ======
    warnings.push(`⚠️ Datos insuficientes para Durnin-Womersley.`);

    const sloanCheck = canCalculateSloan(data);

    if (sloanCheck.canCalculate) {
        const skinfolds: SkinfoldData = {
            thigh: data.thigh,
            subscapular: data.subscapular,
            iliac_crest: data.suprailiac, // Sloan uses iliac crest
            triceps: data.triceps
        };

        const gender: Gender = data.gender === 'male' ? 'male' : 'female';
        const result = calculateBodyComposition('rapid', gender, skinfolds, data.weight, data.height, data.age);

        if (result.isValid) {
            return {
                level: 'sloan_2sf',
                levelName: LEVEL_INFO.sloan_2sf.name,
                isDowngraded: true,
                downgradeReason: 'Datos insuficientes para fórmulas de mayor precisión',
                twoComponent: result,
                fatPercent: result.fatPercent,
                leanMassKg: result.leanMassKg,
                fatMassKg: result.fatMassKg,
                confidenceScore: 60,
                warnings,
                recommendations: [
                    'Esta es una estimación rápida. Para mayor precisión, completar medición ISAK L2 mínimo.',
                    'Considerar bioimpedancia (BIA) como método complementario.'
                ],
                levelInfo: LEVEL_INFO.sloan_2sf
            };
        }
    }

    // ====== LEVEL 4: BMI only (Last resort) ======
    warnings.push(`⚠️ Sin datos de pliegues cutáneos disponibles. Usando solo IMC.`);

    const bmi = data.weight / Math.pow(data.height / 100, 2);

    // Estimate body fat % from BMI using Deurenberg et al. (1991)
    // %GC = (1.20 × BMI) + (0.23 × Age) - (10.8 × Sex) - 5.4
    // Sex: 1 = male, 0 = female
    const sexFactor = data.gender === 'male' ? 1 : 0;
    const estimatedFatPercent = Math.max(3, Math.min(60,
        (1.20 * bmi) + (0.23 * data.age) - (10.8 * sexFactor) - 5.4
    ));

    const fatMassKg = (estimatedFatPercent / 100) * data.weight;

    return {
        level: 'bmi_only',
        levelName: LEVEL_INFO.bmi_only.name,
        isDowngraded: true,
        downgradeReason: 'Sin datos de pliegues cutáneos disponibles',
        fatPercent: Math.round(estimatedFatPercent * 10) / 10,
        leanMassKg: Math.round((data.weight - fatMassKg) * 10) / 10,
        fatMassKg: Math.round(fatMassKg * 10) / 10,
        confidenceScore: 30,
        warnings: [
            '⚠️ ADVERTENCIA: Estimación basada únicamente en IMC.',
            'La precisión es limitada (~±8% respecto a DXA).',
            'No usar para prescripción atlética o clínica de precisión.'
        ],
        recommendations: [
            'Realizar evaluación antropométrica con plicómetro para mayor precisión.',
            'Considerar bioimpedancia (BIA) como alternativa.',
            'Para deportistas, programar evaluación ISAK completa.'
        ],
        levelInfo: LEVEL_INFO.bmi_only
    };
}

/**
 * Get the best available level for given input data
 * (Without actually calculating)
 */
export function getBestAvailableLevel(data: RouterInput): CompositionLevel {
    if (canCalculateKerr(data).canCalculate) return 'kerr_5c';
    if (canCalculateDurnin(data).canCalculate) return 'durnin_4sf';
    if (canCalculateSloan(data).canCalculate) return 'sloan_2sf';
    if (data.weight && data.height && data.age) return 'bmi_only';
    return 'error';
}

/**
 * Get what's missing to achieve a target level
 */
export function getMissingForLevel(data: RouterInput, targetLevel: CompositionLevel): string[] {
    switch (targetLevel) {
        case 'kerr_5c':
            return canCalculateKerr(data).missingFields;
        case 'durnin_4sf':
            return canCalculateDurnin(data).missingFields;
        case 'sloan_2sf':
            return canCalculateSloan(data).missingFields;
        default:
            return [];
    }
}
