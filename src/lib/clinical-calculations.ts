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
export function classifyBMIByAge(bmi: number, edad: number): BMIClassification {
    const isGeriatric = edad >= 65;

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
