"use client";

import { useState, useRef } from "react";
import { Baby, Calendar, Scale, Activity, User, Ruler, History, PieChart, FileDown, Save } from "lucide-react";
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
import { AdultAnthropometryLayout } from "./AdultAnthropometryLayout";
import { FullMeasurementData } from "../UnifiedMeasurementForm";
import { AdolescentEvaluation } from "../AdolescentEvaluation";
import { PediatricBodyCompositionPanel } from "../PediatricBodyCompositionPanel";
import { calculateChronologicalAge } from "@/lib/clinical-calculations";

interface SchoolAnthropometryLayoutProps {
    patientId: string;
    patientName: string;
    patientBirthDate: string;
    patientSex: 'masculino' | 'femenino';
    medidas: MedidasAntropometricas[];
    onSavePediatric: (data: PediatricMeasurementData) => void;
    onSaveAdult: (data: FullMeasurementData) => void;
    onDeleteMedida?: (id: string) => void;
    isTeenager?: boolean; // > 15 years
    initialWeight?: number;
    initialHeight?: number;
}

export function SchoolAnthropometryLayout({
    patientId,
    patientName,
    patientBirthDate,
    patientSex,
    medidas,
    onSavePediatric,
    onSaveAdult,
    onDeleteMedida,
    isTeenager = false,
    initialWeight = 0,
    initialHeight = 0
}: SchoolAnthropometryLayoutProps) {
    const [activeTab, setActiveTab] = useState("crecimiento");
    const [activeChart, setActiveChart] = useState<'talla' | 'imc'>('talla');
    const [enableIsak, setEnableIsak] = useState(false);

    // Ref for external form submit
    const formRef = useRef<PediatricMeasurementFormRef>(null);

    // Biological age from Tanner staging (for adolescents)
    const [biologicalAge, setBiologicalAge] = useState<number | null>(null);
    const [useBiologicalAge, setUseBiologicalAge] = useState(false);

    // Handle biological age change from Adolescent module
    const handleBiologicalAgeChange = (bioAge: number | null, shouldUse: boolean) => {
        setBiologicalAge(bioAge);
        setUseBiologicalAge(shouldUse);
    };

    // If ISAK protocol is enabled, render the Adult layout
    if (enableIsak && isTeenager) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-end px-4">
                    <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                        <Switch id="isak-mode" checked={enableIsak} onCheckedChange={setEnableIsak} />
                        <Label htmlFor="isak-mode" className="text-sm font-medium cursor-pointer">
                            Protocolo ISAK (Deportista)
                        </Label>
                    </div>
                </div>
                <AdultAnthropometryLayout
                    patientName={patientName}
                    patientGender={patientSex}
                    patientBirthDate={patientBirthDate}
                    initialWeight={initialWeight}
                    initialHeight={initialHeight}
                    medidas={medidas}
                    onSave={onSaveAdult}
                    onDeleteMedida={onDeleteMedida}
                />
            </div>
        );
    }

    // Prepare Chart Data
    const sex = patientSex === 'femenino' ? 'female' : 'male';
    const birthDateObj = new Date(patientBirthDate);

    /**
     * Calculate effective age in months for Z-score calculations.
     * If biological age should be used (Tanner discrepancy), adjust the age.
     */
    const getEffectiveAgeMonths = (measureDate: Date): number => {
        const ageMs = measureDate.getTime() - birthDateObj.getTime();
        const chronoMonths = ageMs / (1000 * 60 * 60 * 24 * 30.4375);

        if (useBiologicalAge && biologicalAge) {
            // Calculate the age difference and apply it
            const chronoYears = chronoMonths / 12;
            const ageDiffYears = biologicalAge - chronoYears;
            // Apply the difference: if biological age is higher, use higher months
            return (chronoYears + ageDiffYears) * 12;
        }

        return chronoMonths;
    };

    const weightChartData: PatientDataPoint[] = medidas.map(m => {
        const measureDate = typeof m.fecha === 'string' ? new Date(m.fecha) : m.fecha;
        const ageMs = measureDate.getTime() - birthDateObj.getTime();
        const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.4375);
        const effectiveAgeMonths = getEffectiveAgeMonths(measureDate);
        const zRes = calculateZScore(m.peso, effectiveAgeMonths, sex, 'wfa');

        return {
            ageInMonths: Math.round(effectiveAgeMonths * 100) / 100, // Use biological age for chart position
            value: m.peso,
            date: typeof m.fecha === 'string' ? m.fecha : new Date(m.fecha).toISOString(),
            zScore: zRes?.zScore,
            diagnosis: zRes?.diagnosis,
            ageInDays: calculateExactAgeInDays(patientBirthDate, m.fecha)
        };
    }).filter(p => p.ageInMonths >= 60 && p.ageInMonths <= 228); // 5 to 19 years

    const heightChartData: PatientDataPoint[] = medidas.map(m => {
        const measureDate = typeof m.fecha === 'string' ? new Date(m.fecha) : m.fecha;
        const ageMs = measureDate.getTime() - birthDateObj.getTime();
        const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.4375);
        const effectiveAgeMonths = getEffectiveAgeMonths(measureDate);
        const zRes = calculateZScore(m.talla, effectiveAgeMonths, sex, 'lhfa');

        return {
            ageInMonths: Math.round(effectiveAgeMonths * 100) / 100, // Use biological age for chart position
            value: m.talla,
            date: typeof m.fecha === 'string' ? m.fecha : new Date(m.fecha).toISOString(),
            zScore: zRes?.zScore,
            diagnosis: zRes?.diagnosis,
            ageInDays: calculateExactAgeInDays(patientBirthDate, m.fecha)
        };
    }).filter(p => p.ageInMonths >= 60 && p.ageInMonths <= 228);

    const bmiChartData: PatientDataPoint[] = medidas
        .filter(m => m.peso && m.talla)
        .map(m => {
            const measureDate = typeof m.fecha === 'string' ? new Date(m.fecha) : m.fecha;
            const ageMs = measureDate.getTime() - birthDateObj.getTime();
            const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.4375);
            const effectiveAgeMonths = getEffectiveAgeMonths(measureDate);
            const hM = m.talla / 100;
            const bmi = m.peso / (hM * hM);
            const zRes = calculateZScore(bmi, effectiveAgeMonths, sex, 'bfa');

            return {
                ageInMonths: Math.round(effectiveAgeMonths * 100) / 100, // Use biological age for chart position
                value: bmi,
                date: typeof m.fecha === 'string' ? m.fecha : new Date(m.fecha).toISOString(),
                zScore: zRes?.zScore,
                diagnosis: zRes?.diagnosis,
                ageInDays: calculateExactAgeInDays(patientBirthDate, m.fecha)
            };
        }).filter(p => p.ageInMonths >= 60 && p.ageInMonths <= 228);


    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white dark:bg-slate-900 rounded-2xl p-1.5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800">
                <div className="flex-1">
                    <AnthropometryTabs
                        tabs={[
                            { id: "crecimiento", label: "Crecimiento OMS (5-19 años)", icon: Baby },
                            { id: "composicion", label: "Composición Corporal", icon: PieChart },
                            { id: "historial", label: "Historial", icon: History },
                        ]}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        onSave={() => formRef.current?.submit()}
                    />
                </div>

                <div className="flex items-center gap-2 px-2">
                    {isTeenager && (
                        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                            <Switch id="isak-mode" checked={enableIsak} onCheckedChange={setEnableIsak} />
                            <Label htmlFor="isak-mode" className="text-sm font-medium cursor-pointer">
                                ISAK
                            </Label>
                        </div>
                    )}

                    <button
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
                    >
                        <FileDown className="w-4 h-4 text-slate-500" />
                        Exportar PDF
                    </button>
                </div>
            </div>

            <div className="animate-in fade-in duration-300">
                {activeTab === "crecimiento" && (
                    <div className="space-y-6">
                        {/* Formulario */}
                        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <Ruler className="w-5 h-5 text-brand-primary" />
                                    Nueva Medición (Escolar/Adolescente)
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
                                    hideSubmitButton={true}
                                />
                            </CardContent>
                        </Card>

                        {/* Adolescent Evaluation Module (Tanner + Body Composition) */}
                        <AdolescentEvaluation
                            age={calculateChronologicalAge(new Date(patientBirthDate))}
                            gender={patientSex}
                            onBiologicalAgeChange={handleBiologicalAgeChange}
                        />

                        {/* Biological Age Alert for Charts */}
                        {useBiologicalAge && biologicalAge && (
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg flex items-center gap-2">
                                <span className="text-purple-600 dark:text-purple-400 text-sm">
                                    📊 Las gráficas de crecimiento usan la <strong>Edad Biológica ({biologicalAge.toFixed(1)} años)</strong> basada en el estadío de Tanner.
                                </span>
                            </div>
                        )}

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
                                    startMonth={60}
                                    endMonth={228}
                                />
                            )}
                            {activeChart === 'imc' && (
                                <PediatricGrowthChart
                                    indicator="bfa" // BMI for age is better for > 2y than weight for age
                                    sex={sex}
                                    patientData={bmiChartData}
                                    patientName={patientName}
                                    startMonth={60}
                                    endMonth={228}
                                />
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "composicion" && (
                    <PediatricBodyCompositionPanel
                        patientName={patientName}
                        patientAge={calculateChronologicalAge(new Date(patientBirthDate))}
                        patientGender={patientSex}
                        patientWeight={initialWeight}
                        patientHeight={initialHeight}
                        onBiologicalAgeChange={handleBiologicalAgeChange}
                    />
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
