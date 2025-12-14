-- ============================================================================
-- COMVIDA: Diet Plans and Appointments Tables
-- Migration: 004_diet_and_appointments.sql
-- Description: Creates tables for diet plans and appointments with RLS
-- ============================================================================

-- =============================================================================
-- 1. DIET PLANS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.diet_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,  -- The nutritionist who created the plan
    patient_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE,
    
    -- Plan metadata
    name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    
    -- The full weekly plan data (stored as JSONB for flexibility)
    plan_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_diet_plans_user_id ON public.diet_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_diet_plans_patient_id ON public.diet_plans(patient_id);

-- Enable RLS
ALTER TABLE public.diet_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own diet plans"
    ON public.diet_plans FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own diet plans"
    ON public.diet_plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own diet plans"
    ON public.diet_plans FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own diet plans"
    ON public.diet_plans FOR DELETE
    USING (auth.uid() = user_id);


-- =============================================================================
-- 2. CITAS (APPOINTMENTS) TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.citas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,  -- The nutritionist
    patient_id UUID REFERENCES public.pacientes(id) ON DELETE CASCADE,
    
    -- Appointment details
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    motivo TEXT,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'completada', 'cancelada')),
    modalidad TEXT DEFAULT 'presencial' CHECK (modalidad IN ('presencial', 'virtual')),
    enlace_reunion TEXT,
    categoria TEXT CHECK (categoria IN ('trabajo', 'personal', 'urgente')),
    notas TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_citas_user_id ON public.citas(user_id);
CREATE INDEX IF NOT EXISTS idx_citas_patient_id ON public.citas(patient_id);
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON public.citas(fecha);

-- Enable RLS
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own appointments"
    ON public.citas FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own appointments"
    ON public.citas FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments"
    ON public.citas FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own appointments"
    ON public.citas FOR DELETE
    USING (auth.uid() = user_id);


-- =============================================================================
-- 3. USER PROFILES TABLE (for extended user data)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    nombre TEXT,
    rol TEXT DEFAULT 'usuario' CHECK (rol IN ('admin', 'usuario')),
    especialidad TEXT,
    cmp TEXT,
    telefono TEXT,
    bio TEXT,
    photo_url TEXT,
    clinic_name TEXT,
    clinic_address TEXT,
    clinic_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);


-- =============================================================================
-- 4. INVITATION CODES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.invitation_codes (
    code TEXT PRIMARY KEY,
    rol TEXT DEFAULT 'usuario' CHECK (rol IN ('admin', 'usuario')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used')),
    used_by TEXT,  -- email of user who used it
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (admins can manage, anyone can validate)
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can check if a code is valid (for registration)
CREATE POLICY "Anyone can validate invitation codes"
    ON public.invitation_codes FOR SELECT
    USING (true);

-- Only authenticated users can insert (admins will have special logic in app)
CREATE POLICY "Authenticated users can create invitation codes"
    ON public.invitation_codes FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can update (to mark as used)
CREATE POLICY "Authenticated users can update invitation codes"
    ON public.invitation_codes FOR UPDATE
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete invitation codes"
    ON public.invitation_codes FOR DELETE
    USING (auth.uid() IS NOT NULL);


-- =============================================================================
-- 5. HELPER FUNCTION: Auto-update updated_at timestamp
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DROP TRIGGER IF EXISTS set_updated_at_diet_plans ON public.diet_plans;
CREATE TRIGGER set_updated_at_diet_plans
    BEFORE UPDATE ON public.diet_plans
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_citas ON public.citas;
CREATE TRIGGER set_updated_at_citas
    BEFORE UPDATE ON public.citas
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_user_profiles ON public.user_profiles;
CREATE TRIGGER set_updated_at_user_profiles
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_pacientes ON public.pacientes;
CREATE TRIGGER set_updated_at_pacientes
    BEFORE UPDATE ON public.pacientes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
