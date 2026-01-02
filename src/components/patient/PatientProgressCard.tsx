"use client";

import { useState, useEffect } from "react";
import { Flame, Trophy, Star, Target, Crown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    getPatientProgress,
    formatStreakDisplay,
    getAchievementByKey,
    type PatientProgress,
    ACHIEVEMENTS
} from "@/lib/gamification-service";

interface PatientProgressCardProps {
    pacienteId: string;
    patientName?: string;
    compact?: boolean;
}

/**
 * Displays patient progress including streaks and achievements
 */
export function PatientProgressCard({ pacienteId, patientName, compact = false }: PatientProgressCardProps) {
    const [progress, setProgress] = useState<PatientProgress | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchProgress() {
            try {
                const data = await getPatientProgress(pacienteId);
                setProgress(data);
            } catch (error) {
                console.error('Error fetching patient progress:', error);
            } finally {
                setIsLoading(false);
            }
        }

        if (pacienteId) {
            fetchProgress();
        }
    }, [pacienteId]);

    if (isLoading) {
        return (
            <Card className="animate-pulse">
                <CardHeader className="pb-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                </CardHeader>
                <CardContent>
                    <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </CardContent>
            </Card>
        );
    }

    if (!progress) {
        return null;
    }

    const dietStreak = progress.streaks.find(s => s.streakType === 'diet_adherence');
    const currentStreak = dietStreak?.currentStreak || 0;
    const bestStreak = dietStreak?.bestStreak || 0;
    const recentAchievements = progress.achievements.slice(-3);

    // Calculate progress to next milestone
    const nextMilestone = currentStreak < 7 ? 7 : currentStreak < 14 ? 14 : currentStreak < 30 ? 30 : 90;
    const progressPercent = Math.min((currentStreak / nextMilestone) * 100, 100);

    if (compact) {
        return (
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-xl border border-orange-100 dark:border-orange-900/30">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                    <Flame className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <div className="text-sm font-bold text-slate-800 dark:text-white">
                        {formatStreakDisplay(currentStreak)}
                    </div>
                    <div className="text-xs text-slate-500">
                        Mejor: {bestStreak} días
                    </div>
                </div>
                {currentStreak >= 7 && (
                    <Badge className="bg-orange-500 text-white">
                        🔥 En racha
                    </Badge>
                )}
            </div>
        );
    }

    return (
        <Card className="overflow-hidden border-none shadow-lg">
            {/* Header with Streak */}
            <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white pb-6">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Flame className="w-5 h-5" />
                        Progreso
                        {patientName && <span className="font-normal text-white/80">de {patientName}</span>}
                    </CardTitle>
                    {currentStreak >= 3 && (
                        <Badge className="bg-white/20 text-white border-white/30">
                            {currentStreak >= 30 ? '🏆' : currentStreak >= 7 ? '⭐' : '🔥'}
                            {currentStreak >= 30 ? 'Experto' : currentStreak >= 7 ? 'Constante' : 'En racha'}
                        </Badge>
                    )}
                </div>

                {/* Streak Counter */}
                <div className="mt-4">
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black">{currentStreak}</span>
                        <span className="text-xl text-white/80">días</span>
                    </div>
                    <p className="text-sm text-white/70 mt-1">
                        {currentStreak === 0
                            ? '¡Comienza tu racha hoy!'
                            : currentStreak >= bestStreak
                                ? '¡Récord personal! 🎉'
                                : `Mejor racha: ${bestStreak} días`}
                    </p>
                </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
                {/* Progress to next milestone */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Próximo logro</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {currentStreak}/{nextMilestone} días
                        </span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                    <p className="text-xs text-slate-400">
                        {nextMilestone === 7 ? '🌟 Semana Perfecta' :
                            nextMilestone === 14 ? '🏆 Quincena de Oro' :
                                nextMilestone === 30 ? '👑 Mes Invicto' :
                                    '🎖️ Maestro del Hábito'}
                    </p>
                </div>

                {/* Recent Achievements */}
                {recentAchievements.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                Logros Recientes
                            </span>
                            <button className="text-xs text-orange-500 hover:underline flex items-center gap-1">
                                Ver todos <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {recentAchievements.map(a => {
                                const def = getAchievementByKey(a.key);
                                return (
                                    <div
                                        key={a.key}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs"
                                        title={def?.description}
                                    >
                                        <span>{def?.icon}</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-200">
                                            {def?.name}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* No achievements yet */}
                {recentAchievements.length === 0 && (
                    <div className="text-center py-4 text-slate-400 text-sm">
                        <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p>Aún no hay logros.</p>
                        <p className="text-xs">¡Mantén tu racha para desbloquearlos!</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Mini version for sidebars
 */
export function PatientStreakBadge({ currentStreak, bestStreak }: { currentStreak: number; bestStreak: number }) {
    if (currentStreak === 0) {
        return (
            <div className="text-xs text-slate-400 flex items-center gap-1">
                <Flame className="w-3 h-3 opacity-50" />
                Sin racha activa
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full text-xs font-bold shadow-lg shadow-orange-500/20">
                <Flame className="w-3 h-3" />
                {currentStreak}
            </div>
            {currentStreak >= bestStreak && currentStreak > 0 && (
                <span title="Récord personal">
                    <Crown className="w-4 h-4 text-yellow-500" />
                </span>
            )}
        </div>
    );
}
