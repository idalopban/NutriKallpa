"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Paciente, MedidasAntropometricas } from "@/types";

interface AtRiskPatientsWidgetProps {
    pacientes: Paciente[];
    medidas: MedidasAntropometricas[];
}

interface RiskAlert {
    pacienteId: string;
    nombre: string;
    riskType: 'imc' | 'no_control' | 'trigliceridos' | 'objetivo';
    riskValue: string;
    severity: 'high' | 'medium' | 'low';
}

export function AtRiskPatientsWidget({ pacientes, medidas }: AtRiskPatientsWidgetProps) {
    const router = useRouter();

    const riskAlerts = useMemo<RiskAlert[]>(() => {
        const alerts: RiskAlert[] = [];
        const now = new Date();

        pacientes.forEach(paciente => {
            const nombre = `${paciente.datosPersonales.nombre} ${paciente.datosPersonales.apellido}`;
            const patientMedidas = medidas
                .filter(m => m.pacienteId === paciente.id)
                .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

            const latestMedida = patientMedidas[0];

            if (latestMedida?.imc && latestMedida.imc > 35) {
                alerts.push({
                    pacienteId: paciente.id,
                    nombre,
                    riskType: 'imc',
                    riskValue: `IMC: ${latestMedida.imc.toFixed(1)}`,
                    severity: latestMedida.imc > 40 ? 'high' : 'medium'
                });
            }

            if (latestMedida) {
                const lastVisitDate = new Date(latestMedida.fecha);
                const daysSinceVisit = Math.floor((now.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));

                if (daysSinceVisit > 30) {
                    alerts.push({
                        pacienteId: paciente.id,
                        nombre,
                        riskType: 'no_control',
                        riskValue: `${daysSinceVisit} días sin control`,
                        severity: daysSinceVisit > 60 ? 'high' : 'medium'
                    });
                }
            } else if (paciente.createdAt) {
                const createdDate = new Date(paciente.createdAt);
                const daysSinceCreation = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

                if (daysSinceCreation > 7) {
                    alerts.push({
                        pacienteId: paciente.id,
                        nombre,
                        riskType: 'no_control',
                        riskValue: 'Sin medición inicial',
                        severity: 'low'
                    });
                }
            }

            const trigliceridos = paciente.historiaClinica?.bioquimicaReciente?.trigliceridos;
            if (trigliceridos && trigliceridos > 400) {
                alerts.push({
                    pacienteId: paciente.id,
                    nombre,
                    riskType: 'trigliceridos',
                    riskValue: `TG: ${trigliceridos} mg/dL`,
                    severity: trigliceridos > 500 ? 'high' : 'medium'
                });
            }
        });

        return alerts.sort((a, b) => {
            const severityOrder = { high: 0, medium: 1, low: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        }).slice(0, 5);
    }, [pacientes, medidas]);

    const getSeverityDot = (severity: 'high' | 'medium' | 'low') => {
        switch (severity) {
            case 'high': return 'bg-red-500';
            case 'medium': return 'bg-orange-400';
            case 'low': return 'bg-yellow-400';
        }
    };

    return (
        <div className="bg-white dark:bg-[#1e293b] text-gray-900 dark:text-gray-100 p-6 rounded-3xl shadow-sm dark:border dark:border-[#334155] h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        Seguimiento
                    </h3>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Alertas de Riesgo
                    </h2>
                </div>
                {riskAlerts.length > 0 && (
                    <div className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        {riskAlerts.length} pendiente{riskAlerts.length !== 1 ? 's' : ''}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 space-y-3">
                {riskAlerts.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                        No hay pacientes en riesgo actualmente
                    </div>
                ) : (
                    riskAlerts.map((alert, index) => (
                        <div
                            key={`${alert.pacienteId}-${alert.riskType}-${index}`}
                            className="flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-3">
                                <span className={`w-2.5 h-2.5 rounded-full ${getSeverityDot(alert.severity)} ring-2 ring-white dark:ring-gray-800`} />
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-[#6cba00] transition-colors">
                                        {alert.nombre}
                                    </p>
                                    <p className="text-xs text-gray-400">{alert.riskValue}</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-[#6cba00] hover:bg-green-50 dark:hover:bg-green-900/20"
                                onClick={() => router.push(`/pacientes/${alert.pacienteId}`)}
                            >
                                <Eye className="w-4 h-4" />
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// Weekly Progress Widget
interface WeeklyProgressWidgetProps {
    medidas: MedidasAntropometricas[];
    pacientes: Paciente[];
}

export function WeeklyProgressWidget({ medidas, pacientes }: WeeklyProgressWidgetProps) {
    const stats = useMemo(() => {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const recentMedidas = medidas.filter(m => new Date(m.fecha) >= oneWeekAgo);

        const patientChanges: { lost: number; maintained: number; gained: number; avgChange: number } = {
            lost: 0,
            maintained: 0,
            gained: 0,
            avgChange: 0
        };

        const changesPerPatient: number[] = [];

        pacientes.forEach(paciente => {
            const patientMedidas = medidas
                .filter(m => m.pacienteId === paciente.id)
                .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

            if (patientMedidas.length >= 2) {
                const oldest = patientMedidas[0];
                const latest = patientMedidas[patientMedidas.length - 1];
                const change = latest.peso - oldest.peso;

                changesPerPatient.push(change);

                if (change < -0.2) patientChanges.lost++;
                else if (change > 0.2) patientChanges.gained++;
                else patientChanges.maintained++;
            }
        });

        if (changesPerPatient.length > 0) {
            patientChanges.avgChange = changesPerPatient.reduce((a, b) => a + b, 0) / changesPerPatient.length;
        }

        return {
            totalEvaluaciones: recentMedidas.length,
            ...patientChanges
        };
    }, [medidas, pacientes]);

    return (
        <div className="bg-white dark:bg-[#1e293b] text-gray-900 dark:text-gray-100 p-6 rounded-3xl shadow-sm dark:border dark:border-[#334155] h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                        Resultados
                    </h3>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Progreso Semanal
                    </h2>
                </div>
                <span className="text-[10px] text-gray-400 font-medium px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                    Últimos 7 días
                </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalEvaluaciones}</p>
                    <p className="text-xs text-gray-400 font-medium">Evaluaciones</p>
                </div>
                <div className="text-center">
                    <p className={`text-3xl font-bold ${stats.avgChange < 0 ? 'text-[#6cba00]' : stats.avgChange > 0 ? 'text-[#ff8508]' : 'text-gray-900 dark:text-white'}`}>
                        {stats.avgChange > 0 ? '+' : ''}{stats.avgChange.toFixed(1)} kg
                    </p>
                    <p className="text-xs text-gray-400 font-medium">Promedio</p>
                </div>
            </div>

            {/* Progress Items */}
            <div className="space-y-3 flex-1">
                <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-[#6cba00] shadow-sm ring-2 ring-white dark:ring-gray-800" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                            Bajaron de peso
                        </span>
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{stats.lost}</span>
                </div>
                <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 shadow-sm ring-2 ring-white dark:ring-gray-800" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                            Mantuvieron
                        </span>
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{stats.maintained}</span>
                </div>
                <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-[#ff8508] shadow-sm ring-2 ring-white dark:ring-gray-800" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                            Subieron
                        </span>
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{stats.gained}</span>
                </div>
            </div>
        </div>
    );
}
