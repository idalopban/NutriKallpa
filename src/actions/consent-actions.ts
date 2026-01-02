"use server";

import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getServerSession } from "@/lib/session-utils";
import { logger } from "@/lib/logger";
import { ConsentType } from "@/lib/consent-manager";

/**
 * Record a new consent via Server Action to handle session correctly
 */
export async function recordConsentAction(params: {
    patientId: string;
    consentType: ConsentType;
    granted: boolean;
    expiresAt?: string;
    guardianName?: string;
    guardianRelationship?: string;
    guardianDocument?: string;
    signatureUrl?: string;
    notes?: string;
    userAgent?: string;
}) {
    try {
        const sessionUserId = await getServerSession();
        if (!sessionUserId) {
            return { success: false, error: "No autorizado" };
        }

        const client = createSupabaseAdmin();

        // Security check: Verify patient belongs to the user
        const { data: patient, error: patientError } = await client
            .from("pacientes")
            .select("usuario_id")
            .eq("id", params.patientId)
            .single();

        if (patientError || !patient || patient.usuario_id !== sessionUserId) {
            return { success: false, error: "Paciente no encontrado o no pertenece al usuario" };
        }

        const { data, error } = await client
            .from("patient_consents")
            .insert({
                patient_id: params.patientId,
                consent_type: params.consentType,
                granted: params.granted,
                expires_at: params.expiresAt || null,
                user_agent: params.userAgent || null,
                document_version: '1.0',
                signature_url: params.signatureUrl || null,
                guardian_name: params.guardianName || null,
                guardian_relationship: params.guardianRelationship || null,
                guardian_document: params.guardianDocument || null,
                notes: params.notes || null,
                collected_by: sessionUserId
            })
            .select()
            .single();

        if (error) {
            logger.error('Error in recordConsentAction', { action: 'recordConsentAction' }, error as Error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (err: any) {
        logger.error('Unexpected error in recordConsentAction', { action: 'recordConsentAction' }, err);
        return { success: false, error: "Error de servidor al grabar consentimiento" };
    }
}

/**
 * Get consent status via Server Action
 */
export async function getConsentStatusAction(patientId: string) {
    try {
        const sessionUserId = await getServerSession();
        if (!sessionUserId) {
            return { success: false, error: "No autorizado" };
        }

        const client = createSupabaseAdmin();

        // Verify ownership
        const { data: patient, error: pError } = await client
            .from("pacientes")
            .select("usuario_id")
            .eq("id", patientId)
            .single();

        if (pError || !patient || patient.usuario_id !== sessionUserId) {
            return { success: false, error: "No autorizado" };
        }

        const { data, error } = await client
            .from("patient_consents")
            .select("consent_type, granted, expires_at, revoked_at, guardian_name, guardian_relationship, guardian_document, granted_at")
            .eq("patient_id", patientId)
            .eq("granted", true)
            .is("revoked_at", null)
            .order("granted_at", { ascending: false });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (err) {
        return { success: false, error: "Error de servidor" };
    }
}
