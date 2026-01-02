"use client";

import { useMemo } from "react";
import { FullMeasurementData } from "./UnifiedMeasurementForm";
import { FormulaSelector } from "./FormulaSelector";
import { SkinfoldData, Gender } from "@/lib/bodyCompositionMath";
import { Activity, Target, Zap, Info } from "lucide-react";

interface ResultsPanelProps {
    data: FullMeasurementData;
    onResultChange?: (result: any) => void;
}

// Convertir datos del formulario a formato del motor de cálculo
function convertToSkinfoldData(data: FullMeasurementData): SkinfoldData {
    return {
        triceps: data.skinfolds.triceps || 0,
        biceps: data.skinfolds.biceps || 0,
        subscapular: data.skinfolds.subscapular || 0,
        iliac_crest: data.skinfolds.iliac_crest || 0,
        supraspinale: data.skinfolds.supraspinale || 0,
        abdominal: data.skinfolds.abdominal || 0,
        thigh: data.skinfolds.thigh || 0,
        calf: data.skinfolds.calf || 0
    };
}

// Calcular somatotipo Heath-Carter
function calculateSomatotype(data: FullMeasurementData) {
    const { bioData, skinfolds, girths, breadths } = data;
    const hasBasicData = bioData.peso > 0 && bioData.talla > 0;
    const sumSkinfolds = Object.values(skinfolds).reduce((a, b) => a + b, 0);

    let endomorphy = 0, mesomorphy = 0, ectomorphy = 0;

    if (hasBasicData && sumSkinfolds > 0) {
        // ENDOMORFIA
        const sumTSS = skinfolds.triceps + skinfolds.subscapular + skinfolds.supraspinale;
        const correctedSum = sumTSS * (170.18 / bioData.talla);
        endomorphy = -0.7182 + 0.1451 * correctedSum - 0.00068 * Math.pow(correctedSum, 2) + 0.0000014 * Math.pow(correctedSum, 3);
        endomorphy = Math.max(0.5, endomorphy);

        // MESOMORFIA
        if (girths.brazoFlexionado > 0 && girths.pantorrilla > 0 && breadths.humero > 0 && breadths.femur > 0) {
            const brazoCorr = girths.brazoFlexionado - (skinfolds.triceps / 10);
            const pantorrillaCorr = girths.pantorrilla - (skinfolds.calf / 10);
            mesomorphy = 0.858 * breadths.humero + 0.601 * breadths.femur + 0.188 * brazoCorr + 0.161 * pantorrillaCorr - 0.131 * bioData.talla + 4.5;
            mesomorphy = Math.max(0.5, mesomorphy);
        }

        // ECTOMORFIA
        const HWR = bioData.talla / Math.pow(bioData.peso, 1 / 3);
        if (HWR >= 40.75) {
            ectomorphy = 0.732 * HWR - 28.58;
        } else if (HWR >= 38.25) {
            ectomorphy = 0.463 * HWR - 17.63;
        } else {
            ectomorphy = 0.1;
        }
        ectomorphy = Math.max(0.5, ectomorphy);
    }

    const somatoX = ectomorphy - endomorphy;
    const somatoY = 2 * mesomorphy - (endomorphy + ectomorphy);

    return {
        endomorphy: Math.round(endomorphy * 10) / 10,
        mesomorphy: Math.round(mesomorphy * 10) / 10,
        ectomorphy: Math.round(ectomorphy * 10) / 10,
        somatoX: Math.round(somatoX * 10) / 10,
        somatoY: Math.round(somatoY * 10) / 10,
        hasSomatotype: endomorphy > 0 && mesomorphy > 0 && ectomorphy > 0
    };
}

// Mini Somatocarta
function MiniSomatocarta({ x, y }: { x: number; y: number }) {
    const px = ((x + 12) / 24) * 100;
    const py = 100 - ((y + 12) / 24) * 100;

    return (
        <div className="relative w-full aspect-square max-w-[100px] mx-auto">
            <svg viewBox="0 0 100 100" className="w-full h-full">
                <line x1="50" y1="5" x2="50" y2="95" stroke="currentColor" strokeWidth="0.5" className="text-slate-200 dark:text-slate-700" />
                <line x1="5" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="0.5" className="text-slate-200 dark:text-slate-700" />
                <polygon points="50,10 10,90 90,90" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-300 dark:text-slate-600" />
                <circle cx={Math.max(10, Math.min(90, px))} cy={Math.max(10, Math.min(90, py))} r="5" fill="#ff8508" stroke="white" strokeWidth="2" />
            </svg>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[8px] text-slate-400">Meso</div>
            <div className="absolute bottom-0 left-0 text-[8px] text-slate-400">Endo</div>
            <div className="absolute bottom-0 right-0 text-[8px] text-slate-400">Ecto</div>
        </div>
    );
}

export function ResultsPanel({ data, onResultChange }: ResultsPanelProps) {
    const hasBasicData = data.bioData.peso > 0 && data.bioData.talla > 0;
    const imc = hasBasicData ? data.bioData.peso / Math.pow(data.bioData.talla / 100, 2) : 0;

    const skinfoldData = useMemo(() => convertToSkinfoldData(data), [data]);
    const gender: Gender = data.bioData.genero === 'masculino' ? 'male' : 'female';
    const somatotype = useMemo(() => calculateSomatotype(data), [data]);

    return (
        <div className="space-y-4 h-full">
            {/* Header Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-[#6cba00]/10 to-transparent border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-[#6cba00]" />
                            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Resultados</h3>
                        </div>
                        {hasBasicData && (
                            <span className="text-[10px] bg-[#6cba00] text-white font-bold px-2 py-0.5 rounded-full">
                                En Vivo
                            </span>
                        )}
                    </div>
                </div>

                {/* IMC y Clasificación Rápida */}
                {hasBasicData && (
                    <div className="p-4">
                        <div className="p-3 bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">IMC</span>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${imc < 18.5 ? 'bg-amber-100 text-amber-700' :
                                        imc < 25 ? 'bg-emerald-100 text-emerald-700' :
                                            imc < 30 ? 'bg-amber-100 text-amber-700' :
                                                'bg-red-100 text-red-700'
                                    }`}>
                                    {imc < 18.5 ? 'Bajo' : imc < 25 ? 'Normal' : imc < 30 ? 'Sobre' : 'Obeso'}
                                </span>
                            </div>
                            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                {imc.toFixed(1)}
                            </div>
                        </div>
                    </div>
                )}

                {!hasBasicData && (
                    <div className="p-6 text-center">
                        <Zap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">Ingresa peso y talla</p>
                    </div>
                )}
            </div>

            {/* Formula Selector con resultados */}
            {hasBasicData && (
                <FormulaSelector
                    skinfolds={skinfoldData}
                    gender={gender}
                    weightKg={data.bioData.peso}
                    onResultChange={onResultChange}
                />
            )}

            {/* Somatotipo */}
            {somatotype.hasSomatotype && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-3">
                        <Target className="w-3 h-3" />
                        Somatotipo Heath-Carter
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg text-center">
                            <div className="text-lg font-black text-rose-500">{somatotype.endomorphy}</div>
                            <div className="text-[9px] text-rose-600 dark:text-rose-400">Endo</div>
                        </div>
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                            <div className="text-lg font-black text-blue-500">{somatotype.mesomorphy}</div>
                            <div className="text-[9px] text-blue-600 dark:text-blue-400">Meso</div>
                        </div>
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-center">
                            <div className="text-lg font-black text-emerald-500">{somatotype.ectomorphy}</div>
                            <div className="text-[9px] text-emerald-600 dark:text-emerald-400">Ecto</div>
                        </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <MiniSomatocarta x={somatotype.somatoX} y={somatotype.somatoY} />
                        <div className="flex justify-center gap-4 mt-2 text-[10px] text-slate-400">
                            <span>X: {somatotype.somatoX}</span>
                            <span>Y: {somatotype.somatoY}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
