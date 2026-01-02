-- ============================================================================
-- MIGRATION 024: Fix Audit Logs Consent Constraint
-- 
-- 1. Updates the check constraint on audit_logs to allow consent-related actions.
-- 2. Improves the audit trigger function for consents to handle collected_by field.
-- ============================================================================
-- ============================================================================
-- 1. UPDATE AUDIT_LOGS CONSTRAINT
-- ============================================================================
-- Drop old constraint and add new one with consent actions
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS valid_action;
ALTER TABLE public.audit_logs
ADD CONSTRAINT valid_action CHECK (
        action IN (
            'view',
            'create',
            'update',
            'delete',
            'login',
            'logout',
            'export',
            'download',
            'consent_granted',
            'consent_revoked',
            'consent_updated'
        )
    );
-- ============================================================================
-- 2. IMPROVE CONSENT AUDIT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.audit_consent_changes() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id UUID;
v_table_exists BOOLEAN;
BEGIN -- Check if audit_logs table exists
SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'audit_logs'
    ) INTO v_table_exists;
-- Only log if the table exists
IF v_table_exists THEN -- Attempt to get user from JWT (for browser-side calls if any remain)
BEGIN v_user_id := (
    current_setting('request.jwt.claims', true)::json->>'sub'
)::UUID;
EXCEPTION
WHEN OTHERS THEN v_user_id := NULL;
END;
-- Fallback to collected_by if JWT is empty (common in Server Actions / Admin Client)
IF v_user_id IS NULL THEN v_user_id := NEW.collected_by;
END IF;
INSERT INTO public.audit_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        details
    )
VALUES (
        v_user_id,
        CASE
            WHEN TG_OP = 'INSERT' THEN 'consent_granted'
            WHEN TG_OP = 'UPDATE'
            AND NEW.revoked_at IS NOT NULL THEN 'consent_revoked'
            ELSE 'consent_updated'
        END,
        'patient_consent',
        NEW.id,
        jsonb_build_object(
            'patient_id',
            NEW.patient_id,
            'consent_type',
            NEW.consent_type,
            'granted',
            NEW.granted,
            'guardian_name',
            NEW.guardian_name,
            'signature_url',
            NEW.signature_url
        )
    );
END IF;
RETURN NEW;
END;
$$;
-- Note: No need to recreate the trigger, it will use the updated function.