'use client';

import { useMemo } from 'react';
import * as z from 'zod';
import {
    AmputationType,
    GMFCSLevel,
    calculateChronologicalAge
} from '@/lib/clinical-calculations';

// ============================================================================
// TYPES
// ============================================================================

export type ClinicalContext =
    | 'general'
    | 'lactante'      // < 2 años
    | 'pediatrico'    // 2-17 años
    | 'adulto'        // 18-64 años
    | 'adulto_mayor'  // ≥ 65 años
    | 'gestante'
    | 'amputado'
    | 'neuro';        // PC, Down, etc.

export interface PatientContext {
    fechaNacimiento: Date | string;
    sexo: 'masculino' | 'femenino';
    // Clinical toggles
    isPregnant?: boolean;
    gestationalWeeks?: number;
    prePregnancyWeight?: number;
    hasAmputations?: boolean;
    amputations?: AmputationType[];
    isNeurological?: boolean;
    gmfcsLevel?: GMFCSLevel;
    canStand?: boolean; // Para adultos mayores/postrados
}

export interface FieldConfig {
    id: string;
    label: string;
    type: 'number' | 'select' | 'switch' | 'multi-select';
    unit?: string;
    min?: number;
    max?: number;
    step?: number;
    required?: boolean;
    placeholder?: string;
    options?: { value: string; label: string }[];
    helperText?: string;
    warningThreshold?: { min?: number; max?: number; message: string };
}

export interface SpecialSectionConfig {
    id: string;
    title: string;
    icon: string;
    color: string;
    fields: FieldConfig[];
    condition?: (context: PatientContext, age: number) => boolean;
}

export interface AnthropometryConfig {
    clinicalContext: ClinicalContext;
    age: number;
    visibleFields: string[];
    hiddenFields: string[];
    requiredFields: string[];
    specialSections: SpecialSectionConfig[];
    validationSchema: z.ZodObject<any>;
    warnings: string[];
    recommendations: string[];
}

// ============================================================================
// FIELD DEFINITIONS
// ============================================================================

const BASIC_FIELDS: FieldConfig[] = [
    { id: 'peso', label: 'Peso', type: 'number', unit: 'kg', min: 0.5, max: 300, step: 0.1, required: true },
    { id: 'talla', label: 'Talla', type: 'number', unit: 'cm', min: 30, max: 250, step: 0.1, required: true },
    { id: 'longitud', label: 'Longitud (acostado)', type: 'number', unit: 'cm', min: 30, max: 120, step: 0.1, required: false },
];

const GERIATRIC_FIELDS: FieldConfig[] = [
    { id: 'alturaRodilla', label: 'Altura de Rodilla', type: 'number', unit: 'cm', min: 30, max: 65, step: 0.1, helperText: 'Para estimar talla (Chumlea)' },
    { id: 'circunferenciaPantorrilla', label: 'Circ. Pantorrilla', type: 'number', unit: 'cm', min: 15, max: 60, step: 0.1, warningThreshold: { max: 31, message: 'Riesgo de sarcopenia (< 31 cm)' } },
];

const PREGNANCY_FIELDS: FieldConfig[] = [
    { id: 'semanasGestacion', label: 'Semanas de Gestación', type: 'number', unit: 'sem', min: 6, max: 42, step: 1, required: true },
    { id: 'pesoPregestacional', label: 'Peso Pre-gestacional', type: 'number', unit: 'kg', min: 30, max: 200, step: 0.1, helperText: 'Para cálculo de ganancia de peso' },
];

const INFANT_FIELDS: FieldConfig[] = [
    { id: 'longitud', label: 'Longitud (acostado)', type: 'number', unit: 'cm', min: 30, max: 120, step: 0.1, required: true },
    { id: 'perimetroCefalico', label: 'Perímetro Cefálico', type: 'number', unit: 'cm', min: 25, max: 60, step: 0.1, required: true },
];

const NEURO_FIELDS: FieldConfig[] = [
    { id: 'longitudTibia', label: 'Longitud de Tibia', type: 'number', unit: 'cm', min: 10, max: 50, step: 0.1, helperText: 'Para estimar talla (Stevenson)' },
    { id: 'longitudBrazo', label: 'Longitud Brazo Superior', type: 'number', unit: 'cm', min: 10, max: 45, step: 0.1, helperText: 'Alternativa para estimar talla' },
    {
        id: 'gmfcsLevel',
        label: 'Nivel GMFCS',
        type: 'select',
        options: [
            { value: 'I', label: 'Nivel I' },
            { value: 'II', label: 'Nivel II' },
            { value: 'III', label: 'Nivel III' },
            { value: 'IV', label: 'Nivel IV' },
            { value: 'V', label: 'Nivel V' },
        ]
    },
];

const AMPUTATION_FIELD: FieldConfig = {
    id: 'amputations',
    label: 'Segmentos Amputados',
    type: 'multi-select',
    options: [
        { value: 'mano_izq', label: 'Mano izquierda (0.7%)' },
        { value: 'mano_der', label: 'Mano derecha (0.7%)' },
        { value: 'antebrazo_izq', label: 'Antebrazo izquierdo (1.6%)' },
        { value: 'antebrazo_der', label: 'Antebrazo derecho (1.6%)' },
        { value: 'brazo_izq', label: 'Brazo completo izq. (5%)' },
        { value: 'brazo_der', label: 'Brazo completo der. (5%)' },
        { value: 'pie_izq', label: 'Pie izquierdo (1.5%)' },
        { value: 'pie_der', label: 'Pie derecho (1.5%)' },
        { value: 'pierna_bajo_rodilla_izq', label: 'Pierna bajo rodilla izq. (4.4%)' },
        { value: 'pierna_bajo_rodilla_der', label: 'Pierna bajo rodilla der. (4.4%)' },
        { value: 'pierna_completa_izq', label: 'Pierna completa izq. (16%)' },
        { value: 'pierna_completa_der', label: 'Pierna completa der. (16%)' },
    ],
};

// ============================================================================
// CLINICAL CONTEXT DETECTION
// ============================================================================

function detectClinicalContext(context: PatientContext, age: number): ClinicalContext {
    // Priority order
    if (context.isPregnant) return 'gestante';
    if (context.hasAmputations && context.amputations?.length) return 'amputado';
    if (context.isNeurological || context.gmfcsLevel) return 'neuro';
    if (age < 2) return 'lactante';
    if (age < 18) return 'pediatrico';
    if (age >= 65) return 'adulto_mayor';
    return 'adulto';
}

// ============================================================================
// DYNAMIC ZOD SCHEMA BUILDER
// ============================================================================

function buildValidationSchema(
    clinicalContext: ClinicalContext,
    context: PatientContext,
    age: number
): z.ZodObject<any> {
    const schema: Record<string, z.ZodTypeAny> = {
        peso: z.number().min(0.5, 'Peso mínimo 0.5 kg').max(300),
    };

    // Talla logic
    if (clinicalContext === 'lactante') {
        // Lactantes: longitud obligatoria, talla oculta
        schema.longitud = z.number().min(30).max(120);
        schema.perimetroCefalico = z.number().min(25).max(60);
    } else if (clinicalContext === 'adulto_mayor' && context.canStand === false) {
        // Adulto mayor postrado: altura rodilla obligatoria
        schema.alturaRodilla = z.number().min(30).max(65);
    } else {
        // Resto: talla obligatoria
        schema.talla = z.number().min(30, 'Talla mínima 30 cm').max(250);
    }

    // Pregnancy fields
    if (clinicalContext === 'gestante') {
        schema.semanasGestacion = z.number().min(6).max(42);
        schema.pesoPregestacional = z.number().min(30).max(200).optional();
    }

    // Neurological fields
    if (clinicalContext === 'neuro') {
        schema.longitudTibia = z.number().min(10).max(50).optional();
        schema.gmfcsLevel = z.enum(['I', 'II', 'III', 'IV', 'V']).optional();
    }

    // Geriatric fields
    if (clinicalContext === 'adulto_mayor') {
        schema.circunferenciaPantorrilla = z.number().min(15).max(60).optional();
    }

    return z.object(schema);
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Hook que determina la configuración de campos de antropometría
 * basada en el contexto clínico del paciente.
 * 
 * @param context - Datos del paciente (edad, sexo, condiciones clínicas)
 * @returns Configuración de campos, schema de validación y advertencias
 * 
 * @example
 * ```tsx
 * const config = useAnthropometryConfig({
 *   fechaNacimiento: patient.birthDate,
 *   sexo: 'femenino',
 *   isPregnant: true,
 *   gestationalWeeks: 28,
 * });
 * 
 * // config.clinicalContext === 'gestante'
 * // config.visibleFields incluye 'semanasGestacion'
 * ```
 */
export function useAnthropometryConfig(context: PatientContext): AnthropometryConfig {
    return useMemo(() => {
        // Calculate age
        const birthDate = typeof context.fechaNacimiento === 'string'
            ? new Date(context.fechaNacimiento)
            : context.fechaNacimiento;
        const age = calculateChronologicalAge(birthDate);

        // Detect context
        const clinicalContext = detectClinicalContext(context, age);

        // Build configuration
        const visibleFields: string[] = ['peso'];
        const hiddenFields: string[] = [];
        const requiredFields: string[] = ['peso'];
        const specialSections: SpecialSectionConfig[] = [];
        const warnings: string[] = [];
        const recommendations: string[] = [];

        // =====================================================================
        // APPLY RULES BY CONTEXT
        // =====================================================================

        switch (clinicalContext) {
            case 'lactante':
                // < 2 años: Longitud + Perímetro Cefálico obligatorios
                visibleFields.push('longitud', 'perimetroCefalico');
                requiredFields.push('longitud', 'perimetroCefalico');
                hiddenFields.push('talla'); // Ocultar talla de pie
                recommendations.push('Usar gráficas OMS Peso/Edad y Longitud/Edad');
                break;

            case 'pediatrico':
                visibleFields.push('talla');
                requiredFields.push('talla');
                break;

            case 'adulto':
                visibleFields.push('talla');
                requiredFields.push('talla');
                break;

            case 'adulto_mayor':
                // ≥ 65 años: Rangos geriátricos de IMC
                visibleFields.push('circunferenciaPantorrilla');
                recommendations.push('IMC Normal geriátrico: 23.0 - 27.9');

                if (context.canStand === false) {
                    // Postrado: usar altura de rodilla
                    visibleFields.push('alturaRodilla');
                    requiredFields.push('alturaRodilla');
                    hiddenFields.push('talla');
                    warnings.push('Se usará ecuación de Chumlea para estimar talla');
                } else {
                    visibleFields.push('talla');
                    requiredFields.push('talla');
                }

                specialSections.push({
                    id: 'geriatric',
                    title: 'Evaluación Geriátrica',
                    icon: 'user',
                    color: 'purple',
                    fields: GERIATRIC_FIELDS,
                    condition: () => true,
                });
                break;

            case 'gestante':
                visibleFields.push('talla', 'semanasGestacion', 'pesoPregestacional');
                requiredFields.push('talla', 'semanasGestacion');
                recommendations.push('Se usará Curva de Atalah para clasificación');

                specialSections.push({
                    id: 'pregnancy',
                    title: 'Datos de Embarazo',
                    icon: 'heart',
                    color: 'pink',
                    fields: PREGNANCY_FIELDS,
                    condition: () => true,
                });
                break;

            case 'amputado':
                visibleFields.push('talla', 'amputations');
                requiredFields.push('talla');
                warnings.push('Se calculará peso corregido para IMC real');

                specialSections.push({
                    id: 'amputation',
                    title: 'Información de Amputaciones',
                    icon: 'accessibility',
                    color: 'orange',
                    fields: [AMPUTATION_FIELD],
                    condition: () => true,
                });
                break;

            case 'neuro':
                // Parálisis Cerebral / Down
                visibleFields.push('longitudTibia', 'gmfcsLevel');

                if (context.gmfcsLevel === 'IV' || context.gmfcsLevel === 'V') {
                    warnings.push('Alto riesgo nutricional por GMFCS IV-V');
                    hiddenFields.push('talla');
                    requiredFields.push('longitudTibia');
                } else {
                    visibleFields.push('talla');
                    requiredFields.push('talla');
                }

                specialSections.push({
                    id: 'neurological',
                    title: 'Evaluación Neurológica',
                    icon: 'brain',
                    color: 'blue',
                    fields: NEURO_FIELDS,
                    condition: () => true,
                });
                break;

            default:
                visibleFields.push('talla');
                requiredFields.push('talla');
        }

        // Build validation schema
        const validationSchema = buildValidationSchema(clinicalContext, context, age);

        return {
            clinicalContext,
            age: Math.round(age * 10) / 10,
            visibleFields,
            hiddenFields,
            requiredFields,
            specialSections,
            validationSchema,
            warnings,
            recommendations,
        };
    }, [
        context.fechaNacimiento,
        context.sexo,
        context.isPregnant,
        context.gestationalWeeks,
        context.hasAmputations,
        context.amputations,
        context.isNeurological,
        context.gmfcsLevel,
        context.canStand,
    ]);
}

/**
 * Helper hook para verificar si un campo debe mostrarse.
 */
export function useFieldVisibility(config: AnthropometryConfig) {
    return useMemo(() => ({
        isVisible: (fieldId: string) =>
            config.visibleFields.includes(fieldId) && !config.hiddenFields.includes(fieldId),
        isRequired: (fieldId: string) =>
            config.requiredFields.includes(fieldId),
        isHidden: (fieldId: string) =>
            config.hiddenFields.includes(fieldId),
    }), [config.visibleFields, config.hiddenFields, config.requiredFields]);
}
