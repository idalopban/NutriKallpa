/**
 * Sport Reference Database for Somatotype Comparison
 * 
 * Contains normative somatotype data for various sports and positions,
 * allowing athletes to compare their body composition against optimal ranges.
 * 
 * References:
 * - Carter & Heath (2005) - Somatotyping development and applications
 * - Malina et al. (2004) - Growth, maturation, and physical activity
 * - ISAK (2011) - International Standards for Anthropometric Assessment
 * - Various studies on South American athletes
 */

// ===========================================
// TYPES
// ===========================================

export interface SomatotypeReference {
    sport: string;
    position?: string;
    sex: 'male' | 'female' | 'both';
    level: 'recreational' | 'competitive' | 'elite' | 'olympic';

    // Optimal somatotype (endo-meso-ecto)
    endomorphy: { mean: number; sd: number; range: [number, number] };
    mesomorphy: { mean: number; sd: number; range: [number, number] };
    ectomorphy: { mean: number; sd: number; range: [number, number] };

    // Somatochart coordinates
    somatoX: { mean: number; range: [number, number] };
    somatoY: { mean: number; range: [number, number] };

    // Classification
    typicalClassification: string;
    source?: string;
}

export interface SomatotypeComparison {
    athleteEndo: number;
    athleteMeso: number;
    athleteEcto: number;

    reference: SomatotypeReference;

    deviation: {
        endo: number;      // Difference from reference mean
        meso: number;
        ecto: number;
        total: number;     // Overall deviation (SAD)
    };

    withinRange: {
        endo: boolean;
        meso: boolean;
        ecto: boolean;
        overall: boolean;
    };

    interpretation: string;
    recommendations: string[];
}

// ===========================================
// REFERENCE DATABASE
// ===========================================

export const SOMATOTYPE_REFERENCES: SomatotypeReference[] = [
    // ==================== FOOTBALL/SOCCER ====================
    {
        sport: 'Fútbol',
        position: 'Arquero',
        sex: 'male',
        level: 'elite',
        endomorphy: { mean: 2.8, sd: 0.6, range: [2.0, 3.5] },
        mesomorphy: { mean: 4.8, sd: 0.8, range: [4.0, 5.5] },
        ectomorphy: { mean: 2.4, sd: 0.7, range: [1.8, 3.2] },
        somatoX: { mean: -0.4, range: [-1.5, 0.8] },
        somatoY: { mean: 4.4, range: [3.5, 5.5] },
        typicalClassification: 'Meso-Endomorfo',
        source: 'Estudios Liga 1 Perú 2022-2024',
    },
    {
        sport: 'Fútbol',
        position: 'Defensa Central',
        sex: 'male',
        level: 'elite',
        endomorphy: { mean: 2.2, sd: 0.5, range: [1.5, 2.8] },
        mesomorphy: { mean: 5.2, sd: 0.7, range: [4.5, 6.0] },
        ectomorphy: { mean: 2.0, sd: 0.6, range: [1.5, 2.8] },
        somatoX: { mean: -0.2, range: [-1.0, 0.6] },
        somatoY: { mean: 6.2, range: [5.0, 7.5] },
        typicalClassification: 'Mesomorfo Balanceado',
        source: 'Estudios CONMEBOL 2020-2023',
    },
    {
        sport: 'Fútbol',
        position: 'Lateral',
        sex: 'male',
        level: 'elite',
        endomorphy: { mean: 2.0, sd: 0.5, range: [1.3, 2.6] },
        mesomorphy: { mean: 4.8, sd: 0.6, range: [4.0, 5.5] },
        ectomorphy: { mean: 2.8, sd: 0.7, range: [2.0, 3.5] },
        somatoX: { mean: 0.8, range: [0.0, 1.5] },
        somatoY: { mean: 4.8, range: [4.0, 6.0] },
        typicalClassification: 'Ecto-Mesomorfo',
        source: 'Estudios CONMEBOL 2020-2023',
    },
    {
        sport: 'Fútbol',
        position: 'Mediocampista',
        sex: 'male',
        level: 'elite',
        endomorphy: { mean: 1.8, sd: 0.5, range: [1.2, 2.5] },
        mesomorphy: { mean: 5.0, sd: 0.6, range: [4.2, 5.8] },
        ectomorphy: { mean: 2.5, sd: 0.6, range: [1.8, 3.2] },
        somatoX: { mean: 0.7, range: [-0.2, 1.5] },
        somatoY: { mean: 5.7, range: [4.5, 7.0] },
        typicalClassification: 'Mesomorfo Balanceado',
        source: 'Estudios Liga 1 Perú 2022-2024',
    },
    {
        sport: 'Fútbol',
        position: 'Delantero',
        sex: 'male',
        level: 'elite',
        endomorphy: { mean: 2.0, sd: 0.5, range: [1.3, 2.6] },
        mesomorphy: { mean: 4.8, sd: 0.7, range: [4.0, 5.5] },
        ectomorphy: { mean: 2.8, sd: 0.6, range: [2.0, 3.5] },
        somatoX: { mean: 0.8, range: [0.0, 1.5] },
        somatoY: { mean: 4.8, range: [4.0, 6.0] },
        typicalClassification: 'Ecto-Mesomorfo',
        source: 'Estudios CONMEBOL 2020-2023',
    },
    {
        sport: 'Fútbol',
        position: 'General',
        sex: 'female',
        level: 'elite',
        endomorphy: { mean: 3.0, sd: 0.7, range: [2.2, 4.0] },
        mesomorphy: { mean: 4.0, sd: 0.6, range: [3.2, 4.8] },
        ectomorphy: { mean: 2.2, sd: 0.6, range: [1.5, 3.0] },
        somatoX: { mean: -0.8, range: [-1.8, 0.3] },
        somatoY: { mean: 2.8, range: [1.5, 4.0] },
        typicalClassification: 'Meso-Endomorfo',
        source: 'Estudios FIFA WWC 2023',
    },

    // ==================== VOLLEYBALL ====================
    {
        sport: 'Voleibol',
        position: 'Central',
        sex: 'male',
        level: 'elite',
        endomorphy: { mean: 1.8, sd: 0.5, range: [1.2, 2.5] },
        mesomorphy: { mean: 4.0, sd: 0.6, range: [3.2, 4.8] },
        ectomorphy: { mean: 4.0, sd: 0.7, range: [3.2, 5.0] },
        somatoX: { mean: 2.2, range: [1.0, 3.5] },
        somatoY: { mean: 2.2, range: [1.0, 3.5] },
        typicalClassification: 'Ecto-Mesomorfo',
        source: 'FIVB 2022',
    },
    {
        sport: 'Voleibol',
        position: 'Armador',
        sex: 'male',
        level: 'elite',
        endomorphy: { mean: 2.0, sd: 0.5, range: [1.3, 2.6] },
        mesomorphy: { mean: 3.8, sd: 0.6, range: [3.0, 4.6] },
        ectomorphy: { mean: 3.5, sd: 0.6, range: [2.8, 4.2] },
        somatoX: { mean: 1.5, range: [0.5, 2.5] },
        somatoY: { mean: 3.1, range: [2.0, 4.2] },
        typicalClassification: 'Ecto-Mesomorfo',
        source: 'FIVB 2022',
    },
    {
        sport: 'Voleibol',
        position: 'General',
        sex: 'female',
        level: 'elite',
        endomorphy: { mean: 2.5, sd: 0.6, range: [1.8, 3.2] },
        mesomorphy: { mean: 3.5, sd: 0.5, range: [2.8, 4.2] },
        ectomorphy: { mean: 3.2, sd: 0.6, range: [2.5, 4.0] },
        somatoX: { mean: 0.7, range: [-0.5, 1.8] },
        somatoY: { mean: 2.3, range: [1.2, 3.4] },
        typicalClassification: 'Mesomorfo Balanceado',
        source: 'FIVB 2022',
    },

    // ==================== SWIMMING ====================
    {
        sport: 'Natación',
        position: 'Velocista (50-100m)',
        sex: 'male',
        level: 'elite',
        endomorphy: { mean: 2.0, sd: 0.5, range: [1.4, 2.8] },
        mesomorphy: { mean: 5.5, sd: 0.7, range: [4.8, 6.5] },
        ectomorphy: { mean: 2.8, sd: 0.6, range: [2.0, 3.5] },
        somatoX: { mean: 0.8, range: [-0.2, 1.8] },
        somatoY: { mean: 6.2, range: [5.0, 7.5] },
        typicalClassification: 'Mesomorfo Balanceado',
        source: 'FINA 2021',
    },
    {
        sport: 'Natación',
        position: 'Fondista (800-1500m)',
        sex: 'male',
        level: 'elite',
        endomorphy: { mean: 1.5, sd: 0.4, range: [1.0, 2.0] },
        mesomorphy: { mean: 4.5, sd: 0.6, range: [3.8, 5.2] },
        ectomorphy: { mean: 3.2, sd: 0.6, range: [2.5, 4.0] },
        somatoX: { mean: 1.7, range: [0.8, 2.8] },
        somatoY: { mean: 4.3, range: [3.2, 5.5] },
        typicalClassification: 'Ecto-Mesomorfo',
        source: 'FINA 2021',
    },
    {
        sport: 'Natación',
        position: 'General',
        sex: 'female',
        level: 'elite',
        endomorphy: { mean: 2.5, sd: 0.6, range: [1.8, 3.2] },
        mesomorphy: { mean: 4.0, sd: 0.6, range: [3.2, 4.8] },
        ectomorphy: { mean: 2.8, sd: 0.6, range: [2.0, 3.5] },
        somatoX: { mean: 0.3, range: [-0.8, 1.2] },
        somatoY: { mean: 3.3, range: [2.2, 4.5] },
        typicalClassification: 'Mesomorfo Balanceado',
        source: 'FINA 2021',
    },

    // ==================== ATHLETICS ====================
    {
        sport: 'Atletismo',
        position: 'Maratonista',
        sex: 'male',
        level: 'elite',
        endomorphy: { mean: 1.4, sd: 0.4, range: [0.8, 2.0] },
        mesomorphy: { mean: 4.0, sd: 0.5, range: [3.2, 4.8] },
        ectomorphy: { mean: 4.0, sd: 0.6, range: [3.2, 5.0] },
        somatoX: { mean: 2.6, range: [1.5, 4.0] },
        somatoY: { mean: 2.6, range: [1.5, 4.0] },
        typicalClassification: 'Ectomorfo Balanceado',
        source: 'IAAF 2022',
    },
    {
        sport: 'Atletismo',
        position: 'Velocista (100-200m)',
        sex: 'male',
        level: 'elite',
        endomorphy: { mean: 1.8, sd: 0.4, range: [1.2, 2.4] },
        mesomorphy: { mean: 5.5, sd: 0.6, range: [4.8, 6.2] },
        ectomorphy: { mean: 2.5, sd: 0.5, range: [1.8, 3.2] },
        somatoX: { mean: 0.7, range: [-0.2, 1.5] },
        somatoY: { mean: 6.7, range: [5.5, 8.0] },
        typicalClassification: 'Mesomorfo Balanceado',
        source: 'IAAF 2022',
    },
    {
        sport: 'Atletismo',
        position: 'Lanzamiento de Bala',
        sex: 'male',
        level: 'elite',
        endomorphy: { mean: 4.0, sd: 0.8, range: [3.0, 5.5] },
        mesomorphy: { mean: 7.0, sd: 0.7, range: [6.0, 8.0] },
        ectomorphy: { mean: 0.8, sd: 0.4, range: [0.5, 1.5] },
        somatoX: { mean: -3.2, range: [-4.5, -2.0] },
        somatoY: { mean: 6.2, range: [5.0, 7.5] },
        typicalClassification: 'Endo-Mesomorfo',
        source: 'IAAF 2022',
    },

    // ==================== COMBAT SPORTS ====================
    {
        sport: 'Boxeo',
        position: 'Peso Ligero',
        sex: 'male',
        level: 'elite',
        endomorphy: { mean: 1.8, sd: 0.5, range: [1.2, 2.5] },
        mesomorphy: { mean: 5.2, sd: 0.6, range: [4.5, 6.0] },
        ectomorphy: { mean: 2.8, sd: 0.6, range: [2.0, 3.5] },
        somatoX: { mean: 1.0, range: [0.0, 2.0] },
        somatoY: { mean: 5.8, range: [4.5, 7.0] },
        typicalClassification: 'Ecto-Mesomorfo',
        source: 'IBA 2023',
    },
    {
        sport: 'Boxeo',
        position: 'Peso Pesado',
        sex: 'male',
        level: 'elite',
        endomorphy: { mean: 3.5, sd: 0.7, range: [2.5, 4.5] },
        mesomorphy: { mean: 6.5, sd: 0.6, range: [5.8, 7.2] },
        ectomorphy: { mean: 1.2, sd: 0.5, range: [0.6, 2.0] },
        somatoX: { mean: -2.3, range: [-3.5, -1.0] },
        somatoY: { mean: 6.3, range: [5.0, 7.5] },
        typicalClassification: 'Endo-Mesomorfo',
        source: 'IBA 2023',
    },
    {
        sport: 'Judo',
        position: 'General',
        sex: 'male',
        level: 'elite',
        endomorphy: { mean: 2.5, sd: 0.6, range: [1.8, 3.2] },
        mesomorphy: { mean: 5.5, sd: 0.6, range: [4.8, 6.2] },
        ectomorphy: { mean: 1.8, sd: 0.5, range: [1.2, 2.5] },
        somatoX: { mean: -0.7, range: [-1.5, 0.2] },
        somatoY: { mean: 6.2, range: [5.0, 7.5] },
        typicalClassification: 'Mesomorfo Balanceado',
        source: 'IJF 2022',
    },

    // ==================== BODYBUILDING ====================
    {
        sport: 'Fisicoculturismo',
        position: 'Competencia',
        sex: 'male',
        level: 'elite',
        endomorphy: { mean: 1.5, sd: 0.4, range: [1.0, 2.2] },
        mesomorphy: { mean: 7.5, sd: 0.6, range: [6.8, 8.5] },
        ectomorphy: { mean: 1.0, sd: 0.4, range: [0.5, 1.8] },
        somatoX: { mean: -0.5, range: [-1.5, 0.5] },
        somatoY: { mean: 12.0, range: [10.0, 14.0] },
        typicalClassification: 'Mesomorfo Extremo',
        source: 'IFBB 2023',
    },
    {
        sport: 'Fisicoculturismo',
        position: 'Bikini Fitness',
        sex: 'female',
        level: 'elite',
        endomorphy: { mean: 2.0, sd: 0.5, range: [1.3, 2.8] },
        mesomorphy: { mean: 4.5, sd: 0.5, range: [3.8, 5.2] },
        ectomorphy: { mean: 2.5, sd: 0.5, range: [1.8, 3.2] },
        somatoX: { mean: 0.5, range: [-0.5, 1.5] },
        somatoY: { mean: 5.0, range: [4.0, 6.2] },
        typicalClassification: 'Mesomorfo Balanceado',
        source: 'IFBB 2023',
    },

    // ==================== CROSSFIT ====================
    {
        sport: 'CrossFit',
        position: 'General',
        sex: 'male',
        level: 'elite',
        endomorphy: { mean: 2.0, sd: 0.5, range: [1.3, 2.8] },
        mesomorphy: { mean: 5.5, sd: 0.6, range: [4.8, 6.2] },
        ectomorphy: { mean: 2.2, sd: 0.5, range: [1.5, 3.0] },
        somatoX: { mean: 0.2, range: [-0.8, 1.2] },
        somatoY: { mean: 6.8, range: [5.5, 8.0] },
        typicalClassification: 'Mesomorfo Balanceado',
        source: 'CrossFit Games 2023',
    },
    {
        sport: 'CrossFit',
        position: 'General',
        sex: 'female',
        level: 'elite',
        endomorphy: { mean: 2.5, sd: 0.5, range: [1.8, 3.2] },
        mesomorphy: { mean: 4.5, sd: 0.5, range: [3.8, 5.2] },
        ectomorphy: { mean: 2.0, sd: 0.5, range: [1.3, 2.8] },
        somatoX: { mean: -0.5, range: [-1.5, 0.5] },
        somatoY: { mean: 4.5, range: [3.5, 5.5] },
        typicalClassification: 'Mesomorfo Balanceado',
        source: 'CrossFit Games 2023',
    },
];

// ===========================================
// COMPARISON FUNCTIONS
// ===========================================

/**
 * Find the best matching reference for an athlete
 */
export function findBestReference(
    sport: string,
    position?: string,
    sex: 'male' | 'female' = 'male',
    level: SomatotypeReference['level'] = 'elite'
): SomatotypeReference | null {
    // Try exact match first
    let reference = SOMATOTYPE_REFERENCES.find(
        r => r.sport.toLowerCase() === sport.toLowerCase() &&
            (r.position?.toLowerCase() === position?.toLowerCase() || !position) &&
            (r.sex === sex || r.sex === 'both') &&
            r.level === level
    );

    // Fall back to any position match
    if (!reference) {
        reference = SOMATOTYPE_REFERENCES.find(
            r => r.sport.toLowerCase() === sport.toLowerCase() &&
                (r.sex === sex || r.sex === 'both')
        );
    }

    return reference || null;
}

/**
 * Calculate Somatotype Attitudinal Distance (SAD)
 * SAD = √[(E1-E2)² + (M1-M2)² + (Ec1-Ec2)²]
 */
export function calculateSAD(
    endo1: number, meso1: number, ecto1: number,
    endo2: number, meso2: number, ecto2: number
): number {
    return Math.sqrt(
        Math.pow(endo1 - endo2, 2) +
        Math.pow(meso1 - meso2, 2) +
        Math.pow(ecto1 - ecto2, 2)
    );
}

/**
 * Compare athlete somatotype against a sport reference
 */
export function compareSomatotype(
    athleteEndo: number,
    athleteMeso: number,
    athleteEcto: number,
    reference: SomatotypeReference
): SomatotypeComparison {
    // Calculate deviations
    const endoDev = athleteEndo - reference.endomorphy.mean;
    const mesoDev = athleteMeso - reference.mesomorphy.mean;
    const ectoDev = athleteEcto - reference.ectomorphy.mean;

    // Calculate SAD
    const sad = calculateSAD(
        athleteEndo, athleteMeso, athleteEcto,
        reference.endomorphy.mean, reference.mesomorphy.mean, reference.ectomorphy.mean
    );

    // Check if within ranges
    const endoInRange = athleteEndo >= reference.endomorphy.range[0] &&
        athleteEndo <= reference.endomorphy.range[1];
    const mesoInRange = athleteMeso >= reference.mesomorphy.range[0] &&
        athleteMeso <= reference.mesomorphy.range[1];
    const ectoInRange = athleteEcto >= reference.ectomorphy.range[0] &&
        athleteEcto <= reference.ectomorphy.range[1];
    const overallInRange = endoInRange && mesoInRange && ectoInRange;

    // Generate interpretation
    let interpretation: string;
    const recommendations: string[] = [];

    if (sad < 0.5) {
        interpretation = '✅ Excelente: Somatotipo óptimo para su deporte';
    } else if (sad < 1.0) {
        interpretation = '👍 Bueno: Somatotipo dentro del rango ideal';
    } else if (sad < 2.0) {
        interpretation = '⚠️ Aceptable: Algunas áreas de mejora posibles';
    } else {
        interpretation = '❌ Desviación significativa del perfil ideal';
    }

    // Generate specific recommendations
    if (endoDev > 0.5) {
        recommendations.push('📉 Reducir grasa corporal para optimizar rendimiento');
    } else if (endoDev < -0.5) {
        recommendations.push('ℹ️ Endomorfia baja - monitorear reservas energéticas');
    }

    if (mesoDev < -0.5) {
        recommendations.push('💪 Aumentar masa muscular con entrenamiento de fuerza');
    } else if (mesoDev > 1.0) {
        recommendations.push('⚖️ Alta mesomorfia - considerar peso competitivo');
    }

    if (ectoDev > 0.5 && reference.ectomorphy.mean < 3) {
        recommendations.push('🍽️ Considerar aumento de masa para su deporte');
    } else if (ectoDev < -0.5 && reference.ectomorphy.mean >= 3) {
        recommendations.push('📊 Ectomorfia baja para su posición - optimizar composición');
    }

    if (recommendations.length === 0) {
        recommendations.push('✅ Mantener plan actual de entrenamiento y nutrición');
    }

    return {
        athleteEndo,
        athleteMeso,
        athleteEcto,
        reference,
        deviation: {
            endo: Math.round(endoDev * 100) / 100,
            meso: Math.round(mesoDev * 100) / 100,
            ecto: Math.round(ectoDev * 100) / 100,
            total: Math.round(sad * 100) / 100,
        },
        withinRange: {
            endo: endoInRange,
            meso: mesoInRange,
            ecto: ectoInRange,
            overall: overallInRange,
        },
        interpretation,
        recommendations,
    };
}

/**
 * Get all available sports in the database
 */
export function getAvailableSports(): string[] {
    const sports = new Set<string>();
    SOMATOTYPE_REFERENCES.forEach(ref => sports.add(ref.sport));
    return Array.from(sports).sort();
}

/**
 * Get positions for a sport
 */
export function getPositionsForSport(sport: string): string[] {
    const positions = SOMATOTYPE_REFERENCES
        .filter(ref => ref.sport.toLowerCase() === sport.toLowerCase() && ref.position)
        .map(ref => ref.position as string);
    return [...new Set(positions)].sort();
}

// ===========================================
// UI UTILITIES
// ===========================================

export const DEVIATION_COLORS = {
    excellent: { bg: 'bg-green-500', light: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600' },
    good: { bg: 'bg-blue-500', light: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600' },
    acceptable: { bg: 'bg-yellow-500', light: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600' },
    poor: { bg: 'bg-red-500', light: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600' },
};

export function getSADColor(sad: number): keyof typeof DEVIATION_COLORS {
    if (sad < 0.5) return 'excellent';
    if (sad < 1.0) return 'good';
    if (sad < 2.0) return 'acceptable';
    return 'poor';
}
