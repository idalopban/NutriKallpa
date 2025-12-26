-- Migration 012: Performance Indices
-- Adds indices for common query patterns to improve history loading
-- Index for patient history lookups (most common query)
-- Note: idx_anthropometry_patient_date may already exist but with different column order
CREATE INDEX IF NOT EXISTS idx_anthropometry_patient_created ON anthropometry_records(patient_id, created_at DESC);
-- Composite index for appointment date lookups (agenda view)
-- Note: Some indices may already exist from 004_diet_and_appointments.sql
CREATE INDEX IF NOT EXISTS idx_citas_fecha_hora ON citas(fecha, hora);
-- Index for appointment history by patient
CREATE INDEX IF NOT EXISTS idx_citas_patient_fecha ON citas(patient_id, fecha DESC);
-- Index for diet plan history
CREATE INDEX IF NOT EXISTS idx_diet_plans_patient_created ON diet_plans(patient_id, created_at DESC);
-- Partial index for active patients only
CREATE INDEX IF NOT EXISTS idx_pacientes_usuario_activo ON pacientes(usuario_id)
WHERE activo = true;
-- Comment
COMMENT ON INDEX idx_anthropometry_patient_created IS 'Optimizes patient history loading for anthropometry records';