"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { Baby, Calendar, Scale, Activity } from "lucide-react";
import { AnthropometryTabs } from "../navigation/AnthropometryTabs";
import { NewPediatricMeasurementForm, PediatricMeasurementData, LivePreviewData, PediatricMeasurementFormRef } from "@/components/pediatrics/NewPediatricMeasurementForm";
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
    initialWeight?: number;
    initialHeight?: number;
    initialHeadCircumference?: number;
    medidas: MedidasAntropometricas[];
    onSave: (data: PediatricMeasurementData) => void;
    onDeleteMedida?: (id: string) => void;
}

export function InfantAnthropometryLayout({
    patientId,
    patientName,
    patientBirthDate,
    patientSex,
    initialWeight,
    initialHeight,
    initialHeadCircumference,
    medidas,
    onSave,
    onDeleteMedida
}: InfantAnthropometryLayoutProps) {
    const [activeTab, setActiveTab] = useState("crecimiento");
    const [activeChart, setActiveChart] = useState<'peso' | 'longitud' | 'pesoLength' | 'cefaliaca'>('peso');
    const [livePreviewData, setLivePreviewData] = useState<LivePreviewData>({});

    const formRef = useRef<PediatricMeasurementFormRef>(null);

    // Callback to receive live form data
    const handleLiveDataChange = useCallback((data: LivePreviewData) => {
        setLivePreviewData(data);
    }, []);

    // Prepare Chart Data
    const sex = patientSex === 'femenino' ? 'female' : 'male';
    const birthDateObj = new Date(patientBirthDate);

    // Calculate current age for live preview point
    const currentAgeMonths = useMemo(() => {
        const now = new Date();
        const ageMs = now.getTime() - birthDateObj.getTime();
        return Math.round((ageMs / (1000 * 60 * 60 * 24 * 30.4375)) * 100) / 100;
    }, [birthDateObj]);

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

    const weightLengthChartData: PatientDataPoint[] = medidas.map(m => {
        const measureDate = new Date(m.fecha);
        const ageMs = measureDate.getTime() - birthDateObj.getTime();
        const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.4375);
        const zRes = calculateZScore(m.peso, m.talla, sex, 'wflh'); // Weight for Length

        return {
            ageInMonths: m.talla, // Using length as "age" axis for WFL charts
            value: m.peso,
            date: typeof m.fecha === 'string' ? m.fecha : new Date(m.fecha).toISOString(),
            zScore: zRes?.zScore,
            diagnosis: zRes?.diagnosis,
            ageInDays: calculateExactAgeInDays(patientBirthDate, m.fecha)
        };
    }).filter(p => p.value > 0);

    const hcChartData: PatientDataPoint[] = medidas
        .filter(m => {
            const hasHC = m.headCircumference !== undefined && m.headCircumference !== null && m.headCircumference > 0;
            return hasHC;
        })
        .map(m => {
            const measureDate = new Date(m.fecha);
            const ageMs = measureDate.getTime() - birthDateObj.getTime();
            const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.4375);
            const hc = m.headCircumference || 0;
            const zRes = calculateZScore(hc, ageMonths, sex, 'hcfa');

            return {
                ageInMonths: Math.round(ageMonths * 100) / 100,
                value: hc,
                date: typeof m.fecha === 'string' ? m.fecha : new Date(m.fecha).toISOString(),
                zScore: zRes?.zScore,
                diagnosis: zRes?.diagnosis,
                ageInDays: calculateExactAgeInDays(patientBirthDate, m.fecha)
            };
        }).filter(p => p.ageInMonths >= 0 && p.ageInMonths <= 24);

    // Create live preview point for HC chart when user is editing
    const hcPreviewPoint: PatientDataPoint | null = useMemo(() => {
        if (livePreviewData.headCircumferenceCm && livePreviewData.headCircumferenceCm > 0) {
            const zRes = calculateZScore(livePreviewData.headCircumferenceCm, currentAgeMonths, sex, 'hcfa');
            return {
                ageInMonths: currentAgeMonths,
                value: livePreviewData.headCircumferenceCm,
                date: new Date().toISOString(),
                zScore: zRes?.zScore,
                diagnosis: zRes?.diagnosis,
                ageInDays: Math.floor(currentAgeMonths * 30.4375),
                isPreview: true // Mark as preview for styling
            };
        }
        return null;
    }, [livePreviewData.headCircumferenceCm, currentAgeMonths, sex]);

    // Combine saved data with live preview
    const hcChartDataWithPreview = useMemo(() => {
        if (hcPreviewPoint) {
            return [...hcChartData, hcPreviewPoint];
        }
        return hcChartData;
    }, [hcChartData, hcPreviewPoint]);


    return (
        <div className="space-y-6">
            <AnthropometryTabs
                tabs={[
                    { id: "crecimiento", label: "Crecimiento OMS (Lactante)", icon: Baby },
                    { id: "historial", label: "Historial", icon: Calendar },
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onSave={() => formRef.current?.submit()}
            />

            <div className="animate-in fade-in duration-300">
                {activeTab === "crecimiento" && (
                    <div className="space-y-6">
                        {/* Formulario */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800">
                            <NewPediatricMeasurementForm
                                ref={formRef}
                                patientId={patientId}
                                patientName={patientName}
                                patientBirthDate={patientBirthDate}
                                patientSex={sex}
                                initialWeight={initialWeight}
                                initialHeight={initialHeight}
                                initialHeadCircumference={initialHeadCircumference}
                                onSave={onSave}
                                onLiveDataChange={handleLiveDataChange}
                            />
                        </div>

                        {/* Charts */}

                        {/* Chart Tabs */}
                        <div className="flex justify-center mb-4">
                            <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg overflow-x-auto max-w-full">
                                <button
                                    onClick={() => setActiveChart('peso')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeChart === 'peso'
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                        }`}
                                >
                                    Peso/Edad
                                </button>
                                <button
                                    onClick={() => setActiveChart('longitud')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeChart === 'longitud'
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                        }`}
                                >
                                    Longitud/Edad
                                </button>
                                <button
                                    onClick={() => setActiveChart('pesoLength')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeChart === 'pesoLength'
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                        }`}
                                >
                                    Peso/Longitud
                                </button>
                                <button
                                    onClick={() => setActiveChart('cefaliaca')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeChart === 'cefaliaca'
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                        }`}
                                >
                                    P. Cefálico/Edad
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
                            {activeChart === 'pesoLength' && (
                                <PediatricGrowthChart
                                    indicator="wflh"
                                    sex={sex}
                                    patientData={weightLengthChartData}
                                    patientName={patientName}
                                    startMonth={45} // Start length in cm
                                    endMonth={110}  // End length in cm
                                />
                            )}
                            {activeChart === 'cefaliaca' && (
                                <PediatricGrowthChart
                                    indicator="hcfa"
                                    sex={sex}
                                    patientData={hcChartDataWithPreview}
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
