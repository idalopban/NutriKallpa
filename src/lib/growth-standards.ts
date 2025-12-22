/**
 * growth-standards.ts
 * 
 * Motor matemático para cálculo de Z-Scores según los Patrones de Crecimiento OMS.
 * Incluye datos LMS reducidos para 0-60 meses (Boys/Girls).
 * 
 * Fórmula LMS:
 * Z = ((X/M)^L - 1) / (L × S)
 * 
 * Donde:
 * - X = valor medido (peso, longitud, etc.)
 * - L = power in Box-Cox transformation
 * - M = median
 * - S = coefficient of variation
 */

// ============================================================================
// TYPES
// ============================================================================

export type Sex = 'male' | 'female';
export type MeasurementType = 'recumbent' | 'standing';

export type GrowthIndicator =
    | 'wfa'   // Weight-for-Age
    | 'lhfa'  // Length/Height-for-Age  
    | 'wflh'  // Weight-for-Length/Height
    | 'bfa'   // BMI-for-Age
    | 'hcfa'; // Head Circumference-for-Age

export interface LMSData {
    L: number;
    M: number;
    S: number;
}

export interface ZScoreResult {
    zScore: number;
    percentile: number;
    diagnosis: string;
    severityLevel: 'severe_negative' | 'moderate_negative' | 'normal' | 'moderate_positive' | 'severe_positive';
}

export interface GrowthAssessment {
    wfa?: ZScoreResult;    // Weight-for-Age
    lhfa?: ZScoreResult;   // Length/Height-for-Age
    wflh?: ZScoreResult;   // Weight-for-Length/Height
    bfa?: ZScoreResult;    // BMI-for-Age
    hcfa?: ZScoreResult;   // Head Circumference-for-Age
    nutritionalStatus: string;
    stunting: boolean;
    wasting: boolean;
    overweight: boolean;
}

// ============================================================================
// WHO LMS DATA (Reduced dataset - Key ages 0-60 months)
// Source: WHO Child Growth Standards
// ============================================================================

/**
 * Weight-for-Age (WFA) LMS parameters
 * Age in months → { L, M, S }
 */
const WFA_BOYS: Record<number, LMSData> = {
    0: { L: 0.3487, M: 3.3464, S: 0.14602 },
    1: { L: 0.2297, M: 4.4709, S: 0.13395 },
    2: { L: 0.1970, M: 5.5675, S: 0.12385 },
    3: { L: 0.1738, M: 6.3762, S: 0.11727 },
    4: { L: 0.1553, M: 7.0023, S: 0.11316 },
    5: { L: 0.1395, M: 7.5105, S: 0.10990 },
    6: { L: 0.1257, M: 7.9340, S: 0.10728 },
    9: { L: 0.0956, M: 8.9014, S: 0.10168 },
    12: { L: 0.0705, M: 9.6479, S: 0.09805 },
    15: { L: 0.0492, M: 10.2890, S: 0.09532 },
    18: { L: 0.0317, M: 10.8498, S: 0.09317 },
    21: { L: 0.0169, M: 11.3548, S: 0.09145 },
    24: { L: 0.0042, M: 11.8186, S: 0.09006 },
    30: { L: -0.0158, M: 12.6304, S: 0.08792 },
    36: { L: -0.0295, M: 13.3574, S: 0.08629 },
    42: { L: -0.0390, M: 14.0222, S: 0.08506 },
    48: { L: -0.0456, M: 14.6442, S: 0.08412 },
    54: { L: -0.0504, M: 15.2347, S: 0.08340 },
    60: { L: -0.0540, M: 15.8033, S: 0.08285 },
};

const WFA_GIRLS: Record<number, LMSData> = {
    0: { L: 0.3809, M: 3.2322, S: 0.14171 },
    1: { L: 0.1714, M: 4.1873, S: 0.13724 },
    2: { L: 0.0962, M: 5.1282, S: 0.12859 },
    3: { L: 0.0402, M: 5.8458, S: 0.12256 },
    4: { L: -0.0050, M: 6.4237, S: 0.11835 },
    5: { L: -0.0430, M: 6.8985, S: 0.11515 },
    6: { L: -0.0758, M: 7.2970, S: 0.11266 },
    9: { L: -0.1504, M: 8.2004, S: 0.10745 },
    12: { L: -0.2064, M: 8.9418, S: 0.10407 },
    15: { L: -0.2498, M: 9.5841, S: 0.10166 },
    18: { L: -0.2843, M: 10.1598, S: 0.09981 },
    21: { L: -0.3121, M: 10.6901, S: 0.09833 },
    24: { L: -0.3350, M: 11.1858, S: 0.09714 },
    30: { L: -0.3689, M: 12.0756, S: 0.09541 },
    36: { L: -0.3922, M: 12.8713, S: 0.09420 },
    42: { L: -0.4082, M: 13.6058, S: 0.09334 },
    48: { L: -0.4194, M: 14.2983, S: 0.09273 },
    54: { L: -0.4272, M: 14.9598, S: 0.09232 },
    60: { L: -0.4326, M: 15.5981, S: 0.09205 },
};

/**
 * Length/Height-for-Age (LFA/HFA) LMS parameters
 */
const LHFA_BOYS: Record<number, LMSData> = {
    0: { L: 1, M: 49.8842, S: 0.03795 },
    1: { L: 1, M: 54.7244, S: 0.03557 },
    2: { L: 1, M: 58.4249, S: 0.03424 },
    3: { L: 1, M: 61.4292, S: 0.03328 },
    4: { L: 1, M: 63.8860, S: 0.03257 },
    5: { L: 1, M: 65.9026, S: 0.03204 },
    6: { L: 1, M: 67.6236, S: 0.03165 },
    9: { L: 1, M: 71.7686, S: 0.03112 },
    12: { L: 1, M: 75.7488, S: 0.03080 },
    15: { L: 1, M: 79.1552, S: 0.03056 },
    18: { L: 1, M: 82.2614, S: 0.03038 },
    21: { L: 1, M: 85.1324, S: 0.03026 },
    24: { L: 1, M: 87.1161, S: 0.03015 }, // Note: Height adjustment at 24 months
    30: { L: 1, M: 91.9092, S: 0.03001 },
    36: { L: 1, M: 96.0683, S: 0.02991 },
    42: { L: 1, M: 99.8954, S: 0.02985 },
    48: { L: 1, M: 103.4732, S: 0.02981 },
    54: { L: 1, M: 106.8568, S: 0.02979 },
    60: { L: 1, M: 110.0749, S: 0.02979 },
};

const LHFA_GIRLS: Record<number, LMSData> = {
    0: { L: 1, M: 49.1477, S: 0.03790 },
    1: { L: 1, M: 53.6872, S: 0.03614 },
    2: { L: 1, M: 57.0673, S: 0.03497 },
    3: { L: 1, M: 59.8029, S: 0.03411 },
    4: { L: 1, M: 62.0899, S: 0.03347 },
    5: { L: 1, M: 64.0301, S: 0.03298 },
    6: { L: 1, M: 65.7311, S: 0.03261 },
    9: { L: 1, M: 69.7236, S: 0.03194 },
    12: { L: 1, M: 73.4857, S: 0.03161 },
    15: { L: 1, M: 76.7972, S: 0.03141 },
    18: { L: 1, M: 79.8481, S: 0.03128 },
    21: { L: 1, M: 82.6846, S: 0.03119 },
    24: { L: 1, M: 84.9764, S: 0.03110 },
    30: { L: 1, M: 89.8090, S: 0.03099 },
    36: { L: 1, M: 94.0633, S: 0.03092 },
    42: { L: 1, M: 97.9627, S: 0.03088 },
    48: { L: 1, M: 101.5994, S: 0.03086 },
    54: { L: 1, M: 105.0466, S: 0.03085 },
    60: { L: 1, M: 108.3557, S: 0.03085 },
};

/**
 * Head Circumference-for-Age (HCFA) LMS parameters
 */
const HCFA_BOYS: Record<number, LMSData> = {
    0: { L: 1, M: 34.4618, S: 0.03686 },
    1: { L: 1, M: 37.2759, S: 0.03133 },
    2: { L: 1, M: 39.1285, S: 0.02997 },
    3: { L: 1, M: 40.5135, S: 0.02918 },
    6: { L: 1, M: 43.2973, S: 0.02773 },
    9: { L: 1, M: 45.1858, S: 0.02703 },
    12: { L: 1, M: 46.4989, S: 0.02664 },
    18: { L: 1, M: 48.0073, S: 0.02619 },
    24: { L: 1, M: 49.0265, S: 0.02593 },
    36: { L: 1, M: 50.2246, S: 0.02562 },
    48: { L: 1, M: 51.0189, S: 0.02544 },
    60: { L: 1, M: 51.5825, S: 0.02533 },
};

const HCFA_GIRLS: Record<number, LMSData> = {
    0: { L: 1, M: 33.8787, S: 0.03496 },
    1: { L: 1, M: 36.5463, S: 0.03178 },
    2: { L: 1, M: 38.2521, S: 0.03067 },
    3: { L: 1, M: 39.5328, S: 0.02997 },
    6: { L: 1, M: 42.0253, S: 0.02877 },
    9: { L: 1, M: 43.8037, S: 0.02817 },
    12: { L: 1, M: 45.0316, S: 0.02781 },
    18: { L: 1, M: 46.4183, S: 0.02741 },
    24: { L: 1, M: 47.3549, S: 0.02718 },
    36: { L: 1, M: 48.5148, S: 0.02689 },
    48: { L: 1, M: 49.3109, S: 0.02672 },
    60: { L: 1, M: 49.8979, S: 0.02660 },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Interpola datos LMS para edades intermedias
 */
function interpolateLMS(data: Record<number, LMSData>, ageInMonths: number): LMSData {
    const ages = Object.keys(data).map(Number).sort((a, b) => a - b);

    // Exact match
    if (data[ageInMonths]) {
        return data[ageInMonths];
    }

    // Find surrounding ages
    let lowerAge = ages[0];
    let upperAge = ages[ages.length - 1];

    for (let i = 0; i < ages.length - 1; i++) {
        if (ages[i] <= ageInMonths && ages[i + 1] >= ageInMonths) {
            lowerAge = ages[i];
            upperAge = ages[i + 1];
            break;
        }
    }

    // Edge cases
    if (ageInMonths <= ages[0]) return data[ages[0]];
    if (ageInMonths >= ages[ages.length - 1]) return data[ages[ages.length - 1]];

    // Linear interpolation
    const lowerLMS = data[lowerAge];
    const upperLMS = data[upperAge];
    const ratio = (ageInMonths - lowerAge) / (upperAge - lowerAge);

    return {
        L: lowerLMS.L + ratio * (upperLMS.L - lowerLMS.L),
        M: lowerLMS.M + ratio * (upperLMS.M - lowerLMS.M),
        S: lowerLMS.S + ratio * (upperLMS.S - lowerLMS.S),
    };
}

/**
 * Obtiene los datos LMS para un indicador específico
 */
function getLMSData(
    indicator: GrowthIndicator,
    sex: Sex,
    ageInMonths: number
): LMSData | null {
    let data: Record<number, LMSData>;

    switch (indicator) {
        case 'wfa':
            data = sex === 'male' ? WFA_BOYS : WFA_GIRLS;
            break;
        case 'lhfa':
            data = sex === 'male' ? LHFA_BOYS : LHFA_GIRLS;
            break;
        case 'hcfa':
            data = sex === 'male' ? HCFA_BOYS : HCFA_GIRLS;
            break;
        default:
            return null;
    }

    return interpolateLMS(data, ageInMonths);
}

/**
 * Convierte Z-Score a percentil
 */
function zScoreToPercentile(zScore: number): number {
    // Approximation using error function
    const t = 1 / (1 + 0.2316419 * Math.abs(zScore));
    const d = 0.3989423 * Math.exp(-zScore * zScore / 2);
    const probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    if (zScore > 0) {
        return Math.round((1 - probability) * 100);
    }
    return Math.round(probability * 100);
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Calcula el Z-Score usando la fórmula LMS de la OMS
 * 
 * @param measurement - Valor medido (peso en kg, longitud/talla en cm)
 * @param ageInMonths - Edad en meses
 * @param sex - Sexo del niño
 * @param indicator - Tipo de indicador (wfa, lhfa, etc.)
 * @returns ZScoreResult con z-score, percentil y diagnóstico
 */
export function calculateZScore(
    measurement: number,
    ageInMonths: number,
    sex: Sex,
    indicator: GrowthIndicator
): ZScoreResult | null {
    const lms = getLMSData(indicator, sex, ageInMonths);
    if (!lms) return null;

    const { L, M, S } = lms;
    let zScore: number;

    // Apply LMS formula
    // Z = ((X/M)^L - 1) / (L × S)
    if (Math.abs(L) < 0.0001) {
        // When L is close to 0, use logarithmic formula
        zScore = Math.log(measurement / M) / S;
    } else {
        zScore = (Math.pow(measurement / M, L) - 1) / (L * S);
    }

    // Clamp extreme values
    zScore = Math.max(-5, Math.min(5, zScore));
    zScore = Math.round(zScore * 100) / 100;

    const percentile = zScoreToPercentile(zScore);
    const { diagnosis, severityLevel } = interpretZScore(zScore, indicator);

    return {
        zScore,
        percentile,
        diagnosis,
        severityLevel,
    };
}

/**
 * Interpreta el Z-Score según las guías de la OMS
 */
export function interpretZScore(
    zScore: number,
    indicator: GrowthIndicator
): { diagnosis: string; severityLevel: ZScoreResult['severityLevel'] } {
    // Weight-for-Height or BMI-for-Age
    if (indicator === 'wflh' || indicator === 'bfa') {
        if (zScore > 3) {
            return { diagnosis: 'Obesidad', severityLevel: 'severe_positive' };
        } else if (zScore > 2) {
            return { diagnosis: 'Sobrepeso', severityLevel: 'moderate_positive' };
        } else if (zScore > 1) {
            return { diagnosis: 'Riesgo de sobrepeso', severityLevel: 'normal' };
        } else if (zScore >= -2) {
            return { diagnosis: 'Normal', severityLevel: 'normal' };
        } else if (zScore >= -3) {
            return { diagnosis: 'Desnutrición aguda moderada', severityLevel: 'moderate_negative' };
        } else {
            return { diagnosis: 'Desnutrición aguda severa', severityLevel: 'severe_negative' };
        }
    }

    // Height/Length-for-Age
    if (indicator === 'lhfa') {
        if (zScore > 3) {
            return { diagnosis: 'Muy alto', severityLevel: 'severe_positive' };
        } else if (zScore > 2) {
            return { diagnosis: 'Alto', severityLevel: 'moderate_positive' };
        } else if (zScore >= -2) {
            return { diagnosis: 'Normal', severityLevel: 'normal' };
        } else if (zScore >= -3) {
            return { diagnosis: 'Talla baja moderada', severityLevel: 'moderate_negative' };
        } else {
            return { diagnosis: 'Talla baja severa', severityLevel: 'severe_negative' };
        }
    }

    // Weight-for-Age
    if (indicator === 'wfa') {
        if (zScore > 2) {
            return { diagnosis: 'Peso alto', severityLevel: 'moderate_positive' };
        } else if (zScore >= -2) {
            return { diagnosis: 'Normal', severityLevel: 'normal' };
        } else if (zScore >= -3) {
            return { diagnosis: 'Bajo peso moderado', severityLevel: 'moderate_negative' };
        } else {
            return { diagnosis: 'Bajo peso severo', severityLevel: 'severe_negative' };
        }
    }

    // Default (Head Circumference, etc.)
    if (zScore > 2) {
        return { diagnosis: 'Alto', severityLevel: 'moderate_positive' };
    } else if (zScore >= -2) {
        return { diagnosis: 'Normal', severityLevel: 'normal' };
    } else {
        return { diagnosis: 'Bajo', severityLevel: 'moderate_negative' };
    }
}

/**
 * Calcula la evaluación completa de crecimiento
 */
export function calculateGrowthAssessment(
    weightKg: number,
    heightCm: number,
    headCircumferenceCm: number | undefined,
    ageInMonths: number,
    sex: Sex
): GrowthAssessment {
    const wfa = calculateZScore(weightKg, ageInMonths, sex, 'wfa');
    const lhfa = calculateZScore(heightCm, ageInMonths, sex, 'lhfa');
    const hcfa = headCircumferenceCm
        ? calculateZScore(headCircumferenceCm, ageInMonths, sex, 'hcfa') ?? undefined
        : undefined;

    // Calculate BMI for BFA
    const bmi = weightKg / Math.pow(heightCm / 100, 2);
    const bfa = calculateZScore(bmi, ageInMonths, sex, 'bfa');

    // Determine nutritional status
    let nutritionalStatus = 'Normal';
    const stunting = lhfa ? lhfa.zScore < -2 : false;
    const wasting = wfa ? wfa.zScore < -2 : false;
    const overweight = bfa ? bfa.zScore > 2 : false;

    if (stunting && wasting) {
        nutritionalStatus = 'Desnutrición crónica y aguda';
    } else if (stunting) {
        nutritionalStatus = 'Desnutrición crónica (Retardo del crecimiento)';
    } else if (wasting) {
        nutritionalStatus = 'Desnutrición aguda';
    } else if (overweight) {
        nutritionalStatus = bfa && bfa.zScore > 3 ? 'Obesidad' : 'Sobrepeso';
    }

    return {
        wfa: wfa || undefined,
        lhfa: lhfa || undefined,
        wflh: undefined, // TODO: Implement weight-for-length table
        bfa: bfa || undefined,
        hcfa,
        nutritionalStatus,
        stunting,
        wasting,
        overweight,
    };
}

/**
 * Genera los datos de las curvas de percentiles para gráficas
 */
export function generatePercentileCurves(
    indicator: GrowthIndicator,
    sex: Sex,
    startMonth: number = 0,
    endMonth: number = 60
): { month: number; sd_neg3: number; sd_neg2: number; median: number; sd_pos2: number; sd_pos3: number }[] {
    const curves: { month: number; sd_neg3: number; sd_neg2: number; median: number; sd_pos2: number; sd_pos3: number }[] = [];

    // Define months to process
    const monthsToProcess: number[] = [];

    // If starting from birth, include weekly points for the first month (7, 14, 21 days)
    if (startMonth === 0) {
        monthsToProcess.push(0);
        monthsToProcess.push(0.23); // 7 days (7/30.4375)
        monthsToProcess.push(0.46); // 14 days
        monthsToProcess.push(0.69); // 21 days
        // Continue from month 1
        for (let m = 1; m <= endMonth; m++) monthsToProcess.push(m);
    } else {
        // Standard loop
        for (let m = startMonth; m <= endMonth; m++) monthsToProcess.push(m);
    }

    for (const month of monthsToProcess) {
        const lms = getLMSData(indicator, sex, month);
        if (!lms) continue;

        const { L, M, S } = lms;

        // Calculate percentile values from Z-scores
        const calculateValue = (zScore: number): number => {
            if (Math.abs(L) < 0.0001) {
                return M * Math.exp(S * zScore);
            }
            return M * Math.pow(1 + L * S * zScore, 1 / L);
        };

        curves.push({
            month,
            sd_neg3: Math.round(calculateValue(-3) * 100) / 100,
            sd_neg2: Math.round(calculateValue(-2) * 100) / 100,
            median: Math.round(M * 100) / 100,
            sd_pos2: Math.round(calculateValue(2) * 100) / 100,
            sd_pos3: Math.round(calculateValue(3) * 100) / 100,
        });
    }

    return curves;
}

/**
 * Determina si debe usarse longitud (recumbent) o talla (standing)
 */
export function getMeasurementType(ageInMonths: number): MeasurementType {
    return ageInMonths < 24 ? 'recumbent' : 'standing';
}

/**
 * Ajusta la medida de longitud a talla o viceversa
 * La OMS indica un ajuste de 0.7 cm
 */
export function adjustHeightMeasurement(
    heightCm: number,
    actualType: MeasurementType,
    requiredType: MeasurementType
): number {
    if (actualType === requiredType) return heightCm;

    // Length to Height: subtract 0.7 cm
    if (actualType === 'recumbent' && requiredType === 'standing') {
        return heightCm - 0.7;
    }

    // Height to Length: add 0.7 cm
    return heightCm + 0.7;
}
