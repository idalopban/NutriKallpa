"use client";

/**
 * HydrationCard Component
 * 
 * Displays daily water intake recommendation based on patient data.
 * Clinical grade hydration calculator with visual presentation.
 */

import { Droplets, Info, AlertTriangle, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { calculateHydration, type HydrationRecommendation } from "@/lib/hydration-calculator";
import type { NivelActividad, Pathologies } from "@/types";

interface HydrationCardProps {
    weightKg: number;
    activityLevel?: NivelActividad;
    age?: number;
    pathologies?: Pathologies[];
    isAthlete?: boolean;
    compact?: boolean;
}

export function HydrationCard({
    weightKg,
    activityLevel = 'moderada',
    age,
    pathologies = [],
    isAthlete = false,
    compact = false
}: HydrationCardProps) {
    const recommendation = calculateHydration({
        weightKg,
        activityLevel,
        age,
        pathologies,
        isAthlete
    });

    const liters = (recommendation.totalDailyML / 1000).toFixed(1);
    const glasses = recommendation.glassesPerDay;

    // Compact version for sidebar or small spaces
    if (compact) {
        return (
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800">
                <div className="p-2 bg-cyan-500 rounded-full text-white">
                    <Droplets className="w-4 h-4" />
                </div>
                <div>
                    <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">Hidratación Diaria</p>
                    <p className="text-lg font-bold text-cyan-700 dark:text-cyan-300">
                        {liters}L <span className="text-xs font-normal opacity-75">({glasses} vasos)</span>
                    </p>
                </div>
                {recommendation.warnings.length > 0 && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <ul className="text-xs space-y-1">
                                    {recommendation.warnings.map((w, i) => (
                                        <li key={i}>{w}</li>
                                    ))}
                                </ul>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
        );
    }

    // Full card version
    return (
        <Card className="border border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-white to-cyan-50/50 dark:from-slate-800 dark:to-cyan-900/20 shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-base text-slate-800 dark:text-white">
                    <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl text-white shadow-lg shadow-cyan-500/20">
                        <Droplets className="w-5 h-5" />
                    </div>
                    Hidratación Diaria
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Info className="w-4 h-4 text-slate-400" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <p className="text-xs">
                                    Recomendación basada en peso corporal, nivel de actividad y condiciones clínicas.
                                    Calculado con estándares EFSA/IOM.
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Main Recommendation */}
                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-cyan-100 dark:border-slate-700">
                    <div>
                        <p className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                            {liters}<span className="text-lg font-medium ml-1">L</span>
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {glasses} vasos de 250ml
                        </p>
                    </div>

                    {/* Visual Glasses */}
                    <div className="flex gap-0.5">
                        {Array.from({ length: Math.min(glasses, 10) }).map((_, i) => (
                            <div
                                key={i}
                                className="w-3 h-8 bg-gradient-to-t from-cyan-500 to-cyan-300 rounded-sm opacity-80"
                                style={{ opacity: 0.4 + (i * 0.06) }}
                            />
                        ))}
                        {glasses > 10 && (
                            <span className="text-xs text-slate-400 ml-1">+{glasses - 10}</span>
                        )}
                    </div>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <p className="text-slate-500 dark:text-slate-400">Base</p>
                        <p className="font-semibold text-slate-700 dark:text-slate-200">
                            {(recommendation.baselineML / 1000).toFixed(1)}L
                        </p>
                    </div>
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <p className="text-slate-500 dark:text-slate-400">Actividad</p>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                            +{(recommendation.activityAdjustmentML / 1000).toFixed(1)}L
                        </p>
                    </div>
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <p className="text-slate-500 dark:text-slate-400">Clínico</p>
                        <p className={`font-semibold ${recommendation.clinicalAdjustmentML >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {recommendation.clinicalAdjustmentML >= 0 ? '+' : ''}{(recommendation.clinicalAdjustmentML / 1000).toFixed(1)}L
                        </p>
                    </div>
                </div>

                {/* Warnings if any */}
                {recommendation.warnings.length > 0 && (
                    <div className="space-y-2">
                        {recommendation.warnings.map((warning, i) => (
                            <div key={i} className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                <span>{warning}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tips - show first one only */}
                {recommendation.tips.length > 0 && (
                    <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                        <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>{recommendation.tips[0]}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
