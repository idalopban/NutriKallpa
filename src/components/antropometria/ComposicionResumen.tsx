"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Dumbbell, Bone, Scale, PlusCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ResultadosComposicion, MedidasAntropometricas, ResultadoFormula } from "@/types";
import { cn } from "@/lib/utils";
import { FractionationResults } from "./FractionationResults";

interface ComposicionResumenProps {
    resultados: ResultadosComposicion | null;
    ultimaMedida: MedidasAntropometricas | undefined;
    todasFormulas: ResultadoFormula[];
    formulaSeleccionada: string;
    onFormulaChange: (formula: string) => void;
    onNewEvaluation: () => void;
}

export function ComposicionResumen({
    resultados,
    ultimaMedida,
    todasFormulas,
    formulaSeleccionada,
    onFormulaChange,
    onNewEvaluation
}: ComposicionResumenProps) {

    if (!resultados || !ultimaMedida) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/5">
                <Scale className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground">Sin datos antropométricos</h3>
                <p className="text-sm text-muted-foreground/80 max-w-md mt-2 mb-6">
                    Este paciente aún no tiene evaluaciones registradas. Comienza creando una nueva evaluación.
                </p>
                <Button onClick={onNewEvaluation}>
                    <PlusCircle className="w-4 h-4 mr-2" /> Crear Primera Evaluación
                </Button>
            </div>
        );
    }

    // Helper for classification pills (Simplified logic for demo)
    const getFatClass = (fat: number, sex: string) => {
        // Simple ISAK-based ranges (approx)
        if (sex === 'masculino') {
            if (fat < 5) return { label: 'Bajo', color: 'bg-blue-100 text-blue-700' };
            if (fat < 15) return { label: 'Atleta', color: 'bg-green-100 text-green-700' };
            if (fat < 25) return { label: 'Promedio', color: 'bg-yellow-100 text-yellow-700' };
            return { label: 'Alto', color: 'bg-red-100 text-red-700' };
        } else {
            if (fat < 12) return { label: 'Bajo', color: 'bg-blue-100 text-blue-700' };
            if (fat < 22) return { label: 'Atleta', color: 'bg-green-100 text-green-700' };
            if (fat < 32) return { label: 'Promedio', color: 'bg-yellow-100 text-yellow-700' };
            return { label: 'Alto', color: 'bg-red-100 text-red-700' };
        }
    };

    const fatClass = getFatClass(resultados.porcentajeGrasa, ultimaMedida.sexo || 'otro');

    const isRapid = ultimaMedida.tipoPaciente === 'rapida';
    const isControl = ultimaMedida.tipoPaciente === 'control';
    const showComposition = !isRapid && !isControl;

    // Calculate Sum of Skinfolds for Control profile
    const sumPliegues = ultimaMedida.pliegues
        ? Object.values(ultimaMedida.pliegues).reduce((a, b) => Number(a || 0) + Number(b || 0), 0)
        : 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header & Formula Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-slate-100 dark:border-[#334155] shadow-sm">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Composición Corporal</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Resultados basados en protocolo ISAK</p>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600">
                    <Activity className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Fórmula:</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {formulaSeleccionada}
                    </span>
                </div>
            </div>

            {showComposition ? (
                <FractionationResults data={ultimaMedida} />
            ) : (
                /* Limited View for Rapid/Control profiles */
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {/* ... (Keep existing simple cards for limit profiles if needed, or just let FractionationResults handle errors gracefully) ... 
                         For now, I will keep the simple cards ONLY for profiles that are NOT detailed, 
                         but the logic `showComposition` was (!isRapid && !isControl). 
                         So if it IS detailed, we show FractionationResults.
                     */}

                    {/* 4. IMC (Always visible) */}
                    <Card className="border-none shadow-sm bg-white dark:bg-[#1e293b] dark:border dark:border-[#334155] relative overflow-hidden group hover:shadow-md transition-all duration-300">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Scale className="w-24 h-24 text-blue-500 transform rotate-0" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider flex justify-between items-center">
                                IMC
                                <Info className="w-3 h-3 text-slate-300" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-slate-900 dark:text-white">{ultimaMedida.imc?.toFixed(1)}</span>
                                <span className="text-sm font-medium text-slate-400">kg/m²</span>
                            </div>
                            <div className="mt-2 inline-flex items-center px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                                {ultimaMedida.imc && ultimaMedida.imc < 25 ? 'Normopeso' : 'Controlar'}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sumatoria Pliegues - Only for Control */}
                    {isControl && (
                        <Card className="border-none shadow-sm bg-white dark:bg-[#1e293b] dark:border dark:border-[#334155] relative overflow-hidden group hover:shadow-md transition-all duration-300">
                            {/* ... Content ... */}
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                                    Sumatoria Pliegues
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-bold text-slate-900 dark:text-white">{sumPliegues.toFixed(1)}</span>
                                    <span className="text-sm font-medium text-slate-400">mm</span>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
