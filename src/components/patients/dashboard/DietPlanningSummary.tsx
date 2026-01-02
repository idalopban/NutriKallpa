import React from 'react';
import { Paciente } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Apple, MoreHorizontal } from "lucide-react";
import { usePatientNutrition } from "@/store/usePatientStore";
import { NutritionalDonut } from "@/components/diet/NutritionalDonut";

interface DietPlanningSummaryProps {
    stage: string;
    paciente: Paciente;
}

export const DietPlanningSummary: React.FC<DietPlanningSummaryProps> = ({ stage, paciente }) => {
    const { effectiveFormulaName, totalCalories, macroProteina, macroCarbohidratos, macroGrasa, proteinaGramos } = usePatientNutrition();

    const donutData = {
        protein: { grams: proteinaGramos, percent: macroProteina },
        carbs: { grams: (totalCalories * (macroCarbohidratos / 100)) / 4, percent: macroCarbohidratos },
        fat: { grams: (totalCalories * (macroGrasa / 100)) / 9, percent: macroGrasa }
    };

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Apple className="w-5 h-5 text-[#ff8508]" />
                        Estrategia Nutricional
                    </h3>
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-slate-500">Variables críticas para el plan de alimentación</p>
                        {effectiveFormulaName && (
                            <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800 py-0 h-5">
                                Base: {effectiveFormulaName}
                            </Badge>
                        )}
                    </div>
                </div>
                <MoreHorizontal className="text-slate-300 w-5 h-5" />
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Visualización de Macros Compartida */}
                <div className="lg:col-span-5">
                    <Card className="bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold uppercase text-slate-500 tracking-wider">Distribución Meta</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center">
                            <NutritionalDonut
                                data={donutData}
                                totalCalories={totalCalories}
                                size="sm"
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Enfoque Específico por Etapa */}
                <div className="lg:col-span-7">
                    {stage === 'PEDIATRIC' && <PediatricDietFocus paciente={paciente} />}
                    {stage === 'GERIATRIC' && <GeriatricDietFocus paciente={paciente} />}
                    {stage === 'ADULT' && <AdultDietFocus paciente={paciente} />}
                </div>
            </div>
        </div>
    );
};

const PediatricDietFocus: React.FC<{ paciente: Paciente }> = ({ paciente }) => {
    const birthDate = new Date(paciente.datosPersonales.fechaNacimiento);
    const now = new Date();
    const ageInMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth());

    return (
        <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm">
                    <CardHeader className="pb-1 px-4 pt-4">
                        <CardTitle className="text-[10px] font-bold uppercase text-slate-500">Esquema Sugerido</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <p className="text-sm font-bold text-[#ff8508]">
                            {ageInMonths < 6 ? "Lactancia Exclusiva" :
                                ageInMonths <= 24 ? "Alimentación Complementaria" :
                                    "Dieta Completa / Familiar"}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm">
                    <CardHeader className="pb-1 px-4 pt-4">
                        <CardTitle className="text-[10px] font-bold uppercase text-slate-500">Textura</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <p className="text-sm font-bold text-slate-800 dark:text-white">
                            {ageInMonths < 9 ? "Papilla / Puré" :
                                ageInMonths < 12 ? "Picado Finito" :
                                    "Sólidos / Trozos"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30 shadow-none">
                <CardHeader className="pb-1 px-4 pt-4">
                    <CardTitle className="text-[10px] font-bold uppercase text-red-600">Suplementación (NTS)</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                    <p className="text-base font-black text-red-700 dark:text-red-400">
                        {paciente.pediatricInfo?.isPremature ? "Sulfato Ferroso" : "Dosis Preventiva"}
                    </p>
                    <p className="text-[10px] text-red-600/70 font-medium">Según guías vigentes</p>
                </CardContent>
            </Card>
        </div>
    );
};

const GeriatricDietFocus: React.FC<{ paciente: Paciente }> = ({ paciente }) => {
    return (
        <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm">
                    <CardHeader className="pb-1 px-4 pt-4">
                        <CardTitle className="text-[10px] font-bold uppercase text-slate-500">Hidratación</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <div className="flex gap-1 items-center mb-1">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="w-2.5 h-4 rounded-sm bg-blue-400 border border-blue-500" />
                            ))}
                        </div>
                        <p className="text-xs font-bold text-blue-700">6-8 Vasos/día</p>
                    </CardContent>
                </Card>
                <Card className="bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30 shadow-sm">
                    <CardHeader className="pb-1 px-4 pt-4">
                        <CardTitle className="text-[10px] font-bold uppercase text-indigo-600">Prot. Sarcopenia</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <p className="text-base font-black text-indigo-700 dark:text-indigo-400">1.2 - 1.5 <span className="text-[10px] font-bold">g/kg</span></p>
                    </CardContent>
                </Card>
            </div>
            <Card className="bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm">
                <CardHeader className="pb-1 px-4 pt-4">
                    <CardTitle className="text-[10px] font-bold uppercase text-slate-500">Consistencia Sugerida</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 flex gap-2 flex-wrap">
                    <Badge className="bg-green-50 text-green-700 border-green-200 py-0 text-[10px]">Normal</Badge>
                    <Badge variant="outline" className="text-slate-400 border-slate-200 py-0 text-[10px]">Blanda / Puré</Badge>
                </CardContent>
            </Card>
        </div>
    );
};

const AdultDietFocus: React.FC<{ paciente: Paciente }> = ({ paciente }) => {
    return (
        <div className="space-y-4">
            <Card className="bg-[#6cba00]/5 border-[#6cba00]/20 dark:bg-green-950/10 shadow-none">
                <CardHeader className="pb-1 px-4 pt-4">
                    <CardTitle className="text-[10px] font-bold uppercase text-[#5aa300] tracking-wider">Sugerencia Calórica</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                    <p className="text-3xl font-black text-[#5aa300]">GET <span className="text-xl">± 300</span> <span className="text-sm font-bold">kcal</span></p>
                    <p className="text-[10px] text-[#5aa300]/70 font-bold uppercase">Según objetivo nutricional</p>
                </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
                    <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Fibra Meta</p>
                    <p className="text-base font-black text-slate-700 dark:text-slate-200">25 - 30g</p>
                </div>
                <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
                    <p className="text-[9px] uppercase font-bold text-slate-400 mb-1">Agua mín.</p>
                    <p className="text-base font-black text-slate-700 dark:text-slate-200">2.5 L</p>
                </div>
            </div>
        </div>
    );
};
