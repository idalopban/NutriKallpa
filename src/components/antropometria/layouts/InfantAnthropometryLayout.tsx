"use client";

import { useState } from "react";
import { Baby, Calendar, Scale, Activity } from "lucide-react";
import { AnthropometryTabs } from "../navigation/AnthropometryTabs";
import { NewPediatricMeasurementForm, PediatricMeasurementData } from "@/components/pediatrics/NewPediatricMeasurementForm";
import { PediatricGrowthChart, PatientDataPoint } from "@/components/pediatrics/PediatricGrowthChart";
import { MedidasAntropometricas } from "@/types";
import { calculateZScore } from "@/lib/growth-standards";
import { calculateExactAgeInDays } from "@/lib/clinical-calculations";
import { EvaluationHistory } from "../EvaluationHistory";

interface InfantAnthropometryLayoutProps {
    patientId: string;
    patientName: string;
    patientBirthDate: string;
    patientSex: 'masculino' | 'femenino';
    medidas: MedidasAntropometricas[];
    onSave: (data: PediatricMeasurementData) => void;
    onDeleteMedida?: (id: string) => void;
}

export function InfantAnthropometryLayout({
    patientId,
    patientName,
    patientBirthDate,
    patientSex,
    medidas,
    onSave,
    onDeleteMedida
}: InfantAnthropometryLayoutProps) {
    const [activeTab, setActiveTab] = useState("crecimiento");
    const [activeChart, setActiveChart] = useState<'peso' | 'longitud'>('peso');

    // Prepare Chart Data
    const sex = patientSex === 'femenino' ? 'female' : 'male';
    const birthDateObj = new Date(patientBirthDate);

    const weightChartData: PatientDataPoint[] = medidas.map(m => {
        const measureDate = new Date(m.fecha);
        const ageMs = measureDate.getTime() - birthDateObj.getTime();
        const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.4375);
        const zRes = calculateZScore(m.peso, ageMonths, sex, 'wfa');

        return {
            ageInMonths: Math.round(ageMonths * 100) / 100,
            value: m.peso,
            date: typeof m.fecha === 'string' ? m.fecha : new Date(m.fecha).toISOString(),
            zScore: zRes?.zScore,
            diagnosis: zRes?.diagnosis,
            ageInDays: calculateExactAgeInDays(patientBirthDate, m.fecha)
        };
    }).filter(p => p.ageInMonths >= 0 && p.ageInMonths <= 24);

    const lengthChartData: PatientDataPoint[] = medidas.map(m => {
        const measureDate = new Date(m.fecha);
        const ageMs = measureDate.getTime() - birthDateObj.getTime();
        const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.4375);
        const zRes = calculateZScore(m.talla, ageMonths, sex, 'lhfa'); // Length for age

        return {
            ageInMonths: Math.round(ageMonths * 100) / 100,
            value: m.talla,
            date: typeof m.fecha === 'string' ? m.fecha : new Date(m.fecha).toISOString(),
            zScore: zRes?.zScore,
            diagnosis: zRes?.diagnosis,
            ageInDays: calculateExactAgeInDays(patientBirthDate, m.fecha)
        };
    }).filter(p => p.ageInMonths >= 0 && p.ageInMonths <= 24);


    return (
        <div className="space-y-6">
            <AnthropometryTabs
                tabs={[
                    { id: "crecimiento", label: "Crecimiento OMS (Lactante)", icon: Baby },
                    { id: "historial", label: "Historial", icon: Calendar },
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            <div className="animate-in fade-in duration-300">
                {activeTab === "crecimiento" && (
                    <div className="space-y-6">
                        {/* Formulario */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800">
                            <NewPediatricMeasurementForm
                                patientId={patientId}
                                patientName={patientName}
                                patientBirthDate={patientBirthDate}
                                patientSex={sex}
                                onSave={onSave}
                            />
                        </div>

                        {/* Charts */}

                        {/* Chart Tabs */}
                        <div className="flex justify-center mb-4">
                            <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                <button
                                    onClick={() => setActiveChart('peso')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeChart === 'peso'
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                        }`}
                                >
                                    Peso / Edad
                                </button>
                                <button
                                    onClick={() => setActiveChart('longitud')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeChart === 'longitud'
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                        }`}
                                >
                                    Longitud / Edad
                                </button>
                            </div>
                        </div>

                        {/* Active Chart */}
                        <div className="min-h-[500px]">
                            {activeChart === 'peso' && (
                                <PediatricGrowthChart
                                    indicator="wfa"
                                    sex={sex}
                                    patientData={weightChartData}
                                    patientName={patientName}
                                    startMonth={0}
                                    endMonth={24}
                                />
                            )}
                            {activeChart === 'longitud' && (
                                <PediatricGrowthChart
                                    indicator="lhfa"
                                    sex={sex}
                                    patientData={lengthChartData}
                                    patientName={patientName}
                                    startMonth={0}
                                    endMonth={24}
                                />
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "historial" && (
                    <EvaluationHistory
                        medidas={medidas}
                        onDelete={onDeleteMedida || (() => { })}
                    />
                )}
            </div>
        </div>
    );
}
