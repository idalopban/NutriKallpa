import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getServerSession } from "@/lib/session-utils";
import { logger } from "@/lib/logger";

/**
 * Verifies that the current authenticated user owns a specific resource.
 * This is a critical check for Server Actions to prevent IDOR attacks.
 * 
 * @param table The database table name (e.g., 'pacientes')
 * @param resourceId The UUID of the resource to check
 * @param ownerColumn The column name that holds the owner's ID (default: 'usuario_id')
 * @returns The authenticated user's ID if verification passes
 * @throws Error if unauthorized, resource not found, or session invalid
 */
export async function verifyOwnership(
    table: string,
    resourceId: string,
    ownerColumn: string = "usuario_id"
): Promise<string> {
    // 1. Validate Session
    const sessionUserId = await getServerSession();
    if (!sessionUserId) {
        logger.warn(`Security Check Failed: No active session for ${table}/${resourceId}`);
        throw new Error("Unauthorized: Invalid session");
    }

    // 2. Fetch Resource Owner
    // We use the admin client here to ensure we can read the record even if RLS 
    // policies are strict or complex to debug, because we are MANUALLY enforcing the check.
    const client = createSupabaseAdmin();

    const { data, error } = await client
        .from(table)
        .select(ownerColumn)
        .eq("id", resourceId)
        .single();

    if (error || !data) {
        // Obfuscate 404 vs 403 for security (Standard practice)
        logger.warn(`Security Check Failed: Resource not found or DB error ${table}/${resourceId}`);
        throw new Error("Resource not found or unauthorized");
    }

    // 3. Verify Ownership
    // @ts-ignore - We know the column exists based on the query above
    const resourceOwnerId = data[ownerColumn];

    if (resourceOwnerId !== sessionUserId) {
        logger.error(`SECURITY ALERT: IDOR Attempt. User ${sessionUserId} tried to access ${table}/${resourceId} owned by ${resourceOwnerId}`);
        throw new Error("Forbidden: You do not own this resource");
    }

    return sessionUserId;
}
