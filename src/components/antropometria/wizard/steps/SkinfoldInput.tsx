"use client";

import { useAnthropometryStore, Skinfolds } from "@/store/useAnthropometryStore";
import { Layers, Info } from "lucide-react";

const SKINFOLD_SITES: { key: keyof Skinfolds; name: string; location: string; type: string }[] = [
    { key: 'triceps', name: 'Tríceps', location: 'Parte posterior del brazo', type: 'Vertical' },
    { key: 'biceps', name: 'Bíceps', location: 'Parte anterior del brazo', type: 'Vertical' },
    { key: 'subscapular', name: 'Subescapular', location: 'Debajo de la escápula', type: 'Diagonal' },
    { key: 'suprailiac', name: 'Cresta Ilíaca', location: 'Encima del hueso ilíaco', type: 'Oblicuo' },
    { key: 'abdominal', name: 'Abdominal', location: 'Lateral al ombligo', type: 'Vertical' },
    { key: 'thigh', name: 'Muslo Anterior', location: 'Punto medio del muslo', type: 'Vertical' },
    { key: 'calf', name: 'Pantorrilla', location: 'Cara medial máxima', type: 'Vertical' }
];

export function SkinfoldInput() {
    const { skinfolds, updateSkinfolds } = useAnthropometryStore();

    const sumSkinfolds = Object.values(skinfolds).reduce((a, b) => a + b, 0);
    const filledCount = Object.values(skinfolds).filter(v => v > 0).length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6cba00] to-[#5aa000] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#6cba00]/30">
                    <Layers className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Pliegues Cutáneos</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Medición de los 7 sitios ISAK estándar</p>
            </div>

            {/* Progress indicator */}
            <div className="max-w-3xl mx-auto mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-500">{filledCount} de 7 pliegues</span>
                    <span className="font-bold text-[#6cba00]">Σ {sumSkinfolds.toFixed(1)} mm</span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-[#6cba00] to-[#ff8508] transition-all duration-300"
                        style={{ width: `${(filledCount / 7) * 100}%` }}
                    />
                </div>
            </div>

            {/* Skinfold Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {SKINFOLD_SITES.map((site) => {
                    const value = skinfolds[site.key];
                    const hasValue = value > 0;

                    return (
                        <div
                            key={site.key}
                            className={`bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-lg transition-all duration-300 border-2 ${hasValue
                                    ? 'border-[#6cba00] shadow-[#6cba00]/10'
                                    : 'border-transparent shadow-slate-200/50 dark:shadow-slate-900/50'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white">{site.name}</h4>
                                    <p className="text-xs text-slate-400 mt-0.5">{site.location}</p>
                                </div>
                                <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${site.type === 'Vertical' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                                        site.type === 'Diagonal' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                                            'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                    }`}>
                                    {site.type}
                                </span>
                            </div>

                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="80"
                                    value={value || ""}
                                    onChange={(e) => updateSkinfolds({ [site.key]: parseFloat(e.target.value) || 0 })}
                                    placeholder="0.0"
                                    className={`w-full text-2xl font-bold text-center py-3 px-4 rounded-xl border-2 transition-all outline-none ${hasValue
                                            ? 'bg-[#6cba00]/5 border-[#6cba00]/30 text-[#6cba00]'
                                            : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                                        } focus:ring-2 focus:ring-[#6cba00]/30 focus:border-[#6cba00]`}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">mm</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Info box */}
            <div className="max-w-4xl mx-auto mt-6">
                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>Tip:</strong> Mide cada pliegue 3 veces y usa el promedio.
                        El plicómetro debe sujetarse perpendicular a la piel.
                    </div>
                </div>
            </div>
        </div>
    );
}
