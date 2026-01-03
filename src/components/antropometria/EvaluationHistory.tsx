"use client";

import { Calendar, Trash2, Eye } from "lucide-react";
import type { MedidasAntropometricas } from "@/types";

interface EvaluationHistoryProps {
    medidas: MedidasAntropometricas[];
    onDelete: (id: string) => void;
    onView?: (medida: MedidasAntropometricas) => void;
}

// Helper to safely format values that might be objects
const formatValue = (val: any): string | number => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'object' && 'value' in val) return val.value;
    return val;
};

export function EvaluationHistory({ medidas, onDelete, onView }: EvaluationHistoryProps) {
    if (medidas.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <h3 className="font-bold text-slate-800 dark:text-white">Historial de Evaluaciones</h3>
                </div>
                <p className="text-sm text-slate-400 text-center py-4">
                    No hay evaluaciones guardadas para este paciente.
                </p>
            </div>
        );
    }

    // Detect if this is a pediatric patient based on the data
    const isPediatric = medidas.some(m =>
        m.tipoPaciente === 'pediatrico' ||
        (m.edad !== undefined && m.edad < 5)
    );

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-slate-100 to-transparent dark:from-slate-800 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm">Historial</h3>
                    </div>
                    <span className="text-xs text-slate-400">{medidas.length} evaluaciones</span>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 text-left">
                            <th className="px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-semibold text-slate-500"><span className="sm:hidden">Fec</span><span className="hidden sm:inline">Fecha</span></th>
                            <th className="px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-semibold text-slate-500"><span className="sm:hidden">P</span><span className="hidden sm:inline">Peso</span></th>
                            <th className="px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-semibold text-slate-500"><span className="sm:hidden">T</span><span className="hidden sm:inline">Talla</span></th>
                            {isPediatric ? (
                                <>
                                    <th className="px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-semibold text-slate-500"><span className="sm:hidden">PC</span><span className="hidden sm:inline">P. Cefálico</span></th>
                                    <th className="px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-semibold text-slate-500">IMC</th>
                                </>
                            ) : (
                                <>
                                    <th className="px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-semibold text-slate-500 text-center"><span className="sm:hidden">ΣPl</span><span className="hidden sm:inline">Σ Pliegues</span></th>
                                    <th className="px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-semibold text-slate-500 text-center"><span className="sm:hidden">%G</span><span className="hidden sm:inline">% Grasa</span></th>
                                </>
                            )}
                            <th className="px-2 sm:px-4 py-2 text-[10px] sm:text-xs font-semibold text-slate-500 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {medidas.map((medida, idx) => {
                            // Calcular suma de pliegues si existen
                            const sumPliegues = medida.pliegues
                                ? Object.values(medida.pliegues).reduce((a, b) => (a || 0) + (b || 0), 0)
                                : 0;

                            // Calcular % grasa aproximado
                            const pctGrasa = sumPliegues > 0
                                ? ((sumPliegues * 0.097) + 3.64).toFixed(1)
                                : '-';

                            // Calcular IMC
                            const imc = (medida.peso && medida.talla)
                                ? (medida.peso / Math.pow(medida.talla / 100, 2)).toFixed(1)
                                : '-';

                            // Extract values safely
                            const headCirc = formatValue(medida.headCircumference || (medida.perimetros as any)?.headCircumference);

                            return (
                                <tr
                                    key={medida.id}
                                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${idx === 0 ? 'bg-[#6cba00]/5' : ''}`}
                                >
                                    <td className="px-2 sm:px-4 py-2 sm:py-3">
                                        <div className="flex items-center gap-1 sm:gap-2">
                                            {idx === 0 && (
                                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#6cba00]"></span>
                                            )}
                                            <span className="font-medium text-[10px] sm:text-sm text-slate-700 dark:text-slate-200">
                                                <span className="sm:hidden">
                                                    {new Date(medida.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                                </span>
                                                <span className="hidden sm:inline">
                                                    {new Date(medida.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })}
                                                </span>
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-slate-600 dark:text-slate-300">
                                        {medida.peso || '-'}
                                    </td>
                                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-slate-600 dark:text-slate-300">
                                        {medida.talla || '-'}
                                    </td>
                                    {isPediatric ? (
                                        <>
                                            <td className="px-2 sm:px-4 py-2 sm:py-3">
                                                <span className={`font-semibold text-[10px] sm:text-sm ${(headCirc !== '-') ? 'text-pink-600' : 'text-slate-400'}`}>
                                                    {headCirc}
                                                </span>
                                            </td>
                                            <td className="px-2 sm:px-4 py-2 sm:py-3">
                                                <span className={`font-bold text-[10px] sm:text-sm ${imc !== '-' ? 'text-[#6cba00]' : 'text-slate-400'}`}>
                                                    {imc !== '-' ? imc : '-'}
                                                </span>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                                                <span className="font-semibold text-[10px] sm:text-sm text-[#ff8508]">
                                                    {sumPliegues > 0 ? sumPliegues.toFixed(1) : '-'}
                                                </span>
                                            </td>
                                            <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                                                <span className={`font-bold text-[10px] sm:text-sm ${pctGrasa !== '-' ? 'text-[#6cba00]' : 'text-slate-400'}`}>
                                                    {pctGrasa !== '-' ? `${pctGrasa}%` : '-'}
                                                </span>
                                            </td>
                                        </>
                                    )}
                                    <td className="px-2 sm:px-4 py-2 sm:py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            {onView && (
                                                <button
                                                    onClick={() => onView(medida)}
                                                    className="p-1 sm:p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    title="Ver"
                                                >
                                                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onDelete(medida.id)}
                                                className="p-1 sm:p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
