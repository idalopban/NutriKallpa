"use server";

import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getServerSession } from "@/lib/session-utils";
import { logger } from "@/lib/logger";
import type { Cita } from "@/types";

/**
 * Get all appointments for the authenticated user
 * SECURITY: Uses admin client and session validation
 */
export async function getAppointmentsAction(): Promise<{ success: boolean; data?: Cita[]; error?: string }> {
    try {
        const sessionUserId = await getServerSession();
        if (!sessionUserId) {
            return { success: false, error: "No autorizado" };
        }

        const client = createSupabaseAdmin();
        const { data, error } = await client
            .from("citas")
            .select("*")
            .eq("user_id", sessionUserId)
            .order("fecha", { ascending: true })
            .order("hora", { ascending: true });

        if (error) {
            logger.error('Error fetching appointments action', { action: 'getAppointmentsAction' }, error as Error);
            return { success: false, error: error.message };
        }

        const appointments: Cita[] = (data || []).map(row => ({
            id: row.id,
            pacienteId: row.patient_id,
            fecha: row.fecha,
            hora: row.hora,
            motivo: row.motivo || '',
            estado: row.estado || 'pendiente',
            modalidad: row.modalidad,
            enlaceReunion: row.enlace_reunion,
            categoria: row.categoria,
            notas: row.notas || undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));

        return { success: true, data: appointments };
    } catch (err: any) {
        logger.error('Unexpected error in getAppointmentsAction', { action: 'getAppointmentsAction' }, err);
        return { success: false, error: "Error de servidor" };
    }
}
