"use client";

import { useState, useRef } from "react";
import { Baby, Calendar, Scale, Activity, User, Ruler, History } from "lucide-react";
import { AnthropometryTabs } from "../navigation/AnthropometryTabs";
import { NewPediatricMeasurementForm, PediatricMeasurementData, PediatricMeasurementFormRef } from "@/components/pediatrics/NewPediatricMeasurementForm";
import { PediatricGrowthChart, PatientDataPoint } from "@/components/pediatrics/PediatricGrowthChart";
import { MedidasAntropometricas } from "@/types";
import { calculateZScore } from "@/lib/growth-standards";
import { calculateExactAgeInDays } from "@/lib/clinical-calculations";
import { EvaluationHistory } from "../EvaluationHistory";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FullMeasurementData } from "../UnifiedMeasurementForm";

interface PreschoolAnthropometryLayoutProps {
    patientId: string;
    patientName: string;
    patientBirthDate: string;
    patientSex: 'masculino' | 'femenino';
    medidas: MedidasAntropometricas[];
    onSavePediatric: (data: PediatricMeasurementData) => void;
    onSaveAdult: (data: FullMeasurementData) => void;
    onDeleteMedida?: (id: string) => void;
    initialWeight?: number;
    initialHeight?: number;
}

export function PreschoolAnthropometryLayout({
    patientId,
    patientName,
    patientBirthDate,
    patientSex,
    medidas,
    onSavePediatric,
    onSaveAdult,
    onDeleteMedida,
    initialWeight = 0,
    initialHeight = 0
}: PreschoolAnthropometryLayoutProps) {
    const [activeTab, setActiveTab] = useState("crecimiento");
    const [activeChart, setActiveChart] = useState<'talla' | 'imc'>('talla');

    const formRef = useRef<PediatricMeasurementFormRef>(null);

    // Prepare Chart Data
    const sex = patientSex === 'femenino' ? 'female' : 'male';
    const birthDateObj = new Date(patientBirthDate);

    const weightChartData: PatientDataPoint[] = medidas.map(m => {
        const measureDate = typeof m.fecha === 'string' ? new Date(m.fecha) : m.fecha;
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
    }).filter(p => p.ageInMonths >= 24 && p.ageInMonths <= 60); // 2 to 5 years

    const heightChartData: PatientDataPoint[] = medidas.map(m => {
        const measureDate = typeof m.fecha === 'string' ? new Date(m.fecha) : m.fecha;
        const ageMs = measureDate.getTime() - birthDateObj.getTime();
        const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.4375);
        const zRes = calculateZScore(m.talla, ageMonths, sex, 'lhfa');

        return {
            ageInMonths: Math.round(ageMonths * 100) / 100,
            value: m.talla,
            date: typeof m.fecha === 'string' ? m.fecha : new Date(m.fecha).toISOString(),
            zScore: zRes?.zScore,
            diagnosis: zRes?.diagnosis,
            ageInDays: calculateExactAgeInDays(patientBirthDate, m.fecha)
        };
    }).filter(p => p.ageInMonths >= 24 && p.ageInMonths <= 60);

    const bmiChartData: PatientDataPoint[] = medidas
        .filter(m => m.peso && m.talla)
        .map(m => {
            const measureDate = typeof m.fecha === 'string' ? new Date(m.fecha) : m.fecha;
            const ageMs = measureDate.getTime() - birthDateObj.getTime();
            const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.4375);
            const hM = m.talla / 100;
            const bmi = m.peso / (hM * hM);
            const zRes = calculateZScore(bmi, ageMonths, sex, 'bfa');

            return {
                ageInMonths: Math.round(ageMonths * 100) / 100,
                value: bmi,
                date: typeof m.fecha === 'string' ? m.fecha : new Date(m.fecha).toISOString(),
                zScore: zRes?.zScore,
                diagnosis: zRes?.diagnosis,
                ageInDays: calculateExactAgeInDays(patientBirthDate, m.fecha)
            };
        }).filter(p => p.ageInMonths >= 24 && p.ageInMonths <= 60);


    return (
        <div className="space-y-6">
            <AnthropometryTabs
                tabs={[
                    { id: "crecimiento", label: "Crecimiento OMS (2-5 años)", icon: Baby },
                    { id: "historial", label: "Historial", icon: History },
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onSave={() => formRef.current?.submit()}
            />

            <div className="animate-in fade-in duration-300">
                {activeTab === "crecimiento" && (
                    <div className="space-y-6">
                        {/* Formulario */}
                        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <Ruler className="w-5 h-5 text-brand-primary" />
                                    Nueva Medición (Preescolar)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <NewPediatricMeasurementForm
                                    ref={formRef}
                                    patientId={patientId}
                                    patientName={patientName}
                                    patientBirthDate={patientBirthDate}
                                    patientSex={sex}
                                    initialWeight={initialWeight}
                                    initialHeight={initialHeight}
                                    onSave={onSavePediatric}
                                />
                            </CardContent>
                        </Card>

                        {/* Chart Tabs */}
                        <div className="flex justify-center mb-4">
                            <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                <button
                                    onClick={() => setActiveChart('talla')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeChart === 'talla'
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                        }`}
                                >
                                    Talla / Edad
                                </button>
                                <button
                                    onClick={() => setActiveChart('imc')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeChart === 'imc'
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                        }`}
                                >
                                    IMC / Edad
                                </button>
                            </div>
                        </div>

                        {/* Active Chart */}
                        <div className="min-h-[500px]">
                            {activeChart === 'talla' && (
                                <PediatricGrowthChart
                                    indicator="lhfa"
                                    sex={sex}
                                    patientData={heightChartData}
                                    patientName={patientName}
                                    startMonth={24}
                                    endMonth={60}
                                />
                            )}
                            {activeChart === 'imc' && (
                                <PediatricGrowthChart
                                    indicator="bfa" // BMI for age is better for > 2y than weight for age
                                    sex={sex}
                                    patientData={bmiChartData}
                                    patientName={patientName}
                                    startMonth={24}
                                    endMonth={60}
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
