/**
 * Consent Manager Service
 * 
 * Manages patient informed consent according to Peru's Law 29733
 * (Personal Data Protection Law) for health data processing.
 * 
 * This module provides:
 * - Consent verification before data operations
 * - Consent collection workflow
 * - Audit trail for compliance
 */

import { createBrowserClient } from '@/lib/supabase';
import { recordConsentAction, getConsentStatusAction } from '@/actions/consent-actions';

// ============================================================================
// TYPES
// ============================================================================

export type ConsentType =
    | 'data_collection'    // Collection of personal data
    | 'data_processing'    // Processing of health data
    | 'data_sharing'       // Sharing with third parties
    | 'marketing'          // Marketing communications
    | 'research';          // Research use (anonymized)

export interface ConsentRecord {
    id: string;
    patientId: string;
    consentType: ConsentType;
    granted: boolean;
    grantedAt: Date;
    expiresAt?: Date;
    revokedAt?: Date;
    ipAddress?: string;
    userAgent?: string;
    documentVersion: string;
    signatureUrl?: string;
    guardianName?: string;
    guardianRelationship?: string;
    guardianDocument?: string;
    notes?: string;
}

export interface ConsentTemplate {
    id: string;
    consentType: ConsentType;
    titleEs: string;
    contentEs: string;
    version: string;
    isActive: boolean;
}

export interface ConsentStatus {
    hasDataCollection: boolean;
    hasDataProcessing: boolean;
    hasDataSharing: boolean;
    missingConsents: ConsentType[];
    canProceed: boolean;
    // Details of who authorized
    authorizedBy?: string;
    relationship?: string;
    authorizedAt?: Date;
}

// ============================================================================
// ERRORS
// ============================================================================

export class ConsentRequiredError extends Error {
    public missingConsents: ConsentType[];

    constructor(message: string, missingConsents: ConsentType[] = ['data_processing']) {
        super(message);
        this.name = 'ConsentRequiredError';
        this.missingConsents = missingConsents;
    }
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

/**
 * Check if a patient has active consent for a specific type
 */
export async function hasActiveConsent(
    patientId: string,
    consentType: ConsentType
): Promise<boolean> {
    const supabase = createBrowserClient();

    const { data, error } = await supabase
        .from('patient_consents')
        .select('id, granted, expires_at, revoked_at')
        .eq('patient_id', patientId)
        .eq('consent_type', consentType)
        .eq('granted', true)
        .is('revoked_at', null)
        .order('granted_at', { ascending: false })
        .limit(1)
        .single();

    if (error || !data) return false;

    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return false;
    }

    return true;
}

/**
 * Get the consent status for a patient
 * Returns which consents are active and which are missing
 */
export async function getConsentStatus(patientId: string): Promise<ConsentStatus> {
    const result = await getConsentStatusAction(patientId);
    const consents = result.success ? result.data : [];

    const activeConsents = new Set<ConsentType>();

    if (consents) {
        for (const consent of consents) {
            // Check not expired
            if (!consent.expires_at || new Date(consent.expires_at) > new Date()) {
                activeConsents.add(consent.consent_type as ConsentType);
            }
        }
    }

    const hasDataCollection = activeConsents.has('data_collection');
    const hasDataProcessing = activeConsents.has('data_processing');
    const hasDataSharing = activeConsents.has('data_sharing');

    const requiredConsents: ConsentType[] = ['data_collection', 'data_processing'];
    const missingConsents = requiredConsents.filter(c => !activeConsents.has(c));

    // Get authorization details from the first active record if available
    const firstActive = result.success && result.data && result.data.length > 0 ? result.data[0] : null;

    return {
        hasDataCollection,
        hasDataProcessing,
        hasDataSharing,
        missingConsents,
        canProceed: missingConsents.length === 0,
        authorizedBy: firstActive?.guardian_name || undefined,
        relationship: firstActive?.guardian_relationship || undefined,
        authorizedAt: firstActive?.granted_at ? new Date(firstActive.granted_at) : undefined
    };
}

/**
 * Verify that a patient has required consents before proceeding
 * Throws ConsentRequiredError if consents are missing
 */
export async function verifyConsent(
    patientId: string,
    requiredTypes: ConsentType[] = ['data_processing']
): Promise<boolean> {
    const status = await getConsentStatus(patientId);

    const missing = requiredTypes.filter(type => {
        switch (type) {
            case 'data_collection': return !status.hasDataCollection;
            case 'data_processing': return !status.hasDataProcessing;
            case 'data_sharing': return !status.hasDataSharing;
            default: return true;
        }
    });

    if (missing.length > 0) {
        throw new ConsentRequiredError(
            `El paciente debe firmar el consentimiento informado antes de continuar. Faltan: ${missing.join(', ')}`,
            missing
        );
    }

    return true;
}

/**
 * Record a new consent from a patient
 */
export async function recordConsent(params: {
    patientId: string;
    consentType: ConsentType;
    granted: boolean;
    expiresAt?: Date;
    guardianName?: string;
    guardianRelationship?: string;
    guardianDocument?: string;
    signatureUrl?: string;
    notes?: string;
}): Promise<ConsentRecord | null> {
    // Get user agent (client-side)
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : undefined;

    const result = await recordConsentAction({
        patientId: params.patientId,
        consentType: params.consentType,
        granted: params.granted,
        expiresAt: params.expiresAt?.toISOString(),
        guardianName: params.guardianName,
        guardianRelationship: params.guardianRelationship,
        guardianDocument: params.guardianDocument,
        signatureUrl: params.signatureUrl,
        notes: params.notes,
        userAgent: userAgent
    });

    if (!result.success || !result.data) {
        console.error('Error recording consent:', result.error);
        return null;
    }

    const data = result.data;

    return {
        id: data.id,
        patientId: data.patient_id,
        consentType: data.consent_type,
        granted: data.granted,
        grantedAt: new Date(data.granted_at),
        expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
        documentVersion: data.document_version,
        signatureUrl: data.signature_url || undefined,
        guardianName: data.guardian_name || undefined,
        guardianRelationship: data.guardian_relationship || undefined,
        guardianDocument: data.guardian_document || undefined,
        notes: data.notes || undefined,
    };
}

/**
 * Revoke a previously granted consent
 */
export async function revokeConsent(
    patientId: string,
    consentType: ConsentType,
    reason?: string
): Promise<boolean> {
    const supabase = createBrowserClient();

    const { error } = await supabase
        .from('patient_consents')
        .update({
            revoked_at: new Date().toISOString(),
            notes: reason || 'Revocado por el paciente'
        })
        .eq('patient_id', patientId)
        .eq('consent_type', consentType)
        .eq('granted', true)
        .is('revoked_at', null);

    if (error) {
        console.error('Error revoking consent:', error);
        return false;
    }

    return true;
}

/**
 * Get all consent records for a patient
 */
export async function getPatientConsents(patientId: string): Promise<ConsentRecord[]> {
    const supabase = createBrowserClient();

    const { data, error } = await supabase
        .from('patient_consents')
        .select('*')
        .eq('patient_id', patientId)
        .order('granted_at', { ascending: false });

    if (error || !data) {
        console.error('Error fetching consents:', error);
        return [];
    }

    return data.map(record => ({
        id: record.id,
        patientId: record.patient_id,
        consentType: record.consent_type,
        granted: record.granted,
        grantedAt: new Date(record.granted_at),
        expiresAt: record.expires_at ? new Date(record.expires_at) : undefined,
        revokedAt: record.revoked_at ? new Date(record.revoked_at) : undefined,
        ipAddress: record.ip_address || undefined,
        userAgent: record.user_agent || undefined,
        documentVersion: record.document_version,
        signatureUrl: record.signature_url || undefined,
        guardianName: record.guardian_name || undefined,
        guardianRelationship: record.guardian_relationship || undefined,
        guardianDocument: record.guardian_document || undefined,
        notes: record.notes || undefined,
    }));
}

/**
 * Get consent templates for display
 */
export async function getConsentTemplates(): Promise<ConsentTemplate[]> {
    const supabase = createBrowserClient();

    const { data, error } = await supabase
        .from('consent_templates')
        .select('*')
        .eq('is_active', true)
        .order('consent_type');

    console.log('[getConsentTemplates] Query result:', { data, error });

    // Default templates to use if DB fails or returns empty
    const defaultTemplates: ConsentTemplate[] = [
        {
            id: 'default-1',
            consentType: 'data_collection',
            titleEs: 'Consentimiento para Recolección de Datos Personales',
            contentEs: 'Autorizo la recolección de mis datos personales (nombre, edad, contacto, historial médico) para fines de atención nutricional.',
            version: '1.0',
            isActive: true
        },
        {
            id: 'default-2',
            consentType: 'data_processing',
            titleEs: 'Consentimiento para Tratamiento de Datos de Salud',
            contentEs: 'Autorizo el tratamiento de mis datos de salud (medidas antropométricas, diagnósticos, planes nutricionales) por parte del profesional de nutrición.',
            version: '1.0',
            isActive: true
        },
        {
            id: 'default-3',
            consentType: 'data_sharing',
            titleEs: 'Consentimiento para Compartir Datos con Terceros',
            contentEs: 'Autorizo que mis datos de salud puedan ser compartidos con laboratorios clínicos, médicos tratantes u otros profesionales de salud involucrados en mi atención.',
            version: '1.0',
            isActive: true
        }
    ];

    // Return default templates if DB fails OR if data is empty
    if (error || !data || data.length === 0) {
        console.log('[getConsentTemplates] Using default templates');
        return defaultTemplates;
    }

    return data.map(template => ({
        id: template.id,
        consentType: template.consent_type,
        titleEs: template.title_es,
        contentEs: template.content_es,
        version: template.version,
        isActive: template.is_active
    }));
}

/**
 * Record all essential consents at once (convenience function)
 */
export async function recordEssentialConsents(params: {
    patientId: string;
    guardianName?: string;
    guardianRelationship?: string;
    guardianDocument?: string;
}): Promise<boolean> {
    const essentialConsents: ConsentType[] = ['data_collection', 'data_processing'];

    const results = await Promise.all(
        essentialConsents.map(type =>
            recordConsent({
                patientId: params.patientId,
                consentType: type,
                granted: true,
                guardianName: params.guardianName,
                guardianRelationship: params.guardianRelationship,
                guardianDocument: params.guardianDocument,
            })
        )
    );

    return results.every(r => r !== null);
}
