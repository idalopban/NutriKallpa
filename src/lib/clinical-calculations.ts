/**
 * clinical-calculations.ts
 * 
 * Cálculos clínicos avanzados basados en el Manual de Evaluación Nutricional de la UDD.
 * Incluye: Evaluación geriátrica, soporte para amputaciones, pediatría avanzada y tamizaje nutricional.
 */

// ============================================================================
// TYPES
// ============================================================================

export type AmputationType =
    | 'mano_izq' | 'mano_der'
    | 'antebrazo_izq' | 'antebrazo_der'
    | 'brazo_izq' | 'brazo_der'
    | 'pie_izq' | 'pie_der'
    | 'pierna_bajo_rodilla_izq' | 'pierna_bajo_rodilla_der'
    | 'pierna_completa_izq' | 'pierna_completa_der';

export type TannerStage = 1 | 2 | 3 | 4 | 5;

export interface GeriatricEstimationInput {
    circunferenciaPantorrilla: number; // cm
    alturaRodilla: number; // cm
    circunferenciaBrazo: number; // cm
    pliegueSubescapular: number; // mm
    edad: number;
    sexo: 'masculino' | 'femenino';
}

export interface PediatricAgeInput {
    fechaNacimiento: Date;
    semanasGestacion?: number; // Para prematuros
    tannerStage?: TannerStage; // Para adolescentes 8-15 años
}

export interface MNASFInput {
    // Q1: Ingesta alimentaria (0-2)
    ingestaAlimentaria: 0 | 1 | 2;
    // Q2: Pérdida de peso (0-3)
    perdidaPeso: 0 | 1 | 2 | 3;
    // Q3: Movilidad (0-2)
    movilidad: 0 | 1 | 2;
    // Q4: Enfermedad aguda/estrés (0-2)
    estresAgudo: 0 | 2;
    // Q5: Problemas neuropsicológicos (0-2)
    problemasNeuropsicologicos: 0 | 1 | 2;
    // Q6: IMC o Circunferencia Pantorrilla (0-3)
    imcOPantorrilla: 0 | 1 | 2 | 3;
}

export type MNASFClassification = 'normal' | 'riesgo_desnutricion' | 'desnutricion';

export interface BMIClassification {
    category: string;
    isGeriatric: boolean;
    riskLevel: 'bajo' | 'normal' | 'elevado' | 'alto' | 'muy_alto';
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Porcentajes de peso corporal por segmento amputado
 * Fuente: Osterkamp (1995), Manual UDD
 */
export const AMPUTATION_PERCENTAGES: Record<AmputationType, number> = {
    mano_izq: 0.007,
    mano_der: 0.007,
    antebrazo_izq: 0.016,
    antebrazo_der: 0.016,
    brazo_izq: 0.05,
    brazo_der: 0.05,
    pie_izq: 0.015,
    pie_der: 0.015,
    pierna_bajo_rodilla_izq: 0.044,
    pierna_bajo_rodilla_der: 0.044,
    pierna_completa_izq: 0.16,
    pierna_completa_der: 0.16,
};

/**
 * Etiquetas amigables para tipos de amputación
 */
export const AMPUTATION_LABELS: Record<AmputationType, string> = {
    mano_izq: 'Mano izquierda (0.7%)',
    mano_der: 'Mano derecha (0.7%)',
    antebrazo_izq: 'Antebrazo izquierdo (1.6%)',
    antebrazo_der: 'Antebrazo derecho (1.6%)',
    brazo_izq: 'Brazo completo izq. (5%)',
    brazo_der: 'Brazo completo der. (5%)',
    pie_izq: 'Pie izquierdo (1.5%)',
    pie_der: 'Pie derecho (1.5%)',
    pierna_bajo_rodilla_izq: 'Pierna bajo rodilla izq. (4.4%)',
    pierna_bajo_rodilla_der: 'Pierna bajo rodilla der. (4.4%)',
    pierna_completa_izq: 'Pierna completa izq. (16%)',
    pierna_completa_der: 'Pierna completa der. (16%)',
};

/**
 * Rangos de IMC estándar (adultos 18-64 años)
 */
const BMI_RANGES_STANDARD = {
    bajo_peso: { max: 18.5, label: 'Bajo peso' },
    normal: { min: 18.5, max: 24.9, label: 'Normal' },
    sobrepeso: { min: 25, max: 29.9, label: 'Sobrepeso' },
    obesidad_1: { min: 30, max: 34.9, label: 'Obesidad Grado I' },
    obesidad_2: { min: 35, max: 39.9, label: 'Obesidad Grado II' },
    obesidad_3: { min: 40, label: 'Obesidad Grado III' },
};

/**
 * Rangos de IMC geriátrico (≥65 años) - OMS/ESPEN
 */
const BMI_RANGES_GERIATRIC = {
    bajo_peso: { max: 22.9, label: 'Bajo peso' },
    normal: { min: 23, max: 27.9, label: 'Normal' },
    sobrepeso: { min: 28, max: 31.9, label: 'Sobrepeso' },
    obesidad: { min: 32, label: 'Obesidad' },
};

// ============================================================================
// 1. EVALUACIÓN GERIÁTRICA - FÓRMULAS DE CHUMLEA
// ============================================================================

/**
 * Estima el peso corporal usando las fórmulas de Chumlea (1988)
 * Para pacientes postrados o que no pueden pesarse en balanza.
 * 
 * @param input - Medidas antropométricas y datos del paciente
 * @returns Peso estimado en kg
 */
export function estimateWeightChumlea(input: GeriatricEstimationInput): number {
    const { circunferenciaPantorrilla, alturaRodilla, circunferenciaBrazo, pliegueSubescapular, edad, sexo } = input;

    if (sexo === 'masculino') {
        // Fórmula Chumlea para hombres
        return (
            (0.98 * circunferenciaPantorrilla) +
            (1.16 * alturaRodilla) +
            (1.73 * circunferenciaBrazo) +
            (0.37 * pliegueSubescapular) -
            (0.16 * edad) -
            81.69
        );
    } else {
        // Fórmula Chumlea para mujeres
        return (
            (1.27 * circunferenciaPantorrilla) +
            (0.87 * alturaRodilla) +
            (0.98 * circunferenciaBrazo) +
            (0.4 * pliegueSubescapular) -
            (0.16 * edad) -
            62.35
        );
    }
}

/**
 * Estima la talla usando altura de rodilla (Chumlea, 1985)
 * Para pacientes >60 años que no pueden pararse.
 * 
 * @param alturaRodilla - Altura de rodilla en cm
 * @param edad - Edad en años
 * @param sexo - Sexo del paciente
 * @returns Talla estimada en cm
 */
export function estimateHeightFromKnee(
    alturaRodilla: number,
    edad: number,
    sexo: 'masculino' | 'femenino'
): number {
    if (sexo === 'masculino') {
        return 64.19 - (0.04 * edad) + (2.02 * alturaRodilla);
    } else {
        return 84.88 - (0.24 * edad) + (1.83 * alturaRodilla);
    }
}

/**
 * Clasifica el IMC considerando la edad del paciente.
 * Para ≥65 años usa rangos geriátricos (23-27.9 como normal).
 * 
 * @param bmi - Índice de Masa Corporal
 * @param edad - Edad en años
 * @returns Clasificación con categoría y nivel de riesgo
 */
export function classifyBMIByAge(bmi: number, edad: number, bodyFat?: number, sexo?: 'masculino' | 'femenino', activityLevel?: string): BMIClassification {
    const isGeriatric = edad >= 65;
    const isPediatric = edad < 18;

    // 1. PEDIATRIC CHECK (WHO Growth Standards)
    // Avoid diagnosing "Underweight" on healthy children using adult ranges
    if (isPediatric) {
        // NOTE: Ideally this should return Z-Score diagnosis, but for this function signature
        // we map it to clinical terms safe for children.
        return {
            category: 'Evaluación Pediátrica (Ver Z-Score)',
            isGeriatric: false,
            riskLevel: 'normal'
        };
    }

    // 2. FEMALE ATHLETE TRIAD CHECK (Red Alert)
    // Low body fat + High Activity in Females = Risk of Amenorrhea/Bone Loss
    if (sexo === 'femenino' && bodyFat !== undefined && bodyFat < 12) {
        if (activityLevel === 'intensa' || activityLevel === 'muy_intensa' || activityLevel === 'active' || activityLevel === 'very_active') {
            return {
                category: '🔴 RIESGO TRIADA ATLETA (Grasa <12%)',
                isGeriatric,
                riskLevel: 'muy_alto'
            };
        }
    }

    // 3. "FIT-FAT" PARADOX (Athletes)
    // Men < 18% fat, Women < 25% fat (Approximate athletic thresholds)
    // Only applies if BMI is in overweight/obesity range (>25)
    if (bodyFat !== undefined && bmi >= 25) {
        // We lack sex properly here usually, but if provided use it, else assume male threshold (safer)
        const fatThreshold = sexo === 'femenino' ? 25 : 18;

        if (bodyFat < fatThreshold) {
            return { category: 'Sobrepeso Muscular (Atleta)', isGeriatric, riskLevel: 'bajo' };
        }
    }

    if (isGeriatric) {
        // Rangos geriátricos
        if (bmi < 23) {
            return { category: 'Bajo peso', isGeriatric: true, riskLevel: 'elevado' };
        } else if (bmi >= 23 && bmi < 28) {
            return { category: 'Normal', isGeriatric: true, riskLevel: 'normal' };
        } else if (bmi >= 28 && bmi < 32) {
            return { category: 'Sobrepeso', isGeriatric: true, riskLevel: 'elevado' };
        } else {
            return { category: 'Obesidad', isGeriatric: true, riskLevel: 'alto' };
        }
    } else {
        // Rangos estándar (adultos 18-64)
        if (bmi < 18.5) {
            return { category: 'Bajo peso', isGeriatric: false, riskLevel: 'elevado' };
        } else if (bmi >= 18.5 && bmi < 25) {
            return { category: 'Normal', isGeriatric: false, riskLevel: 'normal' };
        } else if (bmi >= 25 && bmi < 30) {
            return { category: 'Sobrepeso', isGeriatric: false, riskLevel: 'elevado' };
        } else if (bmi >= 30 && bmi < 35) {
            return { category: 'Obesidad Grado I', isGeriatric: false, riskLevel: 'alto' };
        } else if (bmi >= 35 && bmi < 40) {
            return { category: 'Obesidad Grado II', isGeriatric: false, riskLevel: 'muy_alto' };
        } else {
            return { category: 'Obesidad Grado III', isGeriatric: false, riskLevel: 'muy_alto' };
        }
    }
}

// ============================================================================
// 2. SOPORTE PARA AMPUTACIONES
// ============================================================================

/**
 * Calcula el porcentaje total de peso corporal amputado.
 * 
 * @param amputations - Lista de segmentos amputados
 * @returns Porcentaje total (ej: 0.16 para 16%)
 */
export function calculateTotalAmputationPercentage(amputations: AmputationType[]): number {
    return amputations.reduce((total, amp) => total + AMPUTATION_PERCENTAGES[amp], 0);
}

/**
 * Calcula el peso estimado real del paciente si tuviera todos sus miembros.
 * Fórmula: Peso Estimado = Peso Actual / (1 - porcentaje_amputado)
 * 
 * @param pesoActual - Peso medido actualmente (con amputación)
 * @param amputations - Lista de segmentos amputados
 * @returns Peso corporal estimado completo en kg
 */
export function calculateCorrectedWeight(pesoActual: number, amputations: AmputationType[]): number {
    const totalPercentage = calculateTotalAmputationPercentage(amputations);

    if (totalPercentage >= 1) {
        console.warn('Porcentaje de amputación inválido (≥100%)');
        return pesoActual;
    }

    return pesoActual / (1 - totalPercentage);
}

/**
 * Calcula el peso ideal ajustado para pacientes con amputaciones.
 * Fórmula: Peso Ideal Ajustado = Peso Ideal × (1 - porcentaje_amputado)
 * 
 * @param pesoIdeal - Peso ideal calculado (sin considerar amputación)
 * @param amputations - Lista de segmentos amputados
 * @returns Peso ideal ajustado en kg
 */
export function calculateAdjustedIdealWeight(pesoIdeal: number, amputations: AmputationType[]): number {
    const totalPercentage = calculateTotalAmputationPercentage(amputations);
    return pesoIdeal * (1 - totalPercentage);
}

// ============================================================================
// 3. PEDIATRÍA AVANZADA
// ============================================================================

/**
 * Tabla de edad biológica aproximada según estadío de Tanner
 * Basado en promedios poblacionales latinoamericanos.
 */
const TANNER_AGE_MAP = {
    masculino: {
        1: 10,   // Prepuberal
        2: 11.5, // Inicio pubertad
        3: 13,   // Pubertad media
        4: 14.5, // Pubertad avanzada
        5: 16,   // Desarrollo completo
    },
    femenino: {
        1: 9,    // Prepuberal
        2: 10.5, // Inicio pubertad
        3: 12,   // Pubertad media
        4: 13,   // Pubertad avanzada
        5: 14.5, // Desarrollo completo
    },
};

/**
 * Calcula la edad cronológica en años decimales.
 * 
 * @param fechaNacimiento - Fecha de nacimiento
 * @returns Edad en años con decimales
 */
export function calculateChronologicalAge(fechaNacimiento: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - fechaNacimiento.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays / 365.25;
}

/**
 * Calcula la edad biológica basada en estadío de Tanner.
 * Para adolescentes entre 8-15 años.
 * 
 * @param tannerStage - Estadío de Tanner (1-5)
 * @param sexo - Sexo del paciente
 * @returns Edad biológica estimada en años
 */
export function calculateBiologicalAge(
    tannerStage: TannerStage,
    sexo: 'masculino' | 'femenino'
): number {
    return TANNER_AGE_MAP[sexo][tannerStage];
}

/**
 * Determina si se debe usar la edad biológica en lugar de la cronológica.
 * Regla: Si diferencia > 1 año, usar edad biológica.
 * 
 * @param edadCronologica - Edad cronológica en años
 * @param edadBiologica - Edad biológica estimada
 * @returns true si se debe usar edad biológica
 */
export function shouldUseBiologicalAge(edadCronologica: number, edadBiologica: number): boolean {
    return Math.abs(edadCronologica - edadBiologica) > 1;
}

/**
 * Calcula la edad corregida para prematuros (<37 semanas).
 * Se usa hasta los 2 años de edad.
 * 
 * @param fechaNacimiento - Fecha de nacimiento
 * @param semanasGestacion - Semanas de gestación al nacer
 * @returns Edad corregida en meses, o null si no aplica
 */
export function calculateCorrectedAge(
    fechaNacimiento: Date,
    semanasGestacion: number
): { edadCorregidaMeses: number; esPrematuro: boolean } | null {
    const edadMeses = calculateChronologicalAge(fechaNacimiento) * 12;

    // Solo aplica para <37 semanas y menores de 24 meses
    if (semanasGestacion >= 37 || edadMeses > 24) {
        return null;
    }

    const semanasPrematuras = 40 - semanasGestacion;
    const mesesCorreccion = semanasPrematuras / 4.33;
    const edadCorregidaMeses = Math.max(0, edadMeses - mesesCorreccion);

    return {
        edadCorregidaMeses,
        esPrematuro: true,
    };
}

/**
 * Determina la edad a usar para cálculos pediátricos.
 * Considera: prematuridad, estadío de Tanner, o edad cronológica.
 * 
 * @param input - Datos pediátricos del paciente
 * @param sexo - Sexo del paciente
 * @returns Edad a usar en años y el tipo de edad
 */
export function getEffectivePediatricAge(
    input: PediatricAgeInput,
    sexo: 'masculino' | 'femenino'
): { age: number; type: 'cronologica' | 'corregida' | 'biologica' } {
    const edadCronologica = calculateChronologicalAge(input.fechaNacimiento);

    // 1. Verificar prematuridad (para <2 años)
    if (input.semanasGestacion && input.semanasGestacion < 37) {
        const corrected = calculateCorrectedAge(input.fechaNacimiento, input.semanasGestacion);
        if (corrected) {
            return { age: corrected.edadCorregidaMeses / 12, type: 'corregida' };
        }
    }

    // 2. Verificar Tanner (para 8-15 años)
    if (input.tannerStage && edadCronologica >= 8 && edadCronologica <= 15) {
        const edadBiologica = calculateBiologicalAge(input.tannerStage, sexo);
        if (shouldUseBiologicalAge(edadCronologica, edadBiologica)) {
            return { age: edadBiologica, type: 'biologica' };
        }
    }

    // 3. Usar edad cronológica por defecto
    return { age: edadCronologica, type: 'cronologica' };
}

// ============================================================================
// 4. TAMIZAJE NUTRICIONAL - MNA-SF
// ============================================================================

/**
 * Calcula el puntaje total del Mini Nutritional Assessment Short Form (MNA-SF).
 * Herramienta de tamizaje para adultos mayores (≥65 años).
 * 
 * Preguntas:
 * - Q1: ¿Ha comido menos por pérdida de apetito, problemas digestivos, etc.? (0-2)
 * - Q2: ¿Ha perdido peso en los últimos 3 meses? (0-3)
 * - Q3: ¿Movilidad? (0-2)
 * - Q4: ¿Ha tenido enfermedad aguda o estrés psicológico? (0-2)
 * - Q5: ¿Problemas neuropsicológicos? (0-2)
 * - Q6: ¿IMC o circunferencia de pantorrilla? (0-3)
 * 
 * @param input - Respuestas del cuestionario
 * @returns Puntaje total (0-14)
 */
export function calculateMNASF(input: MNASFInput): number {
    return (
        input.ingestaAlimentaria +
        input.perdidaPeso +
        input.movilidad +
        input.estresAgudo +
        input.problemasNeuropsicologicos +
        input.imcOPantorrilla
    );
}

/**
 * Clasifica el resultado del MNA-SF.
 * 
 * - 12-14: Estado nutricional normal
 * - 8-11: Riesgo de desnutrición
 * - 0-7: Desnutrición
 * 
 * @param score - Puntaje MNA-SF
 * @returns Clasificación
 */
export function classifyMNASFScore(score: number): MNASFClassification {
    if (score >= 12) return 'normal';
    if (score >= 8) return 'riesgo_desnutricion';
    return 'desnutricion';
}

/**
 * Determina el valor Q6 del MNA-SF usando circunferencia de pantorrilla
 * cuando no hay IMC disponible.
 * 
 * Pantorrilla <31 cm = 0 puntos
 * Pantorrilla ≥31 cm = 3 puntos
 * 
 * @param circunferenciaPantorrilla - En cm
 * @returns Puntaje Q6 (0 o 3)
 */
export function getMNASFQ6FromCalf(circunferenciaPantorrilla: number): 0 | 3 {
    return circunferenciaPantorrilla >= 31 ? 3 : 0;
}

/**
 * Determina el valor Q6 del MNA-SF usando IMC.
 * 
 * IMC <19 = 0 puntos
 * IMC 19-21 = 1 punto
 * IMC 21-23 = 2 puntos
 * IMC ≥23 = 3 puntos
 * 
 * @param bmi - Índice de Masa Corporal
 * @returns Puntaje Q6 (0-3)
 */
export function getMNASFQ6FromBMI(bmi: number): 0 | 1 | 2 | 3 {
    if (bmi < 19) return 0;
    if (bmi < 21) return 1;
    if (bmi < 23) return 2;
    return 3;
}

/**
 * Obtiene las etiquetas descriptivas para las preguntas del MNA-SF.
 */
export const MNASF_QUESTIONS = {
    q1_ingesta: {
        label: '¿Ha comido menos por pérdida de apetito, problemas digestivos o dificultades para masticar/tragar?',
        options: [
            { value: 0, label: 'Disminución severa de la ingesta' },
            { value: 1, label: 'Disminución moderada de la ingesta' },
            { value: 2, label: 'Sin disminución de la ingesta' },
        ],
    },
    q2_perdida_peso: {
        label: '¿Pérdida de peso en los últimos 3 meses?',
        options: [
            { value: 0, label: 'Pérdida de peso >3 kg' },
            { value: 1, label: 'No sabe' },
            { value: 2, label: 'Pérdida de peso entre 1 y 3 kg' },
            { value: 3, label: 'Sin pérdida de peso' },
        ],
    },
    q3_movilidad: {
        label: '¿Movilidad?',
        options: [
            { value: 0, label: 'De la cama al sillón' },
            { value: 1, label: 'Autonomía en el interior' },
            { value: 2, label: 'Sale del domicilio' },
        ],
    },
    q4_estres: {
        label: '¿Ha tenido enfermedad aguda o estrés psicológico en los últimos 3 meses?',
        options: [
            { value: 0, label: 'Sí' },
            { value: 2, label: 'No' },
        ],
    },
    q5_neuropsicologico: {
        label: '¿Problemas neuropsicológicos?',
        options: [
            { value: 0, label: 'Demencia o depresión grave' },
            { value: 1, label: 'Demencia leve' },
            { value: 2, label: 'Sin problemas psicológicos' },
        ],
    },
    q6_imc: {
        label: 'Índice de Masa Corporal (IMC)',
        options: [
            { value: 0, label: 'IMC <19' },
            { value: 1, label: 'IMC 19-21' },
            { value: 2, label: 'IMC 21-23' },
            { value: 3, label: 'IMC ≥23' },
        ],
    },
    q6_pantorrilla: {
        label: 'Circunferencia de pantorrilla (si no hay IMC)',
        options: [
            { value: 0, label: '<31 cm' },
            { value: 3, label: '≥31 cm' },
        ],
    },
};

// ============================================================================
// 5. EVALUACIÓN GESTACIONAL - CURVA DE ATALAH
// ============================================================================

/**
 * Rangos de IMC por semana de gestación según Curva de Atalah (Chile, 1997)
 * Estándar para clasificación nutricional de embarazadas en Latinoamérica.
 * 
 * Estructura: { semana: { bajoPeso: max, normal: [min, max], sobrepeso: [min, max], obesidad: min } }
 */
export const ATALAH_BMI_RANGES: Record<number, { bajoPeso: number; normal: [number, number]; sobrepeso: [number, number]; obesidad: number }> = {
    // Semanas 6-42 de gestación
    6: { bajoPeso: 20.0, normal: [20.0, 25.0], sobrepeso: [25.0, 30.0], obesidad: 30.0 },
    7: { bajoPeso: 20.0, normal: [20.0, 25.0], sobrepeso: [25.0, 30.0], obesidad: 30.0 },
    8: { bajoPeso: 20.0, normal: [20.0, 25.0], sobrepeso: [25.0, 30.0], obesidad: 30.0 },
    9: { bajoPeso: 20.0, normal: [20.0, 25.0], sobrepeso: [25.0, 30.0], obesidad: 30.0 },
    10: { bajoPeso: 20.0, normal: [20.0, 25.5], sobrepeso: [25.5, 30.0], obesidad: 30.0 },
    11: { bajoPeso: 20.0, normal: [20.0, 25.5], sobrepeso: [25.5, 30.0], obesidad: 30.0 },
    12: { bajoPeso: 20.0, normal: [20.0, 25.5], sobrepeso: [25.5, 30.0], obesidad: 30.0 },
    13: { bajoPeso: 20.0, normal: [20.0, 25.5], sobrepeso: [25.5, 30.0], obesidad: 30.0 },
    14: { bajoPeso: 20.5, normal: [20.5, 26.0], sobrepeso: [26.0, 30.5], obesidad: 30.5 },
    15: { bajoPeso: 20.5, normal: [20.5, 26.0], sobrepeso: [26.0, 30.5], obesidad: 30.5 },
    16: { bajoPeso: 21.0, normal: [21.0, 26.5], sobrepeso: [26.5, 31.0], obesidad: 31.0 },
    17: { bajoPeso: 21.0, normal: [21.0, 26.5], sobrepeso: [26.5, 31.0], obesidad: 31.0 },
    18: { bajoPeso: 21.5, normal: [21.5, 27.0], sobrepeso: [27.0, 31.5], obesidad: 31.5 },
    19: { bajoPeso: 21.5, normal: [21.5, 27.0], sobrepeso: [27.0, 31.5], obesidad: 31.5 },
    20: { bajoPeso: 22.0, normal: [22.0, 27.5], sobrepeso: [27.5, 32.0], obesidad: 32.0 },
    21: { bajoPeso: 22.0, normal: [22.0, 27.5], sobrepeso: [27.5, 32.0], obesidad: 32.0 },
    22: { bajoPeso: 22.5, normal: [22.5, 28.0], sobrepeso: [28.0, 32.5], obesidad: 32.5 },
    23: { bajoPeso: 22.5, normal: [22.5, 28.0], sobrepeso: [28.0, 32.5], obesidad: 32.5 },
    24: { bajoPeso: 23.0, normal: [23.0, 28.5], sobrepeso: [28.5, 33.0], obesidad: 33.0 },
    25: { bajoPeso: 23.0, normal: [23.0, 28.5], sobrepeso: [28.5, 33.0], obesidad: 33.0 },
    26: { bajoPeso: 23.5, normal: [23.5, 29.0], sobrepeso: [29.0, 33.5], obesidad: 33.5 },
    27: { bajoPeso: 23.5, normal: [23.5, 29.0], sobrepeso: [29.0, 33.5], obesidad: 33.5 },
    28: { bajoPeso: 24.0, normal: [24.0, 29.5], sobrepeso: [29.5, 34.0], obesidad: 34.0 },
    29: { bajoPeso: 24.0, normal: [24.0, 29.5], sobrepeso: [29.5, 34.0], obesidad: 34.0 },
    30: { bajoPeso: 24.5, normal: [24.5, 30.0], sobrepeso: [30.0, 34.5], obesidad: 34.5 },
    31: { bajoPeso: 24.5, normal: [24.5, 30.0], sobrepeso: [30.0, 34.5], obesidad: 34.5 },
    32: { bajoPeso: 25.0, normal: [25.0, 30.5], sobrepeso: [30.5, 35.0], obesidad: 35.0 },
    33: { bajoPeso: 25.0, normal: [25.0, 30.5], sobrepeso: [30.5, 35.0], obesidad: 35.0 },
    34: { bajoPeso: 25.5, normal: [25.5, 31.0], sobrepeso: [31.0, 35.5], obesidad: 35.5 },
    35: { bajoPeso: 25.5, normal: [25.5, 31.0], sobrepeso: [31.0, 35.5], obesidad: 35.5 },
    36: { bajoPeso: 26.0, normal: [26.0, 31.5], sobrepeso: [31.5, 36.0], obesidad: 36.0 },
    37: { bajoPeso: 26.0, normal: [26.0, 31.5], sobrepeso: [31.5, 36.0], obesidad: 36.0 },
    38: { bajoPeso: 26.5, normal: [26.5, 32.0], sobrepeso: [32.0, 36.5], obesidad: 36.5 },
    39: { bajoPeso: 26.5, normal: [26.5, 32.0], sobrepeso: [32.0, 36.5], obesidad: 36.5 },
    40: { bajoPeso: 27.0, normal: [27.0, 32.5], sobrepeso: [32.5, 37.0], obesidad: 37.0 },
    41: { bajoPeso: 27.0, normal: [27.0, 32.5], sobrepeso: [32.5, 37.0], obesidad: 37.0 },
    42: { bajoPeso: 27.5, normal: [27.5, 33.0], sobrepeso: [33.0, 37.5], obesidad: 37.5 },
};

export type AtalahClassification = 'Bajo Peso' | 'Normal' | 'Sobrepeso' | 'Obesidad';

/**
 * Clasifica el estado nutricional de una gestante según la Curva de Atalah.
 * 
 * @param bmi - Índice de Masa Corporal actual de la gestante
 * @param gestationalWeeks - Semanas de gestación (6-42)
 * @returns Clasificación nutricional según Atalah
 */
export function classifyAtalah(bmi: number, gestationalWeeks: number): AtalahClassification {
    // Ajustar semanas al rango válido (6-42)
    const week = Math.max(6, Math.min(42, Math.round(gestationalWeeks)));
    const ranges = ATALAH_BMI_RANGES[week];

    if (!ranges) {
        console.warn(`Semana gestacional ${gestationalWeeks} fuera de rango, usando semana 20`);
        return classifyAtalah(bmi, 20);
    }

    if (bmi < ranges.bajoPeso) {
        return 'Bajo Peso';
    } else if (bmi >= ranges.normal[0] && bmi < ranges.sobrepeso[0]) {
        return 'Normal';
    } else if (bmi >= ranges.sobrepeso[0] && bmi < ranges.obesidad) {
        return 'Sobrepeso';
    } else {
        return 'Obesidad';
    }
}

/**
 * Calcula la ganancia de peso gestacional recomendada según IOM 2009.
 * Basado en el IMC pregestacional.
 * 
 * @param prePregnancyBMI - IMC antes del embarazo
 * @param isMultiple - Si es embarazo múltiple (gemelos+)
 * @returns { total: [min, max], weeklySecondThird: [min, max] }
 */
export function getRecommendedGestationalWeightGain(
    prePregnancyBMI: number,
    isMultiple: boolean = false
): { total: [number, number]; weeklySecondThird: [number, number] } {
    if (isMultiple) {
        // Embarazo múltiple
        if (prePregnancyBMI < 18.5) {
            return { total: [22.7, 24.5], weeklySecondThird: [0.68, 0.79] };
        } else if (prePregnancyBMI < 25) {
            return { total: [16.8, 24.5], weeklySecondThird: [0.57, 0.79] };
        } else if (prePregnancyBMI < 30) {
            return { total: [14.1, 22.7], weeklySecondThird: [0.45, 0.68] };
        } else {
            return { total: [11.3, 19.1], weeklySecondThird: [0.34, 0.57] };
        }
    }

    // Embarazo único (IOM 2009)
    if (prePregnancyBMI < 18.5) {
        // Bajo peso
        return { total: [12.5, 18.0], weeklySecondThird: [0.44, 0.58] };
    } else if (prePregnancyBMI < 25) {
        // Normal
        return { total: [11.5, 16.0], weeklySecondThird: [0.35, 0.50] };
    } else if (prePregnancyBMI < 30) {
        // Sobrepeso
        return { total: [7.0, 11.5], weeklySecondThird: [0.23, 0.33] };
    } else {
        // Obesidad
        return { total: [5.0, 9.0], weeklySecondThird: [0.17, 0.27] };
    }
}

// ============================================================================
// 6. PACIENTES NEUROLÓGICOS - ECUACIONES DE STEVENSON
// ============================================================================

/**
 * Estima la talla de un paciente con Parálisis Cerebral usando longitud de tibia.
 * Ecuación de Stevenson (1995).
 * 
 * Útil cuando el paciente no puede mantener postura erecta.
 * 
 * @param tibiaLength - Longitud de tibia en cm (desde borde superior medial hasta maléolo interno)
 * @returns Talla estimada en cm
 */
export function estimateHeightFromTibia(tibiaLength: number): number {
    // Ecuación de Stevenson: Talla (cm) = (3.26 × Longitud Tibia) + 30.8
    return (3.26 * tibiaLength) + 30.8;
}

/**
 * Ecuación alternativa usando longitud de segmento superior del brazo.
 * Stevenson (1995).
 * 
 * @param upperArmLength - Longitud del húmero (acromion a olécranon) en cm
 * @returns Talla estimada en cm
 */
export function estimateHeightFromUpperArm(upperArmLength: number): number {
    // Ecuación: Talla (cm) = (4.35 × Longitud Brazo Superior) + 21.8
    return (4.35 * upperArmLength) + 21.8;
}

/**
 * Determina si un paciente con PC tiene riesgo nutricional según GMFCS.
 * Niveles IV-V tienen alto riesgo de desnutrición.
 * 
 * @param gmfcsLevel - Nivel GMFCS (I-V)
 * @returns true si está en alto riesgo nutricional
 */
export type GMFCSLevel = 'I' | 'II' | 'III' | 'IV' | 'V';

export function isCPNutritionalRisk(gmfcsLevel: GMFCSLevel): boolean {
    return gmfcsLevel === 'IV' || gmfcsLevel === 'V';
}

// ============================================================================
// 7. IMC CORREGIDO PARA AMPUTADOS
// ============================================================================

/**
 * Calcula el IMC real de un paciente con amputaciones.
 * Primero corrige el peso estimando el peso completo, luego calcula IMC.
 * 
 * Fórmula:
 * 1. Peso Corregido = Peso Actual / (1 - %amputación)
 * 2. IMC = Peso Corregido / (Talla en m)²
 * 
 * @param pesoActual - Peso medido actualmente (con amputación) en kg
 * @param talla - Talla en cm
 * @param amputations - Lista de segmentos amputados
 * @returns { correctedWeight, bmi, bmiClassification }
 */
export function calculateAmputeeBMI(
    pesoActual: number,
    talla: number,
    amputations: AmputationType[],
    edad: number = 40,
    bodyFat?: number // New parameter
): { correctedWeight: number; bmi: number; classification: BMIClassification } {
    const correctedWeight = calculateCorrectedWeight(pesoActual, amputations);
    const tallaM = talla / 100;
    const bmi = correctedWeight / (tallaM * tallaM);
    const classification = classifyBMIByAge(bmi, edad, bodyFat);

    return {
        correctedWeight: Math.round(correctedWeight * 10) / 10,
        bmi: Math.round(bmi * 10) / 10,
        classification,
    };
}

// ============================================================================
// 8. TIPO DE EVALUACIÓN UNIFICADA
// ============================================================================

export type AssessmentType = 'general' | 'gestante' | 'pediatrico' | 'adulto_mayor' | 'amputado' | 'neuro';

export interface AssessmentResult {
    type: AssessmentType;
    bmi: number;
    bmiClassification: string;
    riskLevel: 'bajo' | 'normal' | 'elevado' | 'alto' | 'muy_alto';
    details: Record<string, unknown>;
    warnings: string[];
}

/**
 * Función unificada de evaluación nutricional que detecta el contexto clínico
 * y aplica las fórmulas correctas automáticamente.
 * 
 * @param input - Datos del paciente
 * @returns Resultado de evaluación con clasificación interpretada
 */
export function evaluateNutritionalStatus(input: {
    peso: number;
    talla: number;
    edad: number;
    sexo: 'masculino' | 'femenino';
    type?: AssessmentType;
    bodyFat?: number; // New optional parameter
    // Datos específicos por tipo
    gestationalWeeks?: number;
    prePregnancyWeight?: number;
    amputations?: AmputationType[];
    gmfcsLevel?: GMFCSLevel;
    tibiaLength?: number;
    alturaRodilla?: number;
}): AssessmentResult {
    const { peso, talla, edad, sexo, type = 'general' } = input;
    const tallaM = talla / 100;
    const warnings: string[] = [];
    const details: Record<string, unknown> = {};

    // Detectar tipo si no se especifica
    let effectiveType = type;
    if (type === 'general') {
        if (input.gestationalWeeks) effectiveType = 'gestante';
        else if (edad < 18) effectiveType = 'pediatrico';
        else if (edad >= 65) effectiveType = 'adulto_mayor';
        else if (input.amputations && input.amputations.length > 0) effectiveType = 'amputado';
        else if (input.gmfcsLevel || input.tibiaLength) effectiveType = 'neuro';
    }

    let bmi = peso / (tallaM * tallaM);
    let classification: BMIClassification;

    switch (effectiveType) {
        case 'gestante': {
            if (!input.gestationalWeeks) {
                warnings.push('No se especificaron semanas de gestación, usando semana 20');
            }
            const weeks = input.gestationalWeeks || 20;
            const atalahResult = classifyAtalah(bmi, weeks);
            details.atalahClassification = atalahResult;
            details.gestationalWeeks = weeks;

            if (input.prePregnancyWeight) {
                const prePregnancyBMI = input.prePregnancyWeight / (tallaM * tallaM);
                const weightGain = getRecommendedGestationalWeightGain(prePregnancyBMI);
                details.prePregnancyBMI = Math.round(prePregnancyBMI * 10) / 10;
                details.recommendedWeightGain = weightGain;
            }

            classification = {
                category: atalahResult,
                isGeriatric: false,
                riskLevel: atalahResult === 'Normal' ? 'normal' : 'elevado',
            };
            break;
        }

        case 'adulto_mayor': {
            // Usar rangos geriátricos (23-27.9 como normal)
            details.isGeriatricBMI = true;

            // Si hay altura de rodilla, estimar talla y RECALCULAR BMI (Chumlea Integration)
            if (input.alturaRodilla) {
                const tallaEstimada = estimateHeightFromKnee(input.alturaRodilla, edad, sexo);
                details.tallaEstimada = Math.round(tallaEstimada * 10) / 10;
                warnings.push(`Talla estimada por Chumlea: ${details.tallaEstimada} cm (Usada para IMC)`);

                // Recalculate BMI with Chumlea height
                const tallaM = tallaEstimada / 100;
                bmi = peso / (tallaM * tallaM);
            }

            classification = classifyBMIByAge(bmi, 65, input.bodyFat, sexo);
            break;
        }

        case 'amputado': {
            if (!input.amputations || input.amputations.length === 0) {
                warnings.push('No se especificaron amputaciones');
                classification = classifyBMIByAge(bmi, edad);
            } else {
                const result = calculateAmputeeBMI(peso, talla, input.amputations, edad);
                bmi = result.bmi;
                classification = result.classification;
                details.correctedWeight = result.correctedWeight;
                details.amputationPercentage = Math.round(calculateTotalAmputationPercentage(input.amputations) * 100);
            }
            break;
        }

        case 'neuro': {
            // Estimar talla si hay longitud de tibia
            let effectiveTalla = talla;
            if (input.tibiaLength) {
                effectiveTalla = estimateHeightFromTibia(input.tibiaLength);
                details.tallaEstimadaTibia = Math.round(effectiveTalla * 10) / 10;
                warnings.push(`Talla estimada por Stevenson: ${details.tallaEstimadaTibia} cm`);
            }

            const effectiveTallaM = effectiveTalla / 100;
            bmi = peso / (effectiveTallaM * effectiveTallaM);
            classification = classifyBMIByAge(bmi, edad);

            if (input.gmfcsLevel) {
                details.gmfcsLevel = input.gmfcsLevel;
                details.isNutritionalRisk = isCPNutritionalRisk(input.gmfcsLevel);
                if (details.isNutritionalRisk) {
                    warnings.push('Alto riesgo nutricional por GMFCS IV-V');
                }
            }
            break;
        }

        case 'pediatrico':
        default: {
            // Pass bodyFat, sex to allow "Muscular Overweight" and "Athlete Triad" classification
            classification = classifyBMIByAge(bmi, edad, input.bodyFat, sexo);

            // CLINICAL OBSERVATION: Adolescence & Growth Spurt
            if (edad >= 10 && edad <= 19) {
                warnings.push("💡 Sugerencia Clínica: Evaluar Estadío de Tanner para confirmar maduración sexual y validar 'picos de crecimiento'.");
            }
            break;
        }
    }

    return {
        type: effectiveType,
        bmi: Math.round(bmi * 10) / 10,
        bmiClassification: classification.category,
        riskLevel: classification.riskLevel,
        details,
        warnings,
    };
}

/**
 * Calcula la edad exacta en días entre dos fechas, ignorando horas y zonas horarias.
 * Maneja strings 'YYYY-MM-DD' como fechas literales (sin shift UTC->Local).
 * Garantiza consistencia entre el header del paciente y las gráficas.
 * 
 * @param birthDate - Fecha de nacimiento
 * @param targetDate - Fecha objetivo (por defecto hoy)
 * @returns Número de días exactos
 */
export function calculateExactAgeInDays(birthDate: string | Date, targetDate: string | Date = new Date()): number {
    const getVisualMidnight = (val: string | Date): number => {
        if (typeof val === 'string') {
            // Si es fecha pura YYYY-MM-DD, usar componentes literales
            if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
                const [y, m, d] = val.split('-').map(Number);
                return Date.UTC(y, m - 1, d);
            }
        }
        // Para objetos Date o strings ISO con hora, usar fecha LOCAL del navegador
        // Esto asegura que "hoy" sea hoy 00:00 local
        const d = new Date(val);
        return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    };

    const t1 = getVisualMidnight(birthDate);
    const t2 = getVisualMidnight(targetDate);

    return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
}

/**
 * Calcula la edad detallada (años, meses, días) garantizando consistencia visual.
 */
export function calculateDetailedAge(birthDate: string | Date, targetDate: string | Date = new Date()) {
    // Reutilizar lógica de "Visual Date" para evitar offsets
    const getVisualDate = (val: string | Date): Date => {
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
            const [y, m, d] = val.split('-').map(Number);
            return new Date(y, m - 1, d); // Local Date construida visualmente
        }
        const d = new Date(val);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    const birth = getVisualDate(birthDate);
    const target = getVisualDate(targetDate);

    let years = target.getFullYear() - birth.getFullYear();
    let months = target.getMonth() - birth.getMonth();
    let days = target.getDate() - birth.getDate();

    if (days < 0) {
        months--;
        // Días en el mes anterior al objetivo
        const prevMonth = new Date(target.getFullYear(), target.getMonth(), 0);
        days += prevMonth.getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }

    if (years < 0) return { years: 0, months: 0, days: 0, formatted: '0 días' };

    const parts = [];
    if (years > 0) parts.push(`${years} ${years === 1 ? 'año' : 'años'}`);
    if (months > 0) parts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`);
    if (days > 0) parts.push(`${days} ${days === 1 ? 'día' : 'días'}`);

    if (parts.length === 0) parts.push('0 días');

    return {
        years,
        months,
        days,
        formatted: parts.join(' ')
    };
}
export type PatientStage = 'PEDIATRIC' | 'ADULT' | 'GERIATRIC';

/**
 * Retorna la etapa vital del paciente según su fecha de nacimiento.
 * - PEDIÁTRICO: < 18 años
 * - ADULTO: 18 - 59 años
 * - GERIÁTRICO: >= 60 años
 */
export function getPatientStage(fechaNacimiento: Date | string | undefined): PatientStage {
    if (!fechaNacimiento) return 'ADULT';
    const birthDate = typeof fechaNacimiento === 'string' ? new Date(fechaNacimiento) : fechaNacimiento;
    const age = calculateChronologicalAge(birthDate);

    if (age < 18) return 'PEDIATRIC';
    if (age >= 60) return 'GERIATRIC';
    return 'ADULT';
}

/**
 * Determina el contexto clínico basado en la edad para clasificación visual y lógica.
 * Unifica etiquetas (Lactante, Pediátrico, etc.) y colores de UI.
 */
export function getClinicalContextByAge(fechaNacimiento: Date | string | undefined): {
    context: 'lactante' | 'pediatrico' | 'adulto' | 'adulto_mayor';
    label: string;
    color: string;
    age: number;
} {
    if (!fechaNacimiento) {
        return { context: 'adulto', label: 'Adulto', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', age: 30 };
    }

    const birthDate = typeof fechaNacimiento === 'string' ? new Date(fechaNacimiento) : fechaNacimiento;
    const age = calculateChronologicalAge(birthDate);
    const roundedAge = Math.floor(age);

    if (age < 2) {
        return { context: 'lactante', label: 'Lactante', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400', age: roundedAge };
    } else if (age < 18) {
        return { context: 'pediatrico', label: 'Pediátrico', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', age: roundedAge };
    } else if (age >= 65) {
        return { context: 'adulto_mayor', label: 'Adulto Mayor', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', age: roundedAge };
    }
    return { context: 'adulto', label: 'Adulto', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', age: roundedAge };
}

/**
 * Formatea la edad de manera clínica estándar:
 * - Años si edad >= 1 año
 * - Meses si edad < 1 año y >= 1 mes
 * - Días si edad < 1 mes
 */
export function formatClinicalAge(birthDate: Date | string | undefined): string {
    if (!birthDate) return '---';
    const detailed = calculateDetailedAge(birthDate);

    if (detailed.years >= 1) {
        return `${detailed.years} ${detailed.years === 1 ? 'año' : 'años'}`;
    }
    if (detailed.months >= 1) {
        return `${detailed.months} ${detailed.months === 1 ? 'mes' : 'meses'}`;
    }
    return `${detailed.days} ${detailed.days === 1 ? 'día' : 'días'}`;
}

/**
 * Formatea la edad clínica estándar a partir de meses (y opcionalmente días):
 * - Años si meses >= 12
 * - Meses si meses < 12 y >= 1
 * - Días si meses < 1
 */
export function formatClinicalAgeFromMonths(months: number, days?: number): string {
    if (months >= 12) {
        const years = Math.floor(months / 12);
        return `${years} ${years === 1 ? 'año' : 'años'}`;
    }
    if (months >= 1) {
        const m = Math.floor(months);
        return `${m} ${m === 1 ? 'mes' : 'meses'}`;
    }
    // Si no hay días, calcular desde meses
    const d = days !== undefined ? Math.floor(days) : Math.round(months * 30.4375);
    return `${d} ${d === 1 ? 'día' : 'días'}`;
}
