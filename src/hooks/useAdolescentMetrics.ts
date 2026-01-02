/**
 * useAdolescentMetrics.ts
 * 
 * Hook for adolescent-specific anthropometric calculations:
 * - Tanner Stage (Sexual Maturation Rating)
 * - Body Fat % using Weststrate/Deurenberg equations
 * - Classification based on Latin American pediatric tables
 * 
 * Reference: Weststrate & Deurenberg (1989), Durnin & Womersley (1974)
 */

import { useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type Gender = 'masculino' | 'femenino';

export type TannerStage = 1 | 2 | 3 | 4 | 5;

export interface TannerRating {
    /** Genital (M) or Breast (F) development */
    primary: TannerStage;
    /** Pubic Hair development */
    pubicHair: TannerStage;
}

export interface SkinfoldMeasurements {
    biceps: number;      // mm
    triceps: number;     // mm
    subscapular: number; // mm
    suprailiac: number;  // mm
}

export type BodyFatClassification =
    | 'muy_bajo'
    | 'bajo'
    | 'normal'
    | 'moderadamente_elevado'
    | 'alto';

export interface BodyFatResult {
    density: number;
    bodyFatPercent: number;
    classification: BodyFatClassification;
    riskLevel: 'bajo' | 'normal' | 'elevado' | 'alto';
    label: string;
}

export interface AdolescentMetrics {
    isAdolescent: boolean;
    tanner: {
        biologicalAge: number | null;
        chronologicalAge: number;
        shouldUseBiologicalAge: boolean;
        ageDiscrepancy: number;
        alert: string | null;
    };
    bodyComposition: BodyFatResult | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Durnin & Womersley (1974) coefficients for density calculation
 * Based on log10(sum of 4 skinfolds)
 * D = c - (m × log10(sum))
 */
const DURNIN_WOMERSLEY_COEFFICIENTS: Record<Gender, Record<string, { c: number; m: number }>> = {
    masculino: {
        '10-12': { c: 1.1533, m: 0.0643 },
        '13-16': { c: 1.1369, m: 0.0594 },
        '17-19': { c: 1.1620, m: 0.0630 },
    },
    femenino: {
        '10-12': { c: 1.1369, m: 0.0598 },
        '13-16': { c: 1.1610, m: 0.0645 },
        '17-19': { c: 1.1549, m: 0.0678 },
    }
};

/**
 * Tanner stage to approximate biological age mapping
 * Reference: Marshall & Tanner (1969, 1970)
 */
const TANNER_BIOLOGICAL_AGE: Record<Gender, Record<TannerStage, number>> = {
    masculino: {
        1: 10.0,  // Pre-pubertal
        2: 11.5,  // Early puberty
        3: 13.0,  // Mid puberty
        4: 14.5,  // Late puberty
        5: 16.0,  // Adult
    },
    femenino: {
        1: 9.0,   // Pre-pubertal
        2: 10.5,  // Early puberty (thelarche)
        3: 12.0,  // Mid puberty
        4: 13.0,  // Late puberty (menarche typically)
        5: 14.5,  // Adult
    }
};

/**
 * Body Fat Classification Ranges (Table 25 - Latin American Reference)
 */
const BODY_FAT_RANGES: Record<Gender, Record<BodyFatClassification, { min: number; max: number; label: string }>> = {
    masculino: {
        muy_bajo: { min: 0, max: 7.9, label: 'Muy Bajo' },
        bajo: { min: 8, max: 9.9, label: 'Bajo' },
        normal: { min: 10, max: 20, label: 'Normal' },
        moderadamente_elevado: { min: 20.1, max: 24, label: 'Moderadamente Elevado (Sobrepeso)' },
        alto: { min: 25, max: 100, label: 'Alto (Obesidad)' },
    },
    femenino: {
        muy_bajo: { min: 0, max: 12.9, label: 'Muy Bajo' },
        bajo: { min: 13, max: 17.9, label: 'Bajo' },
        normal: { min: 18, max: 28, label: 'Normal' },
        moderadamente_elevado: { min: 28.1, max: 32, label: 'Moderadamente Elevado (Sobrepeso)' },
        alto: { min: 32.1, max: 100, label: 'Alto (Obesidad)' },
    }
};

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Get Durnin & Womersley coefficients based on age and gender
 */
function getCoefficients(age: number, gender: Gender): { c: number; m: number } {
    const coeffs = DURNIN_WOMERSLEY_COEFFICIENTS[gender];

    if (age >= 10 && age <= 12) return coeffs['10-12'];
    if (age >= 13 && age <= 16) return coeffs['13-16'];
    if (age >= 17 && age <= 19) return coeffs['17-19'];

    // Fallback to closest range
    if (age < 10) return coeffs['10-12'];
    return coeffs['17-19'];
}

/**
 * Calculate body density using Durnin & Womersley 4-skinfold equation
 * D = c - (m × log10(sum of 4 skinfolds))
 */
export function calculateDensity(
    skinfolds: SkinfoldMeasurements,
    age: number,
    gender: Gender
): number {
    const sum = skinfolds.biceps + skinfolds.triceps + skinfolds.subscapular + skinfolds.suprailiac;
    const { c, m } = getCoefficients(age, gender);

    const density = c - (m * Math.log10(sum));
    return Math.round(density * 10000) / 10000; // 4 decimal places
}

/**
 * Calculate Body Fat % using Weststrate & Deurenberg equations (Table 24)
 * 
 * Boys 2-18:    %GC = [562 - 4.2×(age-2)] / D - [525 - 4.7×(age-2)]
 * Girls 2-10:   %GC = [562 - 1.1×(age-2)] / D - [525 - 1.4×(age-2)]
 * Girls 10-18:  %GC = [533 - 7.3×(age-10)] / D - [514 - 8×(age-10)]
 */
export function calculateAdolescentBodyFat(
    age: number,
    gender: Gender,
    density: number
): number {
    let bodyFatPercent: number;

    if (gender === 'masculino') {
        // Boys 2-18 years
        bodyFatPercent = ((562 - 4.2 * (age - 2)) / density) - (525 - 4.7 * (age - 2));
    } else {
        // Girls
        if (age < 10) {
            // Girls 2-10 years
            bodyFatPercent = ((562 - 1.1 * (age - 2)) / density) - (525 - 1.4 * (age - 2));
        } else {
            // Girls 10-18 years
            bodyFatPercent = ((533 - 7.3 * (age - 10)) / density) - (514 - 8 * (age - 10));
        }
    }

    // Clamp to reasonable range
    bodyFatPercent = Math.max(3, Math.min(bodyFatPercent, 60));
    return Math.round(bodyFatPercent * 10) / 10; // 1 decimal place
}

/**
 * Classify body fat percentage based on Table 25 (Latin American Reference)
 */
export function classifyBodyFat(
    bodyFatPercent: number,
    gender: Gender
): { classification: BodyFatClassification; label: string; riskLevel: 'bajo' | 'normal' | 'elevado' | 'alto' } {
    const ranges = BODY_FAT_RANGES[gender];

    for (const [key, range] of Object.entries(ranges)) {
        if (bodyFatPercent >= range.min && bodyFatPercent <= range.max) {
            const classification = key as BodyFatClassification;

            // Map classification to risk level
            let riskLevel: 'bajo' | 'normal' | 'elevado' | 'alto';
            switch (classification) {
                case 'muy_bajo':
                    riskLevel = 'elevado';
                    break;
                case 'bajo':
                    riskLevel = 'bajo';
                    break;
                case 'normal':
                    riskLevel = 'normal';
                    break;
                case 'moderadamente_elevado':
                    riskLevel = 'elevado';
                    break;
                case 'alto':
                    riskLevel = 'alto';
                    break;
            }

            return { classification, label: range.label, riskLevel };
        }
    }

    // Default fallback
    return { classification: 'normal', label: 'Normal', riskLevel: 'normal' };
}

/**
 * Get approximate biological age based on Tanner stage
 */
export function getTannerBiologicalAge(
    tannerRating: TannerRating,
    gender: Gender
): number {
    const ageMap = TANNER_BIOLOGICAL_AGE[gender];

    // Use average of both ratings
    const avgStage = Math.round((tannerRating.primary + tannerRating.pubicHair) / 2) as TannerStage;
    return ageMap[avgStage];
}

/**
 * Determine if biological age should be used for evaluation
 * Rule: Use biological age when Tanner is evaluated (not at default 1,1)
 */
export function shouldUseBiologicalAge(
    chronologicalAge: number,
    biologicalAge: number,
    tannerRating?: TannerRating
): { shouldUse: boolean; discrepancy: number; alert: string | null } {
    const discrepancy = Math.abs(biologicalAge - chronologicalAge);

    // Use biological age if Tanner has been evaluated (not default 1,1)
    const tannerEvaluated = tannerRating && (tannerRating.primary > 1 || tannerRating.pubicHair > 1);
    const shouldUse = !!tannerEvaluated;

    let alert: string | null = null;
    if (shouldUse) {
        if (discrepancy > 1) {
            const direction = biologicalAge > chronologicalAge ? 'adelantada' : 'retrasada';
            alert = `⚠️ Maduración ${direction}: Usando Edad Biológica (${biologicalAge.toFixed(1)} años) para evaluación.`;
        } else {
            alert = `📊 Usando Edad Biológica (${biologicalAge.toFixed(1)} años) basada en Tanner.`;
        }
    }

    return { shouldUse, discrepancy, alert };
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export interface UseAdolescentMetricsInput {
    age: number;
    gender: Gender;
    tannerRating?: TannerRating;
    skinfolds?: SkinfoldMeasurements;
}

export function useAdolescentMetrics(input: UseAdolescentMetricsInput): AdolescentMetrics {
    const { age, gender, tannerRating, skinfolds } = input;

    return useMemo(() => {
        const isAdolescent = age >= 10 && age <= 19;

        // Tanner calculations
        let tannerResult = {
            biologicalAge: null as number | null,
            chronologicalAge: age,
            shouldUseBiologicalAge: false,
            ageDiscrepancy: 0,
            alert: null as string | null,
        };

        if (isAdolescent && tannerRating) {
            const biologicalAge = getTannerBiologicalAge(tannerRating, gender);
            const { shouldUse, discrepancy, alert } = shouldUseBiologicalAge(age, biologicalAge, tannerRating);

            tannerResult = {
                biologicalAge,
                chronologicalAge: age,
                shouldUseBiologicalAge: shouldUse,
                ageDiscrepancy: discrepancy,
                alert,
            };
        }

        // Body composition calculations
        let bodyComposition: BodyFatResult | null = null;

        if (isAdolescent && skinfolds) {
            const hasAllSkinfolds =
                skinfolds.biceps > 0 &&
                skinfolds.triceps > 0 &&
                skinfolds.subscapular > 0 &&
                skinfolds.suprailiac > 0;

            if (hasAllSkinfolds) {
                const density = calculateDensity(skinfolds, age, gender);
                const bodyFatPercent = calculateAdolescentBodyFat(age, gender, density);
                const { classification, label, riskLevel } = classifyBodyFat(bodyFatPercent, gender);

                bodyComposition = {
                    density,
                    bodyFatPercent,
                    classification,
                    label,
                    riskLevel,
                };
            }
        }

        return {
            isAdolescent,
            tanner: tannerResult,
            bodyComposition,
        };
    }, [age, gender, tannerRating, skinfolds]);
}

export default useAdolescentMetrics;
