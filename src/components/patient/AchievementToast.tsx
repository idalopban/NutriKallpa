"use client";

import { useState, useEffect } from "react";
import { Trophy, X, Star, Flame, Crown, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AchievementDefinition } from "@/lib/gamification-service";

interface AchievementToastProps {
    achievement: AchievementDefinition | null;
    onDismiss?: () => void;
    autoClose?: boolean;
    autoCloseDelay?: number;
}

/**
 * Celebration toast that appears when patient earns a new achievement
 * Uses CSS animations instead of framer-motion for simpler dependencies
 */
export function AchievementToast({
    achievement,
    onDismiss,
    autoClose = true,
    autoCloseDelay = 5000
}: AchievementToastProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (achievement) {
            setIsVisible(true);
            setIsExiting(false);

            // Auto close after delay
            if (autoClose) {
                const timer = setTimeout(() => {
                    handleDismiss();
                }, autoCloseDelay);
                return () => clearTimeout(timer);
            }
        }
    }, [achievement, autoClose, autoCloseDelay]);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(() => {
            setIsVisible(false);
            onDismiss?.();
        }, 300); // Wait for animation
    };

    const getCategoryColors = (category: string) => {
        switch (category) {
            case 'streak':
                return 'from-orange-500 to-red-500';
            case 'goal':
                return 'from-emerald-500 to-teal-500';
            case 'milestone':
                return 'from-purple-500 to-indigo-500';
            case 'engagement':
                return 'from-blue-500 to-cyan-500';
            default:
                return 'from-slate-500 to-slate-600';
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'streak':
                return <Flame className="w-6 h-6" />;
            case 'goal':
                return <Target className="w-6 h-6" />;
            case 'milestone':
                return <Trophy className="w-6 h-6" />;
            case 'engagement':
                return <Star className="w-6 h-6" />;
            default:
                return <Crown className="w-6 h-6" />;
        }
    };

    if (!achievement || !isVisible) return null;

    return (
        <div
            className={`fixed bottom-6 right-6 z-50 max-w-sm transition-all duration-300 ${isExiting
                    ? 'opacity-0 scale-90 translate-y-4'
                    : 'opacity-100 scale-100 translate-y-0'
                }`}
        >
            <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${getCategoryColors(achievement.category)} p-1 shadow-2xl`}>
                {/* Inner content */}
                <div className="relative bg-white dark:bg-slate-900 rounded-xl p-4">
                    {/* Dismiss button */}
                    <button
                        onClick={handleDismiss}
                        className="absolute top-2 right-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Cerrar notificación"
                        title="Cerrar"
                    >
                        <X className="w-4 h-4 text-slate-400" />
                    </button>

                    {/* Header */}
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getCategoryColors(achievement.category)} flex items-center justify-center text-white shadow-lg`}>
                            <span className="text-2xl">{achievement.icon}</span>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                                ¡Nuevo logro!
                            </p>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                {achievement.name}
                            </h3>
                        </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                        {achievement.description}
                    </p>

                    {/* Action */}
                    <Button
                        onClick={handleDismiss}
                        className={`w-full bg-gradient-to-r ${getCategoryColors(achievement.category)} hover:opacity-90 text-white`}
                    >
                        🎉 ¡Genial!
                    </Button>
                </div>
            </div>
        </div>
    );
}

/**
 * Simple hook to manage achievement toast state
 */
export function useAchievementToast() {
    const [pendingAchievement, setPendingAchievement] = useState<AchievementDefinition | null>(null);

    const showAchievement = (achievement: AchievementDefinition) => {
        setPendingAchievement(achievement);
    };

    const dismissAchievement = () => {
        setPendingAchievement(null);
    };

    return {
        pendingAchievement,
        showAchievement,
        dismissAchievement
    };
}
