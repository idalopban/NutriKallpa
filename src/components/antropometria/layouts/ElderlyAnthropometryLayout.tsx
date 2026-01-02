"use client";

import { useState } from "react";
import { Activity, Calendar, Calculator, Ruler, AlertCircle, TrendingUp, UserMinus, CheckCircle2, AlertTriangle, Info, XCircle, Scale, User, Save } from "lucide-react";
import { EvaluationHistory } from "../EvaluationHistory";
import { MedidasAntropometricas } from "@/types";
import { Badge } from "@/components/ui/badge";
import { FullMeasurementData } from "../UnifiedMeasurementForm";
import { evaluateElderlyPatient, type ElderlyAnthropometricParams } from "@/lib/elderly-standards";
import { cn } from "@/lib/utils";
import { formatClinicalAge } from "@/lib/clinical-calculations";
import { EvaluationActions } from "../EvaluationActions";

interface ElderlyAnthropometryLayoutProps {
    patientId: string;
    patientName: string;
    patientBirthDate: string;
    patientSex: 'masculino' | 'femenino';
    initialWeight?: number;
    initialHeight?: number;
    medidas: MedidasAntropometricas[];
    onSave: (data: FullMeasurementData, formula: string) => void;
    onDeleteMedida?: (id: string) => void;
}

type TabId = 'basico' | 'postrado' | 'composicion' | 'funcionalidad' | 'historial';

interface TabConfig {
    id: TabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabConfig[] = [
    { id: 'basico', label: 'Básica', icon: Calculator },
    { id: 'postrado', label: 'Postrado', icon: UserMinus },
    { id: 'composicion', label: 'Composición', icon: TrendingUp },
    { id: 'funcionalidad', label: 'Funcional', icon: Activity },
    { id: 'historial', label: 'Historial', icon: Calendar },
];

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
    const [activeTab, setActiveTab] = useState<TabId>("basico");

    const [formState, setFormState] = useState({
        weight: initialWeight?.toString() || '',
        height: initialHeight?.toString() || '',
        kneeHeight: '',
        demiSpan: '',
        kneeMalleolus: '',
        forearmLength: '',
        calfCircumference: '',
        armCircumference: '',
        tricepsSkinfold: '',
        subscapularSkinfold: '',
        handgrip: '',
        getUpAndGo: '',
        showFunctionalResults: false,
        selectedTallaMethod: 'AR' as 'AR' | 'LRM' | 'Brazada',
    });

    const updateField = (field: string, value: any) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    };

    const age = new Date().getFullYear() - new Date(patientBirthDate).getFullYear();

    const evaluationParams: ElderlyAnthropometricParams = {
        sexo: patientSex,
        edad: age,
        pesoActual: formState.weight ? parseFloat(formState.weight) : undefined,
        tallaActual: formState.height ? parseFloat(formState.height) : undefined,
        circunferenciaBrazo: formState.armCircumference ? parseFloat(formState.armCircumference) : undefined,
        circunferenciaPantorrilla: formState.calfCircumference ? parseFloat(formState.calfCircumference) : undefined,
        alturaRodilla: formState.kneeHeight ? parseFloat(formState.kneeHeight) : undefined,
        pliegueTricipital: formState.tricepsSkinfold ? parseFloat(formState.tricepsSkinfold) : undefined,
        pliegueSubescapular: formState.subscapularSkinfold ? parseFloat(formState.subscapularSkinfold) : undefined,
        longitudRodillaMaleolo: formState.kneeMalleolus ? parseFloat(formState.kneeMalleolus) : undefined,
        mediaBrazada: formState.demiSpan ? parseFloat(formState.demiSpan) : undefined,
        longitudAntebrazo: formState.forearmLength ? parseFloat(formState.forearmLength) : undefined,
        fuerzaPrension: formState.handgrip ? parseFloat(formState.handgrip) : undefined,
        timedUpAndGo: formState.getUpAndGo ? parseFloat(formState.getUpAndGo) : undefined,
    };

    const evaluation = evaluateElderlyPatient(evaluationParams);

    const handleApplyEstimation = (type: 'peso' | 'talla') => {
        if (type === 'peso' && evaluation.estimaciones.pesoChumlea) {
            updateField('weight', evaluation.estimaciones.pesoChumlea.toFixed(1));
        } else if (type === 'talla') {
            let estimatedTalla: number | undefined;
            if (formState.selectedTallaMethod === 'AR') estimatedTalla = evaluation.estimaciones.tallaAR;
            else if (formState.selectedTallaMethod === 'LRM') estimatedTalla = evaluation.estimaciones.tallaLRM;
            else if (formState.selectedTallaMethod === 'Brazada') estimatedTalla = evaluation.estimaciones.tallaMediaBrazada;

            if (estimatedTalla) {
                updateField('height', estimatedTalla.toFixed(1));
            }
        }
    };

    const handleSave = () => {
        const height = formState.height ? Number(formState.height) : 0;
        const weight = formState.weight ? parseFloat(formState.weight) : 0;

        const data: FullMeasurementData = {
            bioData: { peso: weight, talla: height, edad: age, genero: patientSex },
            skinfolds: {
                triceps: formState.tricepsSkinfold ? parseFloat(formState.tricepsSkinfold) : 0,
                subscapular: formState.subscapularSkinfold ? parseFloat(formState.subscapularSkinfold) : 0,
                biceps: 0, iliac_crest: 0, supraspinale: 0, abdominal: 0, thigh: 0, calf: 0
            },
            girths: {
                brazoRelajado: formState.armCircumference ? parseFloat(formState.armCircumference) : 0,
                pantorrilla: formState.calfCircumference ? parseFloat(formState.calfCircumference) : 0,
                brazoFlexionado: 0, cintura: 0, musloMedio: 0
            },
            breadths: { humero: 0, femur: 0, biacromial: 0, biiliocristal: 0, biestiloideo: 0 },
        };
        onSave(data, 'adulto_mayor');
    };

    const getIMCColor = (label: string) => {
        switch (label) {
            case "Bajo peso": return "bg-red-500";
            case "Normal": return "bg-emerald-500";
            case "Sobrepeso": return "bg-amber-500";
            case "Obesidad": return "bg-orange-600";
            default: return "bg-slate-400";
        }
    };

    // Compact Input Field
    const InputField = ({ label, value, onChange, unit }: { label: string; value: string; onChange: (v: string) => void; unit?: string }) => (
        <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
            <div className="relative">
                <input
                    type="number"
                    placeholder="0"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full h-9 px-3 pr-10 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#ff8508]/20 focus:border-[#ff8508] transition-all"
                />
                {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{unit}</span>}
            </div>
        </div>
    );

    // Compact Result Card
    const ResultCard = ({ label, value, unit, color = "slate" }: { label: string; value: string | number; unit: string; color?: string }) => {
        const colors: Record<string, string> = {
            slate: "border-slate-200 dark:border-slate-700",
            indigo: "border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20",
            emerald: "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20",
            amber: "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20",
        };
        return (
            <div className={cn("p-3 rounded-xl border", colors[color])}>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-slate-900 dark:text-white">{value}</span>
                    <span className="text-xs text-slate-400">{unit}</span>
                </div>
            </div>
        );
    };

    // Diagnosis Card - Toast Style
    const DiagnosisCard = ({ title, subtitle, color }: { title: string; subtitle: string; color: string }) => {
        const styles: Record<string, { bg: string; iconBg: string; iconColor: string; titleColor: string }> = {
            red: {
                bg: "bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50",
                iconBg: "bg-red-100 dark:bg-red-900/50",
                iconColor: "text-red-600 dark:text-red-400",
                titleColor: "text-red-700 dark:text-red-300"
            },
            orange: {
                bg: "bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50",
                iconBg: "bg-orange-100 dark:bg-orange-900/50",
                iconColor: "text-orange-600 dark:text-orange-400",
                titleColor: "text-orange-700 dark:text-orange-300"
            },
            yellow: {
                bg: "bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50",
                iconBg: "bg-amber-100 dark:bg-amber-900/50",
                iconColor: "text-amber-600 dark:text-amber-400",
                titleColor: "text-amber-700 dark:text-amber-300"
            },
            green: {
                bg: "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50",
                iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
                iconColor: "text-emerald-600 dark:text-emerald-400",
                titleColor: "text-emerald-700 dark:text-emerald-300"
            },
            blue: {
                bg: "bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50",
                iconBg: "bg-blue-100 dark:bg-blue-900/50",
                iconColor: "text-blue-600 dark:text-blue-400",
                titleColor: "text-blue-700 dark:text-blue-300"
            },
        };

        const IconMap: Record<string, any> = {
            red: XCircle,
            orange: AlertTriangle,
            yellow: AlertTriangle,
            green: CheckCircle2,
            blue: Info
        };

        const style = styles[color] || styles.blue;
        const Icon = IconMap[color] || Info;

        return (
            <div className={cn(
                "flex items-center gap-4 p-4 rounded-2xl shadow-sm transition-all hover:shadow-md",
                style.bg
            )}>
                <div className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                    style.iconBg
                )}>
                    <Icon className={cn("w-5 h-5", style.iconColor)} />
                </div>
                <div className="flex-grow min-w-0">
                    <p className={cn("text-sm font-semibold leading-tight", style.titleColor)}>{title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{subtitle}</p>
                </div>
                <div className="flex-shrink-0 text-slate-300 dark:text-slate-600 hover:text-slate-400 cursor-pointer">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
            </div>
        );
    };


    return (
        <div className="space-y-4">
            {/* Patient Badge */}
            {patientName && (
                <div className="flex items-center gap-2 px-4 py-2 bg-[#6cba00]/10 text-[#6cba00] rounded-full text-sm font-medium w-fit">
                    <User className="w-4 h-4" />
                    {patientName} {patientBirthDate && ` • ${formatClinicalAge(patientBirthDate)}`}
                </div>
            )}

            {/* TAB NAVIGATION */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white dark:bg-slate-900 rounded-2xl p-1.5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800">
                <nav className="flex gap-1 overflow-x-auto">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap",
                                    isActive
                                        ? "bg-[#ff8508] text-white shadow-lg shadow-[#ff8508]/30"
                                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>

                {activeTab !== 'historial' && (
                    <div className="px-1.5 pb-1.5 sm:pb-0">
                        <EvaluationActions
                            data={{
                                bioData: {
                                    peso: formState.weight ? parseFloat(formState.weight) : 0,
                                    talla: formState.height ? parseFloat(formState.height) : 0,
                                    edad: age,
                                    genero: patientSex
                                },
                                skinfolds: {
                                    triceps: formState.tricepsSkinfold ? parseFloat(formState.tricepsSkinfold) : 0,
                                    subscapular: formState.subscapularSkinfold ? parseFloat(formState.subscapularSkinfold) : 0,
                                    biceps: 0, iliac_crest: 0, supraspinale: 0, abdominal: 0, thigh: 0, calf: 0
                                },
                                girths: {
                                    brazoRelajado: formState.armCircumference ? parseFloat(formState.armCircumference) : 0,
                                    pantorrilla: formState.calfCircumference ? parseFloat(formState.calfCircumference) : 0,
                                    brazoFlexionado: 0, cintura: 0, musloMedio: 0
                                },
                                breadths: { humero: 0, femur: 0, biacromial: 0, biiliocristal: 0, biestiloideo: 0 },
                            }}
                            paciente={{
                                id: patientId,
                                datosPersonales: {
                                    nombre: patientName.split(' ')[0] || '',
                                    apellido: patientName.split(' ').slice(1).join(' ') || '',
                                    fechaNacimiento: patientBirthDate,
                                    sexo: patientSex,
                                    email: '' // Fallback for required field
                                }
                            } as any}
                            medidas={medidas}
                            onSave={(data) => onSave(data, 'adulto_mayor')}
                        />
                    </div>
                )}
            </div>

            {/* TAB CONTENT */}
            <div className="animate-in fade-in duration-200">

                {/* EVALUACIÓN BÁSICA */}
                {activeTab === "basico" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Formulario */}
                        <div className="lg:col-span-8 space-y-6">
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800">
                                <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-5 bg-[#ff8508] rounded-full"></div>
                                    Datos Antropométricos
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <InputField label="Peso (kg)" value={formState.weight} onChange={(v) => updateField('weight', v)} unit="kg" />
                                    <InputField label="Talla (cm)" value={formState.height} onChange={(v) => updateField('height', v)} unit="cm" />
                                    <InputField label="C. Pantorrilla" value={formState.calfCircumference} onChange={(v) => updateField('calfCircumference', v)} unit="cm" />
                                </div>
                            </div>

                            {/* Metas */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-indigo-100 dark:border-indigo-900">
                                <h3 className="font-bold text-indigo-700 dark:text-indigo-400 text-sm mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-5 bg-indigo-500 rounded-full"></div>
                                    Metas (Lorentz)
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <ResultCard label="Peso Ideal" value={evaluation.estimaciones.pesoIdealLorentz?.toFixed(1) || '---'} unit="kg" color="indigo" />
                                    <ResultCard label="% Adecuación" value={evaluation.estimaciones.adecuacionPeso?.toFixed(1) || '---'} unit="%" color="indigo" />
                                </div>
                            </div>
                        </div>

                        {/* Resultados */}
                        <div className="lg:col-span-4">
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-4">
                                <h3 className="font-bold text-slate-800 dark:text-white text-sm">Diagnóstico</h3>

                                {/* IMC */}
                                <div className="text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                                    <p className="text-xs text-slate-500 mb-1">IMC (MINSA)</p>
                                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{evaluation.imc?.toFixed(1) || '---'}</p>
                                    <Badge className={cn("mt-2 text-xs", getIMCColor(evaluation.clasificacionIMCMinsa))}>
                                        {evaluation.clasificacionIMCMinsa}
                                    </Badge>
                                </div>

                                {/* Alertas */}
                                {evaluation.alertas.length > 0 && (
                                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 shadow-sm">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                        </div>
                                        <div className="flex-grow">
                                            <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">Alertas Clínicas</p>
                                            {evaluation.alertas.map((a, i) => (
                                                <p key={i} className="text-xs text-red-600 dark:text-red-400 flex gap-2 items-start mt-1">
                                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                                    {a}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                )}

                {/* PACIENTE POSTRADO */}
                {activeTab === "postrado" && (
                    <div className="space-y-6">
                        {/* Estimación Peso */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-indigo-100 dark:border-indigo-900">
                            <h3 className="font-bold text-indigo-700 dark:text-indigo-400 text-sm mb-4 flex items-center gap-2">
                                <div className="w-1.5 h-5 bg-indigo-500 rounded-full"></div>
                                Estimación de Peso (Chumlea)
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <InputField label="C. Pantorrilla" value={formState.calfCircumference} onChange={(v) => updateField('calfCircumference', v)} unit="cm" />
                                <InputField label="Altura Rodilla" value={formState.kneeHeight} onChange={(v) => updateField('kneeHeight', v)} unit="cm" />
                                <InputField label="C. Brazo" value={formState.armCircumference} onChange={(v) => updateField('armCircumference', v)} unit="cm" />
                                <InputField label="P. Subescapular" value={formState.subscapularSkinfold} onChange={(v) => updateField('subscapularSkinfold', v)} unit="mm" />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/20">
                                <div>
                                    <p className="text-xs text-indigo-600">Peso Estimado</p>
                                    <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                                        {evaluation.estimaciones.pesoChumlea?.toFixed(1) || '---'} <span className="text-sm font-medium">kg</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleApplyEstimation('peso')}
                                    disabled={!evaluation.estimaciones.pesoChumlea}
                                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                >
                                    Usar peso
                                </button>
                            </div>
                        </div>

                        {/* Estimación Talla */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-emerald-100 dark:border-emerald-900">
                            <h3 className="font-bold text-emerald-700 dark:text-emerald-400 text-sm mb-4 flex items-center gap-2">
                                <div className="w-1.5 h-5 bg-emerald-500 rounded-full"></div>
                                Estimación de Talla
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                {/* Opción AR */}
                                <div
                                    onClick={() => updateField('selectedTallaMethod', 'AR')}
                                    className={cn(
                                        "p-3 rounded-lg cursor-pointer border-2 transition-all",
                                        formState.selectedTallaMethod === 'AR'
                                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                                    )}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Altura Rodilla</span>
                                        {formState.selectedTallaMethod === 'AR' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                    </div>
                                    <input
                                        type="number"
                                        placeholder="cm"
                                        value={formState.kneeHeight}
                                        onChange={(e) => updateField('kneeHeight', e.target.value)}
                                        className="w-full h-8 px-2 text-sm rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800"
                                    />
                                    <p className={cn("text-xs mt-2 font-medium", formState.selectedTallaMethod === 'AR' ? "text-emerald-600" : "text-slate-400")}>
                                        Est: {evaluation.estimaciones.tallaAR?.toFixed(1) || '---'} cm
                                    </p>
                                </div>

                                {/* Opción LRM */}
                                <div
                                    onClick={() => updateField('selectedTallaMethod', 'LRM')}
                                    className={cn(
                                        "p-3 rounded-lg cursor-pointer border-2 transition-all",
                                        formState.selectedTallaMethod === 'LRM'
                                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                                    )}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">LRM</span>
                                        {formState.selectedTallaMethod === 'LRM' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                    </div>
                                    <input
                                        type="number"
                                        placeholder="cm"
                                        value={formState.kneeMalleolus}
                                        onChange={(e) => updateField('kneeMalleolus', e.target.value)}
                                        className="w-full h-8 px-2 text-sm rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800"
                                    />
                                    <p className={cn("text-xs mt-2 font-medium", formState.selectedTallaMethod === 'LRM' ? "text-emerald-600" : "text-slate-400")}>
                                        Est: {evaluation.estimaciones.tallaLRM?.toFixed(1) || '---'} cm
                                    </p>
                                </div>

                                {/* Opción Brazada */}
                                <div
                                    onClick={() => updateField('selectedTallaMethod', 'Brazada')}
                                    className={cn(
                                        "p-3 rounded-lg cursor-pointer border-2 transition-all",
                                        formState.selectedTallaMethod === 'Brazada'
                                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                                    )}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Media Brazada</span>
                                        {formState.selectedTallaMethod === 'Brazada' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                    </div>
                                    <input
                                        type="number"
                                        placeholder="cm"
                                        value={formState.demiSpan}
                                        onChange={(e) => updateField('demiSpan', e.target.value)}
                                        className="w-full h-8 px-2 text-sm rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800"
                                    />
                                    <p className={cn("text-xs mt-2 font-medium", formState.selectedTallaMethod === 'Brazada' ? "text-emerald-600" : "text-slate-400")}>
                                        Est: {evaluation.estimaciones.tallaMediaBrazada?.toFixed(1) || '---'} cm
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={() => handleApplyEstimation('talla')}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                                >
                                    <Ruler className="w-3.5 h-3.5" />
                                    Transferir Talla
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* COMPOSICIÓN CORPORAL */}
                {activeTab === "composicion" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Formulario */}
                        <div className="lg:col-span-5">
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800">
                                <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-5 bg-purple-500 rounded-full"></div>
                                    Mediciones
                                </h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <InputField label="C. Brazo (CB)" value={formState.armCircumference} onChange={(v) => updateField('armCircumference', v)} unit="cm" />
                                    <InputField label="Pliegue Tricipital" value={formState.tricepsSkinfold} onChange={(v) => updateField('tricepsSkinfold', v)} unit="mm" />
                                    <InputField label="Pliegue Subescapular" value={formState.subscapularSkinfold} onChange={(v) => updateField('subscapularSkinfold', v)} unit="mm" />
                                </div>
                            </div>
                        </div>

                        {/* Resultados */}
                        <div className="lg:col-span-7 space-y-6">
                            {/* Reserva Muscular */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-emerald-100 dark:border-emerald-900">
                                <div className="flex items-center gap-2 mb-4">
                                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                                    <h4 className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">Reserva Muscular (AMB)</h4>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 mb-3">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">Área Muscular</span>
                                    <span className="text-2xl font-bold text-emerald-600">{evaluation.composicionCorporal.amb.toFixed(1)} <span className="text-sm font-normal">cm²</span></span>
                                </div>
                                <Badge className="w-full justify-center py-2 bg-emerald-600 text-white text-sm font-medium">
                                    Percentil: {evaluation.composicionCorporal.clasificacionAMB}
                                </Badge>
                            </div>

                            {/* Reserva Adiposa */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-amber-100 dark:border-amber-900">
                                <div className="flex items-center gap-2 mb-4">
                                    <Activity className="w-4 h-4 text-amber-600" />
                                    <h4 className="font-bold text-amber-700 dark:text-amber-400 text-sm">Reserva Adiposa (AGB)</h4>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 mb-3">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">Área Grasa</span>
                                    <span className="text-2xl font-bold text-amber-600">{evaluation.composicionCorporal.agb.toFixed(1)} <span className="text-sm font-normal">cm²</span></span>
                                </div>
                                <Badge className="w-full justify-center py-2 bg-amber-600 text-white text-sm font-medium">
                                    Percentil: {evaluation.composicionCorporal.clasificacionPT}
                                </Badge>
                            </div>
                        </div>
                    </div>
                )}

                {/* FUNCIONALIDAD */}
                {activeTab === "funcionalidad" && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-4 flex items-center gap-2">
                                <div className="w-1.5 h-5 bg-orange-500 rounded-full"></div>
                                Evaluación Funcional
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <InputField label="Fuerza Prensión (kg)" value={formState.handgrip} onChange={(v) => updateField('handgrip', v)} unit="kg" />
                                    <p className="text-xs text-slate-500 mt-1">Normal: &gt;27 (H) / &gt;16 (M)</p>
                                </div>
                                <div>
                                    <InputField label="Timed Up & Go (seg)" value={formState.getUpAndGo} onChange={(v) => updateField('getUpAndGo', v)} unit="seg" />
                                    <p className="text-xs text-slate-500 mt-1">Riesgo caída: &gt;12 seg</p>
                                </div>
                            </div>
                            <button
                                onClick={() => updateField('showFunctionalResults', true)}
                                disabled={!formState.handgrip || !formState.calfCircumference}
                                className="w-full py-3 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-lg shadow-orange-200 dark:shadow-none"
                            >
                                <Calculator className="w-3.5 h-3.5 inline mr-1.5" />
                                Calcular Diagnóstico
                            </button>
                        </div>

                        {formState.showFunctionalResults && (
                            <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-300">
                                <DiagnosisCard
                                    color={evaluation.funcionalidad.diagnosticoCombinado.color}
                                    title={evaluation.funcionalidad.diagnosticoCombinado.label}
                                    subtitle={evaluation.funcionalidad.diagnosticoCombinado.explicacion}
                                />

                                {evaluation.funcionalidad.alertaFragilidad && (
                                    <DiagnosisCard
                                        color="red"
                                        title="Síndrome de Fragilidad"
                                        subtitle={evaluation.funcionalidad.alertaFragilidad}
                                    />
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <DiagnosisCard
                                        color={evaluation.funcionalidad.fuerzaPrensionAlerta.includes("Disminuida") ? "orange" : "green"}
                                        title={evaluation.funcionalidad.fuerzaPrensionAlerta}
                                        subtitle={`Valor: ${formState.handgrip || 0} kg`}
                                    />
                                    <DiagnosisCard
                                        color={evaluation.funcionalidad.tugAlerta.includes("Elevado") ? "red" : "green"}
                                        title={evaluation.funcionalidad.tugAlerta}
                                        subtitle={`Tiempo: ${formState.getUpAndGo || 0} seg`}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* HISTORIAL */}
                {activeTab === "historial" && (
                    <EvaluationHistory medidas={medidas} onDelete={onDeleteMedida || (() => { })} />
                )}
            </div>
        </div>
    );
}
