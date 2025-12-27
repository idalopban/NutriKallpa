"use client";

import { useState, useCallback, useEffect } from "react";
import { PieChart, Target, Calendar, User, Scale, Save } from "lucide-react";
import { Body3DViewer } from "./Body3DViewerLazy";
import { UnifiedMeasurementForm, FullMeasurementData } from "./UnifiedMeasurementForm";
import { FormulaSelector } from "./FormulaSelector";
import { FiveComponentPanel } from "./FiveComponentPanel";
import { SomatotypePanel } from "./SomatotypePanel";
import { EvaluationHistory } from "./EvaluationHistory";
import { SkinfoldData, Gender } from "@/lib/bodyCompositionMath";
import type { MedidasAntropometricas } from "@/types";
import { formatClinicalAge } from "@/lib/clinical-calculations";

// Tab Types
type TabId = 'composicion' | 'fraccionamiento' | 'somatocarta' | 'historial';

interface TabConfig {
    id: TabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabConfig[] = [
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
    onSave?: (data: FullMeasurementData) => void;
    onDeleteMedida?: (id: string) => void;
    patientId?: string;
}

// Estado inicial
const initialData: FullMeasurementData = {
    bioData: { peso: 0, talla: 0, edad: 0, genero: 'masculino' },
    skinfolds: { triceps: 0, biceps: 0, subscapular: 0, iliac_crest: 0, supraspinale: 0, abdominal: 0, thigh: 0, calf: 0 },
    girths: { brazoRelajado: 0, brazoFlexionado: 0, cintura: 0, musloMedio: 0, pantorrilla: 0 },
    breadths: { humero: 0, femur: 0 }
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

    const [activeTab, setActiveTab] = useState<TabId>('composicion');
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
    const skinfoldData: SkinfoldData = {
        triceps: data.skinfolds.triceps,
        biceps: data.skinfolds.biceps,
        subscapular: data.skinfolds.subscapular,
        iliac_crest: data.skinfolds.iliac_crest,
        supraspinale: data.skinfolds.supraspinale,
        abdominal: data.skinfolds.abdominal,
        thigh: data.skinfolds.thigh,
        calf: data.skinfolds.calf
    };

    const gender: Gender = data.bioData.genero === 'masculino' ? 'male' : 'female';

    return (
        <div className="space-y-6">
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
                    <button
                        onClick={() => onSave?.(data)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors shadow-lg shadow-slate-900/20"
                    >
                        <Save className="w-4 h-4" />
                        Guardar Evaluación
                    </button>
                </div>
            </div>

            {/* TAB CONTENT */}
            <div className="animate-in fade-in duration-300">

                {/* TAB 1: COMPOSICIÓN */}
                {activeTab === 'composicion' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left: Form + 3D */}
                        <div className="lg:col-span-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Formulario de pliegues */}
                                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800">
                                    <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-4 flex items-center gap-2">
                                        <div className="w-1.5 h-5 bg-[#ff8508] rounded-full"></div>
                                        Datos del Paciente
                                    </h3>
                                    <UnifiedMeasurementForm data={data} onUpdate={handleDataUpdate} />
                                </div>

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
                            />
                        </div>
                    </div>
                )}

                {/* TAB 2: FRACCIONAMIENTO 5 COMPONENTES */}
                {activeTab === 'fraccionamiento' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left: Form */}
                        <div className="lg:col-span-5">
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800">
                                <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-5 bg-indigo-500 rounded-full"></div>
                                    Mediciones ISAK
                                </h3>
                                <UnifiedMeasurementForm data={data} onUpdate={handleDataUpdate} />
                            </div>
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
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800">
                                <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-5 bg-purple-500 rounded-full"></div>
                                    Perímetros y Diámetros
                                </h3>
                                <UnifiedMeasurementForm data={data} onUpdate={handleDataUpdate} patientId={patientId} />
                            </div>
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

