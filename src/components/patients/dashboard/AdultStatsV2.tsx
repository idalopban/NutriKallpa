import React from 'react';
import { DashboardProps } from './types';
import { Scale, Activity, TrendingUp, TrendingDown } from "lucide-react";

export const AdultStats: React.FC<DashboardProps> = ({ paciente, medidas, ultimaMedida }) => {
    // Calculate body fat and muscle mass (approximate for display)
    const imc = ultimaMedida.imc || 0;
    const pesoActual = ultimaMedida.peso || 0;

    const sumPliegues = ultimaMedida.pliegues
        ? Object.values(ultimaMedida.pliegues).reduce((a, b) => Number(a || 0) + Number(b || 0), 0)
        : 0;
    const sex = (ultimaMedida as any).sexo || paciente.datosPersonales.sexo || 'masculino';
    let bodyFatPercent = (ultimaMedida as any).porcentajeGrasa || 0;

    if (bodyFatPercent === 0 && sumPliegues > 0) {
        if (sex === 'masculino') bodyFatPercent = (sumPliegues * 0.097) + 3.64;
        else bodyFatPercent = (sumPliegues * 0.1429) + 4.56;
        bodyFatPercent = Math.max(3, Math.min(bodyFatPercent, 50));
    }
    const masaGrasa = (bodyFatPercent / 100) * pesoActual;
    const masaMuscular = pesoActual - masaGrasa;

    const getImcColor = (valor: number) => {
        if (valor < 18.5) return "text-blue-500";
        if (valor < 25) return "text-green-500";
        if (valor < 30) return "text-orange-500";
        return "text-red-500";
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* IMC */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">IMC</span>
                </div>
                <p className={`text-3xl font-black ${getImcColor(imc)}`}>{imc.toFixed(1)}</p>
                <p className="text-[10px] text-slate-400 font-medium">kg/m² • Adulto</p>
            </div>

            {/* Peso */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                    <Scale className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Peso</span>
                </div>
                <p className="text-3xl font-black text-slate-800 dark:text-white">{pesoActual.toFixed(1)}</p>
                <p className="text-[10px] text-slate-400 font-medium">Kilogramos</p>
            </div>

            {/* % Grasa */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                    <TrendingDown className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">% Grasa</span>
                </div>
                <p className="text-3xl font-black text-orange-600 dark:text-orange-400">
                    {bodyFatPercent > 0 ? bodyFatPercent.toFixed(1) : '--'}
                    <span className="text-sm font-bold ml-0.5">%</span>
                </p>
                <p className="text-[10px] text-slate-400 font-medium">Grasa Corporal</p>
            </div>

            {/* Masa Muscular */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Masa Magra</span>
                </div>
                <p className="text-3xl font-black text-blue-600 dark:text-blue-400">
                    {masaMuscular > 0 ? masaMuscular.toFixed(1) : '--'}
                    <span className="text-sm font-bold ml-0.5">kg</span>
                </p>
                <p className="text-[10px] text-slate-400 font-medium">Estimado (2C)</p>
            </div>
        </div>
    );
};
