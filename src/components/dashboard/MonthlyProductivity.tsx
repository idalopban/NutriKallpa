"use client";

import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, FileText, Activity } from "lucide-react";
import { getAllMedidas } from "@/lib/storage";
import { MedidasAntropometricas } from "@/types";
import { SavedPlan } from "@/lib/diet-service";

interface MonthlyProductivityProps {
    dietPlans: SavedPlan[];
}

// Metas por defecto (pueden ser configurables en el futuro)
const DEFAULT_TARGETS = {
    dietas: 30,
    evaluaciones: 20
};

export function MonthlyProductivity({ dietPlans }: MonthlyProductivityProps) {
    const [mounted, setMounted] = useState(false);
    const [medidas, setMedidas] = useState<MedidasAntropometricas[]>([]);

    useEffect(() => {
        setMounted(true);
        // Cargar todas las medidas antropométricas
        setMedidas(getAllMedidas());
    }, []);

    // Calcular estadísticas del mes actual
    const stats = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Filtrar dietas del mes actual
        const dietasDelMes = dietPlans.filter(plan => {
            if (!plan.createdAt) return false;
            const planDate = new Date(plan.createdAt);
            return planDate.getMonth() === currentMonth && planDate.getFullYear() === currentYear;
        });

        // Filtrar evaluaciones del mes actual
        const evaluacionesDelMes = medidas.filter(medida => {
            if (!medida.createdAt && !medida.fecha) return false;
            const medidaDate = new Date(medida.createdAt || medida.fecha || '');
            return medidaDate.getMonth() === currentMonth && medidaDate.getFullYear() === currentYear;
        });

        return {
            dietas: {
                count: dietasDelMes.length,
                target: DEFAULT_TARGETS.dietas
            },
            evaluaciones: {
                count: evaluacionesDelMes.length,
                target: DEFAULT_TARGETS.evaluaciones
            }
        };
    }, [dietPlans, medidas]);

    // Cálculos de porcentaje
    const dietasPercent = Math.min(Math.round((stats.dietas.count / stats.dietas.target) * 100), 100);
    const evaluacionesPercent = Math.min(Math.round((stats.evaluaciones.count / stats.evaluaciones.target) * 100), 100);

    // Promedio total para el estado "On Track"
    const averagePerformance = (dietasPercent + evaluacionesPercent) / 2;
    const isOnTrack = averagePerformance >= 50;

    // Nombre del mes actual
    const monthName = new Date().toLocaleDateString('es-ES', { month: 'long' });

    return (
        <div className="bg-white dark:bg-[#1e293b] text-gray-900 dark:text-gray-100 p-6 rounded-3xl shadow-sm dark:border dark:border-[#334155] h-full flex flex-col font-sans">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        Productividad
                    </h3>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                        Metas de {monthName}
                    </h2>
                </div>

                {/* Badge de Estado */}
                <div className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors",
                    isOnTrack
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                )}>
                    <TrendingUp className="w-3.5 h-3.5" />
                    {isOnTrack ? "Buen ritmo" : "Acelerar"}
                </div>
            </div>

            {/* Barras de Progreso */}
            <div className="space-y-8 flex-1">

                {/* Ítem 1: Planes Nutricionales */}
                <div className="group">
                    <div className="flex justify-between items-end mb-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            <div className="p-1.5 rounded-md bg-green-50 text-[#6cba00] dark:bg-green-900/20">
                                <FileText className="w-4 h-4" />
                            </div>
                            Planes Nutricionales
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-bold text-gray-900 dark:text-white block leading-none">
                                {dietasPercent}%
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">
                                {stats.dietas.count}/{stats.dietas.target} creados
                            </span>
                        </div>
                    </div>
                    {/* Barra Background */}
                    <div className="h-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        {/* Barra Fill Animada */}
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-[#6cba00] to-[#82d900] shadow-[0_0_10px_rgba(108,186,0,0.3)] transition-all duration-1000 ease-out"
                            style={{ width: mounted ? `${dietasPercent}%` : '0%' }}
                        />
                    </div>
                </div>

                {/* Ítem 2: Evaluaciones ISAK */}
                <div className="group">
                    <div className="flex justify-between items-end mb-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            <div className="p-1.5 rounded-md bg-orange-50 text-[#ff8508] dark:bg-orange-900/20">
                                <Activity className="w-4 h-4" />
                            </div>
                            Evaluaciones ISAK
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-bold text-gray-900 dark:text-white block leading-none">
                                {evaluacionesPercent}%
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium">
                                {stats.evaluaciones.count}/{stats.evaluaciones.target} realizadas
                            </span>
                        </div>
                    </div>
                    {/* Barra Background */}
                    <div className="h-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        {/* Barra Fill Animada */}
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-[#ff8508] to-[#ffa345] shadow-[0_0_10px_rgba(255,133,8,0.3)] transition-all duration-1000 ease-out"
                            style={{ width: mounted ? `${evaluacionesPercent}%` : '0%' }}
                        />
                    </div>
                </div>

            </div>

            {/* Footer - Resumen */}
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                        Total actividades este mes
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                        {stats.dietas.count + stats.evaluaciones.count}
                    </span>
                </div>
            </div>
        </div>
    );
}
