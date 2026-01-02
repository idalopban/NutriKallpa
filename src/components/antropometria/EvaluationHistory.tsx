"use client";

import { Calendar, Trash2, Eye } from "lucide-react";
import type { MedidasAntropometricas } from "@/types";

interface EvaluationHistoryProps {
    medidas: MedidasAntropometricas[];
    onDelete: (id: string) => void;
    onView?: (medida: MedidasAntropometricas) => void;
}

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
                            <th className="px-4 py-2 text-xs font-semibold text-slate-500">Fecha</th>
                            <th className="px-4 py-2 text-xs font-semibold text-slate-500">Peso</th>
                            <th className="px-4 py-2 text-xs font-semibold text-slate-500">Talla</th>
                            {isPediatric ? (
                                <>
                                    <th className="px-4 py-2 text-xs font-semibold text-slate-500">P. Cefálico</th>
                                    <th className="px-4 py-2 text-xs font-semibold text-slate-500">IMC</th>
                                </>
                            ) : (
                                <>
                                    <th className="px-4 py-2 text-xs font-semibold text-slate-500">Σ Pliegues</th>
                                    <th className="px-4 py-2 text-xs font-semibold text-slate-500">% Grasa</th>
                                </>
                            )}
                            <th className="px-4 py-2 text-xs font-semibold text-slate-500 text-right">Acciones</th>
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

                            return (
                                <tr
                                    key={medida.id}
                                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${idx === 0 ? 'bg-[#6cba00]/5' : ''}`}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {idx === 0 && (
                                                <span className="w-2 h-2 rounded-full bg-[#6cba00]"></span>
                                            )}
                                            <span className="font-medium text-slate-700 dark:text-slate-200">
                                                {new Date(medida.fecha).toLocaleDateString('es-ES', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                        {medida.peso || '-'} kg
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                        {medida.talla || '-'} cm
                                    </td>
                                    {isPediatric ? (
                                        <>
                                            <td className="px-4 py-3">
                                                <span className={`font-semibold ${(medida.headCircumference || medida.perimetros?.headCircumference) ? 'text-pink-600' : 'text-slate-400'}`}>
                                                    {(medida.headCircumference || medida.perimetros?.headCircumference)
                                                        ? `${medida.headCircumference || medida.perimetros?.headCircumference} cm`
                                                        : '-'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`font-bold ${imc !== '-' ? 'text-[#6cba00]' : 'text-slate-400'}`}>
                                                    {imc !== '-' ? imc : '-'}
                                                </span>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-4 py-3">
                                                <span className="font-semibold text-[#ff8508]">
                                                    {sumPliegues > 0 ? `${sumPliegues.toFixed(1)} mm` : '-'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`font-bold ${pctGrasa !== '-' ? 'text-[#6cba00]' : 'text-slate-400'}`}>
                                                    {pctGrasa !== '-' ? `${pctGrasa}%` : '-'}
                                                </span>
                                            </td>
                                        </>
                                    )}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            {onView && (
                                                <button
                                                    onClick={() => onView(medida)}
                                                    className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    title="Ver detalles"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onDelete(medida.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
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
