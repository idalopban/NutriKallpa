"use server";

import { calculateFiveComponentFractionation, validateFiveComponentInput, type FiveComponentInput, type FiveComponentResult, type ValidationResult } from "@/lib/fiveComponentMath";
import { calculateSomatotype, type SomatotypeResult } from "@/lib/somatotype-utils";

// ============================================================================
// TYPES
// ============================================================================

export interface CalculationResult {
    success: boolean;
    error?: string;
    validation?: ValidationResult;
    fiveComponent?: FiveComponentResult;
    somatotype?: SomatotypeResult;
    summary?: {
        bodyFatPercent: number;
        fatMassKg: number;
        muscleMassKg: number;
        boneMassKg: number;
        endomorphy: number;
        mesomorphy: number;
        ectomorphy: number;
    };
}

export interface AnthropometryInput {
    bioData: {
        peso: number;
        talla: number;
        edad: number;
        genero: 'masculino' | 'femenino';
    };
    skinfolds: {
        triceps: number;
        subscapular: number;
        biceps: number;
        iliac_crest: number;
        supraspinale: number;
        abdominal: number;
        thigh: number;
        calf: number;
    };
    girths: {
        brazoRelajado: number;
        brazoFlexionado: number;
        cintura: number;
        musloMedio: number;
        pantorrilla: number;
    };
    breadths: {
        humero: number;
        femur: number;
    };
}

// ============================================================================
// SERVER ACTION: Calculate Anthropometry
// ============================================================================

/**
 * Server Action for comprehensive anthropometry calculations
 * 
 * Benefits:
 * - Validation runs on server (more secure)
 * - Calculations protected from client tampering
 * - Auditable logging capability
 */
export async function calculateAnthropometryAction(
    input: AnthropometryInput
): Promise<CalculationResult> {
    try {
        const { bioData, skinfolds, girths, breadths } = input;

        // 1. Convert to FiveComponentInput format
        const fiveComponentInput: FiveComponentInput = {
            weight: bioData.peso,
            height: bioData.talla,
            age: bioData.edad,
            gender: bioData.genero === 'masculino' ? 'male' : 'female',

            // Skinfolds
            triceps: skinfolds.triceps,
            subscapular: skinfolds.subscapular,
            biceps: skinfolds.biceps,
            suprailiac: skinfolds.iliac_crest || skinfolds.supraspinale,
            abdominal: skinfolds.abdominal,
            thigh: skinfolds.thigh,
            calf: skinfolds.calf,

            // Girths
            armRelaxedGirth: girths.brazoRelajado,
            armFlexedGirth: girths.brazoFlexionado,
            waistGirth: girths.cintura,
            thighGirth: girths.musloMedio,
            calfGirth: girths.pantorrilla,

            // Breadths
            humerusBreadth: breadths.humero,
            femurBreadth: breadths.femur,
        };

        // 2. Validate on server
        const validation = validateFiveComponentInput(fiveComponentInput);

        if (!validation.isValid) {
            // Return validation errors without calculating
            return {
                success: false,
                error: validation.errors.length > 0
                    ? validation.errors[0].message
                    : `Faltan datos: ${validation.missing.join(', ')}`,
                validation,
            };
        }

        // 3. Log for audit (in production, this would go to a logging service)
        console.log(`[ANTHROPOMETRY] Calculation request at ${new Date().toISOString()}`);
        if (validation.warnings.length > 0) {
            console.warn(`[ANTHROPOMETRY] Warnings: ${validation.warnings.map(w => w.message).join('; ')}`);
        }

        // 4. Calculate Five-Component Fractionation
        const fiveComponent = calculateFiveComponentFractionation(fiveComponentInput);

        // 5. Calculate Somatotype
        const somatoData = {
            bioData: { peso: bioData.peso, talla: bioData.talla, edad: bioData.edad, genero: bioData.genero },
            skinfolds: {
                triceps: skinfolds.triceps,
                subscapular: skinfolds.subscapular,
                biceps: skinfolds.biceps,
                iliac_crest: skinfolds.iliac_crest,
                supraspinale: skinfolds.supraspinale,
                abdominal: skinfolds.abdominal,
                thigh: skinfolds.thigh,
                calf: skinfolds.calf
            },
            girths: {
                brazoRelajado: girths.brazoRelajado,
                brazoFlexionado: girths.brazoFlexionado,
                cintura: girths.cintura,
                musloMedio: girths.musloMedio,
                pantorrilla: girths.pantorrilla
            },
            breadths: {
                humero: breadths.humero,
                femur: breadths.femur
            }
        };

        const somatotype = calculateSomatotype(somatoData);

        // 6. Return results
        return {
            success: true,
            validation,
            fiveComponent,
            somatotype,
            summary: {
                bodyFatPercent: fiveComponent.lipidFatPercent,
                fatMassKg: fiveComponent.adipose.kg,
                muscleMassKg: fiveComponent.muscle.kg,
                boneMassKg: fiveComponent.bone.kg,
                endomorphy: somatotype.endomorphy,
                mesomorphy: somatotype.mesomorphy,
                ectomorphy: somatotype.ectomorphy,
            }
        };

    } catch (error) {
        console.error('[ANTHROPOMETRY] Calculation error:', error);
        return {
            success: false,
            error: 'Error interno al calcular. Intente nuevamente.',
        };
    }
}
