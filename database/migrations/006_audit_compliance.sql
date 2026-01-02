-- ============================================================================
-- MIGRATION 006: Audit Compliance & GDPR
-- 
-- This migration adds:
-- 1. Audit logs table for tracking access to sensitive data
-- 2. GDPR consent fields in users table
-- 3. Automatic trigger for audit logging
-- ============================================================================

-- ============================================================================
-- 1. CREATE AUDIT LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Who performed the action
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_email TEXT,
    
    -- What was accessed/modified
    action TEXT NOT NULL, -- 'view', 'create', 'update', 'delete', 'login', 'logout', 'export'
    resource_type TEXT NOT NULL, -- 'patient', 'measurement', 'diet', 'report', 'auth'
    resource_id UUID,
    
    -- Details
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes will be created below
    CONSTRAINT valid_action CHECK (
        action IN ('view', 'create', 'update', 'delete', 'login', 'logout', 'export', 'download')
    )
);

-- Add comment
COMMENT ON TABLE public.audit_logs IS 'GDPR/HIPAA compliance audit trail for all sensitive data access';

-- ============================================================================
-- 2. CREATE INDEXES FOR AUDIT LOGS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- ============================================================================
-- 3. ADD GDPR CONSENT FIELDS TO USERS TABLE
-- ============================================================================

-- Add GDPR consent columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'gdpr_consent') THEN
        ALTER TABLE public.users ADD COLUMN gdpr_consent BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'gdpr_consent_date') THEN
        ALTER TABLE public.users ADD COLUMN gdpr_consent_date TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'gdpr_consent_ip') THEN
        ALTER TABLE public.users ADD COLUMN gdpr_consent_ip INET;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'data_retention_agreed') THEN
        ALTER TABLE public.users ADD COLUMN data_retention_agreed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- ============================================================================
-- 4. CREATE AUDIT LOG FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_user_id UUID,
    p_user_email TEXT,
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::JSONB,
    p_ip_address INET DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        user_email,
        action,
        resource_type,
        resource_id,
        details,
        ip_address
    ) VALUES (
        p_user_id,
        p_user_email,
        p_action,
        p_resource_type,
        p_resource_id,
        p_details,
        p_ip_address
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- ============================================================================
-- 5. CREATE TRIGGER FOR PATIENT DATA ACCESS
-- ============================================================================

-- Function to automatically log patient data changes
CREATE OR REPLACE FUNCTION public.audit_patient_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_action TEXT;
    v_user_id UUID;
BEGIN
    -- Determine action
    IF TG_OP = 'INSERT' THEN
        v_action := 'create';
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'update';
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'delete';
    END IF;
    
    -- Get user from JWT if available
    BEGIN
        v_user_id := (current_setting('request.jwt.claims', true)::json->>'sub')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;
    
    -- Log the event with full data for HIPAA compliance
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
        VALUES (v_user_id, v_action, 'patient', OLD.id, 
                jsonb_build_object('old_data', to_jsonb(OLD)));
    ELSIF TG_OP = 'UPDATE' THEN
        -- Capture both old and new values for complete audit trail
        INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
        VALUES (v_user_id, v_action, 'patient', NEW.id,
                jsonb_build_object(
                    'old_data', to_jsonb(OLD),
                    'new_data', to_jsonb(NEW),
                    'patient_name', NEW.nombre || ' ' || NEW.apellido
                ));
    ELSE
        -- INSERT: log new data
        INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
        VALUES (v_user_id, v_action, 'patient', NEW.id,
                jsonb_build_object(
                    'new_data', to_jsonb(NEW),
                    'patient_name', NEW.nombre || ' ' || NEW.apellido
                ));
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_audit_patients ON public.pacientes;
CREATE TRIGGER trg_audit_patients
    AFTER INSERT OR UPDATE OR DELETE ON public.pacientes
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_patient_changes();

-- ============================================================================
-- 6. CREATE TRIGGER FOR MEASUREMENTS ACCESS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_measurement_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_action TEXT;
    v_user_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'create';
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'update';
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'delete';
    END IF;
    
    BEGIN
        v_user_id := (current_setting('request.jwt.claims', true)::json->>'sub')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;
    
    -- Log with full measurement data for HIPAA compliance
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
        VALUES (v_user_id, v_action, 'measurement', OLD.id, 
                jsonb_build_object(
                    'patient_id', OLD.paciente_id,
                    'old_data', to_jsonb(OLD)
                ));
    ELSIF TG_OP = 'UPDATE' THEN
        -- Capture both old and new values for complete audit trail
        INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
        VALUES (v_user_id, v_action, 'measurement', NEW.id,
                jsonb_build_object(
                    'patient_id', NEW.paciente_id,
                    'old_data', to_jsonb(OLD),
                    'new_data', to_jsonb(NEW)
                ));
    ELSE
        -- INSERT: log new data
        INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
        VALUES (v_user_id, v_action, 'measurement', NEW.id,
                jsonb_build_object(
                    'patient_id', NEW.paciente_id,
                    'new_data', to_jsonb(NEW)
                ));
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_measurements ON public.anthropometry_records;
CREATE TRIGGER trg_audit_measurements
    AFTER INSERT OR UPDATE OR DELETE ON public.anthropometry_records
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_measurement_changes();

-- ============================================================================
-- 7. ENABLE RLS ON AUDIT LOGS (admins only can read)
-- ============================================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id::text = current_setting('request.jwt.claims', true)::json->>'sub'
            AND rol = 'admin'
        )
    );

-- Anyone authenticated can insert (for logging their own actions)
CREATE POLICY "Authenticated users can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT INSERT ON public.audit_logs TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- ============================================================================
-- 9. AUDIT LOG IMMUTABILITY (HIPAA/GDPR Compliance)
-- ============================================================================

-- Drop existing immutability policy if exists
DROP POLICY IF EXISTS "Audit logs are immutable - no delete" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs are immutable - no update" ON public.audit_logs;

-- Nobody can delete audit logs (required for HIPAA)
CREATE POLICY "Audit logs are immutable - no delete"
    ON public.audit_logs FOR DELETE
    USING (false);

-- Nobody can update audit logs (immutable records)
CREATE POLICY "Audit logs are immutable - no update"
    ON public.audit_logs FOR UPDATE
    USING (false);

-- ============================================================================
-- 10. RETENTION INDEX (6 years for HIPAA compliance)
-- ============================================================================

-- Index for efficient cleanup of old logs (retention policy: 6 years)
CREATE INDEX IF NOT EXISTS idx_audit_logs_retention 
    ON public.audit_logs(created_at) 
    WHERE created_at < NOW() - INTERVAL '6 years';

-- Comment explaining retention policy
COMMENT ON INDEX idx_audit_logs_retention IS 
    'Index for HIPAA retention policy - logs older than 6 years may be archived';
