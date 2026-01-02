"use server";

import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getServerSession } from "@/lib/session-utils";
import { logger } from "@/lib/logger";
import type { SavedPlan } from "@/lib/diet-service";

/**
 * Get all diet plans for the authenticated user
 * SECURITY: Uses admin client and session validation
 */
export async function getDietPlansAction(): Promise<{ success: boolean; data?: SavedPlan[]; error?: string }> {
    try {
        const sessionUserId = await getServerSession();
        if (!sessionUserId) {
            return { success: false, error: "No autorizado" };
        }

        const client = createSupabaseAdmin();
        const { data, error } = await client
            .from("diet_plans")
            .select("*")
            .eq("user_id", sessionUserId)
            .order("created_at", { ascending: false });

        if (error) {
            logger.error('Error fetching diet plans action', { action: 'getDietPlansAction' }, error as Error);
            return { success: false, error: error.message };
        }

        const plans: SavedPlan[] = (data || []).map(row => ({
            id: row.id,
            userId: row.user_id,
            patientId: row.patient_id,
            name: row.name,
            startDate: row.start_date,
            endDate: row.end_date,
            status: row.status || 'active',
            planData: row.plan_data || [],
            createdAt: row.created_at,
        }));

        return { success: true, data: plans };
    } catch (err: any) {
        logger.error('Unexpected error in getDietPlansAction', { action: 'getDietPlansAction' }, err);
        return { success: false, error: "Error de servidor" };
    }
}
