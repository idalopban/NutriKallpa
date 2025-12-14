"use client";

import { useEffect } from "react";
import { useAnthropometryStore } from "@/store/useAnthropometryStore";
import { Body3DViewer } from "@/components/antropometria/Body3DViewer";
import { SkinfoldMeasurement } from "@/lib/skinfold-map";
import { Activity, TrendingUp, Target, Loader2, PieChart } from "lucide-react";

export function ResultsDashboard() {
    const { bioData, skinfolds, results, isCalculating, calculateResults } = useAnthropometryStore();

    // Auto-calcular al montar
    useEffect(() => {
        calculateResults();
    }, [calculateResults]);

    // Convertir skinfolds a formato de measurements para el 3D
    const measurements: SkinfoldMeasurement[] = Object.entries(skinfolds)
        .filter(([_, value]) => value > 0)
        .map(([key, value]) => ({
            id: key,
            siteKey: key as any,
            value,
            date: new Date().toISOString()
        }));

    if (isCalculating) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
                <Loader2 className="w-12 h-12 text-[#ff8508] animate-spin mb-4" />
                <p className="text-slate-500">Calculando resultados...</p>
            </div>
        );
    }

    if (!results) {
        return (
            <div className="text-center py-20">
                <p className="text-slate-500">No se pudieron calcular los resultados</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6cba00] to-[#5aa000] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#6cba00]/30">
                    <Activity className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Resultados del Análisis</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    {bioData.genero === 'masculino' ? '♂' : '♀'} {bioData.peso}kg • {bioData.talla}cm • {bioData.edad} años
                </p>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* 3D Viewer */}
                <div className="lg:row-span-2">
                    <Body3DViewer
                        measurements={measurements}
                        hoveredId={null}
                    />
                </div>

                {/* Composición Corporal */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-[#6cba00]/10 flex items-center justify-center">
                            <PieChart className="w-5 h-5 text-[#6cba00]" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Composición Corporal</h3>
                    </div>

                    <div className="space-y-4">
                        {/* Grasa */}
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-900/10 rounded-xl">
                            <div>
                                <div className="text-sm text-amber-700 dark:text-amber-300 font-medium">% Grasa Corporal</div>
                                <div className="text-xs text-amber-500">Σ Pliegues: {results.sumSkinfolds}mm</div>
                            </div>
                            <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
                                {results.bodyFatPercent}%
                            </div>
                        </div>

                        {/* Masa Grasa */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                            <span className="text-sm text-slate-600 dark:text-slate-300">Masa Grasa</span>
                            <span className="text-xl font-bold text-slate-800 dark:text-white">{results.fatMassKg} kg</span>
                        </div>

                        {/* Masa Magra */}
                        <div className="flex items-center justify-between p-4 bg-[#6cba00]/10 rounded-xl">
                            <span className="text-sm text-[#6cba00] font-medium">Masa Libre de Grasa</span>
                            <span className="text-xl font-bold text-[#6cba00]">{results.leanMassKg} kg</span>
                        </div>
                    </div>
                </div>

                {/* Somatotipo */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-[#ff8508]/10 flex items-center justify-center">
                            <Target className="w-5 h-5 text-[#ff8508]" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Somatotipo Heath-Carter</h3>
                    </div>

                    {/* Componentes */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {/* Endomorfia */}
                        <div className="text-center p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
                            <div className="text-3xl font-black text-rose-500">{results.endomorphy}</div>
                            <div className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-1">Endomorfia</div>
                            <div className="text-[10px] text-rose-400">Adiposidad</div>
                        </div>

                        {/* Mesomorfia */}
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                            <div className="text-3xl font-black text-blue-500">{results.mesomorphy}</div>
                            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">Mesomorfia</div>
                            <div className="text-[10px] text-blue-400">Muscularidad</div>
                        </div>

                        {/* Ectomorfia */}
                        <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                            <div className="text-3xl font-black text-emerald-500">{results.ectomorphy}</div>
                            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">Ectomorfia</div>
                            <div className="text-[10px] text-emerald-400">Linealidad</div>
                        </div>
                    </div>

                    {/* Coordenadas Somatocarta */}
                    <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-700/50 rounded-xl">
                        <div className="text-sm text-slate-600 dark:text-slate-300 mb-2">Coordenadas Somatocarta</div>
                        <div className="flex items-center justify-center gap-8">
                            <div className="text-center">
                                <span className="text-xs text-slate-400">X</span>
                                <div className="text-2xl font-bold text-slate-800 dark:text-white">{results.somatoX}</div>
                            </div>
                            <div className="w-px h-10 bg-slate-300 dark:bg-slate-600"></div>
                            <div className="text-center">
                                <span className="text-xs text-slate-400">Y</span>
                                <div className="text-2xl font-bold text-slate-800 dark:text-white">{results.somatoY}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
