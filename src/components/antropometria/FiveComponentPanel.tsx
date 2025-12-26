"use client";

import { useMemo } from "react";
import { FullMeasurementData } from "./UnifiedMeasurementForm";
import {
    FiveComponentInput,
    calculateFiveComponentFractionation,
    COMPONENT_COLORS,
    COMPONENT_LABELS
} from "@/lib/fiveComponentMath";
import { Scale, AlertCircle, Info, TrendingUp } from "lucide-react";

interface FiveComponentPanelProps {
    data: FullMeasurementData;
}

// Convertir datos del formulario al formato de 5 componentes
function convertToFiveComponentInput(data: FullMeasurementData): FiveComponentInput {
    return {
        // Datos básicos
        weight: data.bioData.peso,
        height: data.bioData.talla,
        age: data.bioData.edad,
        gender: data.bioData.genero === 'masculino' ? 'male' : 'female',

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
        humerusBreadth: data.breadths.humero,    // Húmero (bi-epicondilar)
        femurBreadth: data.breadths.femur        // Fémur (bi-epicondilar)
    };
}

// Stacked Bar Chart Component
function StackedBarChart({ result }: { result: ReturnType<typeof calculateFiveComponentFractionation> }) {
    const components = [
        { key: 'adipose' as const, ...result.adipose },
        { key: 'muscle' as const, ...result.muscle },
        { key: 'bone' as const, ...result.bone },
        { key: 'skin' as const, ...result.skin },
        { key: 'residual' as const, ...result.residual }
    ];

    return (
        <div className="space-y-3">
            {/* Barra apilada */}
            <div className="h-8 rounded-full overflow-hidden flex shadow-inner bg-slate-100 dark:bg-slate-800">
                {components.map((comp) => {
                    // Use CSS custom property for dynamic width (avoids inline style lint)
                    const widthPercent = Math.max(comp.percent, 0);
                    return (
                        <div
                            key={comp.key}
                            className={`${COMPONENT_COLORS[comp.key].bg} dynamic-width transition-all duration-500 flex items-center justify-center`}
                            // CSS custom property is set here but the actual width comes from .dynamic-width class
                            style={{ '--bar-width': `${widthPercent}%` } as React.CSSProperties}
                            title={`${COMPONENT_LABELS[comp.key].name}: ${comp.percent}%`}
                        >
                            {comp.percent >= 10 && (
                                <span className="text-white text-[10px] font-bold">{comp.percent}%</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Leyenda */}
            <div className="flex flex-wrap gap-3 justify-center">
                {components.map((comp) => (
                    <div key={comp.key} className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 rounded-sm ${COMPONENT_COLORS[comp.key].bg}`}></div>
                        <span className="text-[10px] text-slate-500">{COMPONENT_LABELS[comp.key].icon}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Mass Card Component
function MassCard({
    componentKey,
    kg,
    percent
}: {
    componentKey: 'adipose' | 'muscle' | 'bone' | 'skin' | 'residual';
    kg: number;
    percent: number;
}) {
    const colors = COMPONENT_COLORS[componentKey];
    const labels = COMPONENT_LABELS[componentKey];

    return (
        <div className={`p-4 rounded-xl ${colors.light} border-l-4 ${colors.bg.replace('bg-', 'border-')}`}>
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{labels.icon}</span>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{labels.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">{labels.description}</div>
                </div>
                <div className="text-right">
                    <div className={`text-xl font-black ${colors.text}`}>{kg}</div>
                    <div className="text-[10px] text-slate-400">kg ({percent}%)</div>
                </div>
            </div>
        </div>
    );
}

export function FiveComponentPanel({ data }: FiveComponentPanelProps) {
    const input = useMemo(() => convertToFiveComponentInput(data), [data]);
    const result = useMemo(() => calculateFiveComponentFractionation(input), [input]);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-transparent dark:from-indigo-900/20 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <Scale className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white">Fraccionamiento de Masas</h3>
                        <p className="text-xs text-slate-500">Modelo de 5 Componentes (ISAK)</p>
                    </div>
                </div>
            </div>

            <div className="p-5 space-y-6">
                {result.isValid ? (
                    <>
                        {/* Densidad y % Grasa */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-900/10 rounded-xl text-center">
                                <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">Densidad Corporal</div>
                                <div className="text-2xl font-black text-purple-600">{result.bodyDensity}</div>
                                <div className="text-[10px] text-purple-400">g/cm³ (Durnin)</div>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-900/10 rounded-xl text-center">
                                <div className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">% Grasa (Siri)</div>
                                <div className="text-2xl font-black text-red-500">{result.fatPercent}%</div>
                                <div className="text-[10px] text-red-400">{result.adipose.kg} kg</div>
                            </div>
                        </div>

                        {/* Stacked Bar Chart */}
                        <div className="py-4">
                            <div className="text-xs text-slate-500 font-medium mb-3 text-center">Distribución Corporal</div>
                            <StackedBarChart result={result} />
                        </div>

                        {/* 5 Cards */}
                        <div className="space-y-3">
                            <MassCard componentKey="adipose" kg={result.adipose.kg} percent={result.adipose.percent} />
                            <MassCard componentKey="muscle" kg={result.muscle.kg} percent={result.muscle.percent} />
                            <MassCard componentKey="bone" kg={result.bone.kg} percent={result.bone.percent} />
                            <MassCard componentKey="skin" kg={result.skin.kg} percent={result.skin.percent} />
                            <MassCard componentKey="residual" kg={result.residual.kg} percent={result.residual.percent} />
                        </div>

                        {/* Metodología */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <div className="flex items-start gap-2">
                                <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                                <div className="text-[10px] text-slate-500 space-y-1">
                                    <p><strong>Modelo:</strong> Deborah Kerr (1988) - Phantom Z-scores</p>
                                    <p><strong>Piel:</strong> Du Bois (Superficie Corporal)</p>
                                    <p><strong>Adiposa/Muscular/Ósea/Residual:</strong> Phantom (Ross & Wilson)</p>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Estado inválido - Faltan datos */
                    <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-amber-500" />
                        </div>
                        <h4 className="font-semibold text-slate-600 dark:text-slate-300 mb-2">
                            Datos Insuficientes
                        </h4>
                        <p className="text-sm text-slate-400 mb-4">
                            El modelo de 5 componentes requiere datos adicionales:
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center max-w-sm mx-auto">
                            {result.missingData.slice(0, 6).map((item, idx) => (
                                <span
                                    key={idx}
                                    className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full"
                                >
                                    {item}
                                </span>
                            ))}
                            {result.missingData.length > 6 && (
                                <span className="text-[10px] text-slate-400">
                                    +{result.missingData.length - 6} más
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
