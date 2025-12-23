/**
 * Formula Advisor - Intelligent formula recommendation engine
 * 
 * Analyzes patient profile and recommends the most appropriate
 * body composition formula, with warnings for mismatches.
 */

import type { MedidasAntropometricas, Paciente } from "@/types";

// --- TYPES ---

export type FormulaProfile = 'general' | 'control' | 'fitness' | 'atleta' | 'rapida';

export interface FormulaRecommendation {
    recommended: FormulaProfile;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    scientificBasis: string;
}

export interface FormulaValidation {
    isOptimal: boolean;
    selected: FormulaProfile;
    recommended: FormulaProfile;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    suggestion: string;
}

// --- FORMULA METADATA ---

export const FORMULA_METADATA: Record<FormulaProfile, {
    name: string;
    author: string;
    year: string;
    targetPopulation: string;
    optimalBMI: { min: number; max: number };
    optimalFatPercent?: { min: number; max: number };
    activityLevels: string[];
    ageRange: { min: number; max: number };
}> = {
    general: {
        name: 'General (Wilmore & Behnke)',
        author: 'Wilmore & Behnke',
        year: '1969/1970',
        targetPopulation: 'Población general adulta, sedentaria a moderadamente activa',
        optimalBMI: { min: 18.5, max: 30 },
        activityLevels: ['sedentario', 'ligera', 'moderada'],
        ageRange: { min: 18, max: 65 }
    },
    control: {
        name: 'Control de Peso (Durnin & Womersley)',
        author: 'Durnin & Womersley',
        year: '1974',
        targetPopulation: 'Programas de control de peso, todas las edades',
        optimalBMI: { min: 20, max: 40 },
        activityLevels: ['sedentario', 'ligera', 'moderada', 'intensa'],
        ageRange: { min: 17, max: 72 }
    },
    fitness: {
        name: 'Fitness (Katch & McArdle)',
        author: 'Katch & McArdle',
        year: '1973',
        targetPopulation: 'Personas activas, deportistas recreativos',
        optimalBMI: { min: 18, max: 28 },
        optimalFatPercent: { min: 10, max: 25 },
        activityLevels: ['moderada', 'intensa', 'muy_intensa'],
        ageRange: { min: 18, max: 55 }
    },
    atleta: {
        name: 'Atleta (Withers et al.)',
        author: 'Withers et al.',
        year: '1987',
        targetPopulation: 'Atletas competitivos, bajo porcentaje de grasa',
        optimalBMI: { min: 18, max: 26 },
        optimalFatPercent: { min: 5, max: 18 },
        activityLevels: ['intensa', 'muy_intensa'],
        ageRange: { min: 16, max: 45 }
    },
    rapida: {
        name: 'Evaluación Rápida (Sloan)',
        author: 'Sloan',
        year: '1962/1967',
        targetPopulation: 'Screening rápido, evaluaciones masivas',
        optimalBMI: { min: 18.5, max: 35 },
        activityLevels: ['sedentario', 'ligera', 'moderada', 'intensa', 'muy_intensa'],
        ageRange: { min: 18, max: 65 }
    }
};

// --- RECOMMENDATION ENGINE ---

/**
 * Analyzes patient profile and recommends the most appropriate formula.
 */
export function getRecommendedFormula(
    patient: Pick<Paciente, 'datosPersonales' | 'configuracionNutricional'>,
    measurements?: Pick<MedidasAntropometricas, 'peso' | 'talla' | 'edad'>
): FormulaRecommendation {
    const activityLevel = patient.configuracionNutricional?.nivelActividad || 'sedentario';
    const edad = measurements?.edad || 30;
    const peso = measurements?.peso || patient.datosPersonales?.peso || 70;
    const talla = measurements?.talla || patient.datosPersonales?.talla || 170;
    const imc = peso / Math.pow(talla / 100, 2);

    // Rule 1: Athletes with high activity levels
    if (['intensa', 'muy_intensa', 'very_active', 'active'].includes(activityLevel)) {
        // If likely low body fat (lean BMI), recommend athlete formula
        if (imc < 26) {
            return {
                recommended: 'atleta',
                confidence: 'high',
                reasoning: `Nivel de actividad intenso (${activityLevel}) e IMC ${imc.toFixed(1)} sugiere atleta.`,
                scientificBasis: 'Withers et al. (1987) fue desarrollada específicamente para atletas con bajo % de grasa corporal.'
            };
        }
        // Active but higher BMI → fitness
        return {
            recommended: 'fitness',
            confidence: 'medium',
            reasoning: `Actividad intensa pero IMC ${imc.toFixed(1)} indica deportista recreativo.`,
            scientificBasis: 'Katch & McArdle (1973) es óptima para personas activas sin perfil de atleta competitivo.'
        };
    }

    // Rule 2: Elderly patients (≥65)
    if (edad >= 65) {
        return {
            recommended: 'control',
            confidence: 'high',
            reasoning: `Paciente de ${edad} años - requiere fórmula validada para adultos mayores.`,
            scientificBasis: 'Durnin & Womersley (1974) fue validada en un amplio rango de edades (17-72 años).'
        };
    }

    // Rule 3: Obesity (IMC ≥ 30)
    if (imc >= 30) {
        return {
            recommended: 'control',
            confidence: 'high',
            reasoning: `IMC ${imc.toFixed(1)} indica obesidad - requiere fórmula para control de peso.`,
            scientificBasis: 'Durnin & Womersley es la más validada para individuos con sobrepeso/obesidad.'
        };
    }

    // Rule 4: Moderate activity with normal BMI
    if (['moderada', 'moderate'].includes(activityLevel) && imc >= 18.5 && imc < 28) {
        return {
            recommended: 'fitness',
            confidence: 'medium',
            reasoning: `Actividad moderada e IMC ${imc.toFixed(1)} normal sugiere persona activa.`,
            scientificBasis: 'Katch & McArdle ofrece mayor precisión para personas físicamente activas.'
        };
    }

    // Default: General population
    return {
        recommended: 'general',
        confidence: 'medium',
        reasoning: `Perfil general: IMC ${imc.toFixed(1)}, actividad ${activityLevel}.`,
        scientificBasis: 'Wilmore & Behnke es el estándar para población general sedentaria a moderadamente activa.'
    };
}

/**
 * Validates if the selected formula matches the patient profile.
 * Returns validation result with severity and message.
 */
export function validateFormulaMatch(
    selected: FormulaProfile,
    patient: Pick<Paciente, 'datosPersonales' | 'configuracionNutricional'>,
    measurements?: Pick<MedidasAntropometricas, 'peso' | 'talla' | 'edad'>
): FormulaValidation {
    const recommendation = getRecommendedFormula(patient, measurements);

    if (selected === recommendation.recommended) {
        return {
            isOptimal: true,
            selected,
            recommended: recommendation.recommended,
            severity: 'info',
            message: '✅ Fórmula óptima para este perfil',
            suggestion: recommendation.scientificBasis
        };
    }

    // Determine severity based on mismatch type
    const selectedMeta = FORMULA_METADATA[selected];
    const recommendedMeta = FORMULA_METADATA[recommendation.recommended];

    const activityLevel = patient.configuracionNutricional?.nivelActividad || 'sedentario';
    const edad = measurements?.edad || 30;
    const peso = measurements?.peso || patient.datosPersonales?.peso || 70;
    const talla = measurements?.talla || patient.datosPersonales?.talla || 170;
    const imc = peso / Math.pow(talla / 100, 2);

    // Critical: Athlete formula on obese patient
    if (selected === 'atleta' && imc >= 30) {
        return {
            isOptimal: false,
            selected,
            recommended: recommendation.recommended,
            severity: 'critical',
            message: `⚠️ CRÍTICO: ${selectedMeta.name} no es válida para IMC ${imc.toFixed(1)}`,
            suggestion: `Esta fórmula fue desarrollada para atletas con <18% grasa corporal. Usar ${recommendedMeta.name} para mayor precisión.`
        };
    }

    // Critical: Athlete formula on sedentary patient
    if (selected === 'atleta' && ['sedentario', 'ligera', 'sedentary', 'light'].includes(activityLevel)) {
        return {
            isOptimal: false,
            selected,
            recommended: recommendation.recommended,
            severity: 'critical',
            message: `⚠️ CRÍTICO: ${selectedMeta.name} no aplica para actividad ${activityLevel}`,
            suggestion: `Withers et al. asume alta masa muscular. Usar ${recommendedMeta.name} para población general.`
        };
    }

    // Warning: Age mismatch
    if (edad < selectedMeta.ageRange.min || edad > selectedMeta.ageRange.max) {
        return {
            isOptimal: false,
            selected,
            recommended: recommendation.recommended,
            severity: 'warning',
            message: `⚠️ ${selectedMeta.name} validada para ${selectedMeta.ageRange.min}-${selectedMeta.ageRange.max} años`,
            suggestion: `Paciente de ${edad} años. Considerar ${recommendedMeta.name}: ${recommendation.reasoning}`
        };
    }

    // General mismatch (not critical)
    return {
        isOptimal: false,
        selected,
        recommended: recommendation.recommended,
        severity: 'warning',
        message: `💡 Hay una fórmula más precisa para este perfil`,
        suggestion: `Recomendación: ${recommendedMeta.name}. ${recommendation.reasoning}`
    };
}

/**
 * Get human-readable formula name
 */
export function getFormulaDisplayName(formula: FormulaProfile): string {
    return FORMULA_METADATA[formula]?.name || formula;
}
