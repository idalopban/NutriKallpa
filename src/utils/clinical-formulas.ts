/**
 * clinical-formulas.ts
 * 
 * Fórmulas clínicas avanzadas para poblaciones especiales:
 * - Embarazo (Curva de Atalah, Metas IOM)
 * - Parálisis Cerebral (Stevenson, GMFCS)
 * - Riesgo Cardiometabólico (ICT, Obesidad Abdominal, RCC)
 * - Selector Inteligente de Grasa Corporal (Slaughter vs Durnin)
 */

// ============================================================================
// TYPES
// ============================================================================

export type AtalahClassification = 'Bajo Peso' | 'Normal' | 'Sobrepeso' | 'Obesidad';
export type GMFCSLevel = 'I' | 'II' | 'III' | 'IV' | 'V';
export type RiskLevel = 'minimo' | 'bajo' | 'moderado' | 'alto' | 'muy_alto';
export type TannerMaturationStage = 'pre-puber' | 'puber' | 'post-puber';

export interface IOMWeightGainGoals {
    minGain: number;
    maxGain: number;
    weeklyGainSecondThird: { min: number; max: number };
}

export interface WaistToHeightResult {
    ratio: number;
    risk: RiskLevel;
    interpretation: string;
}

export interface WaistHipRatioResult {
    ratio: number;
    risk: RiskLevel;
    interpretation: string;
}

export interface BodyFatSmartResult {
    percentage: number;
    method: 'slaughter' | 'durnin_siri';
    formula: string;
}

// ============================================================================
// 1. MÓDULO DE EMBARAZO - CURVA DE ATALAH
// ============================================================================

/**
 * Tabla de cortes de IMC según semana gestacional (Atalah 2019)
 * Cada entrada: [semana, bajoPeso, normalMax, sobrepesoMax]
 * - IMC < bajoPeso = "Bajo Peso"
 * - bajoPeso <= IMC < normalMax = "Normal"
 * - normalMax <= IMC < sobrepesoMax = "Sobrepeso"
 * - IMC >= sobrepesoMax = "Obesidad"
 */
export const ATALAH_CURVE_DATA: [number, number, number, number][] = [
    [6, 20.0, 25.0, 30.0],
    [7, 20.0, 25.0, 30.0],
    [8, 20.0, 25.0, 30.0],
    [9, 20.0, 25.0, 30.0],
    [10, 20.0, 25.5, 30.0],
    [11, 20.0, 25.5, 30.0],
    [12, 20.5, 26.0, 30.0],
    [13, 20.5, 26.0, 30.5],
    [14, 21.0, 26.5, 30.5],
    [15, 21.0, 26.5, 31.0],
    [16, 21.5, 27.0, 31.0],
    [17, 21.5, 27.0, 31.5],
    [18, 22.0, 27.5, 31.5],
    [19, 22.0, 27.5, 32.0],
    [20, 22.5, 28.0, 32.0],
    [21, 22.5, 28.0, 32.5],
    [22, 23.0, 28.5, 32.5],
    [23, 23.0, 28.5, 33.0],
    [24, 23.5, 29.0, 33.0],
    [25, 23.5, 29.0, 33.5],
    [26, 24.0, 29.5, 33.5],
    [27, 24.0, 29.5, 34.0],
    [28, 24.5, 30.0, 34.0],
    [29, 24.5, 30.0, 34.5],
    [30, 25.0, 30.5, 34.5],
    [31, 25.0, 30.5, 35.0],
    [32, 25.0, 30.5, 35.0],
    [33, 25.5, 31.0, 35.0],
    [34, 25.5, 31.0, 35.5],
    [35, 26.0, 31.5, 35.5],
    [36, 26.0, 31.5, 36.0],
    [37, 26.0, 32.0, 36.0],
    [38, 26.5, 32.0, 36.5],
    [39, 26.5, 32.0, 36.5],
    [40, 27.0, 32.5, 37.0],
    [41, 27.0, 32.5, 37.0],
    [42, 27.0, 32.5, 37.0],
];

/**
 * Clasifica el estado nutricional de la embarazada según la curva de Atalah.
 * 
 * @param imc - IMC actual de la embarazada
 * @param gestationalWeeks - Semanas de gestación (6-42)
 * @returns Clasificación: "Bajo Peso", "Normal", "Sobrepeso" u "Obesidad"
 */
export function classifyAtalah(imc: number, gestationalWeeks: number): AtalahClassification {
    // Clamping weeks to valid range
    const weeks = Math.max(6, Math.min(42, Math.round(gestationalWeeks)));

    // Find the closest week in the table
    const weekData = ATALAH_CURVE_DATA.find(([w]) => w === weeks)
        || ATALAH_CURVE_DATA[ATALAH_CURVE_DATA.length - 1];

    const [, bajoPesoLimit, normalLimit, sobrepesoLimit] = weekData;

    if (imc < bajoPesoLimit) return 'Bajo Peso';
    if (imc < normalLimit) return 'Normal';
    if (imc < sobrepesoLimit) return 'Sobrepeso';
    return 'Obesidad';
}

/**
 * Metas de ganancia de peso según el IOM (Institute of Medicine).
 * Basado en IMC pregestacional y tipo de embarazo.
 * 
 * @param prePregnancyBMI - IMC antes del embarazo
 * @param isMultiple - true si es embarazo gemelar
 * @returns Objeto con ganancia mínima/máxima total y semanal
 */
export function getIOMWeightGainGoals(
    prePregnancyBMI: number,
    isMultiple: boolean = false
): IOMWeightGainGoals {
    // Singleton pregnancy ranges
    const singletonRanges = {
        underweight: { min: 12.5, max: 18.0, weeklyMin: 0.44, weeklyMax: 0.58 },
        normal: { min: 11.5, max: 16.0, weeklyMin: 0.35, weeklyMax: 0.50 },
        overweight: { min: 7.0, max: 11.5, weeklyMin: 0.23, weeklyMax: 0.33 },
        obese: { min: 5.0, max: 9.0, weeklyMin: 0.17, weeklyMax: 0.27 },
    };

    // Twin pregnancy ranges (IOM 2009)
    const twinRanges = {
        underweight: { min: 22.7, max: 28.1, weeklyMin: 0.57, weeklyMax: 0.70 },
        normal: { min: 16.7, max: 24.5, weeklyMin: 0.42, weeklyMax: 0.61 },
        overweight: { min: 14.0, max: 22.6, weeklyMin: 0.35, weeklyMax: 0.57 },
        obese: { min: 11.3, max: 19.0, weeklyMin: 0.28, weeklyMax: 0.48 },
    };

    const ranges = isMultiple ? twinRanges : singletonRanges;

    let category: keyof typeof singletonRanges;
    if (prePregnancyBMI < 18.5) {
        category = 'underweight';
    } else if (prePregnancyBMI < 25.0) {
        category = 'normal';
    } else if (prePregnancyBMI < 30.0) {
        category = 'overweight';
    } else {
        category = 'obese';
    }

    const range = ranges[category];
    return {
        minGain: range.min,
        maxGain: range.max,
        weeklyGainSecondThird: {
            min: range.weeklyMin,
            max: range.weeklyMax,
        },
    };
}

/**
 * Calcula la ganancia de peso actual vs esperada.
 * 
 * @param currentWeight - Peso actual en kg
 * @param prePregnancyWeight - Peso pregestacional en kg
 * @param gestationalWeeks - Semanas de gestación
 * @param prePregnancyBMI - IMC pregestacional
 * @param isMultiple - Embarazo gemelar
 */
export function evaluatePregnancyWeightGain(
    currentWeight: number,
    prePregnancyWeight: number,
    gestationalWeeks: number,
    prePregnancyBMI: number,
    isMultiple: boolean = false
): { gain: number; status: 'bajo' | 'adecuado' | 'excesivo'; expectedRange: { min: number; max: number } } {
    const goals = getIOMWeightGainGoals(prePregnancyBMI, isMultiple);
    const actualGain = currentWeight - prePregnancyWeight;

    // Estimación de ganancia esperada a esta semana
    // Primer trimestre: ~0.5-2 kg total
    // Después: ganancia semanal según IOM
    let expectedMin: number;
    let expectedMax: number;

    if (gestationalWeeks <= 13) {
        // Primer trimestre: 0.5-2 kg
        const fraction = gestationalWeeks / 13;
        expectedMin = 0.5 * fraction;
        expectedMax = 2.0 * fraction;
    } else {
        // Segundo y tercer trimestre
        const weeksAfterFirst = gestationalWeeks - 13;
        const firstTrimesterGain = 1.5; // Promedio primer trimestre
        expectedMin = firstTrimesterGain + (weeksAfterFirst * goals.weeklyGainSecondThird.min);
        expectedMax = firstTrimesterGain + (weeksAfterFirst * goals.weeklyGainSecondThird.max);
    }

    let status: 'bajo' | 'adecuado' | 'excesivo';
    if (actualGain < expectedMin * 0.9) {
        status = 'bajo';
    } else if (actualGain > expectedMax * 1.1) {
        status = 'excesivo';
    } else {
        status = 'adecuado';
    }

    return {
        gain: actualGain,
        status,
        expectedRange: { min: expectedMin, max: expectedMax },
    };
}

// ============================================================================
// 2. MÓDULO DE PARÁLISIS CEREBRAL
// ============================================================================

/**
 * Estima la talla usando la longitud de tibia (Fórmula de Stevenson).
 * Para pacientes con parálisis cerebral que no pueden medirse de pie.
 * 
 * @param tibiaLength - Longitud de tibia en cm
 * @returns Talla estimada en cm
 */
export function estimateHeightStevenson(tibiaLength: number): number {
    // Fórmula de Stevenson (1995)
    // Talla (cm) = (3.26 × Longitud Tibia) + 30.8
    return (3.26 * tibiaLength) + 30.8;
}

/**
 * Determina si un paciente con PC está en riesgo nutricional.
 * Basado en curvas de Brooks y nivel GMFCS.
 * 
 * @param gmfcsLevel - Nivel de GMFCS (I-V)
 * @param weightForAgePercentile - Percentil de peso para edad
 * @returns true si está en riesgo nutricional
 */
export function isNutritionalRiskPC(
    gmfcsLevel: GMFCSLevel,
    weightForAgePercentile: number
): boolean {
    // GMFCS I-II: Riesgo si < percentil 5
    // GMFCS III-V: Riesgo si < percentil 20
    const threshold = ['I', 'II'].includes(gmfcsLevel) ? 5 : 20;
    return weightForAgePercentile < threshold;
}

/**
 * Obtiene la descripción del nivel GMFCS.
 */
export function getGMFCSDescription(level: GMFCSLevel): string {
    const descriptions: Record<GMFCSLevel, string> = {
        'I': 'Camina sin limitaciones',
        'II': 'Camina con limitaciones',
        'III': 'Camina con dispositivo de apoyo manual',
        'IV': 'Movilidad propia limitada, puede usar silla motorizada',
        'V': 'Transportado en silla de ruedas manual',
    };
    return descriptions[level];
}

// ============================================================================
// 3. INDICADORES DE RIESGO CARDIOMETABÓLICO
// ============================================================================

/**
 * Calcula el Índice Cintura/Talla (ICT) y su clasificación de riesgo.
 * 
 * @param waist - Circunferencia de cintura en cm
 * @param height - Talla en cm
 * @returns Ratio, nivel de riesgo e interpretación
 */
export function calculateWaistToHeightRatio(
    waist: number,
    height: number
): WaistToHeightResult {
    const ratio = waist / height;

    let risk: RiskLevel;
    let interpretation: string;

    if (ratio < 0.50) {
        risk = 'minimo';
        interpretation = 'Sin riesgo cardiometabólico asociado a adiposidad central';
    } else if (ratio < 0.55) {
        risk = 'bajo';
        interpretation = 'Riesgo cardiometabólico ligeramente elevado';
    } else if (ratio < 0.60) {
        risk = 'moderado';
        interpretation = 'Riesgo cardiometabólico moderado - vigilar';
    } else {
        risk = 'alto';
        interpretation = 'Riesgo cardiometabólico alto - intervención recomendada';
    }

    return { ratio, risk, interpretation };
}

/**
 * Determina si existe obesidad abdominal según criterio Minsal Chile.
 * 
 * @param waist - Circunferencia de cintura en cm
 * @param sex - Sexo del paciente
 * @returns true si hay obesidad abdominal
 */
export function hasAbdominalObesity(
    waist: number,
    sex: 'masculino' | 'femenino'
): boolean {
    const threshold = sex === 'masculino' ? 90 : 80;
    return waist >= threshold;
}

/**
 * Tabla de riesgo para Relación Cintura-Cadera (RCC).
 * Basado en WHO (2008) y literatura epidemiológica.
 */
const WHR_RISK_TABLE = {
    masculino: {
        '20-29': { bajo: 0.83, moderado: 0.88, alto: 0.94 },
        '30-39': { bajo: 0.84, moderado: 0.91, alto: 0.96 },
        '40-49': { bajo: 0.88, moderado: 0.95, alto: 1.00 },
        '50-59': { bajo: 0.90, moderado: 0.96, alto: 1.02 },
        '60+': { bajo: 0.91, moderado: 0.98, alto: 1.03 },
    },
    femenino: {
        '20-29': { bajo: 0.71, moderado: 0.77, alto: 0.82 },
        '30-39': { bajo: 0.72, moderado: 0.78, alto: 0.84 },
        '40-49': { bajo: 0.73, moderado: 0.79, alto: 0.87 },
        '50-59': { bajo: 0.74, moderado: 0.81, alto: 0.88 },
        '60+': { bajo: 0.76, moderado: 0.83, alto: 0.90 },
    },
};

type AgeGroup = '20-29' | '30-39' | '40-49' | '50-59' | '60+';

function getAgeGroup(age: number): AgeGroup {
    if (age < 30) return '20-29';
    if (age < 40) return '30-39';
    if (age < 50) return '40-49';
    if (age < 60) return '50-59';
    return '60+';
}

/**
 * Calcula la Relación Cintura-Cadera (RCC) y su clasificación de riesgo.
 * 
 * @param waist - Circunferencia de cintura en cm
 * @param hip - Circunferencia de cadera en cm
 * @param age - Edad en años
 * @param sex - Sexo del paciente
 * @returns Ratio, nivel de riesgo e interpretación
 */
export function calculateWaistHipRatio(
    waist: number,
    hip: number,
    age: number,
    sex: 'masculino' | 'femenino'
): WaistHipRatioResult {
    const ratio = waist / hip;
    const ageGroup = getAgeGroup(age);
    const thresholds = WHR_RISK_TABLE[sex][ageGroup];

    let risk: RiskLevel;
    let interpretation: string;

    if (ratio < thresholds.bajo) {
        risk = 'bajo';
        interpretation = 'Distribución de grasa saludable';
    } else if (ratio < thresholds.moderado) {
        risk = 'moderado';
        interpretation = 'Riesgo moderado de enfermedad cardiovascular';
    } else if (ratio < thresholds.alto) {
        risk = 'alto';
        interpretation = 'Riesgo alto de enfermedad cardiovascular';
    } else {
        risk = 'muy_alto';
        interpretation = 'Riesgo muy alto - intervención urgente recomendada';
    }

    return { ratio, risk, interpretation };
}

/**
 * Calcula todos los indicadores cardiometabólicos de una vez.
 */
export function calculateCardiometabolicRisk(
    waist: number,
    hip: number,
    height: number,
    age: number,
    sex: 'masculino' | 'femenino'
): {
    waistToHeight: WaistToHeightResult;
    abdominalObesity: boolean;
    waistHipRatio: WaistHipRatioResult;
    overallRisk: RiskLevel;
} {
    const waistToHeight = calculateWaistToHeightRatio(waist, height);
    const abdominalObesity = hasAbdominalObesity(waist, sex);
    const waistHipRatio = calculateWaistHipRatio(waist, hip, age, sex);

    // Overall risk is the highest of all indicators
    const riskOrder: RiskLevel[] = ['minimo', 'bajo', 'moderado', 'alto', 'muy_alto'];
    const risks = [waistToHeight.risk, waistHipRatio.risk];
    if (abdominalObesity) risks.push('alto');

    const overallRisk = risks.reduce((highest, current) => {
        return riskOrder.indexOf(current) > riskOrder.indexOf(highest) ? current : highest;
    }, 'minimo' as RiskLevel);

    return {
        waistToHeight,
        abdominalObesity,
        waistHipRatio,
        overallRisk,
    };
}

// ============================================================================
// 4. SELECTOR INTELIGENTE DE GRASA CORPORAL (SLAUGHTER vs DURNIN)
// ============================================================================

/**
 * Coeficientes para ecuaciones de Slaughter (1988) - Pediatría.
 * Para edades 8-18 años.
 */
const SLAUGHTER_COEFFICIENTS = {
    masculino: {
        'pre-puber': { a: 1.21, b: 0.008, c: -1.7 },
        'puber': { a: 1.21, b: 0.008, c: -3.4 },
        'post-puber': { a: 1.21, b: 0.008, c: -5.5 },
    },
    femenino: {
        // Mujeres usan fórmula diferente
        'pre-puber': { a: 1.33, b: 0.013, c: -2.5 },
        'puber': { a: 1.33, b: 0.013, c: -3.0 },
        'post-puber': { a: 1.33, b: 0.013, c: -3.0 },
    },
};

/**
 * Coeficientes para Durnin & Womersley (1974) - Adultos.
 * Usa la suma de 4 pliegues: bíceps, tríceps, subescapular, suprailiaco.
 */
const DURNIN_COEFFICIENTS = {
    masculino: {
        '17-19': { c: 1.1620, m: 0.0630 },
        '20-29': { c: 1.1631, m: 0.0632 },
        '30-39': { c: 1.1422, m: 0.0544 },
        '40-49': { c: 1.1620, m: 0.0700 },
        '50+': { c: 1.1715, m: 0.0779 },
    },
    femenino: {
        '17-19': { c: 1.1549, m: 0.0678 },
        '20-29': { c: 1.1599, m: 0.0717 },
        '30-39': { c: 1.1423, m: 0.0632 },
        '40-49': { c: 1.1333, m: 0.0612 },
        '50+': { c: 1.1339, m: 0.0645 },
    },
};

type DurninAgeGroup = '17-19' | '20-29' | '30-39' | '40-49' | '50+';

function getDurninAgeGroup(age: number): DurninAgeGroup {
    if (age < 20) return '17-19';
    if (age < 30) return '20-29';
    if (age < 40) return '30-39';
    if (age < 50) return '40-49';
    return '50+';
}

/**
 * Calcula % grasa usando ecuaciones de Slaughter (1988).
 * Diseñado para niños y adolescentes de 8-18 años.
 * 
 * @param triceps - Pliegue tricipital en mm
 * @param subscapular - Pliegue subescapular en mm
 * @param tannerStage - Etapa de maduración
 * @param sex - Sexo del paciente
 * @returns Porcentaje de grasa corporal
 */
export function calculateBodyFatSlaughter(
    triceps: number,
    subscapular: number,
    tannerStage: TannerMaturationStage,
    sex: 'masculino' | 'femenino'
): number {
    const sumSkinfolds = triceps + subscapular;
    const coeffs = SLAUGHTER_COEFFICIENTS[sex][tannerStage];

    // %G = a * (PT + PSE) - b * (PT + PSE)² + c
    let fatPercent = coeffs.a * sumSkinfolds
        - coeffs.b * Math.pow(sumSkinfolds, 2)
        + coeffs.c;

    // Clamp to physiological range
    return Math.max(3, Math.min(50, fatPercent));
}

/**
 * Calcula densidad corporal usando Durnin & Womersley (1974).
 * Para adultos mayores de 18 años.
 * 
 * @param biceps - Pliegue bicipital en mm
 * @param triceps - Pliegue tricipital en mm
 * @param subscapular - Pliegue subescapular en mm
 * @param suprailiac - Pliegue suprailiaco en mm
 * @param age - Edad en años
 * @param sex - Sexo del paciente
 * @returns Densidad corporal en g/cm³
 */
export function calculateDensityDurnin(
    biceps: number,
    triceps: number,
    subscapular: number,
    suprailiac: number,
    age: number,
    sex: 'masculino' | 'femenino'
): number {
    const sumSkinfolds = biceps + triceps + subscapular + suprailiac;
    const logSum = Math.log10(sumSkinfolds);
    const ageGroup = getDurninAgeGroup(age);
    const coeffs = DURNIN_COEFFICIENTS[sex][ageGroup];

    // DC = c - m × log10(suma de pliegues)
    return coeffs.c - (coeffs.m * logSum);
}

/**
 * Convierte densidad corporal a % grasa usando la ecuación de Siri.
 * 
 * @param density - Densidad corporal en g/cm³
 * @returns Porcentaje de grasa corporal
 */
export function densityToFatPercentSiri(density: number): number {
    // Ecuación de Siri (1961): %G = (495 / DC) - 450
    const fatPercent = (495 / density) - 450;
    return Math.max(3, Math.min(50, fatPercent));
}

/**
 * Selector inteligente de grasa corporal.
 * Elige automáticamente entre Slaughter (pediatría) y Durnin-Siri (adultos).
 * 
 * @param age - Edad en años
 * @param tannerStage - Etapa de maduración (requerido para <18 años)
 * @param skinfolds - Objeto con pliegues medidos en mm
 * @param sex - Sexo del paciente
 * @returns Resultado con % grasa, método usado y fórmula
 */
export function calculateBodyFatSmart(
    age: number,
    tannerStage: TannerMaturationStage | null,
    skinfolds: {
        triceps: number;
        subscapular: number;
        biceps?: number;
        suprailiac?: number;
    },
    sex: 'masculino' | 'femenino'
): BodyFatSmartResult {
    // Regla: Si edad 8-18 años -> Slaughter
    //        Si edad > 18 años -> Durnin + Siri

    if (age >= 8 && age <= 18) {
        const stage = tannerStage || 'puber'; // Default a puber si no está especificado
        const percentage = calculateBodyFatSlaughter(
            skinfolds.triceps,
            skinfolds.subscapular,
            stage,
            sex
        );

        return {
            percentage,
            method: 'slaughter',
            formula: `Slaughter (1988) - ${stage}`,
        };
    } else {
        // Adultos: Durnin + Siri
        // Necesitamos 4 pliegues; si faltan, usamos valores aproximados
        const biceps = skinfolds.biceps ?? skinfolds.triceps * 0.6;
        const suprailiac = skinfolds.suprailiac ?? skinfolds.subscapular * 1.2;

        const density = calculateDensityDurnin(
            biceps,
            skinfolds.triceps,
            skinfolds.subscapular,
            suprailiac,
            age,
            sex
        );

        const percentage = densityToFatPercentSiri(density);

        return {
            percentage,
            method: 'durnin_siri',
            formula: 'Durnin & Womersley (1974) + Siri (1961)',
        };
    }
}
