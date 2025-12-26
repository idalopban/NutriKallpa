/**
 * Technical Error of Measurement (TEM) Calculations
 * ISAK Level 2-3 Methodology
 * 
 * The TEM quantifies measurement precision and is essential for:
 * - Intra-observer reliability (single measurer consistency)
 * - Inter-observer reliability (between measurers)
 * - Quality control in anthropometric assessments
 * 
 * References:
 * - Dahlberg (1940) - Original TEM formula
 * - ISAK (2011) - International Standards for Anthropometric Assessment
 */

// ===========================================
// TYPES
// ===========================================

export interface MeasurementReplication {
    values: number[];       // Multiple measurements (typically 2-3)
    site: string;          // Measurement site name
    unit: 'mm' | 'cm' | 'kg'; // Measurement unit
}

export interface TEMResult {
    tem: number;           // Absolute TEM in measurement units
    temPercent: number;    // Relative TEM as percentage
    mean: number;          // Mean of measurements
    isReliable: boolean;   // Meets ISAK threshold
    reliability: 'excellent' | 'acceptable' | 'poor';
    message: string;       // Human-readable assessment
}

export interface MeasurementQuality {
    site: string;
    tem: number;
    temPercent: number;
    reliability: 'excellent' | 'acceptable' | 'poor';
    needsRemeasurement: boolean;
}

export interface OverallReliability {
    intraObserverTEM: number;
    intraObserverPercent: number;
    meetsISAKStandard: boolean;
    qualityByMeasurement: MeasurementQuality[];
    overallRating: 'excellent' | 'acceptable' | 'poor';
}

// ===========================================
// CONSTANTS
// ===========================================

/**
 * ISAK TEM Thresholds
 * - Intra-observer: <5% for skinfolds, <1% for girths/lengths
 * - Inter-observer: <7.5% for skinfolds, <1.5% for girths/lengths
 */
export const ISAK_TEM_THRESHOLDS = {
    skinfolds: {
        intraExcellent: 2.5,   // <2.5% = excellent
        intraAcceptable: 5.0,  // 2.5-5% = acceptable
        interExcellent: 5.0,   // <5% = excellent
        interAcceptable: 7.5,  // 5-7.5% = acceptable
    },
    girths: {
        intraExcellent: 0.5,
        intraAcceptable: 1.0,
        interExcellent: 1.0,
        interAcceptable: 1.5,
    },
    breadths: {
        intraExcellent: 0.5,
        intraAcceptable: 1.0,
        interExcellent: 1.0,
        interAcceptable: 1.5,
    },
    basic: {
        intraExcellent: 0.2,
        intraAcceptable: 0.5,
        interExcellent: 0.5,
        interAcceptable: 1.0,
    },
} as const;

/**
 * Measurement site classification for threshold lookup
 */
export const MEASUREMENT_CATEGORIES: Record<string, keyof typeof ISAK_TEM_THRESHOLDS> = {
    // Skinfolds
    triceps: 'skinfolds',
    subscapular: 'skinfolds',
    biceps: 'skinfolds',
    supraspinale: 'skinfolds',
    iliac_crest: 'skinfolds',
    supraespinal: 'skinfolds',
    abdominal: 'skinfolds',
    thigh: 'skinfolds',
    calf: 'skinfolds',

    // Girths
    armRelaxed: 'girths',
    armFlexed: 'girths',
    forearm: 'girths',
    chest: 'girths',
    waist: 'girths',
    hip: 'girths',
    thighGirth: 'girths',
    calfGirth: 'girths',

    // Breadths
    humerus: 'breadths',
    femur: 'breadths',
    wrist: 'breadths',
    ankle: 'breadths',
    biacromial: 'breadths',
    biiliocristal: 'breadths',

    // Basic
    weight: 'basic',
    height: 'basic',
    sittingHeight: 'basic',
};

// ===========================================
// CORE TEM CALCULATIONS
// ===========================================

/**
 * Calculate Technical Error of Measurement using Dahlberg formula
 * TEM = √(Σd²/2n)
 * 
 * For duplicate measurements: TEM = √(Σ(m1-m2)²/2n)
 * Where n = number of subjects (or measurement pairs)
 * 
 * @param measurements - Array of measurement pairs or triplicates
 * @returns Absolute TEM value
 */
export function calculateTEM(measurements: number[][]): number {
    if (measurements.length === 0) return 0;

    let sumSquaredDiff = 0;
    let validPairs = 0;

    for (const pair of measurements) {
        if (pair.length < 2) continue;

        // For duplicate measurements
        const diff = pair[0] - pair[1];
        sumSquaredDiff += diff * diff;
        validPairs++;

        // If there's a third measurement, also compare 1-3 and 2-3
        if (pair.length >= 3) {
            const diff13 = pair[0] - pair[2];
            const diff23 = pair[1] - pair[2];
            sumSquaredDiff += diff13 * diff13 + diff23 * diff23;
            validPairs += 2;
        }
    }

    if (validPairs === 0) return 0;

    return Math.sqrt(sumSquaredDiff / (2 * validPairs));
}

/**
 * Calculate TEM for a single measurement site with replications
 * 
 * @param replication - Measurement values at a single site
 * @returns TEM result with reliability assessment
 */
export function calculateSiteTEM(replication: MeasurementReplication): TEMResult {
    const { values, site, unit } = replication;

    if (values.length < 2) {
        return {
            tem: 0,
            temPercent: 0,
            mean: values[0] || 0,
            isReliable: false,
            reliability: 'poor',
            message: 'Se requieren al menos 2 mediciones para calcular TEM',
        };
    }

    // Calculate mean
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

    // Calculate sum of squared deviations from mean
    let sumSquaredDiff = 0;
    for (let i = 0; i < values.length - 1; i++) {
        for (let j = i + 1; j < values.length; j++) {
            const diff = values[i] - values[j];
            sumSquaredDiff += diff * diff;
        }
    }

    // Number of comparisons
    const numComparisons = (values.length * (values.length - 1)) / 2;
    const tem = Math.sqrt(sumSquaredDiff / (2 * numComparisons));

    // Calculate percentage TEM
    const temPercent = mean > 0 ? (tem / mean) * 100 : 0;

    // Determine threshold category
    const category = MEASUREMENT_CATEGORIES[site] || 'skinfolds';
    const thresholds = ISAK_TEM_THRESHOLDS[category];

    // Assess reliability
    let reliability: 'excellent' | 'acceptable' | 'poor';
    let isReliable: boolean;
    let message: string;

    if (temPercent <= thresholds.intraExcellent) {
        reliability = 'excellent';
        isReliable = true;
        message = `Excelente precisión (TEM ${temPercent.toFixed(1)}%)`;
    } else if (temPercent <= thresholds.intraAcceptable) {
        reliability = 'acceptable';
        isReliable = true;
        message = `Precisión aceptable (TEM ${temPercent.toFixed(1)}%)`;
    } else {
        reliability = 'poor';
        isReliable = false;
        message = `⚠️ Precisión insuficiente (TEM ${temPercent.toFixed(1)}%) - Remedir`;
    }

    return {
        tem: Math.round(tem * 100) / 100,
        temPercent: Math.round(temPercent * 100) / 100,
        mean: Math.round(mean * 100) / 100,
        isReliable,
        reliability,
        message,
    };
}

/**
 * Calculate overall reliability from multiple measurement sites
 * 
 * @param replications - Array of measurement replications
 * @returns Overall reliability assessment
 */
export function calculateOverallReliability(replications: MeasurementReplication[]): OverallReliability {
    const qualityByMeasurement: MeasurementQuality[] = [];
    let totalTEM = 0;
    let totalPercent = 0;
    let count = 0;

    for (const rep of replications) {
        const result = calculateSiteTEM(rep);

        qualityByMeasurement.push({
            site: rep.site,
            tem: result.tem,
            temPercent: result.temPercent,
            reliability: result.reliability,
            needsRemeasurement: !result.isReliable,
        });

        if (result.tem > 0) {
            totalTEM += result.tem;
            totalPercent += result.temPercent;
            count++;
        }
    }

    const avgTEM = count > 0 ? totalTEM / count : 0;
    const avgPercent = count > 0 ? totalPercent / count : 0;

    // Determine overall rating
    const poorCount = qualityByMeasurement.filter(q => q.reliability === 'poor').length;
    const acceptableCount = qualityByMeasurement.filter(q => q.reliability === 'acceptable').length;

    let overallRating: 'excellent' | 'acceptable' | 'poor';
    if (poorCount > 0) {
        overallRating = 'poor';
    } else if (acceptableCount > qualityByMeasurement.length / 2) {
        overallRating = 'acceptable';
    } else {
        overallRating = 'excellent';
    }

    return {
        intraObserverTEM: Math.round(avgTEM * 100) / 100,
        intraObserverPercent: Math.round(avgPercent * 100) / 100,
        meetsISAKStandard: poorCount === 0,
        qualityByMeasurement,
        overallRating,
    };
}

/**
 * Determine if a third measurement is needed (ISAK protocol)
 * Rule: If difference between first two exceeds a threshold, take a third
 * 
 * @param value1 - First measurement
 * @param value2 - Second measurement
 * @param site - Measurement site
 * @returns Whether a third measurement is recommended
 */
export function needsThirdMeasurement(value1: number, value2: number, site: string): boolean {
    const diff = Math.abs(value1 - value2);
    const mean = (value1 + value2) / 2;
    const percentDiff = mean > 0 ? (diff / mean) * 100 : 0;

    const category = MEASUREMENT_CATEGORIES[site] || 'skinfolds';
    const threshold = ISAK_TEM_THRESHOLDS[category].intraAcceptable;

    // Need third measurement if difference exceeds threshold
    return percentDiff > threshold;
}

/**
 * Calculate the final value from replications (median for 3, mean for 2)
 * 
 * @param values - Measurement values
 * @returns Final value to use
 */
export function getFinalValue(values: number[]): number {
    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];
    if (values.length === 2) return (values[0] + values[1]) / 2;

    // For 3+ measurements, use median
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
}

// ===========================================
// UI UTILITIES
// ===========================================

export const TEM_COLORS = {
    excellent: { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-100 dark:bg-green-900/30' },
    acceptable: { bg: 'bg-yellow-500', text: 'text-yellow-600', light: 'bg-yellow-100 dark:bg-yellow-900/30' },
    poor: { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-100 dark:bg-red-900/30' },
};

export const TEM_LABELS = {
    excellent: { label: 'Excelente', icon: '✅', description: 'Precisión ISAK óptima' },
    acceptable: { label: 'Aceptable', icon: '⚠️', description: 'Dentro de límites ISAK' },
    poor: { label: 'Insuficiente', icon: '❌', description: 'Requiere nueva medición' },
};
