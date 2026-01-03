"use server";

import { createPostgrestClient } from "@/lib/postgrest";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getServerSession } from "@/lib/session-utils";
import { logger } from "@/lib/logger";
import { verifyOwnership } from "@/lib/security";
import type { Paciente, MedidasAntropometricas } from "@/types";

export interface AnthropometryHistoryRecord {
    id: string;
    date: string;
    weight: number;
    height: number;
    bodyFatPercent: number | null;
    muscleMassKg: number | null;
    somatotypeEndo: number | null;
    somatotypeMeso: number | null;
    somatotypeEcto: number | null;
}

/**
 * Create or update a patient
 * SECURITY: Validates session and forces usuarioId to be the authenticated user
 */
export async function createPatient(paciente: Paciente): Promise<{ success: boolean; error?: string }> {
    try {
        // SECURITY FIX: Validate session first
        const sessionUserId = await getServerSession();
        if (!sessionUserId) {
            logger.warn('createPatient called without valid session');
            return { success: false, error: "No autorizado - sesión inválida" };
        }

        // Use admin client to bypass RLS (we validate session above)
        const client = createSupabaseAdmin();

        // SECURITY FIX: Force usuario_id to be the authenticated user
        // SECURITY FIX: User Takeover Prevention
        // Check if patient exists and belongs to another user
        const { data: existingPatient } = await client.from("pacientes").select("usuario_id").eq("id", paciente.id).single();
        if (existingPatient && existingPatient.usuario_id !== sessionUserId) {
            logger.error(`SECURITY ALERT: Takeover attempt. User ${sessionUserId} tried to overwrite patient ${paciente.id} of user ${existingPatient.usuario_id}`);
            return { success: false, error: "No autorizado - Este paciente pertenece a otro usuario" };
        }

        const patientData = {
            id: paciente.id,
            usuario_id: sessionUserId, // ← ALWAYS from session, never from client
            nombre: paciente.datosPersonales.nombre,
            apellido: paciente.datosPersonales.apellido,
            email: paciente.datosPersonales.email || null,
            telefono: paciente.datosPersonales.telefono || null,
            fecha_nacimiento: paciente.datosPersonales.fechaNacimiento,
            sexo: paciente.datosPersonales.sexo,
            documento_identidad: paciente.datosPersonales.documentoIdentidad || null,
            avatar_url: paciente.datosPersonales.avatarUrl || null,
            historia_clinica: paciente.historiaClinica || {},
            preferencias: paciente.preferencias || {},
            created_at: paciente.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString() // Always update timestamp
        };

        const { error } = await client
            .from("pacientes")
            .upsert(patientData, { onConflict: 'id' });

        if (error) {
            logger.error('Error creating patient', { action: 'createPatient' }, error as Error);
            return { success: false, error: error.message };
        }

        logger.info('Patient created/updated', {
            action: 'createPatient',
            patientId: paciente.id.slice(0, 8) + '...'
        });

        return { success: true };
    } catch (err: any) {
        logger.error('Unexpected error in createPatient', { action: 'createPatient' }, err);
        return { success: false, error: "Error de servidor al crear paciente" };
    }
}

/**
 * Get all patients for the authenticated user
 * SECURITY: Uses admin client to bypass RLS and getServerSession for identity
 */
export async function getPatientsAction(): Promise<{ success: boolean; data?: Paciente[]; error?: string }> {
    try {
        const sessionUserId = await getServerSession();
        if (!sessionUserId) {
            return { success: false, error: "No autorizado" };
        }

        const client = createSupabaseAdmin();
        const { data, error } = await client
            .from("pacientes")
            .select("*")
            .eq("usuario_id", sessionUserId)
            .order("created_at", { ascending: false });

        if (error) {
            logger.error('Error fetching patients action', { action: 'getPatientsAction' }, error as Error);
            return { success: false, error: error.message };
        }

        const patients: Paciente[] = (data || []).map(row => ({
            id: row.id,
            usuarioId: row.usuario_id,
            datosPersonales: {
                nombre: row.nombre,
                apellido: row.apellido,
                email: row.email || '',
                telefono: row.telefono || undefined,
                fechaNacimiento: row.fecha_nacimiento,
                sexo: row.sexo,
                documentoIdentidad: row.documento_identidad,
                avatarUrl: row.avatar_url || undefined,
            },
            historiaClinica: row.historia_clinica || {},
            preferencias: row.preferencias || {},
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));

        return { success: true, data: patients };
    } catch (err: any) {
        logger.error('Unexpected error in getPatientsAction', { action: 'getPatientsAction' }, err);
        return { success: false, error: "Error de servidor" };
    }
}


/**
 * Delete a patient and all their records
 * SECURITY: Validates session and ownership
 */
export async function deletePatient(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const sessionUserId = await getServerSession();
        if (!sessionUserId) return { success: false, error: "No autorizado" };

        const client = createSupabaseAdmin();

        // Security: Verify ownership before delete (Centralized Check)
        await verifyOwnership("pacientes", id);

        const { error } = await client.from("pacientes").delete().eq("id", id);
        if (error) throw error;

        return { success: true };
    } catch (err: any) {
        logger.error('Error deleting patient', { action: 'deletePatient', patientId: id }, err);
        return { success: false, error: "Error al eliminar paciente" };
    }
}

/**
 * Get patient anthropometry history
 * SECURITY: Validates session and verifies the patient belongs to the caller
 */
export async function getPatientHistory(patientId: string): Promise<{ success: boolean; data?: AnthropometryHistoryRecord[]; error?: string }> {
    try {
        // SECURITY FIX: Validate session first
        const sessionUserId = await getServerSession();
        if (!sessionUserId) {
            logger.warn('getPatientHistory called without valid session');
            return { success: false, error: "No autorizado - sesión inválida" };
        }

        if (!patientId) {
            return { success: false, error: "Patient ID is required" };
        }

        const client = createPostgrestClient();



        // SECURITY FIX: Verify ownership using centralized utility
        try {
            await verifyOwnership("pacientes", patientId);
        } catch (authErr) {
            return { success: false, error: "No autorizado o paciente no encontrado" };
        }

        // Now fetch the history (ownership verified)
        const { data, error } = await client
            .from("anthropometry_records")
            .select("id, created_at, weight, height, body_fat_percent, muscle_mass_kg, somatotype_endo, somatotype_meso, somatotype_ecto")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false });

        if (error) {
            logger.error('Error fetching patient history', { action: 'getPatientHistory' }, error as Error);
            return { success: false, error: error.message };
        }

        // Map DB snake_case to camelCase
        const history: AnthropometryHistoryRecord[] = (data || []).map((record: any) => ({
            id: record.id,
            date: record.created_at,
            weight: Number(record.weight),
            height: Number(record.height),
            bodyFatPercent: record.body_fat_percent !== null ? Number(record.body_fat_percent) : null,
            muscleMassKg: record.muscle_mass_kg !== null ? Number(record.muscle_mass_kg) : null,
            somatotypeEndo: record.somatotype_endo !== null ? Number(record.somatotype_endo) : null,
            somatotypeMeso: record.somatotype_meso !== null ? Number(record.somatotype_meso) : null,
            somatotypeEcto: record.somatotype_ecto !== null ? Number(record.somatotype_ecto) : null,
        }));

        return { success: true, data: history };
    } catch (err: any) {
        logger.error('Unexpected error in getPatientHistory', { action: 'getPatientHistory' }, err);
        return { success: false, error: "Error de servidor al obtener historial" };
    }
}

/**
 * Delete a specific anthropometry record
 * SECURITY: Validates session and ownership
 */
export async function deleteAnthropometryRecord(recordId: string, patientId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const sessionUserId = await getServerSession();
        if (!sessionUserId) return { success: false, error: "No autorizado" };

        const client = createSupabaseAdmin();

        // 1. Verify patient ownership
        await verifyOwnership("pacientes", patientId);

        // 2. Delete the record
        // Ensure the record actually belongs to this patient to prevent IDOR on records
        const { error } = await client
            .from("anthropometry_records")
            .delete()
            .eq("id", recordId)
            .eq("patient_id", patientId);

        if (error) throw error;

        return { success: true };
    } catch (err: any) {
        logger.error('Error deleting anthropometry record', { action: 'deleteAnthropometryRecord', recordId }, err);
        return { success: false, error: "Error al eliminar registro" };
    }
}

/**
 * Server-side helper to fetch a single patient (for RSC)
 */
export async function getPatientServer(id: string): Promise<Paciente | null> {
    try {
        const sessionUserId = await getServerSession();
        if (!sessionUserId) return null;

        const client = createSupabaseAdmin();
        // SECURITY: Verify ownership
        try {
            await verifyOwnership("pacientes", id);
        } catch {
            return null;
        }

        const { data, error } = await client.from("pacientes").select("*").eq("id", id).single();

        if (error || !data) return null;

        return {
            id: data.id,
            usuarioId: data.usuario_id,
            datosPersonales: {
                nombre: data.nombre,
                apellido: data.apellido,
                email: data.email || '',
                telefono: data.telefono || undefined,
                fechaNacimiento: data.fecha_nacimiento,
                sexo: data.sexo,
                documentoIdentidad: data.documento_identidad,
                avatarUrl: data.avatar_url || undefined,
            },
            historiaClinica: data.historia_clinica || {},
            preferencias: data.preferencias || {},
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
    } catch {
        return null;
    }
}

/**
 * Server-side helper to fetch patient measurements (for RSC)
 */
export async function getMedidasServer(patientId: string): Promise<MedidasAntropometricas[]> {
    try {
        const sessionUserId = await getServerSession();
        if (!sessionUserId) return [];

        const client = createSupabaseAdmin();

        // SECURITY: Verify patient ownership before fetching its records
        try {
            await verifyOwnership("pacientes", patientId);
        } catch {
            return [];
        }



        const { data, error } = await client
            .from("anthropometry_records")
            .select("*")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false });


        if (error || !data) return [];

        return data.map((record: any) => ({
            id: record.id,
            pacienteId: record.patient_id,
            fecha: record.created_at,
            peso: Number(record.weight),
            talla: Number(record.height),
            porcentajeGrasa: record.body_fat_percent ? Number(record.body_fat_percent) : undefined,
            masaMuscular: record.muscle_mass_kg ? Number(record.muscle_mass_kg) : undefined,
            sexo: record.sexo || 'masculino',
            edad: Number(record.age),
            imc: Number(record.weight) / Math.pow(Number(record.height) / 100, 2),
            pliegues: {
                triceps: Number(record.triceps),
                subscapular: Number(record.subscapular),
                biceps: Number(record.biceps),
                iliac_crest: Number(record.iliac_crest),
                supraspinale: Number(record.supraspinale),
                abdominal: Number(record.abdominal),
                thigh: Number(record.thigh),
                calf: Number(record.calf),
            },
            perimetros: {
                brazoRelax: Number(record.arm_relaxed),
                brazoFlex: Number(record.arm_flexed),
                cintura: Number(record.waist),
                cadera: Number(record.hip),
                musloMedio: Number(record.thigh_mid),
                pantorrilla: Number(record.calf_max),
                headCircumference: record.head_circumference ? Number(record.head_circumference) : undefined,
            },
            diametros: {
                humero: Number(record.humerus),
                femur: Number(record.femur),
                biacromial: record.biacromial ? Number(record.biacromial) : undefined,
                biiliocristal: record.biiliocristal ? Number(record.biiliocristal) : undefined,
                biestiloideo: record.biestiloideo ? Number(record.biestiloideo) : undefined,
            },
            headCircumference: record.head_circumference ? Number(record.head_circumference) : undefined,
            tipoPaciente: record.tipo_paciente as any || 'general',
            createdAt: record.created_at,
            updatedAt: record.updated_at || record.created_at,
        }));
    } catch {
        return [];
    }
}
