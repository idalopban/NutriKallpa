"use server";

import { z } from "zod";
import { createPostgrestClient } from "@/lib/postgrest";
import { MedidasAntropometricas } from "@/types";
import { revalidatePath } from "next/cache";

// ===========================================
// ZOD VALIDATION SCHEMAS (Server-side validation)
// ===========================================

const PlieguesSchema = z.object({
    triceps: z.number().min(0).max(80, "Pliegue fuera de rango").optional(),
    subscapular: z.number().min(0).max(80, "Pliegue fuera de rango").optional(),
    biceps: z.number().min(0).max(60, "Pliegue fuera de rango").optional(),
    iliac_crest: z.number().min(0).max(80, "Pliegue fuera de rango").optional(),
    supraspinale: z.number().min(0).max(60, "Pliegue fuera de rango").optional(),
    abdominal: z.number().min(0).max(80, "Pliegue fuera de rango").optional(),
    thigh: z.number().min(0).max(80, "Pliegue fuera de rango").optional(),
    calf: z.number().min(0).max(60, "Pliegue fuera de rango").optional(),
}).optional();

const PerimetrosSchema = z.object({
    brazoFlex: z.number().min(0).max(100).optional(),
    brazoRelax: z.number().min(0).max(100).optional(),
    brazoRelajado: z.number().min(0).max(100).optional(),
    musloMedio: z.number().min(0).max(100).optional(), // Critical for 5C model
    pantorrilla: z.number().min(0).max(80).optional(),
    cintura: z.number().min(0).max(250).optional(),
    cadera: z.number().min(0).max(250).optional(),
    cuello: z.number().min(0).max(80).optional(),
}).optional();

const DiametrosSchema = z.object({
    humero: z.number().min(0).max(20).optional(),
    femur: z.number().min(0).max(20).optional(),
    biacromial: z.number().min(0).max(60).optional(),
    biiliocristal: z.number().min(0).max(50).optional(),
    biestiloideo: z.number().min(0).max(15).optional(),
}).optional();

export const EvaluacionSchema = z.object({
    pacienteId: z.string().uuid("ID de paciente inválido"),
    peso: z.number().min(1, "El peso es requerido").max(500, "Peso fuera de rango"),
    talla: z.number().min(30, "Talla mínima 30cm").max(300, "Talla fuera de rango"),
    edad: z.number().min(0, "Edad inválida").max(150, "Edad fuera de rango"),
    sexo: z.enum(["masculino", "femenino", "otro"]).optional(),
    imc: z.number().optional(),
    tipoPaciente: z.string().optional(),
    pliegues: PlieguesSchema,
    perimetros: PerimetrosSchema,
    diametros: DiametrosSchema,
});

export type EvaluacionInput = z.infer<typeof EvaluacionSchema>;

// ===========================================
// TYPE DEFINITIONS
// ===========================================

export type SaveEvaluationResult =
    | { success: true; id?: string; message: string }
    | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// ===========================================
// SERVER ACTION
// ===========================================

export async function saveEvaluation(
    data: MedidasAntropometricas,
    calculatedResults?: {
        bodyFatPercent?: number;
        muscleMassKg?: number;
        somatotypeEndo?: number;
        somatotypeMeso?: number;
        somatotypeEcto?: number;
    }
): Promise<SaveEvaluationResult> {
    try {
        // 1. Server-side Zod validation
        const validationResult = EvaluacionSchema.safeParse({
            pacienteId: data.pacienteId,
            peso: data.peso,
            talla: data.talla,
            edad: data.edad,
            sexo: data.sexo,
            imc: data.imc,
            tipoPaciente: data.tipoPaciente,
            pliegues: data.pliegues,
            perimetros: data.perimetros,
            diametros: data.diametros,
        });

        if (!validationResult.success) {
            const fieldErrors: Record<string, string[]> = {};
            for (const issue of validationResult.error.issues) {
                const path = issue.path.join('.');
                if (!fieldErrors[path]) fieldErrors[path] = [];
                fieldErrors[path].push(issue.message);
            }
            return {
                success: false,
                error: "Datos de entrada inválidos",
                fieldErrors
            };
        }

        const client = createPostgrestClient();

        // Map frontend "MedidasAntropometricas" to DB "anthropometry_records"
        const dbRecord = {
            patient_id: data.pacienteId,
            weight: data.peso || 0,
            height: data.talla || 0,
            age: data.edad || 0,

            // Skinfolds
            triceps: data.pliegues?.triceps || 0,
            subscapular: data.pliegues?.subscapular || 0,
            biceps: data.pliegues?.biceps || 0,
            iliac_crest: data.pliegues?.iliac_crest || 0,
            supraspinale: data.pliegues?.supraspinale || 0,
            abdominal: data.pliegues?.abdominal || 0,
            thigh: data.pliegues?.thigh || 0,
            calf: data.pliegues?.calf || 0,

            // Girths (including musloMedio)
            arm_relaxed: data.perimetros?.brazoRelajado || 0,
            arm_flexed: data.perimetros?.brazoFlex || 0,
            waist: data.perimetros?.cintura || 0,
            hip: data.perimetros?.cadera || 0,
            thigh_mid: data.perimetros?.musloMedio || 0, // Critical for 5C model
            calf_max: data.perimetros?.pantorrilla || 0,

            // Breadths
            humerus: data.diametros?.humero || 0,
            femur: data.diametros?.femur || 0,

            // Snapshot Results
            body_fat_percent: calculatedResults?.bodyFatPercent || null,
            muscle_mass_kg: calculatedResults?.muscleMassKg || null,
            somatotype_endo: calculatedResults?.somatotypeEndo || null,
            somatotype_meso: calculatedResults?.somatotypeMeso || null,
            somatotype_ecto: calculatedResults?.somatotypeEcto || null,

            created_at: new Date().toISOString()
        };

        const { error } = await client
            .from("anthropometry_records")
            .insert(dbRecord);

        if (error) {
            console.error("[saveEvaluation] DB Error:", error);
            return { success: false, error: error.message };
        }

        revalidatePath("/dashboard/pacientes/[id]");
        return { success: true, message: "Evaluación guardada correctamente" };

    } catch (error) {
        console.error("[saveEvaluation] Unexpected error:", error);
        return { success: false, error: "Error interno del servidor" };
    }
}

