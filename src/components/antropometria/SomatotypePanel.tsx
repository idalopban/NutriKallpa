"use client";

import { useMemo } from "react";
import { FullMeasurementData } from "./UnifiedMeasurementForm";
import { Target, Info } from "lucide-react";
import { PremiumSomatochart } from "./PremiumSomatochart";
import {
    calculateSomatotype,
    getSomatotypeClassification,
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

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-900/20 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <Target className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white">Somatocarta Heath-Carter</h3>
                        <p className="text-xs text-slate-500">Análisis del fenotipo corporal</p>
                    </div>
                </div>
            </div>

            <div className="p-5 space-y-6">
                {somatotype.isValid ? (
                    <>
                        {/* Componentes con Niveles */}
                        <div className="grid grid-cols-3 gap-4">
                            {/* Endomorfia */}
                            <div className="p-4 bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-900/20 dark:to-rose-900/10 rounded-xl text-center">
                                <div className="text-3xl font-black text-rose-500">{somatotype.endomorphy}</div>
                                <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-1">Endomorfia</div>
                                <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${getEndomorphyInterpretation(somatotype.endomorphy).level === "Bajo" ? "bg-green-100 text-green-700" :
                                    getEndomorphyInterpretation(somatotype.endomorphy).level === "Moderado" ? "bg-yellow-100 text-yellow-700" :
                                        "bg-red-100 text-red-700"
                                    }`}>
                                    {getEndomorphyInterpretation(somatotype.endomorphy).level}
                                </span>
                            </div>
                            {/* Mesomorfia */}
                            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 rounded-xl text-center">
                                <div className="text-3xl font-black text-blue-500">{somatotype.mesomorphy}</div>
                                <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1">Mesomorfia</div>
                                <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${getMesomorphyInterpretation(somatotype.mesomorphy).level === "Bajo" ? "bg-orange-100 text-orange-700" :
                                    getMesomorphyInterpretation(somatotype.mesomorphy).level === "Moderado" ? "bg-blue-100 text-blue-700" :
                                        "bg-green-100 text-green-700"
                                    }`}>
                                    {getMesomorphyInterpretation(somatotype.mesomorphy).level}
                                </span>
                            </div>
                            {/* Ectomorfia */}
                            <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-900/10 rounded-xl text-center">
                                <div className="text-3xl font-black text-emerald-500">{somatotype.ectomorphy}</div>
                                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">Ectomorfia</div>
                                <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${getEctomorphyInterpretation(somatotype.ectomorphy).level === "Bajo" ? "bg-slate-100 text-slate-700" :
                                    getEctomorphyInterpretation(somatotype.ectomorphy).level === "Moderado" ? "bg-emerald-100 text-emerald-700" :
                                        "bg-cyan-100 text-cyan-700"
                                    }`}>
                                    {getEctomorphyInterpretation(somatotype.ectomorphy).level}
                                </span>
                            </div>
                        </div>

                        {/* Clasificación Global */}
                        <div className="p-4 bg-gradient-to-r from-[#ff8508]/10 to-transparent rounded-xl">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600 dark:text-slate-400">Clasificación</span>
                                <span className="text-lg font-bold text-[#ff8508]">
                                    {getSomatotypeClassification(somatotype.endomorphy, somatotype.mesomorphy, somatotype.ectomorphy)}
                                </span>
                            </div>
                        </div>

                        {/* Gráfico Premium */}
                        <PremiumSomatochart
                            endo={somatotype.endomorphy}
                            meso={somatotype.mesomorphy}
                            ecto={somatotype.ectomorphy}
                        />

                        {/* Interpretación Detallada de Componentes */}
                        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Info className="w-4 h-4" /> Interpretación por Componente
                            </h4>

                            {/* Endomorfia */}
                            <div className="p-3 bg-rose-50/50 dark:bg-rose-900/10 rounded-lg border border-rose-100 dark:border-rose-900/30">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-rose-600 dark:text-rose-400 text-sm">Endomorfia: {somatotype.endomorphy}</span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                                        {getEndomorphyInterpretation(somatotype.endomorphy).level}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {getEndomorphyInterpretation(somatotype.endomorphy).description}
                                </p>
                            </div>

                            {/* Mesomorfia */}
                            <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-blue-600 dark:text-blue-400 text-sm">Mesomorfia: {somatotype.mesomorphy}</span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                        {getMesomorphyInterpretation(somatotype.mesomorphy).level}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {getMesomorphyInterpretation(somatotype.mesomorphy).description}
                                </p>
                            </div>

                            {/* Ectomorfia */}
                            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">Ectomorfia: {somatotype.ectomorphy}</span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                        {getEctomorphyInterpretation(somatotype.ectomorphy).level}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {getEctomorphyInterpretation(somatotype.ectomorphy).description}
                                </p>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Estado vacío */
                    <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                            <Info className="w-8 h-8 text-slate-400" />
                        </div>
                        <h4 className="font-semibold text-slate-600 dark:text-slate-300 mb-2">
                            Datos insuficientes
                        </h4>
                        <p className="text-sm text-slate-400 max-w-sm mx-auto">
                            Para calcular el somatotipo necesitas ingresar:
                        </p>
                        <ul className="mt-3 space-y-1 text-xs text-slate-500">
                            {somatotype.missingData.skinfolds && (
                                <li className="flex items-center justify-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                    Pliegues cutáneos (Tríceps, Subescapular, Supraespinal)
                                </li>
                            )}
                            {somatotype.missingData.girths && (
                                <li className="flex items-center justify-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                    Perímetros (Brazo flexionado, Pantorrilla)
                                </li>
                            )}
                            {somatotype.missingData.breadths && (
                                <li className="flex items-center justify-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                    Diámetros óseos (Húmero, Fémur)
                                </li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
