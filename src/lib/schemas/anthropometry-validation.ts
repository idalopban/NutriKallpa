import { z } from "zod";

/**
 * Zod Schema for Anthropometry Validation
 * Flexible validation: only checks limits when values are provided (> 0).
 * Runs anatomical consistency checks only on non-zero pairs.
 */

// Helper: Optional number that validates limits only when > 0
const optionalMeasure = (min: number, max: number, lowMsg: string) =>
    z.number().refine(
        (val) => val === 0 || (val >= min && val <= max),
        { message: lowMsg }
    );

export const anthropometrySchema = z.object({
    bioData: z.object({
        peso: z.number().min(2, "El peso mínimo es 2kg").max(250, "El peso excede el límite lógico"),
        talla: z.number().min(40, "La talla mínima es 40cm").max(230, "La talla excede el límite lógico"),
        sittingHeight: optionalMeasure(30, 110, "Talla sentado fuera de rango (30-110 cm)").optional(),
        edad: z.number().min(0, "Edad mínima 0").max(110),
        genero: z.enum(["masculino", "femenino"]),
    }),
    skinfolds: z.object({
        triceps: optionalMeasure(2, 60, "Pliegue tríceps fuera de rango (2-60 mm)"),
        subscapular: optionalMeasure(3, 60, "Pliegue subescapular fuera de rango (3-60 mm)"),
        biceps: optionalMeasure(2, 40, "Pliegue bíceps fuera de rango (2-40 mm)"),
        iliac_crest: optionalMeasure(3, 60, "Pliegue cresta ilíaca fuera de rango (3-60 mm)"),
        supraspinale: optionalMeasure(3, 60, "Pliegue supraespinal fuera de rango (3-60 mm)"),
        abdominal: optionalMeasure(4, 80, "Pliegue abdominal fuera de rango (4-80 mm)"),
        thigh: optionalMeasure(4, 70, "Pliegue muslo fuera de rango (4-70 mm)"),
        calf: optionalMeasure(3, 50, "Pliegue pantorrilla fuera de rango (3-50 mm)"),
    }),
    girths: z.object({
        brazoRelajado: optionalMeasure(18, 60, "Perímetro brazo fuera de rango (18-60 cm)"),
        brazoFlexionado: optionalMeasure(20, 65, "Perímetro brazo flexionado fuera de rango (20-65 cm)"),
        cintura: optionalMeasure(45, 200, "Perímetro cintura fuera de rango (45-200 cm)"),
        musloMedio: optionalMeasure(35, 100, "Perímetro muslo fuera de rango (35-100 cm)"),
        pantorrilla: optionalMeasure(20, 60, "Perímetro pantorrilla fuera de rango (20-60 cm)"),
    }),
    breadths: z.object({
        humero: optionalMeasure(5, 12, "Diámetro húmero fuera de rango (5-12 cm)"),
        femur: optionalMeasure(7, 16, "Diámetro fémur fuera de rango (7-16 cm)"),
        biacromial: optionalMeasure(30, 60, "Diámetro biacromial fuera de rango (30-60 cm)"),
        biiliocristal: optionalMeasure(22, 55, "Diámetro biiliocristal fuera de rango (22-55 cm)"),
        biestiloideo: optionalMeasure(4, 8, "Diámetro muñeca fuera de rango (4-8 cm)"),
    }),
}).superRefine((data, ctx) => {
    // --- ANATOMICAL CONSISTENCY CHECKS (only when both values exist) ---

    // 1. Girth & Breadth Logic
    if (data.girths.musloMedio > 0 && data.girths.pantorrilla > 0) {
        if (data.girths.musloMedio < data.girths.pantorrilla) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "El muslo no puede ser menor que la pantorrilla.",
                path: ["girths", "musloMedio"]
            });
        }
    }
    if (data.breadths.femur > 0 && data.breadths.humero > 0) {
        if (data.breadths.femur < data.breadths.humero) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "El fémur debe ser mayor que el húmero en adultos.",
                path: ["breadths", "femur"]
            });
        }
    }
    if (data.girths.cintura > 0 && data.girths.brazoRelajado > 0) {
        if (data.girths.cintura < data.girths.brazoRelajado) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Inconsistencia: Cintura imposiblemente pequeña comparada con el brazo.",
                path: ["girths", "cintura"]
            });
        }
    }

    // 2. Skinfold vs Girth Logic (Regla del Cilindro)
    if (data.skinfolds.triceps > 0 && data.girths.brazoRelajado > 0) {
        if (data.skinfolds.triceps / 10 >= data.girths.brazoRelajado / Math.PI) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "El pliegue del tríceps no cabe en el diámetro del brazo.",
                path: ["skinfolds", "triceps"]
            });
        }
    }
    if (data.skinfolds.thigh > 0 && data.girths.musloMedio > 0) {
        if (data.skinfolds.thigh / 10 >= data.girths.musloMedio / Math.PI) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "El pliegue del muslo no cabe en el diámetro del muslo.",
                path: ["skinfolds", "thigh"]
            });
        }
    }
    if (data.skinfolds.calf > 0 && data.girths.pantorrilla > 0) {
        if (data.skinfolds.calf / 10 >= data.girths.pantorrilla / Math.PI) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "El pliegue de la pantorrilla no cabe en el diámetro de la misma.",
                path: ["skinfolds", "calf"]
            });
        }
    }
    if (data.skinfolds.abdominal > 0 && data.girths.cintura > 0) {
        if (data.skinfolds.abdominal / 10 >= data.girths.cintura / Math.PI) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "El pliegue abdominal es incompatible con el perímetro de cintura.",
                path: ["skinfolds", "abdominal"]
            });
        }
    }

    // 3. Sitting Height Logic
    if (data.bioData.sittingHeight && data.bioData.sittingHeight > 0) {
        if (data.bioData.sittingHeight >= data.bioData.talla) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "La talla sentado no puede ser mayor o igual a la talla total.",
                path: ["bioData", "sittingHeight"]
            });
        }
    }
});

export type AnthropometryValidation = z.infer<typeof anthropometrySchema>;
