"use client";

import { useMemo } from "react";
import { FullMeasurementData } from "./UnifiedMeasurementForm";
import { checkDangerousBMI, checkPathologyObesityRisk } from "@/lib/safety-alerts";
import { Scale, Heart, AlertTriangle, TrendingUp, Info, CheckCircle2 } from "lucide-react";

interface SaludPanelProps {
    data: FullMeasurementData;
}

export function SaludPanel({ data }: SaludPanelProps) {
    const { bioData } = data;
    const hasBasicData = bioData.peso > 0 && bioData.talla > 0;

    const imc = useMemo(() => {
        if (!hasBasicData) return 0;
        return bioData.peso / Math.pow(bioData.talla / 100, 2);
    }, [bioData.peso, bioData.talla, hasBasicData]);

    const bmiCheck = useMemo(() => checkDangerousBMI(bioData.peso, bioData.talla), [bioData.peso, bioData.talla]);

    // Ideal weight range based on BMI 18.5 - 24.9
    const idealWeight = useMemo(() => {
        const heightM = bioData.talla / 100;
        return {
            min: Math.round((18.5 * heightM * heightM) * 10) / 10,
            max: Math.round((24.9 * heightM * heightM) * 10) / 10
        };
    }, [bioData.talla]);

    const getBMIColor = (val: number) => {
        if (val < 18.5) return "text-amber-500";
        if (val < 25) return "text-[#6cba00]";
        if (val < 30) return "text-amber-500";
        return "text-red-500";
    };

    const getBMICategory = (val: number) => {
        if (val < 18.5) return "Bajo Peso";
        if (val < 25) return "Peso Saludable";
        if (val < 30) return "Sobrepeso";
        if (val < 35) return "Obesidad Clase I";
        if (val < 40) return "Obesidad Clase II";
        return "Obesidad Mórbida";
    };

    if (!hasBasicData) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-400 bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
                <Scale className="w-16 h-16 mb-4 opacity-20" />
                <h3 className="text-xl font-bold text-slate-600 dark:text-slate-300">Esperando Mediciones</h3>
                <p className="max-w-xs mt-2 text-sm">
                    Ingresa el peso corporal y la talla en el formulario para generar el análisis de salud.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Main Score Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* BMI Main Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/80 border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                        <Scale className="w-32 h-32" />
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-2xl bg-[#ff8508]/10 flex items-center justify-center">
                            <Scale className="w-5 h-5 text-[#ff8508]" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white">Análisis de IMC</h4>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Standard OMS</p>
                        </div>
                    </div>

                    <div className="flex items-baseline gap-2">
                        <span className={`text-6xl font-black ${getBMIColor(imc)} transition-colors`}>
                            {imc.toFixed(1)}
                        </span>
                        <span className="text-slate-400 font-bold text-lg">kg/m²</span>
                    </div>

                    <div className="mt-4 flex flex-col gap-1">
                        <span className={`text-xl font-bold ${getBMIColor(imc)}`}>
                            {getBMICategory(imc)}
                        </span>
                        <p className="text-xs text-slate-500 max-w-[200px]">
                            {imc < 25 ? "Tu peso actual se encuentra dentro del rango saludable." : "Se recomienda un plan de ajuste calórico."}
                        </p>
                    </div>

                    {/* Progress Bar Gauge */}
                    <div className="mt-8">
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden">
                            <div className="h-full bg-amber-400" style={{ width: '18%' }}></div>
                            <div className="h-full bg-[#6cba00]" style={{ width: '25%' }}></div>
                            <div className="h-full bg-amber-400" style={{ width: '15%' }}></div>
                            <div className="h-full bg-red-400" style={{ width: '42%' }}></div>
                        </div>
                        <div className="relative w-full h-4 mt-1">
                            {/* Marker */}
                            <div
                                className="absolute top-0 w-3 h-3 bg-slate-900 dark:bg-white rounded-full border-2 border-white dark:border-slate-900 -mt-1.5 transition-all duration-1000 ease-out"
                                style={{ left: `${Math.min(100, Math.max(0, (imc / 45) * 100))}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase mt-1">
                            <span>Bajo</span>
                            <span>Saludable</span>
                            <span>Sobrepeso</span>
                            <span>Obesidad</span>
                        </div>
                    </div>
                </div>

                {/* Range Card */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/80 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white">Rango de Peso Ideal</h4>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Según Talla: {bioData.talla}cm</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-4 text-sm font-bold text-slate-400">
                            <span>Mínimo</span>
                            <span>Máximo</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <div className="text-3xl font-black text-slate-700 dark:text-slate-200">
                                {idealWeight.min}<span className="text-sm font-medium ml-1">kg</span>
                            </div>
                            <div className="w-8 h-[2px] bg-slate-200 dark:bg-slate-700 mx-4"></div>
                            <div className="text-3xl font-black text-slate-700 dark:text-slate-200">
                                {idealWeight.max}<span className="text-sm font-medium ml-1">kg</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg">
                        <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <p className="text-[10px] text-blue-700 dark:text-blue-300">
                            Este rango corresponde a un IMC de 18.5 a 24.9 kg/m².
                        </p>
                    </div>
                </div>
            </div>

            {/* Alerts & Risks Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* clinical Alerts */}
                <div className="md:col-span-2">
                    {bmiCheck.isCritical ? (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-3xl p-6 flex gap-4 animate-pulse">
                            <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
                            <div>
                                <h5 className="font-bold text-red-700 dark:text-red-400 text-lg">{bmiCheck.alert?.title}</h5>
                                <p className="text-sm text-red-600 dark:text-red-300 mt-1">{bmiCheck.alert?.message}</p>
                                <div className="mt-4 flex gap-4">
                                    <div className="bg-red-100 dark:bg-red-800 px-3 py-1.5 rounded-xl text-xs font-bold text-red-700 dark:text-red-200 uppercase tracking-wider">Prioridad Médica</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-[#6cba00]/5 dark:bg-[#6cba00]/10 border border-[#6cba00]/20 dark:border-[#6cba00]/40 rounded-3xl p-6 flex gap-4">
                            <CheckCircle2 className="w-8 h-8 text-[#6cba00] shrink-0" />
                            <div>
                                <h5 className="font-bold text-slate-900 dark:text-white text-lg">Sin Riesgos Críticos Detectados</h5>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Los valores de IMC no indican desnutrición severa ni obesidad de alto riesgo clínico inmediato.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Cardiometabolic Risk */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/80 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                            <Heart className="w-4 h-4 text-orange-500" />
                        </div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Factores Ri. Cardiometabólicos</h4>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 italic">Hipertensión / Diabetes</span>
                            <span className={`px-2 py-0.5 rounded-full font-bold ${imc >= 30 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                {imc >= 30 ? 'Riesgo Aumentado' : 'Riesgo Bajo'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 italic">Relación Cintura/Talla</span>
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">Requiere Perímetros</span>
                        </div>
                    </div>
                </div>

                {/* Clinical Recommendations */}
                <div className="bg-gradient-to-br from-[#1a1c1e] to-[#2d3436] p-6 rounded-3xl shadow-xl text-white border border-white/5">
                    <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-400" />
                        Recomendaciones Clínicas
                    </h4>
                    <ul className="space-y-3">
                        <li className="flex gap-2 text-xs text-slate-300">
                            <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0"></div>
                            {imc >= 25 ? "Priorizar reducción de tejido adiposo mediante déficit calórico controlado." : "Mantener ingesta calórica normoproteica para preservar masa magra."}
                        </li>
                        <li className="flex gap-2 text-xs text-slate-300">
                            <div className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0"></div>
                            Realizar evaluación ISAK nivel 2 (Fraccionamiento) para distinguir entre masa ósea, muscular y residual.
                        </li>
                    </ul>
                </div>

            </div>
        </div>
    );
}
