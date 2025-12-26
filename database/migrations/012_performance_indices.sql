-- Migration 012: Performance Indices
-- Adds indices for common query patterns to improve history loading
-- Index for patient history lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_anthropometry_patient_date ON anthropometry_records(patient_id, created_at DESC);
-- Index for appointment lookups by date
CREATE INDEX IF NOT EXISTS idx_appointments_date ON citas(fecha, hora);
-- Index for appointments by patient
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON citas(paciente_id, fecha DESC);
-- Index for diet history
CREATE INDEX IF NOT EXISTS idx_diets_patient_date ON dietas(paciente_id, created_at DESC);
-- Composite index for patient search
CREATE INDEX IF NOT EXISTS idx_patients_user_active ON pacientes(usuario_id, activo)
WHERE activo = true;
-- Comment
COMMENT ON INDEX idx_anthropometry_patient_date IS 'Optimizes patient history loading for anthropometry records';
COMMENT ON INDEX idx_appointments_date IS 'Optimizes daily agenda view';