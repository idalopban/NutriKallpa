/**
 * Gamification Service
 * 
 * Provides streak tracking, achievement management, and engagement features
 * for patient adherence improvement.
 */

import { createBrowserClient } from "@/lib/supabase";

// --- ACHIEVEMENT DEFINITIONS ---

export interface AchievementDefinition {
    key: string;
    name: string;
    description: string;
    icon: string;  // Emoji
    category: 'streak' | 'milestone' | 'goal' | 'engagement';
    condition: (stats: PatientStats) => boolean;
}

export interface PatientStats {
    currentStreak: number;
    bestStreak: number;
    totalDaysLogged: number;
    weightLost?: number;  // kg
    evaluationsCompleted: number;
    appointmentsAttended: number;
    dietDaysFollowed: number;
}

export interface StreakData {
    streakType: string;
    currentStreak: number;
    bestStreak: number;
    lastActivityDate: string | null;
}

export interface Achievement {
    key: string;
    achievedAt: string;
    metadata?: Record<string, unknown>;
}

export interface PatientProgress {
    streaks: StreakData[];
    achievements: Achievement[];
    stats: PatientStats;
}

// --- ACHIEVEMENT CATALOG ---

export const ACHIEVEMENTS: AchievementDefinition[] = [
    // Streak Achievements
    {
        key: 'streak_3',
        name: '3 Días Seguidos',
        description: 'Registraste actividad por 3 días consecutivos',
        icon: '🔥',
        category: 'streak',
        condition: (stats) => stats.currentStreak >= 3
    },
    {
        key: 'streak_7',
        name: 'Semana Perfecta',
        description: '¡Una semana completa sin faltar!',
        icon: '⭐',
        category: 'streak',
        condition: (stats) => stats.currentStreak >= 7
    },
    {
        key: 'streak_14',
        name: 'Quincena de Oro',
        description: '14 días consecutivos de constancia',
        icon: '🏆',
        category: 'streak',
        condition: (stats) => stats.currentStreak >= 14
    },
    {
        key: 'streak_30',
        name: 'Mes Invicto',
        description: '¡30 días seguidos! Eres imparable',
        icon: '👑',
        category: 'streak',
        condition: (stats) => stats.currentStreak >= 30
    },
    {
        key: 'streak_90',
        name: 'Maestro del Hábito',
        description: '90 días = hábito formado para siempre',
        icon: '🎖️',
        category: 'streak',
        condition: (stats) => stats.currentStreak >= 90
    },

    // Milestone Achievements
    {
        key: 'first_evaluation',
        name: 'Primera Medición',
        description: 'Completaste tu primera evaluación antropométrica',
        icon: '📊',
        category: 'milestone',
        condition: (stats) => stats.evaluationsCompleted >= 1
    },
    {
        key: 'five_evaluations',
        name: 'Seguimiento Pro',
        description: '5 evaluaciones completadas. ¡Excelente seguimiento!',
        icon: '📈',
        category: 'milestone',
        condition: (stats) => stats.evaluationsCompleted >= 5
    },

    // Goal Achievements
    {
        key: 'first_kg_lost',
        name: 'Primer Kilo',
        description: 'El primero de muchos. ¡Buen inicio!',
        icon: '🎯',
        category: 'goal',
        condition: (stats) => (stats.weightLost ?? 0) >= 1
    },
    {
        key: 'five_kg_lost',
        name: '5 Kilos Menos',
        description: 'Progreso significativo. ¡Sigue así!',
        icon: '💪',
        category: 'goal',
        condition: (stats) => (stats.weightLost ?? 0) >= 5
    },
    {
        key: 'ten_kg_lost',
        name: 'Transformación',
        description: '10 kg perdidos. ¡Increíble logro!',
        icon: '🦋',
        category: 'goal',
        condition: (stats) => (stats.weightLost ?? 0) >= 10
    },

    // Engagement Achievements
    {
        key: 'first_week',
        name: 'Bienvenido',
        description: 'Completaste tu primera semana en el programa',
        icon: '👋',
        category: 'engagement',
        condition: (stats) => stats.totalDaysLogged >= 7
    },
    {
        key: 'appointment_streak',
        name: 'Nunca Falto',
        description: 'Asististe a 5 citas seguidas sin faltar',
        icon: '✅',
        category: 'engagement',
        condition: (stats) => stats.appointmentsAttended >= 5
    }
];

// --- SERVICE FUNCTIONS ---

/**
 * Get patient progress data including streaks and achievements
 */
export async function getPatientProgress(pacienteId: string): Promise<PatientProgress> {
    const supabase = createBrowserClient();

    // Fetch streaks
    const { data: streaksData, error: streaksError } = await supabase
        .from('patient_streaks')
        .select('*')
        .eq('paciente_id', pacienteId);

    if (streaksError) {
        console.error('Error fetching streaks:', streaksError);
    }

    // Fetch achievements
    const { data: achievementsData, error: achievementsError } = await supabase
        .from('patient_achievements')
        .select('*')
        .eq('paciente_id', pacienteId);

    if (achievementsError) {
        console.error('Error fetching achievements:', achievementsError);
    }

    interface StreakRow { streak_type: string; current_streak: number; best_streak: number; last_activity_date: string | null; }
    const streaks: StreakData[] = (streaksData || []).map((s: StreakRow) => ({
        streakType: s.streak_type,
        currentStreak: s.current_streak,
        bestStreak: s.best_streak,
        lastActivityDate: s.last_activity_date
    }));

    interface AchievementRow { achievement_key: string; achieved_at: string; metadata: Record<string, unknown>; }
    const achievements: Achievement[] = (achievementsData || []).map((a: AchievementRow) => ({
        key: a.achievement_key,
        achievedAt: a.achieved_at,
        metadata: a.metadata
    }));

    // Calculate stats from streaks
    const dietStreak = streaks.find(s => s.streakType === 'diet_adherence');
    const stats: PatientStats = {
        currentStreak: dietStreak?.currentStreak || 0,
        bestStreak: dietStreak?.bestStreak || 0,
        totalDaysLogged: 0,  // Would need additional tracking
        evaluationsCompleted: 0,  // Would need to count from medidas table
        appointmentsAttended: 0,
        dietDaysFollowed: dietStreak?.currentStreak || 0
    };

    return { streaks, achievements, stats };
}

/**
 * Record an activity and update streak
 */
export async function recordActivity(
    pacienteId: string,
    streakType: 'diet_adherence' | 'appointment' | 'weight_log' | 'measurement' = 'diet_adherence'
): Promise<{ currentStreak: number; bestStreak: number; isNewRecord: boolean }> {
    const supabase = createBrowserClient();

    // Call the database function
    const { data, error } = await supabase
        .rpc('update_patient_streak', {
            p_paciente_id: pacienteId,
            p_streak_type: streakType
        });

    if (error) {
        console.error('Error updating streak:', error);
        return { currentStreak: 0, bestStreak: 0, isNewRecord: false };
    }

    const result = data?.[0] || { current_streak: 0, best_streak: 0, is_new_record: false };

    return {
        currentStreak: result.current_streak,
        bestStreak: result.best_streak,
        isNewRecord: result.is_new_record
    };
}

/**
 * Check and grant any new achievements based on current stats
 */
export async function checkAndGrantAchievements(
    pacienteId: string,
    stats: PatientStats
): Promise<AchievementDefinition[]> {
    const supabase = createBrowserClient();
    const newlyEarned: AchievementDefinition[] = [];

    // Get already earned achievements
    const { data: existingAchievements } = await supabase
        .from('patient_achievements')
        .select('achievement_key')
        .eq('paciente_id', pacienteId);

    const earnedKeys = new Set((existingAchievements || []).map((a: { achievement_key: string }) => a.achievement_key));

    // Check each achievement
    for (const achievement of ACHIEVEMENTS) {
        if (!earnedKeys.has(achievement.key) && achievement.condition(stats)) {
            // Grant the achievement
            const { error } = await supabase
                .from('patient_achievements')
                .insert({
                    paciente_id: pacienteId,
                    achievement_key: achievement.key,
                    metadata: { stats }
                });

            if (!error) {
                newlyEarned.push(achievement);
            }
        }
    }

    return newlyEarned;
}

/**
 * Get achievement definition by key
 */
export function getAchievementByKey(key: string): AchievementDefinition | undefined {
    return ACHIEVEMENTS.find(a => a.key === key);
}

/**
 * Format streak display
 */
export function formatStreakDisplay(streak: number): string {
    if (streak === 0) return 'Sin racha';
    if (streak === 1) return '1 día';
    if (streak < 7) return `${streak} días`;
    if (streak < 30) return `${Math.floor(streak / 7)} semana${streak >= 14 ? 's' : ''} 🔥`;
    if (streak < 90) return `${Math.floor(streak / 30)} mes${streak >= 60 ? 'es' : ''} 🔥🔥`;
    return `${Math.floor(streak / 30)} meses 👑`;
}
