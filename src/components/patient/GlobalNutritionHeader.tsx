"use client";

import React from 'react';
import { Target, Scale, Zap, Activity, FileText, Droplet } from 'lucide-react';
import { usePatientNutrition, usePatientStore } from '@/store/usePatientStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { generateDossierPDF } from '@/lib/pdf/generateDossierPDF';
import { calculateHydration } from '@/lib/hydration-calculator';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface GlobalNutritionHeaderProps {
    className?: string;
}

export function GlobalNutritionHeader({ className }: GlobalNutritionHeaderProps) {
    const {
        totalCalories,
        proteinaRatio,
        proteinaGramos,
        carbsGramos,
        grasasGramos,
        effectiveFormulaName,
        proteinBasisLabel,
        isPediatric,
        isGeriatric,
        tdee,
        objetivoLabel,
        config,
        bmi,
        bmiDiagnostico,
        hydration,
        patientAge
    } = usePatientNutrition();

    const { patient, medidas } = usePatientStore();
    const { toast } = useToast();
    const [isExporting, setIsExporting] = useState(false);

    const peso = patient?.datosPersonales.peso || 70;
    const talla = patient?.datosPersonales.talla || 170;
    const sexo = patient?.datosPersonales.sexo || 'masculino';
    const edad = patientAge;
    const isInfant = edad < 2;

    // Use hydration from store
    const hydrationRec = hydration;

    const handleExport = async () => {
        if (!patient) return;
        setIsExporting(true);
        try {
            await generateDossierPDF({
                paciente: patient,
                ultimaMedida: medidas[0],
                nutrition: {
                    totalCalories,
                    proteinaGramos,
                    carbsGramos,
                    grasasGramos,
                    proteinBasisLabel,
                    objetivoLabel,
                    tdee
                },
                hydration: {
                    totalDailyML: hydrationRec.ml,
                    glassesPerDay: Math.ceil(hydrationRec.ml / 250)
                },
                mealMoments: config.mealMoments || []
            });
            toast({
                title: "Reporte Generado",
                description: "El dossier ejecutivo se ha descargado correctamente.",
            });
        } catch (error) {
            console.error("Error exporting PDF:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo generar el reporte PDF.",
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className={cn(
            "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-6",
            className
        )}>
            {isInfant ? (
                <>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-medium text-slate-400 tracking-wider">Plan Alimentación (0-2 años)</p>
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-none capitalize max-w-[180px]">
                                {edad < 0.5 ? 'Lactancia Exclusiva' :
                                    edad < 0.75 ? 'AC (Papillas)' :
                                        edad < 1 ? 'AC (Picado)' :
                                            'Dieta Familiar'}
                            </p>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 hidden md:block" />

                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600">
                            <Scale className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-medium text-slate-400 tracking-wider">Peso/Edad (Diagnóstico)</p>
                            <p className="text-base font-bold text-slate-800 dark:text-white leading-none">
                                {bmiDiagnostico || 'Evaluación Pendiente'}
                            </p>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-medium text-slate-400 tracking-wider">Fórmula activa</p>
                            <p className="text-lg font-semibold text-slate-700 dark:text-slate-200 leading-none capitalize">
                                {effectiveFormulaName || 'Mifflin'}
                            </p>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 hidden md:block" />

                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600">
                            <Scale className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-medium text-slate-400 tracking-wider">Estado Clínico (IMC)</p>
                            <p className="text-xl font-bold text-slate-800 dark:text-white leading-none">
                                {bmi} <span className="text-[10px] font-medium text-slate-400">kg/m²</span>
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                                <p className={cn(
                                    "text-[10px] font-semibold uppercase truncate max-w-[150px]",
                                    bmiDiagnostico.includes('Normal') ? "text-emerald-500" : "text-rose-500"
                                )}>
                                    {bmiDiagnostico}
                                </p>
                                {isGeriatric && (
                                    <span className="text-[9px] font-medium text-slate-400">(Meta: 23-28)</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 hidden md:block" />

                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-medium text-slate-400 tracking-wider">Proteína meta</p>
                            <p className="text-xl font-bold text-slate-800 dark:text-white leading-none">
                                {proteinaRatio} <span className="text-sm font-medium text-slate-400">g/kg</span>
                                <span className="ml-2 text-xs font-medium text-blue-500">({proteinaGramos}g)</span>
                            </p>
                            <p className="text-[9px] font-medium text-blue-400 uppercase leading-none mt-1">
                                Base: {proteinBasisLabel}
                            </p>
                        </div>
                    </div>
                </>
            )}

            {(isPediatric || isGeriatric) && (
                <>
                    <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 hidden md:block" />
                    <div className="flex items-center gap-2">
                        {isPediatric && (
                            <span className="px-2.5 py-1 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 text-[10px] font-bold uppercase tracking-tight ring-1 ring-pink-200 dark:ring-pink-800/50">
                                🧒 Pediátrico
                            </span>
                        )}
                        {isGeriatric && (
                            <span className="px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px] font-bold uppercase tracking-tight ring-1 ring-purple-200 dark:ring-purple-800/50">
                                👴 Geriátrico
                            </span>
                        )}
                    </div>
                </>
            )}

            <div className="ml-auto flex items-center gap-3">
                <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 hidden lg:block" />

                <div className="hidden xl:flex items-center gap-3 mr-4">
                    <div className="w-9 h-9 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600">
                        <Droplet className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[9px] uppercase font-medium text-slate-400 tracking-wider leading-tight">Agua Recomendada</p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-none">
                            {isInfant ? (
                                edad < 0.5 ? 'No indicada (< 6m)' : 'A demanda'
                            ) : (
                                <>{(hydration.ml / 1000).toFixed(1)}L <span className="text-[10px] font-medium text-slate-400">/ día</span></>
                            )}
                        </p>
                        <p className="text-[9px] font-medium text-cyan-500 uppercase leading-none mt-0.5">
                            {isInfant ? 'Lactancia/Comp.' : (hydration.metodo || 'Holiday-Segar')}
                        </p>
                    </div>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={isExporting}
                    className="h-11 rounded-xl border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 gap-2 font-bold px-5 transition-all hover:scale-[1.02]"
                >
                    <FileText className={cn("w-4 h-4", isExporting && "animate-pulse")} />
                    {isExporting ? "Generando..." : "Exportar Dossier"}
                </Button>
            </div>
        </div>
    );
}
