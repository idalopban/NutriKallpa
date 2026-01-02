/**
 * Hydration Calculator Module
 * 
 * Clinical recommendations for daily water intake based on:
 * - Body weight (baseline)
 * - Activity level (exercise adjustment)
 * - Age (geriatric considerations)
 * - Pathologies (renal, cardiac adjustments)
 * - Climate (environmental factors)
 * 
 * References:
 * - EFSA (European Food Safety Authority) 2010
 * - IOM (Institute of Medicine) 2004
 * - ESPEN Guidelines for geriatric patients
 */

import type { NivelActividad, Pathologies } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

export interface HydrationRecommendation {
    baselineML: number;        // Base hydration (30-40 ml/kg)
    activityAdjustmentML: number; // Additional for physical activity
    clinicalAdjustmentML: number; // Adjustments for pathologies
    totalDailyML: number;      // Final recommendation
    glassesPerDay: number;     // Practical measure (250ml glasses)
    warnings: string[];        // Clinical warnings
    tips: string[];            // Practical tips
}

export interface HydrationParams {
    weightKg: number;
    activityLevel?: NivelActividad;
    age?: number;
    pathologies?: Pathologies[];
    isAthlete?: boolean;
    climate?: 'normal' | 'hot' | 'very_hot';
    sweatRateLPerHour?: number; // Optional: Override with calculated sweat rate
}

export interface SweatRateParams {
    weightPreKg: number;
    weightPostKg: number;
    intakeML: number;
    exerciseDurationMin: number;
    urineML?: number;
}

export interface SweatRateResult {
    rateLPerHour: number;
    totalLossL: number;
    fluidReplacementL: number; // usually 150% of loss
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Base hydration factor (ml per kg body weight) */
const BASE_HYDRATION_FACTOR = {
    adult: 35,           // 35 ml/kg for adults
    elderly: 30,         // 30 ml/kg for elderly (>65 years)
    athlete: 40,         // 40 ml/kg for athletes
    pediatric: 50,       // Higher for children
};

/** Activity level adjustments (additional ml) */
const ACTIVITY_ADJUSTMENTS: Record<string, number> = {
    sedentario: 0,
    sedentaria: 0,
    ligera: 300,         // +300ml
    moderada: 500,       // +500ml
    activa: 750,         // +750ml
    muy_activa: 1000,    // +1000ml
    intensa: 1000,
    muy_intensa: 1500,   // +1500ml
};

/** Climate adjustments (additional ml) */
const CLIMATE_ADJUSTMENTS: Record<'normal' | 'hot' | 'very_hot', number> = {
    normal: 0,
    hot: 500,           // +500ml in hot weather
    very_hot: 1000,     // +1000ml in very hot weather
};

/** Pathologies that affect hydration requirements */
const PATHOLOGY_ADJUSTMENTS: Record<string, { adjustment: number; warning: string }> = {
    'renal_cr': {
        adjustment: -500,
        warning: '⚠️ Enfermedad Renal Crónica: Consultar nefrólogo para límite de líquidos personalizado.'
    },
    'hipertension': {
        adjustment: 0,
        warning: '💧 Hipertensión: Evitar bebidas con sodio. Prefiera agua natural.'
    },
    'diabetes_t1': {
        adjustment: 300,
        warning: '🩺 Diabetes: Mantener hidratación constante ayuda a controlar glucemia.'
    },
    'diabetes_t2': {
        adjustment: 300,
        warning: '🩺 Diabetes: Mantener hidratación constante ayuda a controlar glucemia.'
    },
};

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Calculate daily hydration recommendation based on patient parameters
 */
export function calculateHydration(params: HydrationParams): HydrationRecommendation {
    const {
        weightKg,
        activityLevel = 'sedentario',
        age,
        pathologies = [],
        isAthlete = false,
        climate = 'normal'
    } = params;

    const warnings: string[] = [];
    const tips: string[] = [];

    // 1. Determine base factor and calculate baseline
    let baselineML = 0;

    if (age && age < 19) {
        // PEDIATRIC: Holiday-Segar Formula
        if (weightKg <= 10) baselineML = weightKg * 100;
        else if (weightKg <= 20) baselineML = 1000 + (weightKg - 10) * 50;
        else baselineML = 1500 + (weightKg - 20) * 20;

        tips.push('🧒 Pediátrico: Fórmula de Holiday-Segar aplicada para hidratación basal.');
    } else if (age && age >= 60) {
        // GERIATRIC: 30 ml/kg with 1500ml safety floor
        baselineML = Math.max(1500, weightKg * 30);
        tips.push('👴 Adulto mayor: Mínimo 1.5L de seguridad. Beber aunque no sienta sed.');
    } else {
        // ADULT: 35 ml/kg
        baselineML = weightKg * (isAthlete ? 40 : 35);
    }

    // 3. Activity adjustment
    const activityAdjustmentML = ACTIVITY_ADJUSTMENTS[activityLevel] || 0;

    // 4. Climate adjustment
    const climateAdjustment = CLIMATE_ADJUSTMENTS[climate];
    if (climate !== 'normal') {
        tips.push(climate === 'hot'
            ? '☀️ Clima cálido: Aumentar ingesta de líquidos.'
            : '🔥 Clima muy caluroso: Beber antes de sentir sed.');
    }

    // 5. Clinical adjustments (pathologies)
    let clinicalAdjustmentML = climateAdjustment;

    pathologies.forEach(pathology => {
        const pathologyKey = pathology.toLowerCase().replace(/\s+/g, '_');
        const adjustment = PATHOLOGY_ADJUSTMENTS[pathologyKey];

        if (adjustment) {
            clinicalAdjustmentML += adjustment.adjustment;
            warnings.push(adjustment.warning);
        }
    });

    // High protein diet tip
    tips.push('🥩 Dieta alta en proteína: Aumentar ingesta de agua para apoyar función renal.');

    // 6. Calculate total
    const totalDailyML = Math.round(baselineML + activityAdjustmentML + clinicalAdjustmentML);

    // Ensure minimum safe hydration (1500ml) and maximum for safety (4000ml unless athlete)
    const safeTotalML = Math.max(1500, Math.min(totalDailyML, isAthlete ? 6000 : 4000));

    if (totalDailyML > 4000 && !isAthlete) {
        warnings.push('⚠️ Límite de seguridad: Máximo 4L/día para adultos no atletas.');
    }

    // 7. Calculate glasses (250ml standard)
    const glassesPerDay = Math.ceil(safeTotalML / 250);

    return {
        baselineML,
        activityAdjustmentML,
        clinicalAdjustmentML,
        totalDailyML: safeTotalML,
        glassesPerDay,
        warnings,
        tips
    };
}

/**
 * Get a simple hydration recommendation based on weight and activity
 * (Quick version for display)
 */
export function getQuickHydration(weightKg: number, activityLevel: NivelActividad = 'moderada'): {
    litersPerDay: number;
    glassesPerDay: number;
} {
    const result = calculateHydration({ weightKg, activityLevel });
    return {
        litersPerDay: Math.round(result.totalDailyML / 100) / 10, // Round to 1 decimal
        glassesPerDay: result.glassesPerDay
    };
}

/**
 * Format hydration recommendation for display
 */
export function formatHydrationRecommendation(rec: HydrationRecommendation): string {
    const liters = (rec.totalDailyML / 1000).toFixed(1);
    return `${liters}L/día (${rec.glassesPerDay} vasos de 250ml)`;
}

/**
 * Calculate Sweat Rate (Tasa de Sudoración)
 * Formula: (WeightPre - WeightPost + Intake - Urine) / DurationHours
 */
export function calculateSweatRate(params: SweatRateParams): SweatRateResult {
    const { weightPreKg, weightPostKg, intakeML, exerciseDurationMin, urineML = 0 } = params;

    const intakeL = intakeML / 1000;
    const urineL = urineML / 1000;
    const weightLossKg = weightPreKg - weightPostKg;
    const durationHours = exerciseDurationMin / 60;

    const totalLossL = weightLossKg + intakeL - urineL;
    const rateLPerHour = durationHours > 0 ? totalLossL / durationHours : 0;

    return {
        rateLPerHour: Math.round(rateLPerHour * 100) / 100,
        totalLossL: Math.round(totalLossL * 100) / 100,
        fluidReplacementL: Math.round(totalLossL * 1.5 * 100) / 100 // 150% rule
    };
}
