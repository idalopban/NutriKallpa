"use client";

import { getSkinfoldSite, SkinfoldMeasurement, SkinfoldSiteKey } from "@/lib/skinfold-map";
import { Activity, Trash2, TrendingUp } from "lucide-react";

interface MeasurementListProps {
    measurements: SkinfoldMeasurement[];
    hoveredId: string | null;
    onHover: (id: string | null) => void;
    onDelete: (id: string) => void;
}

export function MeasurementList({ measurements, hoveredId, onHover, onDelete }: MeasurementListProps) {
    // Calcular suma total
    const totalSum = measurements.reduce((sum, m) => sum + m.value, 0);

    if (measurements.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                    <Activity className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
                <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Sin mediciones</h4>
                <p className="text-sm text-slate-400 dark:text-slate-500">
                    Ingresa valores en el formulario para visualizarlos aquí y en el modelo 3D.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-[#6cba00]/5 to-transparent">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#6cba00]/10 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-[#6cba00]" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white">Resumen</h3>
                            <p className="text-xs text-slate-500">{measurements.length} sitios medidos</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-[#6cba00]">{totalSum.toFixed(1)}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">Σ mm</div>
                    </div>
                </div>
            </div>

            {/* Lista de mediciones */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[400px] overflow-y-auto">
                {measurements.map((measurement) => {
                    const site = getSkinfoldSite(measurement.siteKey);
                    const isHovered = hoveredId === measurement.id;

                    return (
                        <div
                            key={measurement.id}
                            onMouseEnter={() => onHover(measurement.id)}
                            onMouseLeave={() => onHover(null)}
                            className={`px-5 py-4 flex items-center gap-4 cursor-pointer transition-all duration-200 ${isHovered
                                    ? 'bg-[#ff8508]/5 border-l-4 border-[#ff8508]'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-4 border-transparent'
                                }`}
                        >
                            {/* Indicador visual */}
                            <div className={`w-3 h-3 rounded-full flex-shrink-0 transition-transform ${isHovered ? 'bg-[#6cba00] scale-125' : 'bg-[#ff8508]'
                                }`} />

                            {/* Info del sitio */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                                        {site.name}
                                    </span>
                                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md ${site.type === 'Vertical'
                                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                            : site.type === 'Diagonal'
                                                ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                                                : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                        }`}>
                                        {site.type}
                                    </span>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                    {new Date(measurement.date).toLocaleDateString('es-ES', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>

                            {/* Valor */}
                            <div className="flex items-center gap-3">
                                <span className={`text-xl font-black transition-colors ${isHovered ? 'text-[#6cba00]' : 'text-slate-700 dark:text-slate-200'
                                    }`}>
                                    {measurement.value}<span className="text-sm font-normal text-slate-400">mm</span>
                                </span>

                                {/* Botón eliminar */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(measurement.id);
                                    }}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100 hover:opacity-100"
                                    style={{ opacity: isHovered ? 1 : 0 }}
                                    title="Eliminar medición"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer con promedio */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Promedio</span>
                    <span className="font-bold text-[#6cba00]">
                        {(totalSum / measurements.length).toFixed(1)} mm
                    </span>
                </div>
            </div>
        </div>
    );
}
