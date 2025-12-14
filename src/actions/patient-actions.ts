"use server";

import { createPostgrestClient } from "@/lib/postgrest";
import { getServerSession } from "@/lib/session-utils";
import { logger } from "@/lib/logger";
import type { Paciente } from "@/types";

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

        const client = createPostgrestClient();

        // SECURITY FIX: Force usuario_id to be the authenticated user
        // This prevents IDOR attacks where a user tries to create patients for other users
        const patientData = {
            id: paciente.id,
            usuario_id: sessionUserId, // ← ALWAYS from session, never from client
            nombre: paciente.datosPersonales.nombre,
            apellido: paciente.datosPersonales.apellido,
            email: paciente.datosPersonales.email || null,
            fecha_nacimiento: paciente.datosPersonales.fechaNacimiento,
            sexo: paciente.datosPersonales.sexo,
            documento_identidad: paciente.datosPersonales.documentoIdentidad || null,
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

        // SECURITY FIX: First verify the patient belongs to this user
        const { data: patientCheck, error: patientError } = await client
            .from("pacientes")
            .select("id, usuario_id")
            .eq("id", patientId)
            .single();

        if (patientError || !patientCheck) {
            logger.warn('Patient not found', { action: 'getPatientHistory', patientId: patientId.slice(0, 8) + '...' });
            return { success: false, error: "Paciente no encontrado" };
        }

        // SECURITY FIX: Verify ownership - user can only access their own patients
        if (patientCheck.usuario_id !== sessionUserId) {
            logger.warn('Unauthorized patient access attempt', {
                action: 'getPatientHistory',
                callerUserId: sessionUserId.slice(0, 8) + '...',
                patientOwnerId: patientCheck.usuario_id?.slice(0, 8) + '...'
            });
            return { success: false, error: "No autorizado - paciente no pertenece a este usuario" };
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
