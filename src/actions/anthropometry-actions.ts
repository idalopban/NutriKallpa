"use server";

import { createPostgrestClient } from "@/lib/postgrest";
import { MedidasAntropometricas } from "@/types";
import { revalidatePath } from "next/cache";

export async function saveEvaluation(data: MedidasAntropometricas, calculatedResults?: {
    bodyFatPercent?: number;
    muscleMassKg?: number;
    somatotypeEndo?: number;
    somatotypeMeso?: number;
    somatotypeEcto?: number;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const client = createPostgrestClient();

        if (!data.pacienteId) {
            return { success: false, error: "ID de paciente requerido" };
        }

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

            // Girths
            arm_relaxed: data.perimetros?.brazoRelajado || 0,
            arm_flexed: data.perimetros?.brazoFlex || 0,
            waist: data.perimetros?.cintura || 0,
            hip: data.perimetros?.cadera || 0,
            thigh_mid: data.perimetros?.musloMedio || 0,
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
            console.error("Error saving anthropometry record:", error);
            return { success: false, error: error.message };
        }

        revalidatePath("/dashboard/pacientes/[id]");
        return { success: true };

    } catch (error) {
        console.error("Unexpected error saving evaluations:", error);
        return { success: false, error: "Error interno del servidor" };
    }
}
