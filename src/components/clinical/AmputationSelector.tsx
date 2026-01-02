"use client";

/**
 * AmputationSelector
 * 
 * Visual selector component for indicating patient amputations.
 * Uses body segment checkboxes with weight percentage indicators.
 * Calculates corrected weight automatically.
 */

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import {
    AmputationType,
    AMPUTATION_PERCENTAGES,
    AMPUTATION_LABELS,
    calculateTotalAmputationPercentage,
    calculateCorrectedWeight,
    calculateAdjustedIdealWeight
} from "@/lib/clinical-calculations";

interface AmputationSelectorProps {
    selectedAmputations: AmputationType[];
    onChange: (amputations: AmputationType[]) => void;
    currentWeight?: number;
    idealWeight?: number;
}

// Group amputations by limb type
const AMPUTATION_GROUPS = {
    'Miembro Superior Izq.': ['mano_izq', 'antebrazo_izq', 'brazo_izq'] as AmputationType[],
    'Miembro Superior Der.': ['mano_der', 'antebrazo_der', 'brazo_der'] as AmputationType[],
    'Miembro Inferior Izq.': ['pie_izq', 'pierna_bajo_rodilla_izq', 'pierna_completa_izq'] as AmputationType[],
    'Miembro Inferior Der.': ['pie_der', 'pierna_bajo_rodilla_der', 'pierna_completa_der'] as AmputationType[],
};

export function AmputationSelector({
    selectedAmputations,
    onChange,
    currentWeight,
    idealWeight
}: AmputationSelectorProps) {

    const toggleAmputation = (ampType: AmputationType) => {
        if (selectedAmputations.includes(ampType)) {
            onChange(selectedAmputations.filter(a => a !== ampType));
        } else {
            onChange([...selectedAmputations, ampType]);
        }
    };

    const totalPercentage = calculateTotalAmputationPercentage(selectedAmputations);
    const correctedWeight = currentWeight ? calculateCorrectedWeight(currentWeight, selectedAmputations) : null;
    const adjustedIdealWeight = idealWeight ? calculateAdjustedIdealWeight(idealWeight, selectedAmputations) : null;

    return (
        <div className="space-y-4">
            {/* Header with warning */}
            <div className="flex items-start gap-3 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800">
                <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">
                        Indicar Amputaciones
                    </p>
                    <p className="text-xs text-rose-600 dark:text-rose-400">
                        Selecciona los segmentos amputados para ajustar el peso corporal
                    </p>
                </div>
            </div>

            {/* Amputation Groups */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(AMPUTATION_GROUPS).map(([groupName, amputations]) => (
                    <div key={groupName} className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            {groupName}
                        </h4>
                        <div className="space-y-1">
                            {amputations.map(ampType => {
                                const isSelected = selectedAmputations.includes(ampType);
                                const percentage = AMPUTATION_PERCENTAGES[ampType] * 100;

                                return (
                                    <button
                                        key={ampType}
                                        onClick={() => toggleAmputation(ampType)}
                                        className={`w-full flex items-center justify-between p-2.5 rounded-lg border-2 transition-all text-left ${isSelected
                                                ? 'bg-rose-500 border-rose-500 text-white'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-rose-300'
                                            }`}
                                    >
                                        <span className="text-xs font-medium">
                                            {AMPUTATION_LABELS[ampType].split('(')[0].trim()}
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected
                                                ? 'bg-white/20'
                                                : 'bg-slate-100 dark:bg-slate-700'
                                            }`}>
                                            {percentage.toFixed(1)}%
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Calculated Results */}
            {selectedAmputations.length > 0 && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">Porcentaje Total Amputado:</span>
                        <span className="text-sm font-bold text-rose-600">{(totalPercentage * 100).toFixed(1)}%</span>
                    </div>

                    {correctedWeight !== null && (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                            <div>
                                <span className="text-xs text-slate-500 block">Peso Corregido</span>
                                <span className="text-[10px] text-slate-400">(Peso si tuviera miembros completos)</span>
                            </div>
                            <span className="text-lg font-bold text-[#6cba00]">{correctedWeight.toFixed(1)} kg</span>
                        </div>
                    )}

                    {adjustedIdealWeight !== null && (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                            <div>
                                <span className="text-xs text-slate-500 block">Peso Ideal Ajustado</span>
                                <span className="text-[10px] text-slate-400">(Meta considerando amputación)</span>
                            </div>
                            <span className="text-lg font-bold text-blue-600">{adjustedIdealWeight.toFixed(1)} kg</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
