/**
 * Sports Nutrition Periodization Module
 * 
 * Implements carbohydrate and macro periodization for athletes based on:
 * - Training intensity (rest, light, moderate, intense, match day)
 * - Competition schedule
 * - Sport-specific requirements
 * 
 * References:
 * - Burke et al. (2011) - Carbohydrates for training and competition
 * - Jeukendrup (2014) - Periodized nutrition for athletes
 * - Thomas et al. (2016) - Position of the Academy of Nutrition and Dietetics
 */

// ===========================================
// TYPES
// ===========================================

export type TrainingIntensity = 'rest' | 'light' | 'moderate' | 'intense' | 'match_day' | 'recovery';

export type PeriodizationType = 'normal' | 'carb_loading' | 'fat_adaptation' | 'competition' | 'off_season';

export type SportCategory = 'endurance' | 'strength' | 'team_sport' | 'combat' | 'aesthetic' | 'mixed';

export interface PeriodizedMacros {
    protein: number;        // g/kg body weight
    carbs: number;          // g/kg body weight
    fat: number;            // g/kg body weight
    calories: number;       // Total kcal (calculated)
}

export interface TrainingDay {
    intensity: TrainingIntensity;
    durationMinutes?: number;
    sessionType?: 'strength' | 'cardio' | 'technical' | 'mixed' | 'competition';
    notes?: string;
}

export interface PeriodizationResult {
    macros: PeriodizedMacros;
    recommendations: string[];
    mealTiming: MealTimingRecommendation[];
    hydration: HydrationRecommendation;
}

export interface MealTimingRecommendation {
    timing: string;
    description: string;
    macroFocus: 'carbs' | 'protein' | 'balanced' | 'light';
}

export interface HydrationRecommendation {
    baselineML: number;
    duringExerciseML: number;
    postExerciseML: number;
    electrolytes: boolean;
}

// ===========================================
// CONSTANTS
// ===========================================

/**
 * Carbohydrate recommendations by training intensity (g/kg/day)
 * Based on Burke et al. (2011) and ISSN position stands
 */
export const CARB_RECOMMENDATIONS: Record<TrainingIntensity, { min: number; max: number; description: string }> = {
    rest: {
        min: 3,
        max: 5,
        description: 'Día de descanso - Mantenimiento de glucógeno',
    },
    light: {
        min: 3,
        max: 5,
        description: 'Entrenamiento ligero (<1h baja intensidad)',
    },
    moderate: {
        min: 5,
        max: 7,
        description: 'Entrenamiento moderado (1h intensidad media)',
    },
    intense: {
        min: 6,
        max: 10,
        description: 'Entrenamiento intenso (1-3h alta intensidad)',
    },
    match_day: {
        min: 8,
        max: 12,
        description: 'Día de competencia - Carga máxima de glucógeno',
    },
    recovery: {
        min: 4,
        max: 6,
        description: 'Día de recuperación activa',
    },
};

/**
 * Protein recommendations by training goal (g/kg/day)
 */
export const PROTEIN_RECOMMENDATIONS = {
    maintenance: { min: 1.2, max: 1.6 },
    muscle_gain: { min: 1.6, max: 2.2 },
    fat_loss: { min: 1.8, max: 2.4 },
    endurance: { min: 1.2, max: 1.6 },
    strength: { min: 1.6, max: 2.0 },
    recovery: { min: 1.4, max: 1.8 },
} as const;

/**
 * Sport-specific macro adjustments
 */
export const SPORT_MACRO_PROFILES: Record<SportCategory, {
    carbMultiplier: number;
    proteinMultiplier: number;
    description: string;
}> = {
    endurance: {
        carbMultiplier: 1.2,
        proteinMultiplier: 0.9,
        description: 'Ciclismo, maratón, triatlón - Alto en carbohidratos',
    },
    strength: {
        carbMultiplier: 0.8,
        proteinMultiplier: 1.2,
        description: 'Powerlifting, halterofilia - Alto en proteína',
    },
    team_sport: {
        carbMultiplier: 1.0,
        proteinMultiplier: 1.0,
        description: 'Fútbol, vóley, básquet - Balanceado',
    },
    combat: {
        carbMultiplier: 0.9,
        proteinMultiplier: 1.1,
        description: 'Box, MMA, judo - Control de peso',
    },
    aesthetic: {
        carbMultiplier: 0.7,
        proteinMultiplier: 1.3,
        description: 'Fisicoculturismo, fitness - Definición',
    },
    mixed: {
        carbMultiplier: 1.0,
        proteinMultiplier: 1.0,
        description: 'CrossFit, funcional - Balanceado',
    },
};

/**
 * Pre-defined athlete templates by sport
 */
export const ATHLETE_TEMPLATES = {
    // Football/Soccer
    futbol_arquero: {
        sport: 'team_sport' as SportCategory,
        position: 'Arquero',
        targetSomatotype: [2.5, 4.5, 2.8],
        baseProtein: 1.6,
        matchDayCarbs: 7,
        restDayCarbs: 4,
        hydrationML: 3500,
    },
    futbol_defensa: {
        sport: 'team_sport' as SportCategory,
        position: 'Defensa Central',
        targetSomatotype: [2.2, 5.2, 2.2],
        baseProtein: 1.7,
        matchDayCarbs: 8,
        restDayCarbs: 4,
        hydrationML: 4000,
    },
    futbol_mediocampista: {
        sport: 'team_sport' as SportCategory,
        position: 'Mediocampista',
        targetSomatotype: [1.8, 5.0, 2.5],
        baseProtein: 1.6,
        matchDayCarbs: 9,
        restDayCarbs: 5,
        hydrationML: 4500,
    },
    futbol_delantero: {
        sport: 'team_sport' as SportCategory,
        position: 'Delantero',
        targetSomatotype: [2.0, 4.8, 2.8],
        baseProtein: 1.7,
        matchDayCarbs: 8,
        restDayCarbs: 4.5,
        hydrationML: 4000,
    },

    // Volleyball
    voley_central: {
        sport: 'team_sport' as SportCategory,
        position: 'Central',
        targetSomatotype: [1.8, 4.0, 4.0],
        baseProtein: 1.6,
        matchDayCarbs: 7,
        restDayCarbs: 4,
        hydrationML: 4000,
    },
    voley_armador: {
        sport: 'team_sport' as SportCategory,
        position: 'Armador',
        targetSomatotype: [2.0, 3.8, 3.5],
        baseProtein: 1.5,
        matchDayCarbs: 6,
        restDayCarbs: 4,
        hydrationML: 3500,
    },

    // Swimming
    natacion_velocidad: {
        sport: 'endurance' as SportCategory,
        position: 'Velocista',
        targetSomatotype: [2.0, 5.5, 2.8],
        baseProtein: 1.8,
        matchDayCarbs: 8,
        restDayCarbs: 5,
        hydrationML: 4000,
    },
    natacion_fondo: {
        sport: 'endurance' as SportCategory,
        position: 'Fondista',
        targetSomatotype: [1.5, 4.5, 3.2],
        baseProtein: 1.6,
        matchDayCarbs: 10,
        restDayCarbs: 6,
        hydrationML: 5000,
    },

    // Running
    maraton: {
        sport: 'endurance' as SportCategory,
        position: 'Maratonista',
        targetSomatotype: [1.4, 4.0, 4.0],
        baseProtein: 1.4,
        matchDayCarbs: 10,
        restDayCarbs: 5,
        hydrationML: 5000,
    },
    velocista_atletismo: {
        sport: 'strength' as SportCategory,
        position: 'Velocista 100-200m',
        targetSomatotype: [1.8, 5.5, 2.5],
        baseProtein: 1.8,
        matchDayCarbs: 7,
        restDayCarbs: 4,
        hydrationML: 3500,
    },

    // Combat Sports
    box_peso_ligero: {
        sport: 'combat' as SportCategory,
        position: 'Peso Ligero',
        targetSomatotype: [1.8, 5.2, 2.8],
        baseProtein: 2.0,
        matchDayCarbs: 6,
        restDayCarbs: 3,
        hydrationML: 3500,
    },
    judo: {
        sport: 'combat' as SportCategory,
        position: 'Judoka',
        targetSomatotype: [2.5, 5.5, 1.8],
        baseProtein: 1.8,
        matchDayCarbs: 7,
        restDayCarbs: 4,
        hydrationML: 4000,
    },

    // Bodybuilding
    fisicoculturismo_volumen: {
        sport: 'aesthetic' as SportCategory,
        position: 'Etapa Volumen',
        targetSomatotype: [2.5, 6.5, 1.5],
        baseProtein: 2.0,
        matchDayCarbs: 5,
        restDayCarbs: 4,
        hydrationML: 4000,
    },
    fisicoculturismo_definicion: {
        sport: 'aesthetic' as SportCategory,
        position: 'Etapa Definición',
        targetSomatotype: [1.5, 6.0, 2.0],
        baseProtein: 2.4,
        matchDayCarbs: 3,
        restDayCarbs: 2,
        hydrationML: 4500,
    },

    // CrossFit
    crossfit: {
        sport: 'mixed' as SportCategory,
        position: 'Atleta CrossFit',
        targetSomatotype: [2.0, 5.5, 2.2],
        baseProtein: 1.8,
        matchDayCarbs: 8,
        restDayCarbs: 5,
        hydrationML: 4500,
    },
};

export type AthleteTemplateKey = keyof typeof ATHLETE_TEMPLATES;

// ===========================================
// CALCULATION FUNCTIONS
// ===========================================

/**
 * Calculate periodized macros based on training intensity and athlete profile
 */
export function calculatePeriodizedMacros(
    bodyWeightKg: number,
    trainingDay: TrainingDay,
    sportCategory: SportCategory = 'team_sport',
    goal: keyof typeof PROTEIN_RECOMMENDATIONS = 'maintenance'
): PeriodizedMacros {
    const { intensity, durationMinutes = 60 } = trainingDay;
    const sportProfile = SPORT_MACRO_PROFILES[sportCategory];

    // Base carb recommendation
    const carbRange = CARB_RECOMMENDATIONS[intensity];
    let carbsPerKg = (carbRange.min + carbRange.max) / 2;

    // Adjust for duration
    if (durationMinutes > 90) {
        carbsPerKg += 1;
    } else if (durationMinutes < 30) {
        carbsPerKg -= 1;
    }

    // Apply sport multiplier
    carbsPerKg *= sportProfile.carbMultiplier;

    // Protein recommendation
    const proteinRange = PROTEIN_RECOMMENDATIONS[goal];
    let proteinPerKg = (proteinRange.min + proteinRange.max) / 2;
    proteinPerKg *= sportProfile.proteinMultiplier;

    // Fat fills in remaining calories (minimum 0.8 g/kg)
    const proteinCals = proteinPerKg * bodyWeightKg * 4;
    const carbCals = carbsPerKg * bodyWeightKg * 4;

    // Estimate total needs based on activity
    const activityMultiplier = getActivityMultiplier(intensity);
    const bmr = estimateBMR(bodyWeightKg); // Simplified
    const totalCals = bmr * activityMultiplier;

    const remainingCals = Math.max(0, totalCals - proteinCals - carbCals);
    const fatPerKg = Math.max(0.8, remainingCals / 9 / bodyWeightKg);

    return {
        protein: Math.round(proteinPerKg * 10) / 10,
        carbs: Math.round(carbsPerKg * 10) / 10,
        fat: Math.round(fatPerKg * 10) / 10,
        calories: Math.round(totalCals),
    };
}

/**
 * Get full periodization recommendations including meal timing
 */
export function getPeriodizationRecommendations(
    bodyWeightKg: number,
    trainingDay: TrainingDay,
    sportCategory: SportCategory = 'team_sport',
    goal: keyof typeof PROTEIN_RECOMMENDATIONS = 'maintenance'
): PeriodizationResult {
    const macros = calculatePeriodizedMacros(bodyWeightKg, trainingDay, sportCategory, goal);
    const { intensity } = trainingDay;

    const recommendations: string[] = [];
    const mealTiming: MealTimingRecommendation[] = [];

    // Generate recommendations based on intensity
    if (intensity === 'match_day') {
        recommendations.push('🏆 Día de competencia: Maximizar reservas de glucógeno');
        recommendations.push('Comer comida principal 3-4 horas antes del partido');
        recommendations.push('Snack de carbohidratos simples 1 hora antes');
        recommendations.push('Hidratación constante desde el día anterior');

        mealTiming.push(
            { timing: '3-4h antes', description: 'Comida principal rica en carbohidratos complejos', macroFocus: 'carbs' },
            { timing: '1h antes', description: 'Snack ligero: fruta o barra energética', macroFocus: 'carbs' },
            { timing: 'Durante', description: 'Bebida deportiva si >60min', macroFocus: 'carbs' },
            { timing: '0-30min después', description: 'Recuperación: carbohidrato + proteína', macroFocus: 'balanced' },
        );
    } else if (intensity === 'intense') {
        recommendations.push('💪 Día de entrenamiento intenso');
        recommendations.push('Priorizar carbohidratos complejos en desayuno y almuerzo');
        recommendations.push('Proteína post-entrenamiento dentro de 2 horas');

        mealTiming.push(
            { timing: '2-3h antes', description: 'Comida balanceada', macroFocus: 'balanced' },
            { timing: '30min antes', description: 'Snack ligero si es necesario', macroFocus: 'carbs' },
            { timing: '0-2h después', description: 'Proteína + carbohidratos para recuperación', macroFocus: 'protein' },
        );
    } else if (intensity === 'rest') {
        recommendations.push('😴 Día de descanso: Reducir carbohidratos');
        recommendations.push('Mantener proteína para recuperación muscular');
        recommendations.push('Aprovechar para consumir verduras y fibra');

        mealTiming.push(
            { timing: 'Desayuno', description: 'Proteína + grasas saludables', macroFocus: 'protein' },
            { timing: 'Almuerzo', description: 'Proteína + verduras', macroFocus: 'balanced' },
            { timing: 'Cena', description: 'Comida ligera, proteína magra', macroFocus: 'light' },
        );
    } else {
        recommendations.push('📊 Día de entrenamiento moderado');
        recommendations.push('Distribución balanceada de macronutrientes');

        mealTiming.push(
            { timing: 'Pre-entrenamiento', description: 'Carbohidrato moderado', macroFocus: 'carbs' },
            { timing: 'Post-entrenamiento', description: 'Proteína + carbohidrato', macroFocus: 'balanced' },
        );
    }

    // Hydration recommendations
    const baseHydration = bodyWeightKg * 35; // 35ml per kg base
    const hydration: HydrationRecommendation = {
        baselineML: Math.round(baseHydration),
        duringExerciseML: intensity === 'match_day' || intensity === 'intense' ? 600 : 400,
        postExerciseML: intensity === 'match_day' ? 1500 : 750,
        electrolytes: intensity === 'match_day' || intensity === 'intense',
    };

    return {
        macros,
        recommendations,
        mealTiming,
        hydration,
    };
}

/**
 * Get athlete template by key
 */
export function getAthleteTemplate(key: AthleteTemplateKey) {
    return ATHLETE_TEMPLATES[key];
}

/**
 * List all available athlete templates
 */
export function listAthleteTemplates(): { key: string; label: string; sport: SportCategory }[] {
    return Object.entries(ATHLETE_TEMPLATES).map(([key, template]) => ({
        key,
        label: template.position,
        sport: template.sport,
    }));
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

function getActivityMultiplier(intensity: TrainingIntensity): number {
    const multipliers: Record<TrainingIntensity, number> = {
        rest: 1.2,
        light: 1.4,
        moderate: 1.6,
        intense: 1.8,
        match_day: 2.0,
        recovery: 1.3,
    };
    return multipliers[intensity];
}

function estimateBMR(bodyWeightKg: number): number {
    // Simplified Mifflin-St Jeor estimate (assumes average height/age)
    // For real implementation, use actual height and age
    return 10 * bodyWeightKg + 6.25 * 170 - 5 * 25 + 5; // ~1650 for 70kg
}

// ===========================================
// UI UTILITIES
// ===========================================

export const INTENSITY_LABELS: Record<TrainingIntensity, { label: string; icon: string; color: string }> = {
    rest: { label: 'Descanso', icon: '😴', color: 'gray' },
    light: { label: 'Ligero', icon: '🚶', color: 'green' },
    moderate: { label: 'Moderado', icon: '🏃', color: 'yellow' },
    intense: { label: 'Intenso', icon: '💪', color: 'orange' },
    match_day: { label: 'Competencia', icon: '🏆', color: 'red' },
    recovery: { label: 'Recuperación', icon: '♻️', color: 'blue' },
};

export const SPORT_LABELS: Record<SportCategory, { label: string; icon: string }> = {
    endurance: { label: 'Resistencia', icon: '🚴' },
    strength: { label: 'Fuerza', icon: '🏋️' },
    team_sport: { label: 'Deporte de Equipo', icon: '⚽' },
    combat: { label: 'Combate', icon: '🥊' },
    aesthetic: { label: 'Estético', icon: '💪' },
    mixed: { label: 'Mixto', icon: '🔄' },
};
