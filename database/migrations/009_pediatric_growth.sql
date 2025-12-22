-- Migration 009: Pediatric Growth Standards Module
-- Sistema de evaluación de crecimiento infantil (0-5 años) según OMS

-- ============================================================================
-- 1. TABLA DE MEDIDAS PEDIÁTRICAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS pediatric_measurements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Fecha y edad
    date_recorded TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    age_in_days INTEGER NOT NULL, -- Días exactos para precisión OMS
    age_in_months NUMERIC(5,2) NOT NULL, -- Meses para visualización
    
    -- Medidas antropométricas
    weight_kg NUMERIC(5,3), -- Peso en kg (hasta 3 decimales para lactantes)
    height_cm NUMERIC(5,2), -- Longitud o talla en cm
    head_circumference_cm NUMERIC(5,2), -- Perímetro cefálico
    
    -- Tipo de medición
    measurement_type TEXT NOT NULL CHECK (measurement_type IN ('recumbent', 'standing')),
    -- 'recumbent' = Longitud (acostado, <24 meses)
    -- 'standing' = Talla (de pie, ≥24 meses)
    
    -- Z-Scores calculados
    z_scores JSONB DEFAULT '{}'::jsonb,
    -- Estructura: { 
    --   "wfa": 0.5,     -- Weight-for-Age
    --   "lhfa": -0.2,   -- Length/Height-for-Age
    --   "wflh": 0.3,    -- Weight-for-Length/Height
    --   "bfa": 0.1,     -- BMI-for-Age
    --   "hcfa": 0.0     -- Head Circumference-for-Age
    -- }
    
    -- Diagnósticos interpretados
    diagnoses JSONB DEFAULT '{}'::jsonb,
    -- Estructura: {
    --   "wfa": "Normal",
    --   "lhfa": "Talla baja",
    --   "nutritional_status": "Eutrófico"
    -- }
    
    -- Metadatos
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pediatric_measurements_patient 
    ON pediatric_measurements(patient_id);
CREATE INDEX IF NOT EXISTS idx_pediatric_measurements_date 
    ON pediatric_measurements(date_recorded);
CREATE INDEX IF NOT EXISTS idx_pediatric_measurements_age 
    ON pediatric_measurements(age_in_months);

-- ============================================================================
-- 2. RLS POLICIES
-- ============================================================================

ALTER TABLE pediatric_measurements ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden ver las medidas de sus propios pacientes
CREATE POLICY pediatric_measurements_user_policy ON pediatric_measurements
    FOR ALL
    USING (user_id = auth.uid() OR user_id IN (
        SELECT id FROM users WHERE rol = 'admin'
    ));

-- ============================================================================
-- 3. FUNCIÓN PARA CALCULAR EDAD EN DÍAS
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_age_in_days(birth_date DATE, measurement_date DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN measurement_date - birth_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 4. TRIGGER PARA ACTUALIZAR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_pediatric_measurement_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pediatric_measurements_updated_at ON pediatric_measurements;
CREATE TRIGGER pediatric_measurements_updated_at
    BEFORE UPDATE ON pediatric_measurements
    FOR EACH ROW
    EXECUTE FUNCTION update_pediatric_measurement_timestamp();
