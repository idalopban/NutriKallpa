"use client";

import { Measurement, getSkinfoldInfo } from "@/lib/skinfold-coordinates";
import { Trash2, Activity } from "lucide-react";

interface MeasurementsSidebarProps {
    measurements: Measurement[];
    hoveredId: string | null;
    onHover: (id: string | null) => void;
    onDelete: (id: string) => void;
}

export function MeasurementsSidebar({
    measurements,
    hoveredId,
    onHover,
    onDelete
}: MeasurementsSidebarProps) {

    if (measurements.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 text-center">
                <Activity className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    No hay mediciones registradas.
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Usa el formulario para agregar pliegues.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#6cba00]" />
                    Puntos Medidos ({measurements.length})
                </h4>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[400px] overflow-y-auto">
                {measurements.map((measurement) => {
                    const info = getSkinfoldInfo(measurement.type);
                    const isHovered = hoveredId === measurement.id;

                    return (
                        <div
                            key={measurement.id}
                            onMouseEnter={() => onHover(measurement.id)}
                            onMouseLeave={() => onHover(null)}
                            className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer transition-all duration-200 ${isHovered
                                    ? 'bg-[#ff8508]/10 border-l-4 border-[#ff8508]'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-l-4 border-transparent'
                                }`}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${isHovered ? 'bg-[#6cba00]' : 'bg-[#ff8508]'}`}></span>
                                    <span className="text-sm font-medium text-slate-800 dark:text-white truncate">
                                        {info.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 ml-4">
                                    <span className="text-xs text-slate-400 dark:text-slate-500">
                                        {info.foldType}
                                    </span>
                                    <span className="text-[10px] text-slate-300 dark:text-slate-600">•</span>
                                    <span className="text-xs text-slate-400 dark:text-slate-500">
                                        {measurement.date}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-[#6cba00]">
                                    {measurement.value}mm
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(measurement.id);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Eliminar medición"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
