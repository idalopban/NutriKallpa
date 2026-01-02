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
// AGE CALCULATION & TABLE TRANSITION
// ============================================================================

/**
 * Política de Transición de Tablas OMS:
 * 
 * - 0-24 meses: Tabla "Infants" (longitud recostada)
 * - 24-60 meses: Tabla "Children" (estatura de pie)
 * - 60-228 meses: Tabla "2007 Reference" (5-19 años)
 * 
 * La medición debe ser de PIE a partir de 24 meses.
 */
export const TABLE_TRANSITION_CONFIG = {
    INFANT_TO_CHILD_MONTHS: 24,
    CHILD_TO_ADOLESCENT_MONTHS: 60,
    MAX_PEDIATRIC_MONTHS: 228, // 19 años
};

/**
 * Calcula la edad exacta en meses con precisión de días.
 * 
 * Usa la constante 30.4375 días/mes (365.25 / 12) que incluye años bisiestos.
 * 
 * @param birthDate - Fecha de nacimiento (Date o string ISO)
 * @param evaluationDate - Fecha de evaluación (Date o string ISO, default: hoy)
 * @returns Edad en meses con decimales
 * @throws Error si la fecha de evaluación es anterior al nacimiento
 * 
 * @example
 * // Bebé nacido el 29 de febrero de 2024, evaluado el 1 de marzo de 2025
 * calculateExactAgeInMonths('2024-02-29', '2025-03-01') // ~12.07 meses
 */
export function calculateExactAgeInMonths(
    birthDate: Date | string,
    evaluationDate: Date | string = new Date()
): number {
    const birth = new Date(birthDate);
    const evaluation = new Date(evaluationDate);

    // Validación: fecha de evaluación debe ser posterior al nacimiento
    if (evaluation < birth) {
        throw new Error('INVALID_DATE: La fecha de evaluación no puede ser anterior al nacimiento');
    }

    const diffMs = evaluation.getTime() - birth.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    // 30.4375 = 365.25 / 12 (promedio días por mes incluyendo bisiestos)
    return diffDays / 30.4375;
}

/**
 * Determina qué tabla OMS usar según la edad
 */
export function getTableForAge(ageInMonths: number): 'infant' | 'child' | 'adolescent' {
    if (ageInMonths < TABLE_TRANSITION_CONFIG.INFANT_TO_CHILD_MONTHS) {
        return 'infant';
    }
    if (ageInMonths < TABLE_TRANSITION_CONFIG.CHILD_TO_ADOLESCENT_MONTHS) {
        return 'child';
    }
    return 'adolescent';
}

/**
 * Calcula la edad exacta en días
 */
export function calculateExactAgeInDays(
    birthDate: Date | string,
    evaluationDate: Date | string = new Date()
): number {
    const birth = new Date(birthDate);
    const evaluation = new Date(evaluationDate);

    if (evaluation < birth) {
        throw new Error('INVALID_DATE: La fecha de evaluación no puede ser anterior al nacimiento');
    }

    return (evaluation.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24);
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

/**
 * BMI-for-Age (BFA) LMS parameters
 * Source: WHO Child Growth Standards
 * https://www.who.int/tools/child-growth-standards/standards/bmi-for-age
 */
const BFA_BOYS: Record<number, LMSData> = {
    0: { L: -1.6769, M: 13.4045, S: 0.09182 },
    1: { L: -1.8395, M: 14.6329, S: 0.08108 },
    2: { L: -1.7807, M: 15.7986, S: 0.07417 },
    3: { L: -1.6797, M: 16.7055, S: 0.06964 },
    4: { L: -1.5633, M: 17.4068, S: 0.06658 },
    5: { L: -1.4489, M: 17.9625, S: 0.06449 },
    6: { L: -1.3454, M: 18.4138, S: 0.06301 },
    9: { L: -1.1035, M: 19.2697, S: 0.06095 },
    12: { L: -0.9108, M: 19.8763, S: 0.05991 },
    15: { L: -0.7575, M: 20.3236, S: 0.05946 },
    18: { L: -0.6343, M: 20.6561, S: 0.05938 },
    21: { L: -0.5338, M: 20.9042, S: 0.05955 },
    24: { L: -0.4509, M: 21.0875, S: 0.05988 },
    30: { L: -0.3155, M: 21.3013, S: 0.06078 },
    36: { L: -0.2306, M: 21.3965, S: 0.06173 },
    42: { L: -0.1837, M: 21.4332, S: 0.06269 },
    48: { L: -0.1641, M: 21.4445, S: 0.06364 },
    54: { L: -0.1627, M: 21.4524, S: 0.06459 },
    60: { L: -0.1707, M: 21.4676, S: 0.06554 },
};

const BFA_GIRLS: Record<number, LMSData> = {
    0: { L: -1.4508, M: 13.1122, S: 0.09108 },
    1: { L: -1.6421, M: 14.3659, S: 0.08204 },
    2: { L: -1.6177, M: 15.5653, S: 0.07570 },
    3: { L: -1.5384, M: 16.5167, S: 0.07144 },
    4: { L: -1.4428, M: 17.2527, S: 0.06849 },
    5: { L: -1.3468, M: 17.8284, S: 0.06637 },
    6: { L: -1.2571, M: 18.2817, S: 0.06477 },
    9: { L: -1.0476, M: 19.1082, S: 0.06247 },
    12: { L: -0.8835, M: 19.6625, S: 0.06118 },
    15: { L: -0.7530, M: 20.0713, S: 0.06048 },
    18: { L: -0.6464, M: 20.3755, S: 0.06015 },
    21: { L: -0.5572, M: 20.6061, S: 0.06006 },
    24: { L: -0.4811, M: 20.7838, S: 0.06014 },
    30: { L: -0.3557, M: 21.0223, S: 0.06062 },
    36: { L: -0.2698, M: 21.1522, S: 0.06131 },
    42: { L: -0.2187, M: 21.2155, S: 0.06211 },
    48: { L: -0.1946, M: 21.2421, S: 0.06296 },
    54: { L: -0.1899, M: 21.2517, S: 0.06383 },
    60: { L: -0.1948, M: 21.2595, S: 0.06472 },
};

/**
 * Weight-for-Length (WFL) LMS parameters (0-2 years)
 * Length in cm → { L, M, S }
 */
const WFL_BOYS: Record<number, LMSData> = {
    45: { L: 0.0381, M: 2.4549, S: 0.13327 },
    50: { L: -0.0632, M: 3.3427, S: 0.11974 },
    55: { L: -0.1384, M: 4.5423, S: 0.10698 },
    60: { L: -0.1930, M: 5.9555, S: 0.09650 },
    65: { L: -0.2281, M: 7.4098, S: 0.08861 },
    70: { L: -0.2486, M: 8.7610, S: 0.08298 },
    75: { L: -0.2598, M: 9.9238, S: 0.07920 },
    80: { L: -0.2662, M: 10.8931, S: 0.07686 },
    85: { L: -0.2709, M: 11.7516, S: 0.07567 },
    90: { L: -0.2783, M: 12.6300, S: 0.07545 },
    95: { L: -0.2921, M: 13.6335, S: 0.07593 },
    100: { L: -0.3134, M: 14.8143, S: 0.07692 },
    105: { L: -0.3423, M: 16.1950, S: 0.07842 },
    110: { L: -0.3792, M: 17.8174, S: 0.08053 },
};

const WFL_GIRLS: Record<number, LMSData> = {
    45: { L: -0.1293, M: 2.5029, S: 0.12959 },
    50: { L: -0.1873, M: 3.3276, S: 0.12061 },
    55: { L: -0.2307, M: 4.4101, S: 0.10986 },
    60: { L: -0.2618, M: 5.6669, S: 0.10018 },
    65: { L: -0.2825, M: 6.9922, S: 0.09218 },
    70: { L: -0.2951, M: 8.2573, S: 0.08605 },
    75: { L: -0.3016, M: 9.3905, S: 0.08174 },
    80: { L: -0.3031, M: 10.3756, S: 0.07903 },
    85: { L: -0.3015, M: 11.2392, S: 0.07764 },
    90: { L: -0.3005, M: 12.0833, S: 0.07739 },
    95: { L: -0.3048, M: 13.0180, S: 0.07802 },
    100: { L: -0.3175, M: 14.1167, S: 0.07942 },
    105: { L: -0.3411, M: 15.4246, S: 0.08149 },
    110: { L: -0.3774, M: 16.9858, S: 0.08417 },
};

// ============================================================================
// WHO 2007 REFERENCE DATA (5-19 years / 61-228 months)
// Source: WHO Reference 2007
// https://www.who.int/toolkits/child-growth-standards/standards/height-for-age-5-19-years
// ============================================================================

/**
 * Height-for-Age (HFA) 2007 parameters (BOYS)
 */
const HFA_BOYS_2007: Record<number, LMSData> = {
    61: { L: 1, M: 110.4, S: 0.0441 },
    72: { L: 1, M: 116.0, S: 0.0439 },
    84: { L: 1, M: 121.7, S: 0.0441 },
    96: { L: 1, M: 127.3, S: 0.0445 },
    108: { L: 1, M: 132.7, S: 0.0452 },
    120: { L: 1, M: 138.4, S: 0.0463 },
    132: { L: 1, M: 144.1, S: 0.0478 },
    144: { L: 1, M: 150.2, S: 0.0496 },
    156: { L: 1, M: 157.0, S: 0.0514 },
    168: { L: 1, M: 163.7, S: 0.0526 },
    180: { L: 1, M: 169.0, S: 0.0528 },
    192: { L: 1, M: 172.5, S: 0.0518 },
    204: { L: 1, M: 174.5, S: 0.0505 },
    216: { L: 1, M: 175.7, S: 0.0494 },
    228: { L: 1, M: 176.5, S: 0.0487 },
};

/**
 * Height-for-Age (HFA) 2007 parameters (GIRLS)
 */
const HFA_GIRLS_2007: Record<number, LMSData> = {
    61: { L: 1, M: 109.6, S: 0.0450 },
    72: { L: 1, M: 115.1, S: 0.0453 },
    84: { L: 1, M: 120.8, S: 0.0461 },
    96: { L: 1, M: 126.6, S: 0.0472 },
    108: { L: 1, M: 132.5, S: 0.0485 },
    120: { L: 1, M: 138.6, S: 0.0498 },
    132: { L: 1, M: 144.8, S: 0.0507 },
    144: { L: 1, M: 150.5, S: 0.0509 },
    156: { L: 1, M: 155.1, S: 0.0502 },
    168: { L: 1, M: 158.4, S: 0.0488 },
    180: { L: 1, M: 160.4, S: 0.0474 },
    192: { L: 1, M: 161.4, S: 0.0463 },
    204: { L: 1, M: 162.2, S: 0.0454 },
    216: { L: 1, M: 162.8, S: 0.0449 },
    228: { L: 1, M: 163.2, S: 0.0446 },
};

/**
 * BMI-for-Age (BFA) 2007 parameters (BOYS)
 */
const BFA_BOYS_2007: Record<number, LMSData> = {
    61: { L: -0.7684, M: 15.2952, S: 0.08805 },
    72: { L: -0.7302, M: 15.3400, S: 0.09114 },
    84: { L: -0.6868, M: 15.4290, S: 0.09553 },
    96: { L: -0.6359, M: 15.5807, S: 0.10106 },
    108: { L: -0.5750, M: 15.8080, S: 0.10773 },
    120: { L: -0.5057, M: 16.1171, S: 0.11545 },
    132: { L: -0.4287, M: 16.5101, S: 0.12384 },
    144: { L: -0.3475, M: 17.0544, S: 0.13251 },
    156: { L: -0.2662, M: 17.7801, S: 0.14083 },
    168: { L: -0.1901, M: 18.5283, S: 0.14810 },
    180: { L: -0.1232, M: 19.3516, S: 0.15396 },
    192: { L: -0.0664, M: 20.2183, S: 0.15822 },
    204: { L: -0.0199, M: 21.1121, S: 0.16091 },
    216: { L: 0.0177, M: 21.9213, S: 0.16223 },
    228: { L: 0.0473, M: 22.6582, S: 0.16244 },
};

/**
 * BMI-for-Age (BFA) 2007 parameters (GIRLS)
 */
const BFA_GIRLS_2007: Record<number, LMSData> = {
    61: { L: -1.1609, M: 15.1763, S: 0.09141 },
    72: { L: -1.0964, M: 15.2285, S: 0.09520 },
    84: { L: -1.0181, M: 15.3216, S: 0.10091 },
    96: { L: -0.9256, M: 15.4649, S: 0.10803 },
    108: { L: -0.8209, M: 15.6696, S: 0.11599 },
    120: { L: -0.7077, M: 15.9610, S: 0.12455 },
    132: { L: -0.5912, M: 16.3765, S: 0.13292 },
    144: { L: -0.4782, M: 16.9458, S: 0.14067 },
    156: { L: -0.3739, M: 17.6534, S: 0.14729 },
    168: { L: -0.2831, M: 18.4418, S: 0.15234 },
    180: { L: -0.2079, M: 19.2393, S: 0.15570 },
    192: { L: -0.1485, M: 20.0003, S: 0.15777 },
    204: { L: -0.1040, M: 20.7303, S: 0.15881 },
    216: { L: -0.0722, M: 21.4111, S: 0.15926 },
    228: { L: -0.0509, M: 22.0469, S: 0.15920 },
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
    type: string,
    sex: string,
    month: number
): LMSData | null {
    let data: Record<number, LMSData>;

    switch (type) {
        case 'wfa':
            data = sex === 'male' ? WFA_BOYS : WFA_GIRLS;
            break;
        case 'lhfa':
            if (month > 60) {
                data = sex === 'male' ? HFA_BOYS_2007 : HFA_GIRLS_2007;
            } else {
                data = sex === 'male' ? LHFA_BOYS : LHFA_GIRLS;
            }
            break;
        case 'bfa':
            if (month > 60) {
                data = sex === 'male' ? BFA_BOYS_2007 : BFA_GIRLS_2007;
            } else {
                data = sex === 'male' ? BFA_BOYS : BFA_GIRLS;
            }
            break;
        case 'wflh':
            data = sex === 'male' ? WFL_BOYS : WFL_GIRLS;
            break;
        case 'hcfa':
            data = sex === 'male' ? HCFA_BOYS : HCFA_GIRLS;
            break;
        default:
            return null;
    }

    return interpolateLMS(data, month);
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
            return { diagnosis: 'Delgadez', severityLevel: 'moderate_negative' };
        } else {
            return { diagnosis: 'Delgadez severa', severityLevel: 'severe_negative' };
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
    const isInfant = ageInMonths < 24;
    const wfa = calculateZScore(weightKg, ageInMonths, sex, 'wfa');
    const lhfa = calculateZScore(heightCm, ageInMonths, sex, 'lhfa');
    const hcfa = headCircumferenceCm
        ? calculateZScore(headCircumferenceCm, ageInMonths, sex, 'hcfa') ?? undefined
        : undefined;

    // Weight-for-Length (P/L) for infants < 2y
    const wflh = isInfant
        ? calculateZScore(weightKg, heightCm, sex, 'wflh') ?? undefined
        : undefined;

    // BMI for BFA - Only for >= 2 years as primary indicator
    const bmi = weightKg / Math.pow(heightCm / 100, 2);
    const bfa = calculateZScore(bmi, ageInMonths, sex, 'bfa');

    // Determine nutritional status
    let nutritionalStatus = 'Normal';
    const stunting = lhfa ? lhfa.zScore < -2 : false;

    // In infants < 2y, wasting is determined by WFL (P/L) or WFA (P/E)
    // In older children, by BMI (BFA)
    const wasting = isInfant
        ? (wflh ? wflh.zScore < -2 : (wfa ? wfa.zScore < -2 : false))
        : (bfa ? bfa.zScore < -2 : false);

    const overweight = isInfant
        ? (wflh ? wflh.zScore > 2 : false)
        : (bfa ? bfa.zScore > 2 : false);

    if (stunting && wasting) {
        nutritionalStatus = 'Desnutrición crónica y aguda';
    } else if (stunting) {
        nutritionalStatus = 'Desnutrición crónica (Retardo del crecimiento)';
    } else if (wasting) {
        nutritionalStatus = 'Desnutrición aguda (Emaciación)';
    } else if (overweight) {
        const severeObj = isInfant ? wflh : bfa;
        nutritionalStatus = severeObj && severeObj.zScore > 3 ? 'Obesidad' : 'Sobrepeso';
    }

    return {
        wfa: wfa || undefined,
        lhfa: lhfa || undefined,
        wflh,
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
/**
 * Obtiene los valores mediana (M) sugeridos de peso y talla para una edad y sexo.
 * Útil para proporcionar valores predeterminados inteligentes en formularios.
 * 
 * @param ageInMonths - Edad en meses
 * @param sex - Sexo ('male' | 'female' o 'masculino' | 'femenino')
 * @returns { weight: number, height: number }
 */
export function getMedianAnthro(ageInMonths: number, sex: Sex | 'masculino' | 'femenino'): { weight: number; height: number } {
    const normalizedSex: Sex = (sex === 'masculino' || sex === 'male') ? 'male' : 'female';

    // 1. ADULTOS (> 19 años / 228 meses)
    if (ageInMonths > 228) {
        return normalizedSex === 'male'
            ? { weight: 75, height: 175 }
            : { weight: 62, height: 162 };
    }

    // 2. PEDIATRÍA (LMS Mediana)
    const weightLMS = getLMSData('wfa', normalizedSex, Math.min(60, ageInMonths));
    const heightLMS = getLMSData('lhfa', normalizedSex, ageInMonths);

    return {
        weight: weightLMS ? Math.round(weightLMS.M * 10) / 10 : 70,
        height: heightLMS ? Math.round(heightLMS.M * 10) / 10 : 170
    };
}
