-- ============================================================================
-- FIX: Patient Consents RLS Policies
-- 
-- Run this in your Supabase SQL Editor to fix the insertion permissions
-- ============================================================================
-- First, let's check if RLS is enabled
ALTER TABLE public.patient_consents ENABLE ROW LEVEL SECURITY;
-- Drop existing policies and recreate them with correct configuration
DROP POLICY IF EXISTS "Users can view consents for their patients" ON public.patient_consents;
DROP POLICY IF EXISTS "Users can insert consents for their patients" ON public.patient_consents;
DROP POLICY IF EXISTS "Users can update consents for their patients" ON public.patient_consents;
-- CREATE new policies using auth.uid() instead of JWT claims (more reliable)
-- SELECT policy
CREATE POLICY "Users can view consents for their patients" ON public.patient_consents FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.pacientes
            WHERE public.pacientes.id = public.patient_consents.patient_id
                AND public.pacientes.usuario_id = auth.uid()
        )
    );
-- INSERT policy
CREATE POLICY "Users can insert consents for their patients" ON public.patient_consents FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.pacientes
            WHERE public.pacientes.id = patient_id
                AND public.pacientes.usuario_id = auth.uid()
        )
    );
-- UPDATE policy
CREATE POLICY "Users can update consents for their patients" ON public.patient_consents FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM public.pacientes
            WHERE public.pacientes.id = public.patient_consents.patient_id
                AND public.pacientes.usuario_id = auth.uid()
        )
    );
-- Grant necessary permissions
GRANT SELECT,
    INSERT,
    UPDATE ON public.patient_consents TO authenticated;
-- ============================================================================
-- Also fix consent_templates if it was not populated correctly
-- ============================================================================
-- Check and insert default templates if missing
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
-- Grant SELECT permission on consent_templates
GRANT SELECT ON public.consent_templates TO authenticated;