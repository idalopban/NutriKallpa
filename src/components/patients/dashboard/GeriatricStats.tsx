import React from 'react';
import { DashboardProps } from './types';
import { Activity, Scale, Heart, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const GeriatricStats: React.FC<DashboardProps> = ({ paciente, medidas, ultimaMedida }) => {
    console.log("%c [GeriatricStats] RENDERING ", "background: #8b5cf6; color: white; font-weight: bold;");
    const imc = ultimaMedida.imc || 0;
    const calf = paciente.geriatricAnthropometry?.circunferenciaPantorrilla || 0;

    // MNA Score from the last assessment if available
    const lastMNA = paciente.mnaAssessments?.[0]; // Assuming they are sorted by date or take the first
    const mnaScore = lastMNA?.puntajeTotal;
    const mnaClass = lastMNA?.clasificacion;

    const getGeriatricImcColor = (valor: number) => {
        if (valor < 23) return "text-red-500"; // Bajo peso geriátrico
        if (valor < 28) return "text-green-500"; // Normal geriátrico
        if (valor < 32) return "text-orange-500"; // Sobrepeso
        return "text-red-600"; // Obesidad
    };

    const getMNABadgeColor = (status: string | undefined) => {
        if (status === 'normal') return "bg-green-100 text-green-700";
        if (status === 'riesgo_desnutricion') return "bg-amber-100 text-amber-700";
        if (status === 'desnutricion') return "bg-red-100 text-red-700";
        return "bg-slate-100 text-slate-600";
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* IMC Geriátrico */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">IMC Geriátrico</span>
                </div>
                <p className={`text-3xl font-black ${getGeriatricImcColor(imc)}`}>{imc.toFixed(1)}</p>
                <p className="text-[10px] text-slate-400 font-medium">kg/m² • Normal: 23-28</p>
            </div>

            {/* Sarcopenia Risk (Calf) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                    <Scale className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider text-pink-600">Riesgo Sarcopenia</span>
                </div>
                <p className={`text-3xl font-black ${calf > 0 && calf < 31 ? 'text-red-600' : 'text-slate-800 dark:text-white'}`}>
                    {calf > 0 ? `${calf} cm` : '--'}
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                    {calf > 0 ? (
                        calf < 31 ? (
                            <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">🚨 Riesgo Alto</Badge>
                        ) : (
                            <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">Normal</Badge>
                        )
                    ) : (
                        <span className="text-[10px] text-slate-400">Circunf. Pantorrilla</span>
                    )}
                </div>
            </div>

            {/* MNA Score */}
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-blue-600">
                    <Heart className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Estado MNA</span>
                </div>
                <p className="text-3xl font-black text-blue-700 dark:text-blue-400">
                    {mnaScore !== undefined ? `${mnaScore}/14` : '--'}
                </p>
                {mnaClass && (
                    <Badge className={`mt-2 text-[10px] ${getMNABadgeColor(mnaClass)}`}>
                        {mnaClass === 'riesgo_desnutricion' ? 'Riesgo Desnutrición' : mnaClass.toUpperCase()}
                    </Badge>
                )}
            </div>

            {/* Geriatric Alert/Context */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 shadow-sm flex flex-col justify-center">
                <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                    <div>
                        <p className="text-[10px] font-bold text-amber-800 uppercase tracking-tighter">Foco Geriátrico</p>
                        <p className="text-[11px] leading-tight text-amber-700/80 font-medium">
                            Priorizar masa muscular y funcionalidad sobre el peso estético.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
