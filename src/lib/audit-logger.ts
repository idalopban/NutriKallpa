/**
 * Audit Logger Service
 * 
 * Provides server-side audit logging for GDPR/HIPAA compliance.
 * Logs all access to sensitive patient data.
 */

'use server';

import { createPostgrestClient } from './postgrest';

// ============================================================================
// TYPES
// ============================================================================

type AuditAction = 'view' | 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'download';
type ResourceType = 'patient' | 'measurement' | 'diet' | 'report' | 'auth' | 'user';

interface AuditLogEntry {
    userId?: string;
    userEmail?: string;
    action: AuditAction;
    resourceType: ResourceType;
    resourceId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
}

// ============================================================================
// AUDIT LOGGER FUNCTIONS
// ============================================================================

/**
 * Log an audit event to the database
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
    try {
        const client = createPostgrestClient();

        await client.from('audit_logs').insert({
            user_id: entry.userId || null,
            user_email: entry.userEmail || null,
            action: entry.action,
            resource_type: entry.resourceType,
            resource_id: entry.resourceId || null,
            details: entry.details || {},
            ip_address: entry.ipAddress || null,
        });

        // Don't throw on failure - audit logging shouldn't break the app
    } catch (error) {
        console.error('[AUDIT] Failed to log event:', error);
    }
}

/**
 * Log a patient data access event
 */
export async function logPatientAccess(
    userId: string,
    userEmail: string,
    action: AuditAction,
    patientId: string,
    patientName?: string
): Promise<void> {
    await logAuditEvent({
        userId,
        userEmail,
        action,
        resourceType: 'patient',
        resourceId: patientId,
        details: patientName ? { patientName } : undefined,
    });
}

/**
 * Log a measurement access event
 */
export async function logMeasurementAccess(
    userId: string,
    userEmail: string,
    action: AuditAction,
    measurementId: string,
    patientId?: string
): Promise<void> {
    await logAuditEvent({
        userId,
        userEmail,
        action,
        resourceType: 'measurement',
        resourceId: measurementId,
        details: patientId ? { patientId } : undefined,
    });
}

/**
 * Log an authentication event
 */
export async function logAuthEvent(
    action: 'login' | 'logout',
    userEmail: string,
    userId?: string,
    success: boolean = true
): Promise<void> {
    await logAuditEvent({
        userId,
        userEmail,
        action,
        resourceType: 'auth',
        details: { success },
    });
}

/**
 * Log a report/PDF download event
 */
export async function logReportDownload(
    userId: string,
    userEmail: string,
    patientId: string,
    reportType: string
): Promise<void> {
    await logAuditEvent({
        userId,
        userEmail,
        action: 'download',
        resourceType: 'report',
        resourceId: patientId,
        details: { reportType },
    });
}

/**
 * Log data export event (GDPR requirement)
 */
export async function logDataExport(
    userId: string,
    userEmail: string,
    exportType: string
): Promise<void> {
    await logAuditEvent({
        userId,
        userEmail,
        action: 'export',
        resourceType: 'user',
        resourceId: userId,
        details: { exportType },
    });
}
