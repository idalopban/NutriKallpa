/**
 * Body Composition Math Module
 * Implements body density and fat percentage calculations using established formulas
 * Reference: Wilmore & Behnke, Durnin & Womersley, Katch & McArdle, Withers, Sloan
 */

// ===========================================
// TIPOS
// ===========================================
import { ClinicalSafetyFlag } from "@/types";

export type FormulaType = 'general' | 'control' | 'fitness' | 'athlete' | 'rapid';
export type Gender = 'male' | 'female';

export interface SkinfoldData {
    triceps?: number;
    subscapular?: number;
    biceps?: number;
    iliac_crest?: number;       // Cresta Ilíaca
    supraspinale?: number;      // Supraespinal
    abdominal?: number;
    thigh?: number;             // Muslo Frontal
    calf?: number;              // Pantorrilla Medial
}

export interface FormulaInfo {
    id: FormulaType;
    name: string;
    author: string;
    year: string;
    requiredSkinfolds: {
        male: (keyof SkinfoldData)[];
        female: (keyof SkinfoldData)[];
    };
    description: string;
}

export interface BodyCompositionResult {
    bodyDensity: number;
    fatPercent: number;
    fatMassKg: number;
    leanMassKg: number;
    formula: FormulaType;
    isValid: boolean;
    missingSkinfolds: (keyof SkinfoldData)[];
    flags?: ClinicalSafetyFlag[];
}

// ===========================================
// FÓRMULAS INFO
// ===========================================

export const FORMULA_INFO: Record<FormulaType, FormulaInfo> = {
    general: {
        id: 'general',
        name: 'General',
        author: 'Wilmore & Behnke',
        year: '1969/1970',
        requiredSkinfolds: {
            male: ['abdominal', 'thigh'],
            female: ['subscapular', 'triceps', 'thigh']
        },
        description: 'Para adultos de población general'
    },
    control: {
        id: 'control',
        name: 'Control',
        author: 'Durnin & Womersley',
        year: '1974',
        requiredSkinfolds: {
            male: ['triceps', 'biceps', 'subscapular', 'iliac_crest'],
            female: ['triceps', 'biceps', 'subscapular', 'iliac_crest']
        },
        description: 'Usa suma de 4 pliegues con logaritmo'
    },
    fitness: {
        id: 'fitness',
        name: 'Fitness',
        author: 'Katch & McArdle',
        year: '1973',
        requiredSkinfolds: {
            male: ['triceps', 'subscapular', 'abdominal'],
            female: ['subscapular', 'iliac_crest']
        },
        description: 'Para personas activas físicamente'
    },
    athlete: {
        id: 'athlete',
        name: 'Atleta',
        author: 'Withers et al.',
        year: '1987',
        requiredSkinfolds: {
            male: ['triceps', 'biceps', 'subscapular', 'supraspinale', 'abdominal', 'thigh', 'calf'],
            female: ['triceps', 'subscapular', 'supraspinale', 'calf']
        },
        description: 'Para deportistas de alto rendimiento'
    },
    rapid: {
        id: 'rapid',
        name: 'Rápida',
        author: 'Sloan',
        year: '1962/1967',
        requiredSkinfolds: {
            male: ['thigh', 'subscapular'],
            female: ['iliac_crest', 'triceps']
        },
        description: 'Evaluación rápida con 2 pliegues'
    }
};

// ===========================================
// FUNCIONES DE CÁLCULO
// ===========================================

/**
 * Calcula el % de grasa corporal usando la ecuación de Siri
 * @param density Densidad corporal (g/cm³)
 * @returns Porcentaje de grasa corporal
 */
export function calculateBodyFatPercentage(density: number): number {
    if (!density || density <= 0 || !isFinite(density)) {
        return 0;
    }
    // Ecuación de Siri (1961): %GC = (495 / DC) - 450
    const fatPercent = (495 / density) - 450;
    return Math.max(0, Math.min(fatPercent, 60)); // Clamp entre 0-60%
}


/**
 * Valida si los pliegues requeridos están presentes
 */
export function validateSkinfolds(
    formula: FormulaType,
    gender: Gender,
    skinfolds: SkinfoldData
): { isValid: boolean; missing: (keyof SkinfoldData)[] } {
    const required = FORMULA_INFO[formula].requiredSkinfolds[gender];
    const missing: (keyof SkinfoldData)[] = [];

    for (const key of required) {
        const value = skinfolds[key];
        if (!value || value <= 0 || !isFinite(value)) {
            missing.push(key);
        }
    }

    return { isValid: missing.length === 0, missing };
}

/**
 * Calcula la Densidad Corporal (DC) según la fórmula seleccionada
 */
export function calculateBodyDensity(
    formula: FormulaType,
    gender: Gender,
    skinfolds: SkinfoldData
): number {
    // Extraer valores con default 0
    const triceps = skinfolds.triceps || 0;
    const biceps = skinfolds.biceps || 0;
    const subscapular = skinfolds.subscapular || 0;
    const iliac_crest = skinfolds.iliac_crest || 0;
    const supraspinale = skinfolds.supraspinale || 0;
    const abdominal = skinfolds.abdominal || 0;
    const thigh = skinfolds.thigh || 0;
    const calf = skinfolds.calf || 0;

    let density = 0;

    switch (formula) {
        // =============================================
        // 1. GENERAL - Wilmore & Behnke (1969/1970)
        // =============================================
        case 'general':
            if (gender === 'male') {
                // Hombres: DC = 1.08543 - 0.000886(Abdominal) - 0.00040(Muslo)
                density = 1.08543 - (0.000886 * abdominal) - (0.00040 * thigh);
            } else {
                // Mujeres: DC = 1.06234 - 0.00068(Subescapular) - 0.00039(Tríceps) - 0.00025(Muslo)
                density = 1.06234 - (0.00068 * subscapular) - (0.00039 * triceps) - (0.00025 * thigh);
            }
            break;

        // =============================================
        // 2. CONTROL - Durnin & Womersley (1974)
        // =============================================
        case 'control': {
            // ISAK AUDIT: Durnin & Womersley (1974) refers to "Suprailiac", which strictly maps to ISAK "Iliac Crest".
            // Do NOT use Supraspinale here.
            const sum4 = triceps + biceps + subscapular + iliac_crest;
            if (sum4 <= 0) return 0;
            const logSum = Math.log10(sum4);

            if (gender === 'male') {
                // Hombres: DC = 1.1765 - 0.0744(log10(Suma))
                density = 1.1765 - (0.0744 * logSum);
            } else {
                // Mujeres: DC = 1.1567 - 0.0717(log10(Suma))
                density = 1.1567 - (0.0717 * logSum);
            }
            break;
        }

        // =============================================
        // 3. FITNESS - Katch & McArdle (1973)
        // =============================================
        case 'fitness':
            if (gender === 'male') {
                // Hombres: DC = 1.09655 - 0.00103(Tríceps) - 0.00056(Subescapular) + 0.00054(Abdominal)
                density = 1.09655 - (0.00103 * triceps) - (0.00056 * subscapular) + (0.00054 * abdominal);
            } else {
                // Mujeres: DC = 1.09246 - 0.00049(Subescapular) - 0.00075(Cresta Iliaca)
                // ISAK AUDIT: "Suprailiac" maps to Iliac Crest.
                density = 1.09246 - (0.00049 * subscapular) - (0.00075 * iliac_crest);
            }
            break;

        // =============================================
        // 4. ATLETA - Withers et al. (1987)
        // =============================================
        case 'athlete': {
            if (gender === 'male') {
                // Hombres: DC = 1.0988 - 0.0004(Suma 7 Pliegues)
                const sum7 = triceps + biceps + subscapular + supraspinale + abdominal + thigh + calf;
                density = 1.0988 - (0.0004 * sum7);
            } else {
                // Mujeres: DC = 1.20953 - 0.08294(log10(Suma: Tríceps + Subescapular + CIliaca + Pantorrilla))
                const sum4Female = triceps + subscapular + supraspinale + calf;
                if (sum4Female <= 0) return 0;
                density = 1.20953 - (0.08294 * Math.log10(sum4Female));
            }
            break;
        }

        // =============================================
        // 5. RÁPIDA - Sloan (1962/1967)
        // =============================================
        case 'rapid':
            if (gender === 'male') {
                // Hombres: DC = 1.1043 - 0.001327(Muslo) - 0.001310(Subescapular)
                density = 1.1043 - (0.001327 * thigh) - (0.001310 * subscapular);
            } else {
                // Mujeres: DC = 1.0764 - 0.00081(Cresta Iliaca) - 0.00088(Tríceps)
                density = 1.0764 - (0.00081 * iliac_crest) - (0.00088 * triceps);
            }
            break;

        default:
            return 0;
    }

    // Validar que la densidad esté en un rango razonable (0.9 - 1.2 g/cm³)
    if (density < 0.9 || density > 1.2 || !isFinite(density)) {
        return 0;
    }

    return Math.round(density * 100000) / 100000; // 5 decimales
}

/**
 * Calcula la composición corporal completa
 */
export function calculateBodyComposition(
    formula: FormulaType,
    gender: Gender,
    skinfolds: SkinfoldData,
    weightKg: number,
    heightCm: number = 0,
    age: number = 0
): BodyCompositionResult {
    // Validar datos
    const validation = validateSkinfolds(formula, gender, skinfolds);

    if (!validation.isValid || weightKg <= 0) {
        return {
            bodyDensity: 0,
            fatPercent: 0,
            fatMassKg: 0,
            leanMassKg: 0,
            formula,
            isValid: false,
            missingSkinfolds: validation.missing
        };
    }

    // Calcular densidad corporal
    const bodyDensity = calculateBodyDensity(formula, gender, skinfolds);

    if (bodyDensity <= 0) {
        return {
            bodyDensity: 0,
            fatPercent: 0,
            fatMassKg: 0,
            leanMassKg: 0,
            formula,
            isValid: false,
            missingSkinfolds: []
        };
    }

    // Calcular % grasa (Siri)
    const fatPercent = calculateBodyFatPercentage(bodyDensity);

    // Calcular masas
    const fatMassKg = (fatPercent / 100) * weightKg;
    const leanMassKg = weightKg - fatMassKg; // Changed 'peso' to 'weightKg' to match parameter

    // ===========================================
    // 5. BIOLOGICAL SURVIVAL GUARDS (Audit Condition)
    // ===========================================
    const flags: ClinicalSafetyFlag[] = [];

    // Extreme Fat Percentage (Life Threatening)
    if (gender === 'male' && fatPercent < 3) {
        flags.push({
            level: 'critical',
            code: 'BIO_RISK_FAT_LOW',
            message: 'Riesgo Crítico: Grasa corporal incompatible con la vida (<3% en hombres).'
        });
    } else if (gender === 'female' && fatPercent < 8) {
        flags.push({
            level: 'critical',
            code: 'BIO_RISK_FAT_LOW',
            message: 'Riesgo Crítico: Grasa corporal incompatible con la vida (<8% en mujeres).'
        });
    }

    // High Fat Percentage (Severe Metabolic Risk)
    if (fatPercent > (gender === 'male' ? 45 : 55)) {
        flags.push({
            level: 'warning',
            code: 'METABOLIC_RISK',
            message: 'Alerta: Porcentaje de grasa con alto riesgo metabólico.'
        });
    }

    return {
        bodyDensity: Number(bodyDensity.toFixed(5)), // Changed 'density' to 'bodyDensity' to match variable
        fatPercent: Number(fatPercent.toFixed(2)),
        fatMassKg: Number(fatMassKg.toFixed(2)),
        leanMassKg: Number(leanMassKg.toFixed(2)),
        formula,
        isValid: true,
        missingSkinfolds: [],
        flags: flags.length > 0 ? flags : undefined
    };
}

// ===========================================
// HELPERS
// ===========================================

export const SKINFOLD_LABELS: Record<keyof SkinfoldData, string> = {
    triceps: 'Tríceps',
    biceps: 'Bíceps',
    subscapular: 'Subescapular',
    iliac_crest: 'Cresta Ilíaca',
    supraspinale: 'Supraespinal',
    abdominal: 'Abdominal',
    thigh: 'Muslo Frontal',
    calf: 'Pantorrilla Medial'
};

export function getRequiredSkinfoldsLabels(formula: FormulaType, gender: Gender): string[] {
    const keys = FORMULA_INFO[formula].requiredSkinfolds[gender];
    return keys.map(k => SKINFOLD_LABELS[k]);
}

export function getMissingSkinfoldLabels(missing: (keyof SkinfoldData)[]): string[] {
    return missing.map(k => SKINFOLD_LABELS[k]);
}
