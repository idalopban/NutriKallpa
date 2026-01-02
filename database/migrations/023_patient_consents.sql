-- ============================================================================
-- MIGRATION 023: Patient Consents (Ley 29733 Compliance)
-- 
-- Implements informed consent tracking required by Peruvian Law 29733
-- (Personal Data Protection Law) for health data processing.
-- ============================================================================
-- ============================================================================
-- 1. PATIENT CONSENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.patient_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Patient reference
    patient_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    -- Consent type
    consent_type TEXT NOT NULL CHECK (
        consent_type IN (
            'data_collection',
            -- Recolección de datos personales
            'data_processing',
            -- Procesamiento de datos de salud
            'data_sharing',
            -- Compartir con terceros (laboratorios, etc.)
            'marketing',
            -- Comunicaciones de marketing
            'research' -- Uso en investigación (anonimizado)
        )
    ),
    -- Consent status
    granted BOOLEAN NOT NULL,
    -- Temporal data
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    -- NULL = no expiration
    revoked_at TIMESTAMPTZ,
    -- Audit trail
    ip_address INET,
    user_agent TEXT,
    -- Legal document reference
    document_version VARCHAR(20) DEFAULT '1.0',
    -- Version of consent form
    signature_url TEXT,
    -- Link to signed document (if applicable)
    -- Who collected the consent (user ID from auth.users)
    collected_by UUID,
    -- Minor consent (for pediatric patients)
    guardian_name TEXT,
    guardian_relationship TEXT,
    -- padre, madre, tutor legal
    guardian_document TEXT,
    -- DNI del tutor
    -- Additional notes
    notes TEXT,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Add comments
COMMENT ON TABLE public.patient_consents IS 'Tracks informed consent for data processing per Ley 29733 (Peru)';
COMMENT ON COLUMN public.patient_consents.consent_type IS 'Type of consent: data_collection, data_processing, data_sharing, marketing, research';
COMMENT ON COLUMN public.patient_consents.guardian_name IS 'For pediatric patients: legal guardian who provided consent';
-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_consents_patient ON public.patient_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_consents_type ON public.patient_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_consents_active ON public.patient_consents(patient_id, consent_type, granted)
WHERE granted = TRUE
    AND revoked_at IS NULL;
-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.patient_consents ENABLE ROW LEVEL SECURITY;
-- Users can view consents for their own patients
DROP POLICY IF EXISTS "Users can view consents for their patients" ON public.patient_consents;
CREATE POLICY "Users can view consents for their patients" ON public.patient_consents FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.pacientes
            WHERE public.pacientes.id = public.patient_consents.patient_id
                AND public.pacientes.usuario_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );
-- Users can create consents for their patients
DROP POLICY IF EXISTS "Users can insert consents for their patients" ON public.patient_consents;
CREATE POLICY "Users can insert consents for their patients" ON public.patient_consents FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.pacientes
            WHERE public.pacientes.id = public.patient_consents.patient_id
                AND public.pacientes.usuario_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );
-- Users can update (revoke) consents for their patients
DROP POLICY IF EXISTS "Users can update consents for their patients" ON public.patient_consents;
CREATE POLICY "Users can update consents for their patients" ON public.patient_consents FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM public.pacientes
            WHERE public.pacientes.id = public.patient_consents.patient_id
                AND public.pacientes.usuario_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );
-- Grant permissions
GRANT SELECT,
    INSERT,
    UPDATE ON public.patient_consents TO authenticated;
-- ============================================================================
-- 4. HELPER FUNCTION: Check Active Consent
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_active_consent(
        p_patient_id UUID,
        p_consent_type TEXT
    ) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
SELECT EXISTS (
        SELECT 1
        FROM public.patient_consents
        WHERE patient_id = p_patient_id
            AND consent_type = p_consent_type
            AND granted = TRUE
            AND revoked_at IS NULL
            AND (
                expires_at IS NULL
                OR expires_at > NOW()
            )
    );
$$;
-- ============================================================================
-- 5. HELPER FUNCTION: Get All Active Consents for Patient
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_patient_consents(p_patient_id UUID) RETURNS TABLE (
        consent_type TEXT,
        granted BOOLEAN,
        granted_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        guardian_name TEXT
    ) LANGUAGE sql STABLE SECURITY DEFINER AS $$
SELECT DISTINCT ON (consent_type) pc.consent_type,
    pc.granted,
    pc.granted_at,
    pc.expires_at,
    pc.guardian_name
FROM public.patient_consents pc
WHERE pc.patient_id = p_patient_id
    AND pc.revoked_at IS NULL
ORDER BY pc.consent_type,
    pc.granted_at DESC;
$$;
-- ============================================================================
-- 6. AUDIT TRIGGER (Optional - only if audit_logs table exists)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.audit_consent_changes() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user_id UUID;
v_table_exists BOOLEAN;
BEGIN -- Check if audit_logs table exists
SELECT EXISTS (
        SELECT
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'audit_logs'
    ) INTO v_table_exists;
-- Only log if the table exists
IF v_table_exists THEN BEGIN v_user_id := (
    current_setting('request.jwt.claims', true)::json->>'sub'
)::UUID;
EXCEPTION
WHEN OTHERS THEN v_user_id := NULL;
END;
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
            NEW.granted
        )
    );
END IF;
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_audit_consent ON public.patient_consents;
CREATE TRIGGER trg_audit_consent
AFTER
INSERT
    OR
UPDATE ON public.patient_consents FOR EACH ROW EXECUTE FUNCTION public.audit_consent_changes();
-- ============================================================================
-- 7. CONSENT DOCUMENT TEMPLATES (Reference)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.consent_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consent_type TEXT NOT NULL UNIQUE,
    title_es TEXT NOT NULL,
    content_es TEXT NOT NULL,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Insert default consent templates
INSERT INTO public.consent_templates (consent_type, title_es, content_es, version)
VALUES (
        'data_collection',
        'Consentimiento para Recolección de Datos Personales',
        'Autorizo la recolección de mis datos personales (nombre, edad, contacto, historial médico) para fines de atención nutricional. Entiendo que estos datos serán tratados conforme a la Ley 29733 de Protección de Datos Personales del Perú.',
        '1.0'
    ),
    (
        'data_processing',
        'Consentimiento para Tratamiento de Datos de Salud',
        'Autorizo el tratamiento de mis datos de salud (medidas antropométricas, diagnósticos, planes nutricionales) por parte del profesional de nutrición. Estos datos serán utilizados exclusivamente para mi atención y seguimiento nutricional.',
        '1.0'
    ),
    (
        'data_sharing',
        'Consentimiento para Compartir Datos con Terceros',
        'Autorizo que mis datos de salud puedan ser compartidos con laboratorios clínicos, médicos tratantes u otros profesionales de salud involucrados en mi atención, previa anonimización cuando corresponda.',
        '1.0'
    ) ON CONFLICT (consent_type) DO NOTHING;
ALTER TABLE public.consent_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read consent templates" ON public.consent_templates;
CREATE POLICY "Anyone can read consent templates" ON public.consent_templates FOR
SELECT TO authenticated USING (is_active = TRUE);
GRANT SELECT ON public.consent_templates TO authenticated;