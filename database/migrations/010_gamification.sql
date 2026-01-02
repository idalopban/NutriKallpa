-- 010_gamification.sql
-- Gamification and engagement tracking for patient adherence
-- NutriKallpa - Clinical Improvements
-- ============================================
-- PATIENT STREAKS TABLE
-- ============================================
-- Tracks daily/weekly streaks for different activities
CREATE TABLE IF NOT EXISTS patient_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    streak_type VARCHAR(50) NOT NULL DEFAULT 'diet_adherence',
    -- Streak Types: 'diet_adherence', 'appointment', 'weight_log', 'measurement'
    current_streak INT NOT NULL DEFAULT 0,
    best_streak INT NOT NULL DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- One streak per type per patient
    UNIQUE(paciente_id, streak_type)
);
-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_patient_streaks_paciente ON patient_streaks(paciente_id);
-- ============================================
-- PATIENT ACHIEVEMENTS TABLE
-- ============================================
-- Tracks earned achievements and milestones
CREATE TABLE IF NOT EXISTS patient_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    achievement_key VARCHAR(100) NOT NULL,
    -- Keys: 'first_week', 'first_kg_lost', 'streak_7', 'streak_30', 
    --       'streak_90', 'first_evaluation', 'goal_reached', etc.
    achieved_at TIMESTAMPTZ DEFAULT NOW(),
    -- Optional metadata (e.g., weight lost, days count)
    metadata JSONB DEFAULT '{}'::jsonb,
    -- Prevent duplicate achievements
    UNIQUE(paciente_id, achievement_key)
);
-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_patient_achievements_paciente ON patient_achievements(paciente_id);
CREATE INDEX IF NOT EXISTS idx_patient_achievements_key ON patient_achievements(achievement_key);
-- ============================================
-- RLS POLICIES
-- ============================================
-- Enable RLS
ALTER TABLE patient_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_achievements ENABLE ROW LEVEL SECURITY;
-- Nutritionists can only see their own patients' data
CREATE POLICY "Nutritionists can view their patients' streaks" ON patient_streaks FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM pacientes
            WHERE pacientes.id = patient_streaks.paciente_id
                AND pacientes.usuario_id = auth.uid()
        )
    );
CREATE POLICY "Nutritionists can manage their patients' streaks" ON patient_streaks FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM pacientes
        WHERE pacientes.id = patient_streaks.paciente_id
            AND pacientes.usuario_id = auth.uid()
    )
);
CREATE POLICY "Nutritionists can view their patients' achievements" ON patient_achievements FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM pacientes
            WHERE pacientes.id = patient_achievements.paciente_id
                AND pacientes.usuario_id = auth.uid()
        )
    );
CREATE POLICY "Nutritionists can manage their patients' achievements" ON patient_achievements FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM pacientes
        WHERE pacientes.id = patient_achievements.paciente_id
            AND pacientes.usuario_id = auth.uid()
    )
);
-- ============================================
-- HELPER FUNCTION: Update Streak
-- ============================================
CREATE OR REPLACE FUNCTION update_patient_streak(
        p_paciente_id UUID,
        p_streak_type VARCHAR(50)
    ) RETURNS TABLE (
        current_streak INT,
        best_streak INT,
        is_new_record BOOLEAN
    ) AS $$
DECLARE v_last_date DATE;
v_current INT;
v_best INT;
v_today DATE := CURRENT_DATE;
v_is_new_record BOOLEAN := FALSE;
BEGIN -- Get or create streak record
INSERT INTO patient_streaks (
        paciente_id,
        streak_type,
        current_streak,
        best_streak,
        last_activity_date
    )
VALUES (p_paciente_id, p_streak_type, 0, 0, NULL) ON CONFLICT (paciente_id, streak_type) DO NOTHING;
-- Fetch current values
SELECT ps.last_activity_date,
    ps.current_streak,
    ps.best_streak INTO v_last_date,
    v_current,
    v_best
FROM patient_streaks ps
WHERE ps.paciente_id = p_paciente_id
    AND ps.streak_type = p_streak_type;
-- Calculate new streak
IF v_last_date IS NULL THEN -- First activity ever
v_current := 1;
ELSIF v_last_date = v_today THEN -- Already logged today, no change
-- Just return current values
ELSIF v_last_date = v_today - INTERVAL '1 day' THEN -- Consecutive day! Increment streak
v_current := v_current + 1;
ELSE -- Streak broken, reset to 1
v_current := 1;
END IF;
-- Check for new record
IF v_current > v_best THEN v_best := v_current;
v_is_new_record := TRUE;
END IF;
-- Update the record
UPDATE patient_streaks
SET current_streak = v_current,
    best_streak = v_best,
    last_activity_date = v_today,
    updated_at = NOW()
WHERE paciente_id = p_paciente_id
    AND streak_type = p_streak_type;
RETURN QUERY
SELECT v_current,
    v_best,
    v_is_new_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================
-- AUDIT: Add comment for documentation
-- ============================================
COMMENT ON TABLE patient_streaks IS 'Tracks daily activity streaks for patient engagement';
COMMENT ON TABLE patient_achievements IS 'Stores earned achievements and milestones for gamification';
COMMENT ON FUNCTION update_patient_streak IS 'Atomically updates streak count and checks for records';