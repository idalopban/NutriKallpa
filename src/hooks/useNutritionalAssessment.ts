'use client';

import { useMemo } from 'react';
import {
    evaluateNutritionalStatus,
    AssessmentType,
    AssessmentResult,
    AmputationType,
    GMFCSLevel,
} from '@/lib/clinical-calculations';

/**
 * Input para el hook de evaluación nutricional.
 * Acepta datos básicos y específicos por tipo de paciente.
 */
export interface NutritionalAssessmentInput {
    // Datos básicos requeridos
    peso: number;
    talla: number;
    edad: number;
    sexo: 'masculino' | 'femenino';

    // Tipo de evaluación (auto-detectado si no se especifica)
    type?: AssessmentType;

    // Gestante
    gestationalWeeks?: number;
    prePregnancyWeight?: number;

    // Amputado
    amputations?: AmputationType[];

    // Neurológico (PC)
    gmfcsLevel?: GMFCSLevel;
    tibiaLength?: number;

    // Adulto Mayor
    alturaRodilla?: number;
}

/**
 * Hook de evaluación nutricional unificado.
 * 
 * Detecta automáticamente el contexto clínico y aplica las fórmulas correctas:
 * - Gestante: Curva de Atalah
 * - Adulto Mayor (≥65): Rangos geriátricos (23-27.9 normal)
 * - Amputado: IMC corregido
 * - Neurológico: Estimación por Stevenson
 * - Pediátrico: Edad corregida/biológica
 * 
 * @example
 * ```tsx
 * const assessment = useNutritionalAssessment({
 *   peso: 65,
 *   talla: 160,
 *   edad: 70,
 *   sexo: 'masculino',
 * });
 * 
 * console.log(assessment.bmiClassification); // "Normal" (rango geriátrico)
 * ```
 */
export function useNutritionalAssessment(
    input: NutritionalAssessmentInput | null
): AssessmentResult | null {
    return useMemo(() => {
        if (!input || !input.peso || !input.talla || !input.edad) {
            return null;
        }

        try {
            return evaluateNutritionalStatus({
                peso: input.peso,
                talla: input.talla,
                edad: input.edad,
                sexo: input.sexo,
                type: input.type,
                gestationalWeeks: input.gestationalWeeks,
                prePregnancyWeight: input.prePregnancyWeight,
                amputations: input.amputations,
                gmfcsLevel: input.gmfcsLevel,
                tibiaLength: input.tibiaLength,
                alturaRodilla: input.alturaRodilla,
            });
        } catch (error) {
            console.error('[useNutritionalAssessment] Error:', error);
            return null;
        }
    }, [
        input?.peso,
        input?.talla,
        input?.edad,
        input?.sexo,
        input?.type,
        input?.gestationalWeeks,
        input?.prePregnancyWeight,
        input?.amputations,
        input?.gmfcsLevel,
        input?.tibiaLength,
        input?.alturaRodilla,
    ]);
}

/**
 * Hook helper para obtener solo la clasificación de IMC.
 * Útil para componentes que solo necesitan el diagnóstico.
 */
export function useBMIDiagnosis(
    peso: number | undefined,
    talla: number | undefined,
    edad: number | undefined,
    sexo: 'masculino' | 'femenino' = 'masculino'
): { bmi: number; classification: string; isGeriatric: boolean } | null {
    const assessment = useNutritionalAssessment(
        peso && talla && edad
            ? { peso, talla, edad, sexo }
            : null
    );

    return useMemo(() => {
        if (!assessment) return null;

        return {
            bmi: assessment.bmi,
            classification: assessment.bmiClassification,
            isGeriatric: assessment.type === 'adulto_mayor',
        };
    }, [assessment]);
}
