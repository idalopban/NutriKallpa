"use client";

import { useMemo, useState } from "react";
import { FullMeasurementData } from "./UnifiedMeasurementForm";
import {
    FiveComponentInput,
    calculateFiveComponentFractionation,
} from "@/lib/fiveComponentMath";
import { Scale, AlertCircle, Info, ArrowUpRight, TrendingUp, User, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface FiveComponentPanelProps {
    data: FullMeasurementData;
}

// Map for Premium Gradients
const COMPONENT_DESIGN: Record<string, { gradient: string; shadow: string; icon: string; label: string }> = {
    adipose: {
        gradient: "from-orange-400 via-orange-500 to-orange-600",
        shadow: "shadow-orange-200 dark:shadow-orange-900/20",
        icon: "🔥",
        label: "Adiposa"
    },
    muscle: {
        gradient: "from-blue-500 via-blue-600 to-blue-700",
        shadow: "shadow-blue-200 dark:shadow-blue-900/20",
        icon: "💪",
        label: "Muscular"
    },
    bone: {
        gradient: "from-amber-400 via-amber-500 to-amber-600",
        shadow: "shadow-amber-200 dark:shadow-amber-900/20",
        icon: "🦴",
        label: "Ósea"
    },
    skin: {
        gradient: "from-emerald-400 via-emerald-500 to-emerald-600",
        shadow: "shadow-emerald-200 dark:shadow-emerald-900/20",
        icon: "✨",
        label: "Piel"
    },
    residual: {
        gradient: "from-cyan-400 via-cyan-500 to-cyan-600",
        shadow: "shadow-cyan-200 dark:shadow-cyan-900/20",
        icon: "🫁",
        label: "Residual"
    }
};

// Donut Chart Component for 5 Components - Interactive
// Donut Chart Component for 5 Components - Interactive
function BodyCompositionDonut({ result }: { result: any }) {
    const [activeComp, setActiveComp] = useState<any>(null);
    const radius = 82;
    const circumference = 2 * Math.PI * radius;

    // Components to display in order
    const components = [
        { key: 'muscle', value: result.muscle.percent, color: '#3b82f6', label: 'Muscular', kg: result.muscle.kg },
        { key: 'adipose', value: result.adipose.percent, color: '#f97316', label: 'Adiposa', kg: result.adipose.kg },
        { key: 'bone', value: result.bone.percent, color: '#f59e0b', label: 'Ósea', kg: result.bone.kg },
        { key: 'residual', value: result.residual.percent, color: '#06b6d4', label: 'Residual', kg: result.residual.kg },
        { key: 'skin', value: result.skin.percent, color: '#10b981', label: 'Piel', kg: result.skin.kg },
    ];

    let currentOffset = 0;

    return (
        <div className="flex flex-col items-center py-4 w-full animate-in fade-in duration-700">
            {/* Area del Grafico */}
            <div className="relative flex-shrink-0 group">
                <svg
                    viewBox="0 0 200 200"
                    className="w-64 h-64 transform -rotate-90 drop-shadow-2xl transition-all duration-500"
                >
                    {/* Background base */}
                    <circle
                        cx="100"
                        cy="100"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="transparent"
                        className="text-slate-50 dark:text-slate-800/50"
                    />

                    {components.map((comp) => {
                        const strokeDasharray = (comp.value / 100) * circumference;
                        const strokeDashoffset = -currentOffset;
                        currentOffset += strokeDasharray;
                        const isActive = activeComp?.key === comp.key;

                        return (
                            <circle
                                key={comp.key}
                                cx="100"
                                cy="100"
                                r={radius}
                                stroke={comp.color}
                                strokeWidth={isActive ? "20" : "14"}
                                strokeDasharray={`${strokeDasharray} ${circumference}`}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="butt"
                                fill="transparent"
                                onMouseEnter={() => setActiveComp(comp)}
                                onMouseLeave={() => setActiveComp(null)}
                                onClick={() => setActiveComp(comp)}
                                className={cn(
                                    "transition-all duration-300 ease-out cursor-pointer",
                                    isActive ? "opacity-100" : "opacity-90 hover:opacity-100"
                                )}
                            />
                        );
                    })}
                </svg>

                {/* Texto Central Dinamico - Ajustado para estar contenido */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
                    <div className="animate-in fade-in zoom-in duration-300 flex flex-col items-center max-w-[130px]">
                        <div className={cn(
                            "text-4xl font-black transition-colors duration-300 leading-none",
                            activeComp ? "" : "text-slate-800 dark:text-white"
                        )} style={{ color: activeComp?.color }}>
                            {activeComp ? activeComp.value : result.lipidFatPercent}<span className="text-xl font-bold ml-0.5">%</span>
                        </div>

                        <div className={cn(
                            "text-[8px] uppercase font-black mt-2 tracking-widest px-2.5 py-1 rounded-full border transition-all duration-300",
                            activeComp
                                ? "bg-white dark:bg-slate-900 shadow-sm"
                                : "bg-slate-50/50 dark:bg-slate-800/80 border-slate-100/50 dark:border-slate-700/50 text-slate-400"
                        )} style={{
                            borderColor: activeComp ? `${activeComp.color}44` : undefined,
                            color: activeComp ? activeComp.color : undefined
                        }}>
                            {activeComp ? activeComp.label : "Grasa Total"}
                        </div>

                        <div className="h-10 flex items-center justify-center mt-1">
                            {activeComp ? (
                                <div className="animate-in slide-in-from-top-1 duration-300">
                                    <span className="text-lg font-black text-slate-700 dark:text-slate-200">{activeComp.kg}</span>
                                    <span className="text-[10px] font-bold text-slate-400 ml-1 uppercase">kg</span>
                                </div>
                            ) : (
                                <div className="text-[7.5px] font-bold text-slate-300 uppercase tracking-tighter italic leading-tight">
                                    Toca un color para detalles
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Ayuda visual minimalista (Botones de color) */}
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {components.map((comp) => (
                    <button
                        key={comp.key}
                        onMouseEnter={() => setActiveComp(comp)}
                        onMouseLeave={() => setActiveComp(null)}
                        onClick={() => setActiveComp(comp)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300",
                            activeComp?.key === comp.key
                                ? "bg-white dark:bg-slate-800 shadow-md scale-105"
                                : "bg-transparent border-transparent grayscale opacity-50 hover:grayscale-0 hover:opacity-100"
                        )}
                        style={{ borderColor: activeComp?.key === comp.key ? comp.color : 'transparent' }}
                    >
                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: comp.color }} />
                        <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{comp.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

// Convertir datos del formulario al formato de 5 componentes
function convertToFiveComponentInput(data: FullMeasurementData): FiveComponentInput {
    return {
        // Datos básicos
        weight: data.bioData.peso,
        height: data.bioData.talla,
        age: data.bioData.edad,
        gender: data.bioData.genero === 'masculino' ? 'male' : 'female',
        sittingHeight: data.bioData.sittingHeight,

        // Pliegues cutáneos (7 pliegues)
        triceps: data.skinfolds.triceps,
        subscapular: data.skinfolds.subscapular,
        biceps: data.skinfolds.biceps,
        suprailiac: data.skinfolds.iliac_crest,  // Supraespinal / Cresta Ilíaca
        abdominal: data.skinfolds.abdominal,
        thigh: data.skinfolds.thigh,             // Muslo frontal
        calf: data.skinfolds.calf,               // Pantorrilla medial

        // Perímetros (cm) - Ahora usando el campo real musloMedio
        armRelaxedGirth: data.girths.brazoRelajado,
        armFlexedGirth: data.girths.brazoFlexionado,
        waistGirth: data.girths.cintura,
        thighGirth: data.girths.musloMedio,      // ✅ Campo real en lugar de aproximación
        calfGirth: data.girths.pantorrilla,

        // Diámetros óseos (cm)
        humerusBreadth: data.breadths.humero,         // Húmero (bi-epicondilar)
        femurBreadth: data.breadths.femur,            // Fémur (bi-epicondilar)
        biacromialBreadth: data.breadths.biacromial,  // Biacromial (hombros)
        biiliocristalBreadth: data.breadths.biiliocristal,  // Biiliocristal (caderas)
        wristBreadth: data.breadths.biestiloideo       // Muñeca (biestiloideo)
    };
}

// Mass Card Component - Premium Redesign
function PremiumMassCard({
    componentKey,
    kg,
    percent
}: {
    componentKey: 'adipose' | 'muscle' | 'bone' | 'skin' | 'residual';
    kg: number;
    percent: number;
}) {
    const design = COMPONENT_DESIGN[componentKey];

    return (
        <div className={cn(
            "relative overflow-hidden p-4 rounded-3xl bg-gradient-to-br transition-all hover:scale-[1.02] active:scale-[0.98]",
            design.gradient,
            design.shadow
        )}>
            {/* Background design element */}
            <div className="absolute -right-4 -bottom-4 opacity-10">
                <span className="text-7xl grayscale invert select-none">{design.icon}</span>
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
                        {design.icon}
                    </div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">{design.label}</span>
                </div>

                <div className="flex items-baseline justify-between">
                    <div>
                        <div className="text-2xl font-black text-white leading-none">{kg} <span className="text-xs font-medium opacity-80">kg</span></div>
                    </div>
                    <div className="text-sm font-bold text-white/90">
                        {percent}%
                    </div>
                </div>
            </div>
        </div>
    );
}

export function FiveComponentPanel({ data }: FiveComponentPanelProps) {
    const input = useMemo(() => convertToFiveComponentInput(data), [data]);
    const result = useMemo(() => calculateFiveComponentFractionation(input), [input]);

    return (
        <div className="space-y-6">
            {result.isValid ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* Main Featured Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col lg:flex-row items-center gap-10">
                            {/* Left Side: Balance Info */}
                            <div className="flex-1 space-y-6 w-full">
                                <div>
                                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mb-2">Composición Corporal</h3>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-black text-slate-800 dark:text-white">{result.lipidFatPercent}</span>
                                        <span className="text-2xl font-bold text-slate-400">% Grasa</span>
                                    </div>
                                    <div className="text-sm text-slate-400 font-medium mt-1">Peso Total: {input.weight} kg</div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <div className="flex flex-col items-start gap-2 p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-all hover:bg-white dark:hover:bg-slate-900 shadow-sm hover:shadow-md group">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 transition-transform group-hover:scale-110">
                                            <TrendingUp className="w-4 h-4" />
                                        </div>
                                        <div className="w-full">
                                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">Densidad</div>
                                            <div className="text-base font-black text-slate-700 dark:text-slate-200 tabular-nums leading-none">{result.bodyDensity}</div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-start gap-2 p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-all hover:bg-white dark:hover:bg-slate-900 shadow-sm hover:shadow-md group">
                                        <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-600 transition-transform group-hover:scale-110">
                                            <Activity className="w-4 h-4" />
                                        </div>
                                        <div className="w-full">
                                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">Estatura</div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-base font-black text-slate-700 dark:text-slate-200 tabular-nums leading-none">{input.height}</span>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase">cm</span>
                                            </div>
                                        </div>
                                    </div>
                                    {result.cormicIndex && (
                                        <div className="col-span-2 flex flex-col items-start gap-2 p-4 rounded-3xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 transition-all hover:bg-white dark:hover:bg-slate-900 shadow-sm hover:shadow-md group">
                                            <div className="flex items-center justify-between w-full">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider tabular-nums">
                                                    {result.cormicIndex}%
                                                </div>
                                            </div>
                                            <div className="w-full">
                                                <div className="text-[8px] font-black text-indigo-400 dark:text-indigo-500/70 uppercase tracking-[0.15em] mb-1">Índice Córmico</div>
                                                <div className="text-xs font-bold text-indigo-700 dark:text-indigo-300 leading-tight">
                                                    {result.cormicInterpretation}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Separator for desktop */}
                            <div className="hidden lg:block w-px h-40 bg-slate-100 dark:bg-slate-800 mx-4" />

                            {/* Right Side: Circular Visualization */}
                            <div className="flex-shrink-0">
                                <BodyCompositionDonut result={result} />
                            </div>
                        </div>
                    </div>

                    {/* Secondary Cards Grid */}
                    <div className="mt-8">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-xs">Fraccionamiento</h4>
                            <span className="text-[10px] text-slate-400 font-bold">5 COMPONENTES</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <PremiumMassCard componentKey="muscle" kg={result.muscle.kg} percent={result.muscle.percent} />
                            <PremiumMassCard componentKey="adipose" kg={result.adipose.kg} percent={result.adipose.percent} />
                            <PremiumMassCard componentKey="bone" kg={result.bone.kg} percent={result.bone.percent} />
                            <PremiumMassCard componentKey="residual" kg={result.residual.kg} percent={result.residual.percent} />
                        </div>
                    </div>

                    {/* Additional Components & Warnings */}
                    <div className="mt-6 flex flex-col md:flex-row gap-4">
                        <div className="flex-1 p-5 rounded-[2rem] bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                                    <Scale className="w-4 h-4" />
                                </div>
                                <div className="text-xs font-black text-slate-800 dark:text-white">Masa de Piel</div>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-emerald-600">{result.skin.kg} kg</span>
                                <span className="text-xs text-slate-400">{result.skin.percent}% del total</span>
                            </div>
                        </div>

                        {result.obesityWarning && (
                            <div className={cn(
                                "flex-[2] p-5 rounded-[2rem] border transition-all",
                                result.obesityWarning.alternativeFormulas.length > 0
                                    ? "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/30"
                                    : "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30"
                            )}>
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        "p-2 rounded-xl",
                                        result.obesityWarning.alternativeFormulas.length > 0 ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                                    )}>
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-slate-800 dark:text-white mb-1 uppercase tracking-wider">Aviso de Composición</div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{result.obesityWarning.message}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Metodología */}
                    <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <Info className="w-4 h-4 text-slate-400" />
                            <div className="text-[10px] text-slate-500 font-medium">
                                <span className="font-bold text-slate-700 dark:text-slate-300">Modelo Kerr (1988):</span> Fraccionamiento anatómico mediante estrategia Phantom de Ross & Wilson.
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Empty State - Minimalist */
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-6">
                        <User className="w-10 h-10 text-slate-200" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Esperando Mediciones</h3>
                    <p className="text-sm text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                        Complete los campos obligatorios para generar el análisis premium.
                    </p>

                    {result.missingData.length > 0 && (
                        <div className="mt-8 pt-8 border-t border-slate-50 dark:border-slate-800">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Campos Restantes</p>
                            <div className="flex flex-wrap gap-2 justify-center max-w-sm mx-auto">
                                {result.missingData.slice(0, 8).map((item, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-lg border border-blue-100 dark:border-blue-900/30">
                                        {item}
                                    </span>
                                ))}
                                {result.missingData.length > 8 && (
                                    <span className="text-[10px] text-slate-400 font-bold px-2 py-1">+{result.missingData.length - 8} más</span>
                                )}
                            </div>
                        </div>
                    )}

                    {result.errors.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-800 text-left max-w-sm mx-auto">
                            <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] mb-3 text-center">Inconsistencias Detectadas</p>
                            <div className="space-y-2">
                                {result.errors.map((error, idx) => (
                                    <div key={idx} className="flex gap-2 items-start p-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30">
                                        <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-[10px] text-red-600 dark:text-red-400 leading-tight font-medium">{error.message}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
