/**
 * safety-alerts.ts
 *
 * Sistema de alertas de seguridad clínica para NutriKallpa.
 * Detecta condiciones críticas que requieren intervención inmediata.
 *
 * Referencias:
 * - MINSA Perú: Norma Técnica de Salud para la Atención Integral de Salud
 * - NRS-2002: Nutritional Risk Screening
 * - ESPEN Guidelines 2017
 */

import { calculateZScore, type Sex } from "./growth-standards";

// ============================================================================
// TYPES
// ============================================================================

export type AlertSeverity = "info" | "warning" | "critical" | "emergency";

export interface SafetyAlert {
    id: string;
    type:
    | "weight_loss"
    | "bmi_extreme"
    | "pathology_risk"
    | "anthropometric_error"
    | "nutritional_risk";
    severity: AlertSeverity;
    title: string;
    message: string;
    recommendation?: string;
    referral?: string;
}

export interface WeightLossCheck {
    isCritical: boolean;
    percentLoss: number;
    timeframeDays: number;
    alert?: SafetyAlert;
}

export interface BMICheck {
    isCritical: boolean;
    bmi: number;
    category: "incompatible" | "severe_underweight" | "normal" | "severe_obesity";
    alert?: SafetyAlert;
}

// ============================================================================
// CONSTANTS - CLINICAL THRESHOLDS
// ============================================================================

/**
 * Umbrales de pérdida de peso según NRS-2002 y ESPEN
 */
export const WEIGHT_LOSS_THRESHOLDS = {
    /** Pérdida >5% en 1 mes = Desnutrición moderada */
    ONE_MONTH_MODERATE: { days: 30, percent: 5 },
    /** Pérdida >10% en 6 meses = Desnutrición severa */
    SIX_MONTHS_SEVERE: { days: 180, percent: 10 },
    /** Pérdida >2% en 1 semana = Alerta temprana */
    ONE_WEEK_WARNING: { days: 7, percent: 2 },
} as const;

/**
 * Umbrales de IMC según OMS y criterios clínicos
 */
export const BMI_THRESHOLDS = {
    /** IMC incompatible con la vida */
    INCOMPATIBLE_LOW: 12,
    INCOMPATIBLE_HIGH: 60,
    /** Desnutrición severa */
    SEVERE_UNDERWEIGHT: 16,
    /** Obesidad mórbida (Clase III) */
    MORBID_OBESITY: 40,
} as const;

/**
 * Patologías de alto riesgo cardiovascular
 */
export const HIGH_RISK_PATHOLOGIES = [
    "hipertension",
    "hipertensión",
    "diabetes",
    "diabetes mellitus",
    "enfermedad coronaria",
    "insuficiencia cardiaca",
    "iam",
    "infarto",
    "arritmia",
    "dislipidemia",
    "hiperlipidemia",
] as const;

// ============================================================================
// WEIGHT LOSS DETECTION
// ============================================================================

/**
 * Verifica si el paciente ha experimentado pérdida de peso crítica.
 * Implementa criterios NRS-2002 y ESPEN.
 *
 * @param currentWeight - Peso actual en kg
 * @param previousWeight - Peso anterior en kg
 * @param daysElapsed - Días transcurridos entre mediciones
 * @returns Resultado del chequeo con alerta si aplica
 */
export function checkCriticalWeightLoss(
    currentWeight: number,
    previousWeight: number,
    daysElapsed: number
): WeightLossCheck {
    // Validar inputs
    if (
        !currentWeight ||
        !previousWeight ||
        currentWeight <= 0 ||
        previousWeight <= 0
    ) {
        return { isCritical: false, percentLoss: 0, timeframeDays: daysElapsed };
    }

    // Calcular pérdida porcentual
    const weightDiff = previousWeight - currentWeight;
    const percentLoss = (weightDiff / previousWeight) * 100;

    // NUEVO: Detectar ganancia de peso rápida (posible edema, ICC, síndrome nefrótico)
    if (percentLoss < 0) {
        const percentGain = Math.abs(percentLoss);

        // Ganancia >5% en 1 semana es clínicamente significativa
        if (daysElapsed <= 7 && percentGain >= 5) {
            return {
                isCritical: true,
                percentLoss: -percentGain, // Negativo indica ganancia
                timeframeDays: daysElapsed,
                alert: {
                    id: "weight_gain_rapid_critical",
                    type: "weight_loss", // Reusa el tipo para compatibilidad
                    severity: "critical",
                    title: "⚠️ Ganancia de Peso Rápida",
                    message: `Ganancia de ${percentGain.toFixed(1)}% del peso corporal en ${daysElapsed} días. Posible retención de líquidos.`,
                    recommendation:
                        "Evaluar edema en miembros inferiores. Descartar ICC, enfermedad renal, o efectos de medicación (corticoides, AINES).",
                    referral:
                        "Derivar a medicina interna si hay signos de insuficiencia cardíaca o renal.",
                },
            };
        }

        // Ganancia >3% en 1 semana - advertencia temprana
        if (daysElapsed <= 7 && percentGain >= 3) {
            return {
                isCritical: false,
                percentLoss: -percentGain,
                timeframeDays: daysElapsed,
                alert: {
                    id: "weight_gain_rapid_warning",
                    type: "weight_loss",
                    severity: "warning",
                    title: "⚡ Ganancia de Peso Notable",
                    message: `Ganancia de ${percentGain.toFixed(1)}% en ${daysElapsed} días. Monitorear tendencia.`,
                    recommendation:
                        "Verificar ingesta de sodio, hidratación, y posibles efectos de medicación. Revisar adherencia a dieta.",
                },
            };
        }

        // Ganancia sin alerta
        return { isCritical: false, percentLoss: 0, timeframeDays: daysElapsed };
    }

    // Chequear criterios de severidad
    const thresholds = WEIGHT_LOSS_THRESHOLDS;

    // Pérdida >5% en 1 mes (30 días)
    if (
        daysElapsed <= thresholds.ONE_MONTH_MODERATE.days &&
        percentLoss >= thresholds.ONE_MONTH_MODERATE.percent
    ) {
        return {
            isCritical: true,
            percentLoss: Math.round(percentLoss * 10) / 10,
            timeframeDays: daysElapsed,
            alert: {
                id: "weight_loss_1m_critical",
                type: "weight_loss",
                severity: "critical",
                title: "⚠️ Pérdida de Peso Crítica",
                message: `Pérdida de ${percentLoss.toFixed(1)}% del peso corporal en ${daysElapsed} días. Esto supera el umbral del 5% en 1 mes.`,
                recommendation:
                    "Evaluar causas de pérdida de peso. Considerar suplementación nutricional inmediata.",
                referral:
                    "Referir a especialista en nutrición clínica o medicina interna.",
            },
        };
    }

    // Pérdida >10% en 6 meses (180 días)
    if (
        daysElapsed <= thresholds.SIX_MONTHS_SEVERE.days &&
        percentLoss >= thresholds.SIX_MONTHS_SEVERE.percent
    ) {
        return {
            isCritical: true,
            percentLoss: Math.round(percentLoss * 10) / 10,
            timeframeDays: daysElapsed,
            alert: {
                id: "weight_loss_6m_severe",
                type: "weight_loss",
                severity: "emergency",
                title: "🚨 Pérdida de Peso Severa",
                message: `Pérdida de ${percentLoss.toFixed(1)}% del peso corporal en ${daysElapsed} días. Alto riesgo de desnutrición severa.`,
                recommendation:
                    "Iniciar protocolo de recuperación nutricional. Descartar patología subyacente (neoplasia, infección, enfermedad gastrointestinal).",
                referral:
                    "Derivación urgente a servicio de nutrición hospitalaria y medicina interna.",
            },
        };
    }

    // Pérdida >2% en 1 semana - alerta temprana
    if (
        daysElapsed <= thresholds.ONE_WEEK_WARNING.days &&
        percentLoss >= thresholds.ONE_WEEK_WARNING.percent
    ) {
        return {
            isCritical: false,
            percentLoss: Math.round(percentLoss * 10) / 10,
            timeframeDays: daysElapsed,
            alert: {
                id: "weight_loss_1w_warning",
                type: "weight_loss",
                severity: "warning",
                title: "⚡ Pérdida de Peso Rápida",
                message: `Pérdida de ${percentLoss.toFixed(1)}% en ${daysElapsed} días. Monitorear tendencia.`,
                recommendation:
                    "Verificar ingesta calórica y posibles causas (estrés, enfermedad aguda, cambio de actividad).",
            },
        };
    }

    return {
        isCritical: false,
        percentLoss: Math.round(percentLoss * 10) / 10,
        timeframeDays: daysElapsed,
    };
}

// ============================================================================
// BMI SAFETY CHECK
// ============================================================================

/**
 * Verifica si el IMC está en rangos peligrosos o incompatibles con la vida.
 *
 * @param weight - Peso en kg
 * @param height - Talla en cm
 * @returns Resultado del chequeo con alerta si aplica
 */
export function checkDangerousBMI(weight: number, height: number): BMICheck {
    // Validar inputs
    if (!weight || !height || weight <= 0 || height <= 0) {
        return { isCritical: false, bmi: 0, category: "normal" };
    }

    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);
    const roundedBMI = Math.round(bmi * 10) / 10;

    // IMC incompatible con la vida (<12 o >60)
    if (bmi < BMI_THRESHOLDS.INCOMPATIBLE_LOW) {
        return {
            isCritical: true,
            bmi: roundedBMI,
            category: "incompatible",
            alert: {
                id: "bmi_incompatible_low",
                type: "bmi_extreme",
                severity: "emergency",
                title: "🚨 IMC CRÍTICO - Verificar Mediciones",
                message: `IMC de ${roundedBMI} kg/m² está por debajo del umbral compatible con la vida (${BMI_THRESHOLDS.INCOMPATIBLE_LOW}).`,
                recommendation:
                    "VERIFICAR URGENTEMENTE: 1) Calibración de báscula, 2) Técnica de medición de talla, 3) Si es correcto, hospitalización inmediata.",
                referral: "Emergencia médica - Hospitalización para estabilización.",
            },
        };
    }

    if (bmi > BMI_THRESHOLDS.INCOMPATIBLE_HIGH) {
        return {
            isCritical: true,
            bmi: roundedBMI,
            category: "incompatible",
            alert: {
                id: "bmi_incompatible_high",
                type: "bmi_extreme",
                severity: "emergency",
                title: "🚨 IMC EXTREMO - Verificar Mediciones",
                message: `IMC de ${roundedBMI} kg/m² excede el rango fisiológico típico (${BMI_THRESHOLDS.INCOMPATIBLE_HIGH}).`,
                recommendation:
                    "Verificar calibración de equipos. Si es correcto, requiere manejo multidisciplinario de obesidad.",
                referral:
                    "Derivación a equipo de cirugía bariátrica y endocrinología.",
            },
        };
    }

    // Desnutrición severa (IMC <16)
    if (bmi < BMI_THRESHOLDS.SEVERE_UNDERWEIGHT) {
        return {
            isCritical: true,
            bmi: roundedBMI,
            category: "severe_underweight",
            alert: {
                id: "bmi_severe_underweight",
                type: "bmi_extreme",
                severity: "critical",
                title: "⚠️ Desnutrición Severa",
                message: `IMC de ${roundedBMI} kg/m² indica desnutrición severa (OMS Grado III).`,
                recommendation:
                    "Iniciar rehabilitación nutricional con incremento calórico gradual. Monitorear síndrome de realimentación.",
                referral: "Referir a nutrición clínica hospitalaria.",
            },
        };
    }

    // Obesidad mórbida (IMC ≥40)
    if (bmi >= BMI_THRESHOLDS.MORBID_OBESITY) {
        return {
            isCritical: false,
            bmi: roundedBMI,
            category: "severe_obesity",
            alert: {
                id: "bmi_morbid_obesity",
                type: "bmi_extreme",
                severity: "warning",
                title: "⚡ Obesidad Mórbida (Clase III)",
                message: `IMC de ${roundedBMI} kg/m² corresponde a obesidad mórbida con alto riesgo de comorbilidades.`,
                recommendation:
                    "Manejo integral: dieta hipocalórica supervisada, actividad física adaptada, evaluación psicológica.",
                referral: "Considerar evaluación para cirugía bariátrica.",
            },
        };
    }

    return { isCritical: false, bmi: roundedBMI, category: "normal" };
}

// ============================================================================
// PATHOLOGY + OBESITY RISK
// ============================================================================

/**
 * Evalúa el riesgo combinado de patología cardiovascular y obesidad.
 *
 * @param bmi - Índice de masa corporal
 * @param patologias - Lista de patologías del paciente
 * @returns Alerta si hay riesgo combinado alto
 */
export function checkPathologyObesityRisk(
    bmi: number,
    patologias: string[]
): SafetyAlert | null {
    if (!patologias || patologias.length === 0 || bmi < 30) {
        return null;
    }

    // Normalizar patologías para búsqueda
    const normalizedPatologias = patologias.map((p) => p.toLowerCase().trim());

    // Buscar patologías de alto riesgo
    const hasHighRiskPathology = normalizedPatologias.some((p) =>
        HIGH_RISK_PATHOLOGIES.some((hrp) => p.includes(hrp))
    );

    if (hasHighRiskPathology && bmi >= 30) {
        const riskLevel = bmi >= 40 ? "muy alto" : bmi >= 35 ? "alto" : "elevado";

        return {
            id: "pathology_obesity_combined",
            type: "pathology_risk",
            severity: bmi >= 35 ? "critical" : "warning",
            title: `⚡ Riesgo Cardiovascular ${riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}`,
            message: `Paciente con obesidad (IMC ${bmi.toFixed(1)}) y patología cardiovascular. Riesgo combinado ${riskLevel}.`,
            recommendation: `Priorizar reducción de peso. Meta inicial: -5-10% del peso corporal. Control estricto de presión arterial y glicemia.`,
            referral:
                bmi >= 35
                    ? "Derivar a cardiología y endocrinología para manejo conjunto."
                    : "Seguimiento cercano con médico tratante.",
        };
    }

    return null;
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

export interface SafetyCheckInput {
    currentWeight: number;
    previousWeight?: number;
    daysElapsed?: number;
    height: number;
    patologias?: string[];
}

/**
 * Ejecuta todos los chequeos de seguridad y retorna las alertas encontradas.
 *
 * @param input - Datos del paciente para evaluación
 * @returns Lista de alertas de seguridad ordenadas por severidad
 */
export function generateSafetyAlerts(input: SafetyCheckInput): SafetyAlert[] {
    const alerts: SafetyAlert[] = [];

    // 1. Chequeo de IMC
    const bmiCheck = checkDangerousBMI(input.currentWeight, input.height);
    if (bmiCheck.alert) {
        alerts.push(bmiCheck.alert);
    }

    // 2. Chequeo de pérdida de peso (si hay datos previos)
    if (input.previousWeight && input.daysElapsed && input.daysElapsed > 0) {
        const weightCheck = checkCriticalWeightLoss(
            input.currentWeight,
            input.previousWeight,
            input.daysElapsed
        );
        if (weightCheck.alert) {
            alerts.push(weightCheck.alert);
        }
    }

    // 3. Chequeo de patología + obesidad
    if (input.patologias && input.patologias.length > 0) {
        const bmi = input.currentWeight / Math.pow(input.height / 100, 2);
        const pathoCheck = checkPathologyObesityRisk(bmi, input.patologias);
        if (pathoCheck) {
            alerts.push(pathoCheck);
        }
    }

    // Ordenar por severidad (emergency > critical > warning > info)
    const severityOrder: Record<AlertSeverity, number> = {
        emergency: 0,
        critical: 1,
        warning: 2,
        info: 3,
    };

    return alerts.sort(
        (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );
}

// ============================================================================
// PEDIATRIC BMI SAFETY CHECK (Z-Scores OMS)
// ============================================================================

export interface PediatricBMICheck {
    isCritical: boolean;
    bmi: number;
    zScore: number;
    category: "severe_wasting" | "wasting" | "normal" | "overweight" | "obesity";
    alert?: SafetyAlert;
}

/**
 * Umbrales de Z-Score para IMC pediátrico según OMS.
 * Estos son aproximados; para precisión total se requieren las tablas LMS por edad/sexo.
 */
const PEDIATRIC_BMI_THRESHOLDS = {
    SEVERE_WASTING: -3,    // Desnutrición aguda severa
    WASTING: -2,           // Desnutrición aguda moderada
    NORMAL_LOW: -2,
    NORMAL_HIGH: 1,
    OVERWEIGHT: 2,         // Sobrepeso
    OBESITY: 3,            // Obesidad
} as const;

/**
 * Verifica si el IMC de un niño/adolescente está en rangos peligrosos.
 * Usa Z-Scores exactos según estándares OMS (Tablas LMS).
 *
 * @param weight - Peso en kg
 * @param height - Talla en cm
 * @param ageMonths - Edad en meses
 * @param sex - Sexo del paciente
 * @returns Resultado del chequeo con alerta si aplica
 */
export function checkPediatricBMI(
    weight: number,
    height: number,
    ageMonths: number,
    sex: "male" | "female"
): PediatricBMICheck {
    // Validar inputs
    if (!weight || !height || weight <= 0 || height <= 0 || ageMonths < 0) {
        return { isCritical: false, bmi: 0, zScore: 0, category: "normal" };
    }

    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);
    const roundedBMI = Math.round(bmi * 10) / 10;

    // Calcular Z-Score exacto usando tablas LMS
    const bfaResult = calculateZScore(bmi, ageMonths, sex as Sex, 'bfa');

    if (!bfaResult) {
        return { isCritical: false, bmi: roundedBMI, zScore: 0, category: "normal" };
    }

    const zScore = bfaResult.zScore;
    const roundedZ = Math.round(zScore * 10) / 10;

    const ageYears = Math.floor(ageMonths / 12);

    // Desnutrición aguda severa (Z < -3)
    if (zScore < PEDIATRIC_BMI_THRESHOLDS.SEVERE_WASTING) {
        return {
            isCritical: true,
            bmi: roundedBMI,
            zScore: roundedZ,
            category: "severe_wasting",
            alert: {
                id: "pediatric_bmi_severe_wasting",
                type: "bmi_extreme",
                severity: "emergency",
                title: "🚨 Desnutrición Aguda Severa (Z < -3)",
                message: `Niño de ${ageYears} años con IMC ${roundedBMI} (Z-score: ${roundedZ}). Indica desnutrición aguda severa (Marasmo/Kwashiorkor).`,
                recommendation:
                    "Iniciar protocolo de alimentación terapéutica F-75/F-100. Evaluar complicaciones médicas. Descartar patología subyacente.",
                referral:
                    "HOSPITALIZACIÓN URGENTE para recuperación nutricional supervisada.",
            },
        };
    }

    // Desnutrición aguda moderada (Z < -2)
    if (zScore < PEDIATRIC_BMI_THRESHOLDS.WASTING) {
        return {
            isCritical: true,
            bmi: roundedBMI,
            zScore: roundedZ,
            category: "wasting",
            alert: {
                id: "pediatric_bmi_wasting",
                type: "bmi_extreme",
                severity: "critical",
                title: "⚠️ Desnutrición Aguda Moderada (Z < -2)",
                message: `Niño de ${ageYears} años con IMC ${roundedBMI} (Z-score: ${roundedZ}). Indica emaciación (wasting).`,
                recommendation:
                    "Iniciar suplementación nutricional intensiva. Evaluar seguridad alimentaria familiar. Seguimiento semanal.",
                referral:
                    "Derivar a programa de recuperación nutricional ambulatoria.",
            },
        };
    }

    // Obesidad infantil (Z > +3)
    if (zScore > PEDIATRIC_BMI_THRESHOLDS.OBESITY) {
        return {
            isCritical: false,
            bmi: roundedBMI,
            zScore: roundedZ,
            category: "obesity",
            alert: {
                id: "pediatric_bmi_obesity",
                type: "bmi_extreme",
                severity: "warning",
                title: "⚡ Obesidad Infantil (Z > +3)",
                message: `Niño de ${ageYears} años con IMC ${roundedBMI} (Z-score: ${roundedZ}). Indica obesidad según OMS.`,
                recommendation:
                    "Plan de alimentación saludable familiar. Incrementar actividad física. Evaluar resistencia a insulina (HOMA-IR).",
                referral:
                    "Considerar evaluación endocrinológica si hay acantosis nigricans o historia familiar de diabetes.",
            },
        };
    }

    // Sobrepeso (Z > +2)
    if (zScore > PEDIATRIC_BMI_THRESHOLDS.OVERWEIGHT) {
        return {
            isCritical: false,
            bmi: roundedBMI,
            zScore: roundedZ,
            category: "overweight",
            alert: {
                id: "pediatric_bmi_overweight",
                type: "bmi_extreme",
                severity: "info",
                title: "ℹ️ Sobrepeso Infantil (Z > +2)",
                message: `Niño de ${ageYears} años con IMC ${roundedBMI} (Z-score: ${roundedZ}). Indica sobrepeso según OMS.`,
                recommendation:
                    "Promoción de hábitos saludables. Reducir bebidas azucaradas y ultraprocesados. Fomentar deporte.",
            },
        };
    }

    return { isCritical: false, bmi: roundedBMI, zScore: roundedZ, category: "normal" };
}
