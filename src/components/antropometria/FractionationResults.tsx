"use client";

import { useMemo } from "react";
import { MedidasAntropometricas, getAnthroNumber } from "@/types";
import {
    FiveComponentInput,
    calculateFiveComponentFractionation,
    COMPONENT_COLORS,
    COMPONENT_LABELS
} from "@/lib/fiveComponentMath";
import { Scale, AlertCircle, Info } from "lucide-react";

interface FractionationResultsProps {
    data: MedidasAntropometricas;
}

// Adapter: MedidasAntropometricas -> FiveComponentInput
function convertToFiveComponentInput(data: MedidasAntropometricas): FiveComponentInput {
    // Safely access properties with non-null assertions if we are sure, or defaults.
    // The component handles "missing data" logically later if values are 0/undefined.

    return {
        weight: data.peso || 0,
        height: data.talla || 0,
        age: data.edad || 0,
        gender: data.sexo === 'masculino' ? 'male' : 'female',

        triceps: getAnthroNumber(data.pliegues?.triceps),
        subscapular: getAnthroNumber(data.pliegues?.subscapular),
        biceps: getAnthroNumber(data.pliegues?.biceps),
        suprailiac: getAnthroNumber(data.pliegues?.supraspinale),
        abdominal: getAnthroNumber(data.pliegues?.abdominal),
        thigh: getAnthroNumber(data.pliegues?.thigh),
        calf: getAnthroNumber(data.pliegues?.calf),

        armRelaxedGirth: getAnthroNumber(data.perimetros?.brazoRelajado) || getAnthroNumber(data.perimetros?.brazoRelax),
        armFlexedGirth: getAnthroNumber(data.perimetros?.brazoFlex),
        waistGirth: getAnthroNumber(data.perimetros?.cintura),
        thighGirth: getAnthroNumber(data.perimetros?.musloMedio) || (getAnthroNumber(data.perimetros?.brazoFlex) * 2),
        calfGirth: getAnthroNumber(data.perimetros?.pantorrilla),

        humerusBreadth: getAnthroNumber(data.diametros?.humero),
        femurBreadth: getAnthroNumber(data.diametros?.femur)
    };
}

// Mini Donut Chart SVG
function MiniDonutChart({ percent, colorClass }: { percent: number; colorClass: string }) {
    const r = 16;
    const c = 2 * Math.PI * r;
    const offset = c - (percent / 100) * c;

    // Extract Tailwind color to hex if possible, or use current color. 
    // Ideally we pass a hex, but for now we rely on text-color classes.
    // Simpler: Use current color stroke.

    return (
        <svg width="40" height="40" viewBox="0 0 40 40" className="transform -rotate-90">
            {/* Background Circle */}
            <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-100 dark:text-slate-800" />

            {/* Value Circle */}
            <circle
                cx="20" cy="20" r={r}
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray={c}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className={`${colorClass} transition-all duration-1000 ease-out`}
            />
        </svg>
    );
}

// Slim Stacked Bar
function SummaryStackedBar({ result }: { result: ReturnType<typeof calculateFiveComponentFractionation> }) {
    const components = [
        { key: 'adipose' as const, ...result.adipose },
        { key: 'muscle' as const, ...result.muscle },
        { key: 'bone' as const, ...result.bone },
        { key: 'skin' as const, ...result.skin },
        { key: 'residual' as const, ...result.residual }
    ];

    return (
        <div className="w-full">
            <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Distribución Corporal Total</span>
                <span className="text-[10px] text-slate-400">100% = {result.skin.kg + result.adipose.kg + result.muscle.kg + result.bone.kg + result.residual.kg} kg</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
                {components.map((comp) => (
                    <div
                        key={comp.key}
                        className={`${COMPONENT_COLORS[comp.key].bg}`}
                        style={{ width: `${comp.percent}%` }}
                    />
                ))}
            </div>
        </div>
    );
}

// Modern Card
function MassComponentCard({ componentKey, kg, percent }: { componentKey: 'adipose' | 'muscle' | 'bone' | 'skin' | 'residual'; kg: number; percent: number }) {
    const colors = COMPONENT_COLORS[componentKey];
    const labels = COMPONENT_LABELS[componentKey];

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
            {/* Decorative Side Strip */}
            <div className={`absolute top-0 left-0 w-1.5 h-full ${colors.bg}`} />

            {/* Content */}
            <div className="flex justify-between items-start pl-3">
                <div>
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg opacity-80 group-hover:scale-110 transition-transform">{labels.icon}</span>
                        <h4 className="font-semibold text-slate-700 dark:text-slate-200">{labels.name}</h4>
                    </div>
                    <p className="text-[10px] text-slate-400 max-w-[140px] leading-tight mb-4">{labels.description}</p>

                    {/* Hero Value */}
                    <div className="flex items-baseline gap-1">
                        <span className={`text-4xl font-black ${colors.text} tracking-tight`}>{kg}</span>
                        <span className="text-sm font-medium text-slate-400">kg</span>
                    </div>
                </div>

                {/* Right Side: Donut & Percent */}
                <div className="flex flex-col items-end gap-2">
                    <MiniDonutChart percent={percent} colorClass={colors.text} />
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${colors.light} ${colors.text}`}>
                        {percent}%
                    </span>
                </div>
            </div>
        </div>
    );
}

export function FractionationResults({ data }: FractionationResultsProps) {
    const input = useMemo(() => convertToFiveComponentInput(data), [data]);
    const result = useMemo(() => calculateFiveComponentFractionation(input), [input]);

    if (!result.isValid) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-100 dark:border-slate-800 text-center">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">Datos insuficientes para Fraccionamiento</h3>
                <p className="text-sm text-slate-400 mt-1">Se requieren mediciones completas (Pliegues, Perímetros, Diámetros) para el modelo de 5 componentes.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {result.missingData.map((m, i) => (
                        <span key={i} className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-500">{m}</span>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Scale className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Fraccionamiento de Masas</h2>
                        <p className="text-xs text-slate-500">Modelo Kerr (1988) - 5 Componentes</p>
                    </div>
                </div>

                {/* Slim Summary Bar */}
                <SummaryStackedBar result={result} />
            </div>

            {/* The Modern Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <MassComponentCard componentKey="adipose" kg={result.adipose.kg} percent={result.adipose.percent} />
                <MassComponentCard componentKey="muscle" kg={result.muscle.kg} percent={result.muscle.percent} />
                <MassComponentCard componentKey="bone" kg={result.bone.kg} percent={result.bone.percent} />
                <MassComponentCard componentKey="skin" kg={result.skin.kg} percent={result.skin.percent} />
                <MassComponentCard componentKey="residual" kg={result.residual.kg} percent={result.residual.percent} />

                {/* Extra Stats Card (Density/Fat Summary) */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 flex flex-col justify-center gap-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Densidad</p>
                            <p className="text-2xl font-black text-slate-700 dark:text-slate-300">{result.bodyDensity}</p>
                            <p className="text-[10px] text-slate-400">g/cm³</p>
                        </div>
                        <Info className="w-5 h-5 text-slate-300" />
                    </div>
                    <div className="h-px bg-slate-200 dark:bg-slate-700 w-full" />
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">% Grasa (Siri)</p>
                            <p className="text-2xl font-black text-slate-700 dark:text-slate-300">{result.lipidFatPercent}%</p>
                            <p className="text-[10px] text-slate-400">Estimado</p>
                        </div>
                        <Scale className="w-5 h-5 text-slate-300" />
                    </div>
                </div>
            </div>
        </div>
    );
}
