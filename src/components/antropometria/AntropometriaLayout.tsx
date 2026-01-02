"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { PieChart, Target, Calendar, User, Scale, Save } from "lucide-react";
import { Body3DViewer } from "./Body3DViewerLazy";
import { UnifiedMeasurementForm, FullMeasurementData } from "./UnifiedMeasurementForm";
import { FormulaSelector } from "./FormulaSelector";
import { FiveComponentPanel } from "./FiveComponentPanel";
import { SomatotypePanel } from "./SomatotypePanel";
import { EvaluationActions } from "./EvaluationActions";
import { EvaluationHistory } from "./EvaluationHistory";
import { SaludPanel } from "./SaludPanel";
import { SkinfoldData, Gender } from "@/lib/bodyCompositionMath";
import type { MedidasAntropometricas } from "@/types";
import { formatClinicalAge } from "@/lib/clinical-calculations";
import { checkDangerousBMI } from "@/lib/safety-alerts";
import { SafetyAlertsBanner } from "@/components/safety/SafetyAlertsBanner";
import { FormulaType } from "@/lib/bodyCompositionMath";

// Tab Types
type TabId = 'basico' | 'composicion' | 'fraccionamiento' | 'somatocarta' | 'historial';

interface TabConfig {
    id: TabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabConfig[] = [
    { id: 'basico', label: 'Básico', icon: User },
    { id: 'composicion', label: 'Composición', icon: PieChart },
    { id: 'fraccionamiento', label: '5 Componentes', icon: Scale },
    { id: 'somatocarta', label: 'Somatocarta', icon: Target },
    { id: 'historial', label: 'Historial', icon: Calendar },
];

interface AntropometriaLayoutProps {
    patientName?: string;
    patientGender?: 'masculino' | 'femenino';
    patientBirthDate?: string;
    initialWeight?: number;
    initialHeight?: number;
    medidas: MedidasAntropometricas[];
    onSave?: (data: FullMeasurementData, formula: string, result?: any) => void;
    onDeleteMedida?: (id: string) => void;
    patientId?: string;
}

// Estado inicial
const initialData: FullMeasurementData = {
    bioData: { peso: 0, talla: 0, sittingHeight: 0, edad: 0, genero: 'masculino' },
    skinfolds: { triceps: 0, biceps: 0, subscapular: 0, iliac_crest: 0, supraspinale: 0, abdominal: 0, thigh: 0, calf: 0 },
    girths: { brazoRelajado: 0, brazoFlexionado: 0, cintura: 0, musloMedio: 0, pantorrilla: 0 },
    breadths: { humero: 0, femur: 0, biacromial: 0, biiliocristal: 0, biestiloideo: 0 }
};

export function AntropometriaLayout({
    patientName,
    patientGender = 'masculino',
    patientBirthDate,
    initialWeight = 0,
    initialHeight = 0,
    medidas,
    onSave,
    onDeleteMedida,
    patientId
}: AntropometriaLayoutProps) {
    // Calcular edad a partir de fecha de nacimiento
    const calculateAge = (birthDate?: string): number => {
        if (!birthDate) return 0;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const [activeTab, setActiveTab] = useState<TabId>('basico');
    const [selectedFormula, setSelectedFormula] = useState<FormulaType>('general');
    const [currentResult, setCurrentResult] = useState<any>(null);
    const [data, setData] = useState<FullMeasurementData>({
        ...initialData,
        bioData: {
            peso: initialWeight,
            talla: initialHeight,
            edad: calculateAge(patientBirthDate),
            genero: patientGender
        }
    });

    // Sincronizar datos cuando cambian los props iniciales
    useEffect(() => {
        setData(prev => ({
            ...prev,
            bioData: {
                ...prev.bioData,
                peso: initialWeight || prev.bioData.peso,
                talla: initialHeight || prev.bioData.talla,
                edad: calculateAge(patientBirthDate) || prev.bioData.edad,
                genero: patientGender
            }
        }));
    }, [initialWeight, initialHeight, patientBirthDate, patientGender]);

    const handleDataUpdate = useCallback((partialData: Partial<FullMeasurementData>) => {
        setData(prev => ({ ...prev, ...partialData }));
    }, []);

    // Convertir datos a formato del motor
    const skinfoldData: SkinfoldData = useMemo(() => ({
        triceps: data.skinfolds.triceps,
        biceps: data.skinfolds.biceps,
        subscapular: data.skinfolds.subscapular,
        iliac_crest: data.skinfolds.iliac_crest,
        supraspinale: data.skinfolds.supraspinale,
        abdominal: data.skinfolds.abdominal,
        thigh: data.skinfolds.thigh,
        calf: data.skinfolds.calf
    }), [
        data.skinfolds.triceps,
        data.skinfolds.biceps,
        data.skinfolds.subscapular,
        data.skinfolds.iliac_crest,
        data.skinfolds.supraspinale,
        data.skinfolds.abdominal,
        data.skinfolds.thigh,
        data.skinfolds.calf
    ]);

    const gender: Gender = data.bioData.genero === 'masculino' ? 'male' : 'female';

    // Safety alerts for anthropometry
    const bmiAlert = useMemo(() => {
        if (!data.bioData.peso || !data.bioData.talla) return null;
        const check = checkDangerousBMI(data.bioData.peso, data.bioData.talla);
        return check.alert || null;
    }, [data.bioData.peso, data.bioData.talla]);

    const evaluationLevel: 'basic' | 'intermediate' | 'advanced' = useMemo(() => {
        if (activeTab === 'basico') return 'basic';
        if (activeTab === 'composicion') return 'intermediate';
        return 'advanced';
    }, [activeTab]);

    return (
        <div className="space-y-6">
            {/* Safety Alert Banner */}
            {bmiAlert && (
                <SafetyAlertsBanner alerts={[bmiAlert]} />
            )}

            {/* Patient Badge */}
            {patientName && (
                <div className="flex items-center gap-2 px-4 py-2 bg-[#6cba00]/10 text-[#6cba00] rounded-full text-sm font-medium w-fit">
                    <User className="w-4 h-4" />
                    {patientName} {patientBirthDate && ` • ${formatClinicalAge(patientBirthDate)}`}
                </div>
            )}

            {/* TAB NAVIGATION & ACTIONS */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white dark:bg-slate-900 rounded-2xl p-1.5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800">
                <nav className="flex gap-1 overflow-x-auto">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${isActive
                                    ? 'bg-[#ff8508] text-white shadow-lg shadow-[#ff8508]/30'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>

                <div className="px-1.5 pb-1.5 sm:pb-0">
                    <EvaluationActions
                        data={data}
                        paciente={patientId ? { id: patientId, datosPersonales: { nombre: patientName?.split(' ')[0] || '', apellido: patientName?.split(' ').slice(1).join(' ') || '', fechaNacimiento: patientBirthDate || '', sexo: patientGender } } as any : undefined}
                        medidas={medidas}
                        onSave={(data) => onSave?.(data, selectedFormula, currentResult)}
                    />
                </div>
            </div>

            {/* TAB CONTENT */}
            <div className="animate-in fade-in duration-300">

                {/* TAB 0: SALUD BÁSICA */}
                {activeTab === 'basico' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left: Form */}
                        <div className="lg:col-span-5">
                            <UnifiedMeasurementForm
                                data={data}
                                onUpdate={handleDataUpdate}
                                patientId={patientId}
                                evaluationLevel={evaluationLevel}
                            />
                        </div>

                        {/* Right: Health Results */}
                        <div className="lg:col-span-7">
                            <SaludPanel data={data} />
                        </div>
                    </div>
                )}

                {/* TAB 1: COMPOSICIÓN */}
                {activeTab === 'composicion' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left: Form + 3D */}
                        <div className="lg:col-span-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Formulario de pliegues */}
                                <UnifiedMeasurementForm
                                    data={data}
                                    onUpdate={handleDataUpdate}
                                    patientId={patientId}
                                    evaluationLevel={evaluationLevel}
                                />

                                {/* 3D Viewer */}
                                <div className="min-h-[400px]">
                                    <Body3DViewer data={data} />
                                </div>
                            </div>
                        </div>

                        {/* Right: Results */}
                        <div className="lg:col-span-4">
                            <FormulaSelector
                                skinfolds={skinfoldData}
                                gender={gender}
                                weightKg={data.bioData.peso}
                                selectedFormula={selectedFormula}
                                onFormulaChange={setSelectedFormula}
                                onResultChange={setCurrentResult}
                            />
                        </div>
                    </div>
                )}

                {/* TAB 2: FRACCIONAMIENTO 5 COMPONENTES */}
                {activeTab === 'fraccionamiento' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left: Form */}
                        <div className="lg:col-span-5">
                            {/* Mediciones ISAK */}
                            <UnifiedMeasurementForm
                                data={data}
                                onUpdate={handleDataUpdate}
                                patientId={patientId}
                                evaluationLevel={evaluationLevel}
                            />
                        </div>

                        {/* Right: 5 Component Results */}
                        <div className="lg:col-span-7">
                            <FiveComponentPanel data={data} />
                        </div>
                    </div>
                )}

                {/* TAB 3: SOMATOCARTA */}
                {activeTab === 'somatocarta' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left: Perímetros y Diámetros */}
                        <div className="lg:col-span-4">
                            {/* Perímetros y Diámetros */}
                            <UnifiedMeasurementForm
                                data={data}
                                onUpdate={handleDataUpdate}
                                patientId={patientId}
                                evaluationLevel={evaluationLevel}
                            />
                        </div>

                        {/* Right: Somatocarta */}
                        <div className="lg:col-span-8">
                            <SomatotypePanel data={data} />
                        </div>
                    </div>
                )}

                {/* TAB 3: HISTORIAL */}
                {activeTab === 'historial' && (
                    <EvaluationHistory
                        medidas={medidas}
                        onDelete={onDeleteMedida || (() => { })}
                    />
                )}
            </div>
        </div>
    );
}
