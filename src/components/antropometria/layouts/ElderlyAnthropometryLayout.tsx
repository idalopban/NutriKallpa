"use client";

import { useState } from "react";
import { Activity, Calendar, Calculator, Ruler, Save } from "lucide-react";
import { AnthropometryTabs } from "../navigation/AnthropometryTabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EvaluationHistory } from "../EvaluationHistory";
import { MedidasAntropometricas } from "@/types";
import { Badge } from "@/components/ui/badge";
import { useAssessmentStore } from "@/store/useAssessmentStore";
import { FullMeasurementData } from "../UnifiedMeasurementForm";

interface ElderlyAnthropometryLayoutProps {
    patientId: string;
    patientName: string;
    patientBirthDate: string;
    patientSex: 'masculino' | 'femenino';
    initialWeight?: number;
    initialHeight?: number;
    medidas: MedidasAntropometricas[];
    onSave: (data: FullMeasurementData) => void;
    onDeleteMedida?: (id: string) => void;
}

export function ElderlyAnthropometryLayout({
    patientId,
    patientName,
    patientBirthDate,
    patientSex,
    initialWeight,
    initialHeight,
    medidas,
    onSave,
    onDeleteMedida
}: ElderlyAnthropometryLayoutProps) {
    const [activeTab, setActiveTab] = useState("funcionalidad");

    // We can use local state or the store. Using local state for this specific form logic 
    // to avoid conflict with the main store if not needed, or sync with it.
    // For simplicity and to match the "Adaptive" nature, we'll try to use the store if possible, 
    // but here we are building a specific UI. Let's use local state for the inputs and sync on save.

    const [formState, setFormState] = useState({
        // Funcionalidad
        handgrip: '',
        getUpAndGo: '',
        canStand: true,

        // Estimación Talla
        kneeHeight: '',
        demiSpan: '',
        estimatedHeight: initialHeight || 0,

        // CP/IMC
        calfCircumference: '',
        weight: initialWeight?.toString() || '',
        muac: '', // Mid-Upper Arm Circumference
    });

    // Helper to update state
    const updateField = (field: string, value: any) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    };

    // Calculate Estimated Height (Chumlea)
    const calculateHeight = () => {
        if (!formState.kneeHeight) return;
        const kh = parseFloat(formState.kneeHeight);
        const age = new Date().getFullYear() - new Date(patientBirthDate).getFullYear(); // Approx
        const isMale = patientSex === 'masculino';

        let estHeight = 0;
        // Chumlea Eq for Elderly
        if (isMale) {
            estHeight = 64.19 - (0.04 * age) + (2.02 * kh);
        } else {
            estHeight = 84.88 - (0.24 * age) + (1.83 * kh);
        }
        updateField('estimatedHeight', estHeight.toFixed(1));
    };

    const handleSave = () => {
        // Construct the FullMeasurementData object expected by the saver
        const height = formState.estimatedHeight ? Number(formState.estimatedHeight) : 0;
        const weight = formState.weight ? parseFloat(formState.weight) : 0;

        // Map to FullMeasurementData
        const data: FullMeasurementData = {
            bioData: {
                peso: weight,
                talla: height, // Use estimated height as the height
                edad: 0, // Calculated in backend/saver
                genero: patientSex
            },
            skinfolds: {
                triceps: 0, biceps: 0, subscapular: 0, iliac_crest: 0, supraspinale: 0, abdominal: 0, thigh: 0,
                calf: 0 // We don't have skinfold form here, default to 0
            },
            girths: {
                brazoRelajado: formState.muac ? parseFloat(formState.muac) : 0,
                brazoFlexionado: 0,
                cintura: 0,
                pantorrilla: formState.calfCircumference ? parseFloat(formState.calfCircumference) : 0
            },
            breadths: { humero: 0, femur: 0 },
            // Store functionality in context or extra fields if supported? 
            // For now, we focus on the anthropometrics (Weight, Height, BMI logic).
        };

        onSave(data);
    };

    return (
        <div className="space-y-6">
            <AnthropometryTabs
                tabs={[
                    { id: "funcionalidad", label: "Funcionalidad", icon: Activity },
                    { id: "estimacion_talla", label: "Estimación Talla", icon: Ruler },
                    { id: "cp_imc", label: "CP/IMC", icon: Calculator },
                    { id: "historial", label: "Historial", icon: Calendar },
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onSave={activeTab !== 'historial' ? handleSave : undefined}
            />

            <div className="animate-in fade-in duration-300">
                {/* TAB 1: FUNCIONALIDAD */}
                {activeTab === "funcionalidad" && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Activity className="w-5 h-5 text-blue-600" />
                                Evaluación Funcional
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Fuerza de Prensión (Dinamometría)</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            placeholder="0.0"
                                            value={formState.handgrip}
                                            onChange={(e) => updateField('handgrip', e.target.value)}
                                        />
                                        <span className="absolute right-3 top-2.5 text-xs text-slate-400">kg</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Punto de corte: &lt;27kg (H), &lt;16kg (M)</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Timed Up & Go</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            placeholder="0.0"
                                            value={formState.getUpAndGo}
                                            onChange={(e) => updateField('getUpAndGo', e.target.value)}
                                        />
                                        <span className="absolute right-3 top-2.5 text-xs text-slate-400">seg</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Riesgo de caída: &gt;12 seg</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* TAB 2: ESTIMACIÓN TALLA */}
                {activeTab === "estimacion_talla" && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Ruler className="w-5 h-5 text-indigo-600" />
                                Estimación de Talla (Chumlea)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                <div className="space-y-2">
                                    <Label>Altura de Rodilla</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            placeholder="0.0"
                                            value={formState.kneeHeight}
                                            onChange={(e) => updateField('kneeHeight', e.target.value)}
                                            onBlur={calculateHeight}
                                        />
                                        <span className="absolute right-3 top-2.5 text-xs text-slate-400">cm</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <p className="text-sm text-slate-500">Talla Estimada</p>
                                    <p className="text-2xl font-bold text-indigo-600">
                                        {formState.estimatedHeight ? `${formState.estimatedHeight} cm` : '---'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* TAB 3: CP / IMC */}
                {activeTab === "cp_imc" && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Calculator className="w-5 h-5 text-green-600" />
                                Circunferencia de Pantorrilla e IMC
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label>Peso Actual</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            placeholder="0.0"
                                            value={formState.weight}
                                            onChange={(e) => updateField('weight', e.target.value)}
                                        />
                                        <span className="absolute right-3 top-2.5 text-xs text-slate-400">kg</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Circunferencia Pantorrilla (CP)</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            placeholder="0.0"
                                            value={formState.calfCircumference}
                                            onChange={(e) => updateField('calfCircumference', e.target.value)}
                                        />
                                        <span className="absolute right-3 top-2.5 text-xs text-slate-400">cm</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Sarcopenia: &lt;31cm</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Circunferencia Brazo (CMB)</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            placeholder="0.0"
                                            value={formState.muac}
                                            onChange={(e) => updateField('muac', e.target.value)}
                                        />
                                        <span className="absolute right-3 top-2.5 text-xs text-slate-400">cm</span>
                                    </div>
                                </div>
                            </div>

                            {/* Result Badge */}
                            {(formState.weight && (formState.estimatedHeight || 0)) ? (
                                <div className="flex flex-wrap gap-4 mt-4">
                                    <Badge className="text-lg py-2 px-4 bg-slate-100 text-slate-800 hover:bg-slate-200">
                                        IMC: {(parseFloat(formState.weight) / Math.pow((Number(formState.estimatedHeight) / 100), 2)).toFixed(1)}
                                    </Badge>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                )}

                {/* TAB 4: HISTORIAL */}
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
