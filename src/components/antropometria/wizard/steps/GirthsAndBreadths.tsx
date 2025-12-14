"use client";

import { useAnthropometryStore, Girths, Breadths } from "@/store/useAnthropometryStore";
import { Circle, Maximize2 } from "lucide-react";

const GIRTH_SITES: { key: keyof Girths; name: string; location: string }[] = [
    { key: 'brazoRelajado', name: 'Brazo Relajado', location: 'Punto medio del brazo' },
    { key: 'brazoFlexionado', name: 'Brazo Flexionado', location: 'Máxima contracción del bíceps' },
    { key: 'cintura', name: 'Cintura', location: 'Punto más estrecho del abdomen' },
    { key: 'pantorrilla', name: 'Pantorrilla', location: 'Perímetro máximo de la pantorrilla' }
];

const BREADTH_SITES: { key: keyof Breadths; name: string; location: string }[] = [
    { key: 'humero', name: 'Húmero (Codo)', location: 'Diámetro biepicondíleo del húmero' },
    { key: 'femur', name: 'Fémur (Rodilla)', location: 'Diámetro bicondíleo del fémur' }
];

export function GirthsAndBreadths() {
    const { girths, breadths, updateGirths, updateBreadths } = useAnthropometryStore();

    const girthsFilled = Object.values(girths).filter(v => v > 0).length;
    const breadthsFilled = Object.values(breadths).filter(v => v > 0).length;
    const totalFilled = girthsFilled + breadthsFilled;
    const totalRequired = 6;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
                    <Circle className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Perímetros y Diámetros</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Mediciones para el cálculo del somatotipo</p>
            </div>

            {/* Progress */}
            <div className="max-w-3xl mx-auto mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-500">{totalFilled} de {totalRequired} mediciones</span>
                    <span className={`font-bold ${totalFilled === totalRequired ? 'text-[#6cba00]' : 'text-slate-400'}`}>
                        {totalFilled === totalRequired ? '✓ Completo' : 'En progreso'}
                    </span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                        style={{ width: `${(totalFilled / totalRequired) * 100}%` }}
                    />
                </div>
            </div>

            {/* Perímetros Section */}
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-2 mb-4">
                    <Circle className="w-5 h-5 text-purple-500" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Perímetros</h3>
                    <span className="text-xs text-slate-400">(en cm)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {GIRTH_SITES.map((site) => {
                        const value = girths[site.key];
                        const hasValue = value > 0;

                        return (
                            <div
                                key={site.key}
                                className={`bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-lg transition-all duration-300 border-2 ${hasValue
                                        ? 'border-purple-400 shadow-purple-500/10'
                                        : 'border-transparent shadow-slate-200/50 dark:shadow-slate-900/50'
                                    }`}
                            >
                                <div className="mb-3">
                                    <h4 className="font-bold text-slate-800 dark:text-white">{site.name}</h4>
                                    <p className="text-xs text-slate-400 mt-0.5">{site.location}</p>
                                </div>

                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="200"
                                        value={value || ""}
                                        onChange={(e) => updateGirths({ [site.key]: parseFloat(e.target.value) || 0 })}
                                        placeholder="0.0"
                                        className={`w-full text-2xl font-bold text-center py-3 px-4 rounded-xl border-2 transition-all outline-none ${hasValue
                                                ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400'
                                                : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                                            } focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500`}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">cm</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Diámetros Section */}
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-2 mb-4">
                    <Maximize2 className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Diámetros Óseos</h3>
                    <span className="text-xs text-slate-400">(en cm)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {BREADTH_SITES.map((site) => {
                        const value = breadths[site.key];
                        const hasValue = value > 0;

                        return (
                            <div
                                key={site.key}
                                className={`bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-lg transition-all duration-300 border-2 ${hasValue
                                        ? 'border-indigo-400 shadow-indigo-500/10'
                                        : 'border-transparent shadow-slate-200/50 dark:shadow-slate-900/50'
                                    }`}
                            >
                                <div className="mb-3">
                                    <h4 className="font-bold text-slate-800 dark:text-white">{site.name}</h4>
                                    <p className="text-xs text-slate-400 mt-0.5">{site.location}</p>
                                </div>

                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="20"
                                        value={value || ""}
                                        onChange={(e) => updateBreadths({ [site.key]: parseFloat(e.target.value) || 0 })}
                                        placeholder="0.0"
                                        className={`w-full text-2xl font-bold text-center py-3 px-4 rounded-xl border-2 transition-all outline-none ${hasValue
                                                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                                                : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                                            } focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500`}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">cm</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
