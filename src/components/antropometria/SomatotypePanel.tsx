"use client";

import { useMemo } from "react";
import { FullMeasurementData } from "./UnifiedMeasurementForm";
import { CuadroDiagnosticoSomatotipo } from "./CuadroDiagnosticoSomatotipo";
import { PremiumSomatochart } from "./PremiumSomatochart";
import { Info } from "lucide-react";
import {
    calculateSomatotype,
    getEndomorphyInterpretation,
    getMesomorphyInterpretation,
    getEctomorphyInterpretation,
    type SomatotypeMeasurementData,
} from "@/lib/somatotype-utils";

interface SomatotypePanelProps {
    data: FullMeasurementData;
}

export function SomatotypePanel({ data }: SomatotypePanelProps) {
    const somatotype = useMemo(() => calculateSomatotype(data as SomatotypeMeasurementData), [data]);

    if (!somatotype.isValid) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 p-12 text-center">
                <div className="w-20 h-20 rounded-[2rem] bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <Info className="w-10 h-10 text-slate-300" />
                </div>
                <h4 className="text-xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">
                    Evaluación Incompleta
                </h4>
                <p className="text-sm text-slate-400 max-w-sm mx-auto mb-8 font-medium">
                    Se requieren mediciones adicionales para generar el análisis biomecánico del somatotipo.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                    {somatotype.missingData.skinfolds && (
                        <span className="px-4 py-2 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-wider border border-amber-100">
                            Pliegues Faltantes
                        </span>
                    )}
                    {somatotype.missingData.girths && (
                        <span className="px-4 py-2 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-wider border border-amber-100">
                            Perímetros Faltantes
                        </span>
                    )}
                    {somatotype.missingData.breadths && (
                        <span className="px-4 py-2 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-wider border border-amber-100">
                            Diámetros Faltantes
                        </span>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 1. Cuadro de Diagnóstico Premium (Nuevas Tarjetas Wallet) */}
            <CuadroDiagnosticoSomatotipo
                endo={somatotype.endomorphy}
                meso={somatotype.mesomorphy}
                ecto={somatotype.ectomorphy}
            />

            {/* 2. Gráfico Somatocarta */}
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800">
                <PremiumSomatochart
                    endo={somatotype.endomorphy}
                    meso={somatotype.mesomorphy}
                    ecto={somatotype.ectomorphy}
                />
            </div>

            {/* 3. Interpretación Detallada */}
            <div className="grid grid-cols-1 gap-4">
                <div className="bg-slate-50/50 dark:bg-slate-800/30 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                    <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-3 uppercase tracking-[0.2em] mb-8">
                        <Info className="w-5 h-5 text-indigo-500" />
                        Análisis por Componente
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Endomorfia */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-rose-500" />
                                <span className="font-black text-rose-600 dark:text-rose-400 text-xs uppercase tracking-wider">Adiposidad</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                {getEndomorphyInterpretation(somatotype.endomorphy).description}
                            </p>
                        </div>

                        {/* Mesomorfia */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="font-black text-blue-600 dark:text-blue-400 text-xs uppercase tracking-wider">Muscularidad</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                {getMesomorphyInterpretation(somatotype.mesomorphy).description}
                            </p>
                        </div>

                        {/* Ectomorfia */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs uppercase tracking-wider">Linealidad</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                {getEctomorphyInterpretation(somatotype.ectomorphy).description}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
