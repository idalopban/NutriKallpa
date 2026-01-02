"use server";

import { z } from "zod";
import { createPostgrestClient } from "@/lib/postgrest";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getServerSession } from "@/lib/session-utils";
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

/**
 * Schema for TEM measurement replications
 * Each skinfold should have 2-3 measurements for TEM calculation
 */
const MeasurementReplicationsSchema = z.object({
    triceps: z.array(z.number().min(0).max(80)).max(3).optional(),
    subscapular: z.array(z.number().min(0).max(80)).max(3).optional(),
    biceps: z.array(z.number().min(0).max(60)).max(3).optional(),
    supraspinale: z.array(z.number().min(0).max(60)).max(3).optional(),
    abdominal: z.array(z.number().min(0).max(80)).max(3).optional(),
    thigh: z.array(z.number().min(0).max(80)).max(3).optional(),
    calf: z.array(z.number().min(0).max(60)).max(3).optional(),
}).optional();

/**
 * Schema for measurement quality (TEM-based)
 */
const MeasurementQualitySchema = z.object({
    overallRating: z.enum(['excellent', 'acceptable', 'poor']).optional(),
    temPercent: z.number().min(0).max(100).optional(),
    meetsISAKStandard: z.boolean().optional(),
    sitesNeedingRemeasurement: z.array(z.string()).optional(),
}).optional();

const EvaluacionSchema = z.object({
    pacienteId: z.string().uuid("ID de paciente inválido"),
    peso: z.number().min(1, "El peso es requerido").max(500, "Peso fuera de rango"),
    talla: z.number().min(30, "Talla mínima 30cm").max(300, "Talla fuera de rango"),
    // NEW: Sitting height for Cormic Index
    tallaSentado: z.number().min(30).max(150).optional(),
    edad: z.number().min(0, "Edad inválida").max(150, "Edad fuera de rango"),
    sexo: z.enum(["masculino", "femenino", "otro"]).optional(),
    imc: z.number().optional(),
    // NEW: Cormic Index calculated field
    cormicIndex: z.number().min(40).max(60).optional(),
    headCircumference: z.number().min(0).max(80).optional(),
    tipoPaciente: z.string().optional(),
    pliegues: PlieguesSchema,
    perimetros: PerimetrosSchema,
    diametros: DiametrosSchema,
    // NEW: TEM measurement replications
    measurementReplications: MeasurementReplicationsSchema,
    // NEW: Measurement quality indicator
    measurementQuality: MeasurementQualitySchema,
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
            headCircumference: data.headCircumference,
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

        // SECURITY FIX: Validate session
        const sessionUserId = await getServerSession();
        if (!sessionUserId) {
            return { success: false, error: "No autorizado - sesión inválida" };
        }

        const client = createSupabaseAdmin();

        // Map frontend "MedidasAntropometricas" to DB "anthropometry_records"
        const dbRecord = {
            id: data.id, // Critical: include ID for proper upsert
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
            // Trunk diameters (added in migration 017)
            biacromial: data.diametros?.biacromial || null,
            biiliocristal: data.diametros?.biiliocristal || null,
            biestiloideo: data.diametros?.biestiloideo || null,

            // Head circumference (Kerr 5C model, added in migration 017)
            head_circumference: data.headCircumference || data.perimetros?.headCircumference || null,

            // Classification
            tipo_paciente: data.tipoPaciente || 'general',

            // Snapshot Results
            // Priority: Server Calc > Client Data > Null
            body_fat_percent: calculatedResults?.bodyFatPercent ?? data.porcentajeGrasa ?? null,
            muscle_mass_kg: calculatedResults?.muscleMassKg || null,
            somatotype_endo: calculatedResults?.somatotypeEndo || null,
            somatotype_meso: calculatedResults?.somatotypeMeso || null,
            somatotype_ecto: calculatedResults?.somatotypeEcto || null,

            created_at: new Date().toISOString()
        };

        const { error } = await client
            .from("anthropometry_records")
            .upsert(dbRecord, { onConflict: 'id' });

        if (error) {
            console.error("[saveEvaluation] DB Error:", error);
            return { success: false, error: error.message };
        }

        // Fix: Correct route is /pacientes/[id], not /dashboard/pacientes/[id]
        // We also revalidate the main list just in case
        revalidatePath("/pacientes");
        revalidatePath(`/pacientes/${data.pacienteId}`);
        return { success: true, message: "Evaluación guardada correctamente" };

    } catch (error) {
        console.error("[saveEvaluation] Unexpected error:", error);
        return { success: false, error: "Error interno del servidor" };
    }
}

/**
 * Updates only the calculated results of an existing anthropometry record.
 * Used when switching formulas or recalculating somatotype.
 */
export async function updateEvaluationResult(
    recordId: string,
    results: {
        bodyFatPercent?: number;
        muscleMassKg?: number;
        somatotype?: { endo: number; meso: number; ecto: number };
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const sessionUserId = await getServerSession();
        if (!sessionUserId) return { success: false, error: "No autorizado" };

        const client = createSupabaseAdmin();

        const updates: any = {};
        if (results.bodyFatPercent !== undefined) updates.body_fat_percent = results.bodyFatPercent;
        if (results.muscleMassKg !== undefined) updates.muscle_mass_kg = results.muscleMassKg;
        if (results.somatotype) {
            updates.somatotype_endo = results.somatotype.endo;
            updates.somatotype_meso = results.somatotype.meso;
            updates.somatotype_ecto = results.somatotype.ecto;
        }

        const { error } = await client
            .from("anthropometry_records")
            .update(updates)
            .eq("id", recordId);

        if (error) {
            console.error("[updateEvaluationResult] DB Error:", error);
            return { success: false, error: error.message };
        }

        revalidatePath("/dashboard/pacientes/[id]");
        return { success: true };
    } catch (error) {
        console.error("Error updating results:", error);
        return { success: false, error: "Error interno" };
    }
}

/**
 * Fetches the most recent anthropometry record for a patient.
 */
export async function getLastAnthropometryAction(patientId: string): Promise<{ data: any | null; diagnostic: any }> {
    const diag: any = {
        patientId,
        timestamp: new Date().toISOString(),
        steps: []
    };

    try {
        diag.steps.push("Auth check...");
        const sessionUserId = await getServerSession();
        diag.sessionUserId = sessionUserId ? "FOUND" : "MISSING";

        if (!sessionUserId) return { data: null, diagnostic: diag };

        diag.steps.push("DB Admin client init...");
        const client = createSupabaseAdmin();

        diag.steps.push("Global count check...");
        const { count: globalCount } = await client
            .from("anthropometry_records")
            .select("*", { count: 'exact', head: true });
        diag.globalCount = globalCount;

        diag.steps.push("Patient ownership check...");
        const { data: patientCheck, error: pError } = await client
            .from("pacientes")
            .select("usuario_id, nombre, apellido")
            .eq("id", patientId)
            .single();

        // If patient doesn't exist in Supabase, fall back to direct anthropometry search
        // This handles patients created only in localStorage
        if (pError?.code === 'PGRST116') {
            diag.patientNotSynced = true;
            diag.steps.push("Patient not in DB, searching anthropometry directly...");

            // Directly search for records with this patient_id
            const { data: directData, error: directError, count: directCount } = await client
                .from("anthropometry_records")
                .select("*", { count: 'exact' })
                .eq("patient_id", patientId)
                .order("created_at", { ascending: false })
                .limit(1);

            if (directError) {
                diag.directQueryError = directError;
                return { data: null, diagnostic: diag };
            }

            diag.patientRecordCount = directCount;
            if (directData && directData.length > 0) {
                diag.lastRecordId = directData[0].id;
                diag.lastRecordDate = directData[0].created_at;
                diag.matchSuccess = true;
            } else if (diag.globalCount > 0) {
                // No records for this patient, show what IDs exist
                const { data: samples } = await client
                    .from("anthropometry_records")
                    .select("patient_id")
                    .limit(5);
                diag.existingPatientIdsInDB = [...new Set(samples?.map(s => s.patient_id))];
            }
            diag.steps.push("Finished (via direct search)");
            return {
                data: (directData && directData.length > 0) ? directData[0] : null,
                diagnostic: diag
            };
        }

        if (pError) {
            diag.pError = pError;
            return { data: null, diagnostic: diag };
        }

        diag.patientFound = true;
        diag.ownerMatch = patientCheck.usuario_id === sessionUserId;

        if (!diag.ownerMatch) {
            diag.ownerId = "PRIVATE";
            return { data: null, diagnostic: diag };
        }

        diag.steps.push("Querying records for patient...");
        const { data, error, count } = await client
            .from("anthropometry_records")
            .select("*", { count: 'exact' })
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false })
            .limit(1);

        if (error) {
            diag.queryError = error;
            return { data: null, diagnostic: diag };
        }

        diag.patientRecordCount = count;

        if (data && data.length > 0) {
            diag.lastRecordId = data[0].id;
            diag.lastRecordDate = data[0].created_at;
            diag.matchSuccess = true;
        } else if (diag.globalCount > 0) {
            const { data: samples } = await client
                .from("anthropometry_records")
                .select("patient_id")
                .limit(5);
            diag.samplePatientIdsFromDB = samples?.map(s => s.patient_id);
        }

        diag.steps.push("Finished");

        return {
            data: (data && data.length > 0) ? data[0] : null,
            diagnostic: diag
        };
    } catch (error: any) {
        diag.exception = error.message;
        return { data: null, diagnostic: diag };
    }
}

