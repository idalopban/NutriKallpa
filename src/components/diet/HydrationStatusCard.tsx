"use client";

/**
 * HydrationStatusCard Component
 * 
 * Shows CURRENT water consumption reported by patient (from consultation)
 * with a comparison to the clinical recommendation.
 */

import { Droplets, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { calculateHydration } from "@/lib/hydration-calculator";
import type { NivelActividad } from "@/types";

interface HydrationStatusCardProps {
    /** Current daily water consumption in liters (from patient history) */
    currentLiters?: number;
    /** Patient weight for recommendation calculation */
    weightKg: number;
    /** Activity level for recommendation */
    activityLevel?: NivelActividad;
    /** Patient age */
    age?: number;
    /** Pre-calculated recommended liters (from store) - overrides internal calculation */
    recommendedLiters?: number;
}

export function HydrationStatusCard({
    currentLiters,
    weightKg,
    activityLevel = 'moderada',
    age,
    recommendedLiters: propRecommended
}: HydrationStatusCardProps) {
    // Calculate recommendation (fallback if not provided via prop)
    const recommendation = calculateHydration({
        weightKg,
        activityLevel,
        age
    });

    // Use prop if provided, otherwise calculate
    const recommendedLiters = propRecommended ?? (recommendation.totalDailyML / 1000);
    const current = currentLiters ?? 0;

    // Calculate percentage of goal
    const percentOfGoal = current > 0 ? Math.round((current / recommendedLiters) * 100) : 0;

    // Determine status
    const isLow = percentOfGoal < 70;
    const isGood = percentOfGoal >= 70 && percentOfGoal <= 120;
    const isHigh = percentOfGoal > 120;

    // Status styling
    const getStatusColor = () => {
        if (!current) return 'text-slate-400';
        if (isLow) return 'text-amber-500';
        if (isGood) return 'text-emerald-500';
        return 'text-blue-500';
    };

    const getStatusIcon = () => {
        if (!current) return <Minus className="w-4 h-4" />;
        if (isLow) return <TrendingDown className="w-4 h-4" />;
        if (isGood) return <TrendingUp className="w-4 h-4" />;
        return <AlertTriangle className="w-4 h-4" />;
    };

    const getStatusText = () => {
        if (!current) return 'Sin registro';
        if (isLow) return 'Bajo';
        if (isGood) return 'Adecuado';
        return 'Alto';
    };

    return (
        <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border border-cyan-200 dark:border-cyan-800">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-cyan-500 rounded-lg text-white">
                        <Droplets className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 uppercase tracking-wide">
                        Consumo de Agua
                    </span>
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${getStatusColor()}`}>
                    {getStatusIcon()}
                    {getStatusText()}
                </div>
            </div>

            {/* Values */}
            <div className="flex items-end justify-between gap-4">
                {/* Current consumption */}
                <div className="flex-1">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Actual</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-white">
                        {current > 0 ? current.toFixed(1) : '--'}
                        <span className="text-xs font-normal text-slate-400 ml-0.5">L/día</span>
                    </p>
                </div>

                {/* Separator */}
                <div className="h-8 w-px bg-cyan-200 dark:bg-cyan-700" />

                {/* Recommended */}
                <div className="flex-1 text-right">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Recomendado</p>
                    <p className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">
                        {recommendedLiters.toFixed(1)}
                        <span className="text-xs font-normal text-cyan-400 ml-0.5">L/día</span>
                    </p>
                </div>
            </div>

            {/* Progress bar */}
            {current > 0 && (
                <div className="mt-3">
                    <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${isLow ? 'bg-amber-400' : isGood ? 'bg-emerald-400' : 'bg-blue-400'
                                }`}
                            style={{ width: `${Math.min(percentOfGoal, 120)}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 text-center">
                        {percentOfGoal}% de la meta diaria
                    </p>
                </div>
            )}

            {/* Warning if no data */}
            {!current && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 italic">
                    💡 Registrar consumo actual en Historia Clínica → Estilo de Vida
                </p>
            )}
        </div>
    );
}
