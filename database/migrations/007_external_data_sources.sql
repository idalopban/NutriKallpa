-- ============================================================================
-- MIGRATION 007: External Data Sources for Wearables/Labs
-- 
-- This migration adds infrastructure for future integrations with:
-- - Wearable devices (Fitbit, Apple Watch, Garmin)
-- - Laboratory results (blood tests, glucose monitors)
-- - HL7/FHIR compatible data sources
-- ============================================================================

-- ============================================================================
-- 1. CREATE EXTERNAL DATA SOURCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.external_data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Patient reference
    patient_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
    
    -- Source identification
    source_type TEXT NOT NULL,
    source_id TEXT,              -- External device/lab ID
    source_name TEXT,            -- Human-readable source name
    
    -- Data payload
    raw_data JSONB NOT NULL,     -- Original data from source
    normalized_data JSONB,       -- Transformed to our schema
    
    -- Temporal data
    recorded_at TIMESTAMPTZ NOT NULL,  -- When the measurement was taken
    synced_at TIMESTAMPTZ DEFAULT NOW(),  -- When we received it
    
    -- Metadata
    data_type TEXT,              -- 'weight', 'steps', 'heart_rate', 'blood_glucose', etc.
    unit TEXT,                   -- Unit of measurement
    value NUMERIC,               -- Extracted primary value (for quick queries)
    
    -- Processing status
    is_processed BOOLEAN DEFAULT FALSE,
    processing_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_source_type CHECK (
        source_type IN (
            'fitbit', 
            'apple_health', 
            'garmin', 
            'google_fit',
            'samsung_health',
            'lab_result', 
            'glucose_monitor',
            'blood_pressure_monitor',
            'smart_scale',
            'manual_import',
            'hl7_fhir'
        )
    )
);

-- Add comments
COMMENT ON TABLE public.external_data_sources IS 
    'Storage for data from wearables, labs, and external health systems';
COMMENT ON COLUMN public.external_data_sources.raw_data IS 
    'Original JSON payload from external source';
COMMENT ON COLUMN public.external_data_sources.normalized_data IS 
    'Data transformed to NutriKallpa internal schema';

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

-- Primary query pattern: get patient's external data by date
CREATE INDEX IF NOT EXISTS idx_external_data_patient_recorded 
    ON public.external_data_sources(patient_id, recorded_at DESC);

-- Query by source type
CREATE INDEX IF NOT EXISTS idx_external_data_source_type 
    ON public.external_data_sources(source_type);

-- Query by data type (for dashboards)
CREATE INDEX IF NOT EXISTS idx_external_data_type 
    ON public.external_data_sources(data_type, recorded_at DESC);

-- Query unprocessed data (for background jobs)
CREATE INDEX IF NOT EXISTS idx_external_data_unprocessed 
    ON public.external_data_sources(is_processed) 
    WHERE is_processed = FALSE;

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.external_data_sources ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view external data of their patients" ON public.external_data_sources;
DROP POLICY IF EXISTS "Users can insert external data for their patients" ON public.external_data_sources;
DROP POLICY IF EXISTS "Users can update external data for their patients" ON public.external_data_sources;
DROP POLICY IF EXISTS "Users can delete external data for their patients" ON public.external_data_sources;

-- Users can only access data for their own patients
CREATE POLICY "Users can view external data of their patients"
    ON public.external_data_sources FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.pacientes
            WHERE public.pacientes.id = public.external_data_sources.patient_id
            AND public.pacientes.usuario_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

CREATE POLICY "Users can insert external data for their patients"
    ON public.external_data_sources FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pacientes
            WHERE public.pacientes.id = public.external_data_sources.patient_id
            AND public.pacientes.usuario_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

CREATE POLICY "Users can update external data for their patients"
    ON public.external_data_sources FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.pacientes
            WHERE public.pacientes.id = public.external_data_sources.patient_id
            AND public.pacientes.usuario_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

CREATE POLICY "Users can delete external data for their patients"
    ON public.external_data_sources FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.pacientes
            WHERE public.pacientes.id = public.external_data_sources.patient_id
            AND public.pacientes.usuario_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

-- ============================================================================
-- 4. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_data_sources TO authenticated;

-- ============================================================================
-- 5. CREATE AUDIT TRIGGER (for compliance)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_external_data_changes()
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
    
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
        VALUES (v_user_id, v_action, 'external_data', OLD.id, 
                jsonb_build_object(
                    'patient_id', OLD.patient_id,
                    'source_type', OLD.source_type
                ));
    ELSE
        INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
        VALUES (v_user_id, v_action, 'external_data', NEW.id,
                jsonb_build_object(
                    'patient_id', NEW.patient_id,
                    'source_type', NEW.source_type,
                    'data_type', NEW.data_type
                ));
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_external_data ON public.external_data_sources;
CREATE TRIGGER trg_audit_external_data
    AFTER INSERT OR UPDATE OR DELETE ON public.external_data_sources
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_external_data_changes();

-- ============================================================================
-- 6. HELPER FUNCTION: Get latest reading by type
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_latest_external_reading(
    p_patient_id UUID,
    p_data_type TEXT
)
RETURNS TABLE (
    id UUID,
    source_type TEXT,
    value NUMERIC,
    unit TEXT,
    recorded_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        ed.id,
        ed.source_type,
        ed.value,
        ed.unit,
        ed.recorded_at
    FROM public.external_data_sources ed
    WHERE ed.patient_id = p_patient_id
    AND ed.data_type = p_data_type
    ORDER BY ed.recorded_at DESC
    LIMIT 1;
$$;
