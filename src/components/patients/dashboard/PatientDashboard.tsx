import React from 'react';
import { Paciente, MedidasAntropometricas } from "@/types";
import { getPatientStage } from "@/lib/clinical-calculations";
import { PediatricStats } from "./PediatricStats";
import { AdultStats } from "./AdultStatsV2"; // Renamed to break cache
import { GeriatricStats } from "./GeriatricStats";
import { Activity, LineChart, Info, Apple } from "lucide-react";
import { EvolutionSummary } from "../EvolutionSummary";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DietPlanningSummary } from "./DietPlanningSummary";

interface PatientDashboardProps {
    paciente: Paciente;
    medidas: MedidasAntropometricas[];
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ paciente, medidas }) => {
    const stage = getPatientStage(paciente.datosPersonales.fechaNacimiento);
    // medidas is sorted descending (most recent first), so use index 0
    const ultimaMedida = medidas.length > 0 ? medidas[0] : {};

    const renderKPIs = () => {
        switch (stage) {
            case 'PEDIATRIC':
                return <PediatricStats paciente={paciente} medidas={medidas} ultimaMedida={ultimaMedida} />;
            case 'GERIATRIC':
                return <GeriatricStats paciente={paciente} medidas={medidas} ultimaMedida={ultimaMedida} />;
            case 'ADULT':
            default:
                return <AdultStats paciente={paciente} medidas={medidas} ultimaMedida={ultimaMedida} />;
        }
    };

    return (
        <div className="space-y-8">
            {/* 1. SECCIÓN: RESUMEN Y CÁLCULOS (KPIs) */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-[#ff8508]" />
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight">Estado Nutricional</h2>
                    </div>
                    <Badge variant="outline" className="bg-white dark:bg-slate-800 uppercase text-[10px] font-bold">
                        {stage === 'PEDIATRIC' ? 'Modo Pediátrico' : stage === 'GERIATRIC' ? 'Modo Geriátrico' : 'Modo Adulto'}
                    </Badge>
                </div>
                {renderKPIs()}
            </section>

            {/* 2. SECCIÓN: CONTENIDO DINÁMICO */}
            <div className="bg-slate-50/50 dark:bg-slate-900/50 p-1 rounded-3xl border border-slate-100 dark:border-slate-800">
                {stage === 'PEDIATRIC' ? (
                    /* Para Pediátricos: Vista Simple (Planificación está en pestaña superior) */
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-6 px-1">
                            <LineChart className="w-5 h-5 text-[#ff8508]" />
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-tight">Avance y Evolución</h2>
                        </div>
                        <EvolutionSummary
                            patientId={paciente.id}
                            mode="pediatric"
                        />
                        <PediatricEvolutionNotes />
                    </div>
                ) : (
                    /* Para Adultos y Geriátricos: Revertir a Pestañas Internas Consolidadas */
                    <Tabs defaultValue="avance" className="w-full">
                        <div className="flex px-4 pt-2 pb-0">
                            <TabsList className="bg-transparent border-b border-transparent gap-6">
                                <TabsTrigger
                                    value="avance"
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#ff8508] data-[state=active]:text-[#ff8508] rounded-none px-0 pb-2 font-bold transition-all text-sm"
                                >
                                    <LineChart className="w-4 h-4 mr-2" />
                                    Avance y Evolución
                                </TabsTrigger>
                                <TabsTrigger
                                    value="planing"
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#ff8508] data-[state=active]:text-[#ff8508] rounded-none px-0 pb-2 font-bold transition-all text-sm"
                                >
                                    <Apple className="w-4 h-4 mr-2" />
                                    Planificación
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="p-4 pt-6">
                            <TabsContent value="avance" className="mt-0 focus-visible:outline-none">
                                <EvolutionSummary
                                    patientId={paciente.id}
                                    mode={stage.toLowerCase() as 'adult' | 'geriatric'}
                                />
                                {stage === 'GERIATRIC' && <GeriatricEvolutionNotes />}
                            </TabsContent>

                            <TabsContent value="planing" className="mt-0 focus-visible:outline-none">
                                <DietPlanningSummary stage={stage} paciente={paciente} />
                            </TabsContent>
                        </div>
                    </Tabs>
                )}
            </div>
        </div>
    );
};

const PediatricEvolutionNotes: React.FC = () => (
    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0" />
        <p className="text-sm text-blue-800 dark:text-blue-300">
            <b>Interpretación Pediátrica:</b> En niños, el crecimiento lineal (talla) es el indicador más sensible de salud a largo plazo. Una desaceleración en la curva de talla puede preceder a cambios en peso.
        </p>
    </div>
);

const GeriatricEvolutionNotes: React.FC = () => (
    <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800 flex gap-3">
        <Info className="w-5 h-5 text-purple-600 shrink-0" />
        <p className="text-sm text-purple-800 dark:text-purple-300">
            <b>Foco Gerontológico:</b> La estabilidad en la masa muscular y fuerza es prioritaria. Una pérdida de peso involuntaria &gt; 5% en 6 meses es criterio de fragilidad.
        </p>
    </div>
);
