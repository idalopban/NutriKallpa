import React from 'react';
import { DashboardProps } from './types';
import { Baby, Activity, Scale, Clock } from "lucide-react";
import { calculateDetailedAge } from "@/lib/clinical-calculations";
import { calculateZScore } from "@/lib/growth-standards";
import { Badge } from "@/components/ui/badge";

export const PediatricStats: React.FC<DashboardProps> = ({ paciente, medidas, ultimaMedida }) => {
    console.log("%c [PediatricStats] RENDERING ", "background: #3b82f6; color: white; font-weight: bold;");
    const ageDetailed = calculateDetailedAge(paciente.datosPersonales.fechaNacimiento);
    const birthDate = new Date(paciente.datosPersonales.fechaNacimiento);
    const now = new Date();
    const ageInMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth());
    const sex = paciente.datosPersonales.sexo === 'femenino' ? 'female' : 'male';

    const peso = ultimaMedida.peso || 0;
    const talla = ultimaMedida.talla || 0;

    // Z-Scores
    const wfa = peso > 0 ? calculateZScore(peso, ageInMonths, sex, 'wfa') : null;
    const lhfa = talla > 0 ? calculateZScore(talla, ageInMonths, sex, 'lhfa') : null;

    // Get latest Hemoglobin from Biochemistry Record
    // Looking into patient's biography/records for latest Hb
    const latestHb = paciente.medidas?.flatMap(m => m.observaciones?.includes('Hb:') ? [m.observaciones] : [])[0];
    // Actually, BiochemistryRecord is separate in types but let's see where it's stored in Paciente
    // types says Paciente has biochemistryReciente (HistoriaClinica) or measures
    const hbValue = paciente.historiaClinica?.bioquimicaReciente?.hemoglobina;

    const getZColor = (z: number | undefined) => {
        if (z === undefined) return "text-slate-400";
        if (z < -2 || z > 2) return "text-red-600";
        if (z < -1 || z > 1) return "text-amber-500";
        return "text-green-600";
    };

    const getZBadgeColor = (z: number | undefined) => {
        if (z === undefined) return "bg-slate-100 text-slate-600";
        if (z < -2 || z > 2) return "bg-red-100 text-red-700";
        if (z < -1 || z > 1) return "bg-amber-100 text-amber-700";
        return "bg-green-100 text-green-700";
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Exact Age */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Edad Exacta</span>
                </div>
                <p className="text-2xl font-black text-slate-800 dark:text-white">{ageDetailed.formatted}</p>
                <p className="text-[10px] text-slate-400 font-medium">Hitos de Desarrollo</p>
            </div>

            {/* Z-Score Peso/Edad */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                    <Scale className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">P/E (Z-Score)</span>
                </div>
                <p className={`text-3xl font-black ${getZColor(wfa?.zScore)}`}>
                    {wfa?.zScore ? wfa.zScore.toFixed(2) : '--'}
                </p>
                <Badge variant="secondary" className={`mt-2 text-[10px] ${getZBadgeColor(wfa?.zScore)}`}>
                    {wfa?.diagnosis || 'Sin datos'}
                </Badge>
            </div>

            {/* Z-Score Talla/Edad */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-slate-500">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">T/E (Z-Score)</span>
                </div>
                <p className={`text-3xl font-black ${getZColor(lhfa?.zScore)}`}>
                    {lhfa?.zScore ? lhfa.zScore.toFixed(2) : '--'}
                </p>
                <Badge variant="secondary" className={`mt-2 text-[10px] ${getZBadgeColor(lhfa?.zScore)}`}>
                    {lhfa?.diagnosis || 'Sin datos'}
                </Badge>
            </div>

            {/* Anemia Status */}
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Activity className="w-12 h-12 text-red-600" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2 text-red-600">
                        <span className="text-xs font-bold uppercase tracking-wider uppercase">Estado Anemia</span>
                    </div>
                    <p className="text-3xl font-black text-red-700 dark:text-red-400">
                        {hbValue ? `${hbValue} g/dL` : '--'}
                    </p>
                    <p className="text-[10px] text-red-600/70 font-bold mt-1 uppercase">
                        {hbValue ? (hbValue < 11 ? '🔴 Anemia Detectada' : '🟢 Hb Normal') : 'Falta Hemoglobina'}
                    </p>
                </div>
            </div>
        </div>
    );
};
