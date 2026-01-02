"use client";

/**
 * NutrientTimingCard Component
 * 
 * Displays nutritional timing recommendations for athletes:
 * - Pre-workout (1-2h before)
 * - Intra-workout (during)
 * - Post-workout (within 30min-2h)
 */

import {
    Timer,
    Zap,
    RotateCcw,
    Dumbbell,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { useState } from "react";
import type { NivelActividad } from "@/types";

interface NutrientTimingCardProps {
    /** Patient weight for calculations */
    weightKg: number;
    /** Activity level to determine if timing is relevant */
    activityLevel?: NivelActividad;
    /** Target daily calories for percentage calculations */
    totalCalories?: number;
    /** Target daily carbs in grams */
    targetCarbsG?: number;
    /** Target daily protein in grams */
    targetProteinG?: number;
    /** Compact mode for sidebar */
    compact?: boolean;
}

// Activity levels that benefit from nutrient timing
const TIMING_RELEVANT_ACTIVITIES: NivelActividad[] = [
    'activa', 'muy_activa', 'intensa', 'muy_intensa', 'elite', 'ultra'
];

export function NutrientTimingCard({
    weightKg,
    activityLevel = 'moderada',
    totalCalories = 2000,
    targetCarbsG = 250,
    targetProteinG = 120,
    compact = false
}: NutrientTimingCardProps) {
    const [expanded, setExpanded] = useState(!compact);

    // Only show detailed timing for active+ individuals
    const isRelevant = TIMING_RELEVANT_ACTIVITIES.includes(activityLevel);
    const isElite = activityLevel === 'elite' || activityLevel === 'ultra';

    // Calculate timing-based macros
    const preWorkout = {
        carbsG: Math.round(targetCarbsG * 0.25), // 25% of daily carbs
        proteinG: Math.round(targetProteinG * 0.20), // 20% of daily protein
        timing: '1-2h antes',
        examples: ['Avena con plátano', 'Tostada con mantequilla de maní', 'Arroz con pollo']
    };

    const intraWorkout = {
        carbsG: isElite ? Math.round(30 + (weightKg * 0.5)) : 0, // 30-60g/h for elite
        hydrationML: Math.round(400 + (weightKg * 5)), // 400-800ml/h
        timing: 'Durante (si >60 min)',
        examples: isElite
            ? ['Gel energético', 'Bebida isotónica', 'Dátiles']
            : ['Agua', 'Electrolitos si +90min']
    };

    const postWorkout = {
        carbsG: Math.round(targetCarbsG * 0.30), // 30% of daily carbs
        proteinG: Math.round(0.3 * weightKg), // 0.3g/kg fast protein
        timing: '0-2h después',
        examples: ['Batido proteico con fruta', 'Pollo con arroz y vegetales', 'Huevos con pan integral']
    };

    if (!isRelevant && compact) {
        return null; // Don't show timing card for sedentary patients in compact mode
    }

    return (
        <div className="rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-800 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-3 flex items-center justify-between hover:bg-violet-100/50 dark:hover:bg-violet-800/30 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-violet-500 rounded-lg text-white">
                        <Timer className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-left">
                        <span className="text-xs font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide">
                            Timing Nutricional
                        </span>
                        {isElite && (
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-violet-500 text-white rounded font-bold">
                                ÉLITE
                            </span>
                        )}
                    </div>
                </div>
                {expanded ? (
                    <ChevronUp className="w-4 h-4 text-violet-500" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-violet-500" />
                )}
            </button>

            {/* Content */}
            {expanded && (
                <div className="px-3 pb-3 space-y-3">
                    {!isRelevant ? (
                        <p className="text-xs text-slate-500 italic p-2 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                            💡 El timing nutricional es más relevante para niveles de actividad "Activa" o superior.
                            Para actividad moderada/sedentaria, enfócate en cumplir los macros diarios totales.
                        </p>
                    ) : (
                        <>
                            {/* Pre-Workout */}
                            <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-violet-100 dark:border-violet-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className="w-4 h-4 text-yellow-500" />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        Pre-Entreno
                                    </span>
                                    <span className="text-[10px] text-slate-400 ml-auto">{preWorkout.timing}</span>
                                </div>
                                <div className="flex gap-4 mb-2">
                                    <div className="text-center">
                                        <p className="text-lg font-black text-yellow-600">{preWorkout.carbsG}g</p>
                                        <p className="text-[10px] text-slate-400">Carbos</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-black text-blue-600">{preWorkout.proteinG}g</p>
                                        <p className="text-[10px] text-slate-400">Proteína</p>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-500">
                                    Ej: {preWorkout.examples.slice(0, 2).join(' • ')}
                                </p>
                            </div>

                            {/* Intra-Workout (only for elite/long sessions) */}
                            {isElite && (
                                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-violet-100 dark:border-violet-800">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Dumbbell className="w-4 h-4 text-green-500" />
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                            Intra-Entreno
                                        </span>
                                        <span className="text-[10px] text-slate-400 ml-auto">{intraWorkout.timing}</span>
                                    </div>
                                    <div className="flex gap-4 mb-2">
                                        <div className="text-center">
                                            <p className="text-lg font-black text-green-600">{intraWorkout.carbsG}g</p>
                                            <p className="text-[10px] text-slate-400">Carbos/h</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-lg font-black text-cyan-600">{intraWorkout.hydrationML}ml</p>
                                            <p className="text-[10px] text-slate-400">Agua/h</p>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-500">
                                        Ej: {intraWorkout.examples.slice(0, 2).join(' • ')}
                                    </p>
                                </div>
                            )}

                            {/* Post-Workout */}
                            <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-violet-100 dark:border-violet-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <RotateCcw className="w-4 h-4 text-purple-500" />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        Post-Entreno
                                    </span>
                                    <span className="text-[10px] text-slate-400 ml-auto">{postWorkout.timing}</span>
                                </div>
                                <div className="flex gap-4 mb-2">
                                    <div className="text-center">
                                        <p className="text-lg font-black text-purple-600">{postWorkout.carbsG}g</p>
                                        <p className="text-[10px] text-slate-400">Carbos</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-black text-blue-600">{postWorkout.proteinG}g</p>
                                        <p className="text-[10px] text-slate-400">Proteína</p>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-500">
                                    Ej: {postWorkout.examples.slice(0, 2).join(' • ')}
                                </p>
                            </div>

                            {/* Tip */}
                            <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                                <p className="text-[10px] text-violet-700 dark:text-violet-300">
                                    💡 <strong>Ventana anabólica:</strong> Consumir proteína de rápida absorción (suero, huevos)
                                    en los primeros 30-60 min post-entreno optimiza la síntesis proteica muscular.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
