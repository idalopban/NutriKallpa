/**
 * adolescent-validation.ts
 * 
 * Zod schema for adolescent-specific anthropometric validation.
 * Makes 4 skinfolds REQUIRED when patient is 10-19 years old.
 */

import { z } from 'zod';

/**
 * Skinfold measurement schema (reusable)
 * Range: 2-60mm for most skinfolds
 */
const skinfoldSchema = z.number()
    .min(2, 'El pliegue mínimo es 2mm')
    .max(60, 'El pliegue máximo es 60mm');

/**
 * Optional skinfold (for non-adolescents)
 */
const optionalSkinfold = z.number()
    .min(0)
    .max(60)
    .optional()
    .default(0);

/**
 * Tanner Stage schema (1-5)
 */
export const tannerStageSchema = z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
]);

/**
 * Tanner Rating schema
 */
export const tannerRatingSchema = z.object({
    primary: tannerStageSchema,
    pubicHair: tannerStageSchema,
});

/**
 * Required skinfolds schema for adolescents
 */
export const adolescentSkinfoldsSchema = z.object({
    biceps: skinfoldSchema,
    triceps: skinfoldSchema,
    subscapular: skinfoldSchema,
    suprailiac: skinfoldSchema,
});

/**
 * Optional skinfolds schema for non-adolescents
 */
export const optionalSkinfoldsSchema = z.object({
    biceps: optionalSkinfold,
    triceps: optionalSkinfold,
    subscapular: optionalSkinfold,
    suprailiac: optionalSkinfold,
});

/**
 * Full adolescent anthropometry schema
 * Applies stricter validation for patients aged 10-19
 */
export const adolescentAnthropometrySchema = z.object({
    bioData: z.object({
        peso: z.number().min(10, 'El peso mínimo es 10kg').max(150, 'El peso máximo es 150kg'),
        talla: z.number().min(100, 'La talla mínima es 100cm').max(200, 'La talla máxima es 200cm'),
        edad: z.number().min(10, 'Esta evaluación es para adolescentes (10-17 años)').max(17, 'Esta evaluación es para adolescentes (10-17 años)'),
        genero: z.enum(['masculino', 'femenino']),
    }),
    skinfolds: adolescentSkinfoldsSchema,
    tanner: tannerRatingSchema.optional(),
});

/**
 * Helper function to determine if adolescent validation should be applied
 */
export function isAdolescentAge(age: number): boolean {
    return age >= 10 && age < 18;
}

/**
 * Conditional skinfold schema based on age
 * Returns the appropriate schema depending on whether patient is adolescent
 */
export function getSkinfoldSchema(age: number) {
    if (isAdolescentAge(age)) {
        return adolescentSkinfoldsSchema;
    }
    return optionalSkinfoldsSchema;
}

/**
 * Type exports
 */
export type TannerStage = z.infer<typeof tannerStageSchema>;
export type TannerRating = z.infer<typeof tannerRatingSchema>;
export type AdolescentSkinfolds = z.infer<typeof adolescentSkinfoldsSchema>;
export type AdolescentAnthropometry = z.infer<typeof adolescentAnthropometrySchema>;

// ============================================================================
// PATIENT TYPE + AGE CROSS-VALIDATION
// ============================================================================

import { differenceInYears } from 'date-fns';
import { PEDIATRIC_AGE_THRESHOLD, GERIATRIC_AGE_THRESHOLD } from '../patient-stage';

/**
 * Schema with cross-validation between tipoPaciente and fechaNacimiento.
 * Ensures the selected patient type matches the actual age.
 */
export const patientTypeAgeSchema = z.object({
    tipoPaciente: z.enum(['pediatrico', 'adulto', 'adulto_mayor']),
    fechaNacimiento: z.string().or(z.date()),
}).superRefine((data, ctx) => {
    const birth = new Date(data.fechaNacimiento);
    const age = differenceInYears(new Date(), birth);

    if (data.tipoPaciente === 'pediatrico' && age >= PEDIATRIC_AGE_THRESHOLD) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Paciente debe tener menos de ${PEDIATRIC_AGE_THRESHOLD} años para tipo Pediátrico (tiene ${age} años)`,
            path: ['fechaNacimiento']
        });
    }

    if (data.tipoPaciente === 'adulto' && (age < PEDIATRIC_AGE_THRESHOLD || age >= GERIATRIC_AGE_THRESHOLD)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Paciente debe tener entre ${PEDIATRIC_AGE_THRESHOLD} y ${GERIATRIC_AGE_THRESHOLD - 1} años para tipo Adulto`,
            path: ['fechaNacimiento']
        });
    }

    if (data.tipoPaciente === 'adulto_mayor' && age < GERIATRIC_AGE_THRESHOLD) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Paciente debe tener ${GERIATRIC_AGE_THRESHOLD} años o más para tipo Geriátrico`,
            path: ['fechaNacimiento']
        });
    }
});

export type PatientTypeAgeInput = z.infer<typeof patientTypeAgeSchema>;
