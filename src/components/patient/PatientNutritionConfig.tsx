"use client";

/**
 * PatientNutritionConfig
 * 
 * Reusable component for viewing and editing a patient's nutritional configuration.
 * Can be embedded in anthropometry and diet pages.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Scale, Utensils, Edit2, Check, X, PieChart, Target, AlertTriangle, User, Pencil, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

import { usePatientNutrition } from "@/store/usePatientStore";
import type { NivelActividad, ObjetivoPeso, FormulaGET, ProteinBasis, CalorieGoalPreset } from "@/types";
import { PROTEIN_BASIS_LABELS, CALORIE_GOAL_PRESETS } from "@/types";
import { MealMomentsManager } from "./MealMomentsManager";

interface Props {
    editable?: boolean;
    compact?: boolean;
    onDirtyChange?: (isDirty: boolean) => void;
    rightSideContent?: React.ReactNode;
}

export function PatientNutritionConfig({
    editable = true,
    compact = false,
    onDirtyChange,
    rightSideContent
}: Props) {
    const router = useRouter();
    const {
        config,
        updateConfig,
        nivelActividad,
        objetivoPeso,
        formulaGET,
        proteinaRatio,
        kcalAjuste,
        macroProteina,
        macroCarbohidratos,
        macroGrasa,
        // Clinical audit additions
        proteinBasis,
        proteinTargetWeight,
        proteinBasisLabel,
        proteinWarning,
        bmi,
        isObese,
        caloriePreset,
        presetInfo,
        kcalAdjustment,
        patient,
        proteinaGramos,
        totalCalories,
        // 🛡️ SAFETY indicators
        calorieFloorApplied,
        minCalories,
        autoAdjustedForObesity,
        // 🛡️ Population indicators
        patientAge,
        isPediatric,
        pediatricDeficitBlocked,
        isGeriatric,
        effectiveFormulaName
    } = usePatientNutrition();

    // Validate macros sum to 100%
    const macrosTotal = (config.macroProteina ?? 25) + (config.macroCarbohidratos ?? 50) + (config.macroGrasa ?? 25);
    const macrosValid = macrosTotal === 100;

    const [isEditing, setIsEditing] = useState(false);
    const [localConfig, setLocalConfig] = useState(config);

    // Sync dirty state with parent
    useEffect(() => {
        if (onDirtyChange) {
            onDirtyChange(isEditing);
        }
    }, [isEditing, onDirtyChange]);

    const handleSave = () => {
        updateConfig(localConfig);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setLocalConfig(config);
        setIsEditing(false);
    };

    const activityLabels: Partial<Record<NivelActividad, string>> = isPediatric ? {
        sedentario: "Sedentario (PA 1.0)",
        ligera: "Poco Activo (PA 1.15)",
        moderada: "Activo (PA 1.28)",
        activa: "Muy Activo (PA 1.5)"
    } : {
        sedentario: "Sedentario",
        ligera: "Ligera (1-3 días/sem)",
        moderada: "Moderada (3-5 días/sem)",
        activa: "Activa (5-6 días/sem)",
        muy_activa: "Muy Activa (Atleta)",
        intensa: "Intensa (6-7 días/sem)",
        muy_intensa: "Muy Intensa (Doble sesión)"
    };

    const goalLabels: Partial<Record<ObjetivoPeso, string>> = {
        perdida: "Perder Peso",
        perder: "Perder Grasa",
        mantenimiento: "Mantenimiento",
        ganar: "Ganar Músculo",
        ganancia: "Ganancia de Peso"
    };

    const formulaLabels: Partial<Record<FormulaGET, string>> = {
        mifflin: "Mifflin-St Jeor",
        harris: "Harris-Benedict",
        fao: "FAO/OMS",
        katch: "Katch-McArdle",
        iom: "IOM (Pediátrico)",
        henry: "Henry (2005)"
    };

    const ratios = [1.2, 1.6, 2, 2.2];
    const pesoKg = proteinTargetWeight || 70;
    const proteinaDiaria = Math.round((localConfig.proteinaRatio ?? 1.6) * pesoKg);
    const kcalProteina = proteinaDiaria * 4;

    const handleRatioChange = (value: number) => {
        // 🔗 LIVE PREVIEW: Always update immediately
        updateConfig({ proteinaRatio: value });
        setLocalConfig(prev => ({ ...prev, proteinaRatio: value }));
    };

    // Compact view (just displays values)
    if (compact && !isEditing) {
        return (
            <Card className="border border-slate-200/80 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-sm">
                <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                        {/* Left: Config Tags */}
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">
                                <Scale className="w-3 h-3" />
                                {nivelActividad && activityLabels[nivelActividad]}
                            </div>
                            <div className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">
                                {objetivoPeso && goalLabels[objetivoPeso]}
                            </div>
                            <div className="px-3 py-1.5 bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 rounded-full text-xs font-medium">
                                {proteinaRatio}g/kg proteína
                            </div>
                        </div>

                        {/* Right: Macro Distribution Visual */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                <PieChart className="w-4 h-4" />
                                <span className="font-semibold">Macros:</span>
                            </div>

                            {/* Visual Macro Bars - Improved Design */}
                            <div className="flex items-center gap-1 h-8 bg-slate-100 dark:bg-slate-700/60 rounded-full p-1 overflow-hidden min-w-[280px]">
                                {/* Protein */}
                                <div
                                    className="h-full bg-[#3b82f6] rounded-full flex items-center justify-center transition-all shadow-sm"
                                    style={{ width: `${macroProteina}%`, minWidth: macroProteina > 0 ? '48px' : '0' }}
                                >
                                    <span className="text-[11px] font-bold text-white drop-shadow-sm whitespace-nowrap px-1">P {macroProteina}%</span>
                                </div>
                                {/* Carbs */}
                                <div
                                    className="h-full bg-[#22c55e] rounded-full flex items-center justify-center transition-all shadow-sm"
                                    style={{ width: `${macroCarbohidratos}%`, minWidth: macroCarbohidratos > 0 ? '48px' : '0' }}
                                >
                                    <span className="text-[11px] font-bold text-white drop-shadow-sm whitespace-nowrap px-1">C {macroCarbohidratos}%</span>
                                </div>
                                {/* Fat */}
                                <div
                                    className="h-full bg-[#f59e0b] rounded-full flex items-center justify-center transition-all shadow-sm"
                                    style={{ width: `${macroGrasa}%`, minWidth: macroGrasa > 0 ? '48px' : '0' }}
                                >
                                    <span className="text-[11px] font-bold text-white drop-shadow-sm whitespace-nowrap px-1">G {macroGrasa}%</span>
                                </div>
                            </div>

                            {/* Edit Button */}
                            {editable && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditing(true)}
                                    className="h-9 px-3 gap-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:text-[#ff8508] hover:border-[#ff8508] transition-all font-bold shadow-sm"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    <span className="hidden sm:inline">Ajustar Metas</span>
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-8">
            <div className={rightSideContent ? "grid grid-cols-1 xl:grid-cols-12 gap-6 items-start" : "space-y-8"}>
                <div className={rightSideContent ? "xl:col-span-7 space-y-6" : "space-y-8"}>
                    {/* 1. TOP CARDS: ACTIVITY & REQUIREMENTS */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                        {/* 1. ACTIVITY PANEL (LEFT - 45%) */}
                        <div className="lg:col-span-5 h-full">
                            <Card className="border-none shadow-md bg-white dark:bg-[#1e293b] h-full flex flex-col overflow-hidden">
                                <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-[#334155] pb-4">
                                    <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-800 dark:text-white">
                                        <Scale className="w-4 h-4 text-blue-500" />
                                        Nivel de Actividad {isPediatric && <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full ml-auto italic">Pediátrico</span>}
                                    </CardTitle>
                                    <p className="text-[11px] text-slate-500 mt-1 font-medium">
                                        {isPediatric
                                            ? "Coeficiente de Actividad (PA) según guías IOM para el desarrollo infantil."
                                            : "Selecciona la intensidad física diaria para el cálculo del TDEE."}
                                    </p>
                                </CardHeader>
                                <CardContent className="pt-6 flex-1 flex flex-col gap-3">
                                    {Object.entries(activityLabels).map(([key, label]) => {
                                        const isActive = localConfig.nivelActividad === key;
                                        return (
                                            <div
                                                key={key}
                                                onClick={() => {
                                                    // 🔗 LIVE PREVIEW
                                                    updateConfig({ nivelActividad: key as any });
                                                    setLocalConfig(prev => ({ ...prev, nivelActividad: key as any }));
                                                }}
                                                className={`group relative py-2.5 px-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between
                                                    ${isActive
                                                        ? 'border-[#ff8508] bg-[#FFF7ED] dark:bg-orange-900/20 shadow-md ring-1 ring-orange-200 dark:ring-orange-900/40'
                                                        : 'border-slate-100 dark:border-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700 bg-white dark:bg-[#0f172a]'
                                                    }`}
                                            >
                                                <div className="flex flex-col">
                                                    <p className={`font-medium text-sm leading-tight ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                                        {label}
                                                    </p>
                                                </div>
                                                {isActive && (
                                                    <div className="w-4 h-4 rounded-full bg-[#ff8508] flex items-center justify-center shadow-sm animate-in zoom-in-50 duration-200">
                                                        <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        </div>

                        {/* 2. REQUIREMENTS PANEL (RIGHT - 55%) */}
                        <div className="lg:col-span-7 h-full">
                            <Card className="border-none shadow-md bg-white dark:bg-[#1e293b] h-full flex flex-col overflow-hidden border-t-4 border-t-[#84cc16]">
                                <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-[#334155] pb-4">
                                    <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-800 dark:text-white">
                                        <Utensils className="w-4 h-4 text-[#84cc16]" />
                                        Requerimientos
                                    </CardTitle>
                                    <p className="text-[11px] text-slate-500 mt-1 font-medium">
                                        {isPediatric ? "Energy Estimated Requirement (EER)" : "Planificación de Gasto Energético Total (GET)"}
                                    </p>
                                </CardHeader>
                                <CardContent className="pt-4 flex-1 flex flex-col gap-4 justify-between">
                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Objetivo Nutricional</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                onClick={() => {
                                                    const updates = { objetivoPeso: 'perder' as const, caloriePreset: 'moderate_deficit' as CalorieGoalPreset };
                                                    updateConfig(updates);
                                                    setLocalConfig(prev => ({ ...prev, ...updates }));
                                                }}
                                                className={`h-16 rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 border-2 ${localConfig.objetivoPeso === 'perder'
                                                    ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20 scale-[1.02]'
                                                    : 'bg-white dark:bg-[#0f172a] border-slate-100 dark:border-slate-800/50 text-rose-500 hover:border-red-200 hover:bg-rose-50/50'}`}
                                            >
                                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M7 7l10 10M17 7v10H7" />
                                                </svg>
                                                <span className="text-[9px] font-semibold uppercase tracking-wide">{isPediatric ? 'DÉFICIT' : 'DEFINICIÓN'}</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const updates = { objetivoPeso: 'mantenimiento' as const, caloriePreset: 'maintenance' as CalorieGoalPreset };
                                                    updateConfig(updates);
                                                    setLocalConfig(prev => ({ ...prev, ...updates }));
                                                }}
                                                className={`h-16 rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 border-2 ${localConfig.objetivoPeso === 'mantenimiento'
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/20 scale-[1.02]'
                                                    : 'bg-white dark:bg-[#0f172a] border-slate-100 dark:border-slate-800/50 text-blue-500 hover:border-blue-200 hover:bg-blue-50/50'}`}
                                            >
                                                <div className="w-5 h-1 bg-current rounded-full" />
                                                <span className="text-[9px] font-semibold uppercase tracking-wide">{isPediatric ? 'CRECIMIENTO' : 'MANTENER'}</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const updates = { objetivoPeso: 'ganar' as const, caloriePreset: 'mild_surplus' as CalorieGoalPreset };
                                                    updateConfig(updates);
                                                    setLocalConfig(prev => ({ ...prev, ...updates }));
                                                }}
                                                className={`h-16 rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 border-2 ${localConfig.objetivoPeso === 'ganar'
                                                    ? 'bg-[#6cba00] border-[#6cba00] text-white shadow-lg shadow-green-500/20 scale-[1.02]'
                                                    : 'bg-white dark:bg-[#0f172a] border-slate-100 dark:border-slate-800/50 text-emerald-500 hover:border-green-200 hover:bg-emerald-50/50'}`}
                                            >
                                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M17 17L7 7M7 17V7h10" />
                                                </svg>
                                                <span className="text-[9px] font-semibold uppercase tracking-wide">{isPediatric ? 'RECUPERACIÓN' : 'VOLUMEN'}</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="py-4 px-4 border border-slate-100 dark:border-slate-800 rounded-xl text-center bg-slate-50/50 dark:bg-slate-900/40 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-[#ff8508]/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
                                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Meta Diaria Estimada</p>
                                        <div className="flex items-baseline justify-center gap-1.5">
                                            <span className="text-4xl font-bold text-slate-800 dark:text-white tracking-tighter leading-none">{totalCalories}</span>
                                            <span className="text-lg font-medium text-slate-400">kcal</span>
                                        </div>
                                        {effectiveFormulaName && (
                                            <p className="text-[9px] text-slate-400 mt-1.5 font-medium flex items-center justify-center gap-1 bg-white/50 dark:bg-slate-800/50 w-fit mx-auto px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-700">
                                                <Check className="w-2.5 h-2.5 text-[#ff8508]" /> Base: <span className="text-slate-600 dark:text-slate-300 uppercase">{effectiveFormulaName}</span>
                                            </p>
                                        )}
                                    </div>

                                    <Button
                                        className="w-full bg-[#84cc16] hover:bg-[#65a30d] text-white rounded-xl h-11 font-semibold gap-2.5 text-sm shadow-lg shadow-lime-500/15 dark:shadow-none transition-all hover:scale-[1.01] active:scale-[0.98] group"
                                        onClick={() => {
                                            const path = `/dietas?patientId=${patient?.id}&calories=${totalCalories}&protein=${proteinaGramos}`;
                                            router.push(path);
                                        }}
                                    >
                                        <Utensils className="w-4 h-4 stroke-[2.5] group-hover:rotate-12 transition-transform" />
                                        Crear Plan de Alimentación
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* 2. PROTEIN & MACROS SETTINGS (Clinical Step 2) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Ratio de Proteína */}
                        <Card className="border-none shadow-md bg-white dark:bg-[#1e293b] overflow-hidden">
                            <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-[#334155] pb-4">
                                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-800 dark:text-white">
                                    <Target className="w-4 h-4 text-orange-600" />
                                    Distribución de Proteína
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                        {ratios.map((ratio) => {
                                            const isSelected = Number(localConfig.proteinaRatio) === ratio;
                                            return (
                                                <button
                                                    key={ratio}
                                                    type="button"
                                                    className={`w-full h-18 rounded-2xl border-2 text-xl font-black transition-all
                                                        ${isSelected
                                                            ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20 scale-[1.02]'
                                                            : 'bg-white dark:bg-[#0f172a] text-orange-500 border-orange-100 dark:border-orange-900/40 hover:bg-orange-50 dark:hover:bg-orange-900/10'}
                                                    `}
                                                    onClick={() => handleRatioChange(ratio)}
                                                >
                                                    {ratio} <span className="block text-[10px] font-bold leading-none mt-1 opacity-60 uppercase">g/kg</span>
                                                </button>
                                            );
                                        })}
                                        <div className={`flex items-center justify-center border-2 rounded-2xl px-3 py-2 h-18 transition-all
                                            ${!ratios.includes(Number(localConfig.proteinaRatio)) ? 'border-green-400 bg-green-50/10 shadow-sm' : 'border-slate-100 dark:border-slate-800/50'}
                                            bg-white dark:bg-[#0f172a]
                                        `}>
                                            <input
                                                type="number"
                                                step="0.1"
                                                min={1}
                                                max={3}
                                                value={localConfig.proteinaRatio ?? ''}
                                                onChange={e => handleRatioChange(parseFloat(e.target.value))}
                                                className="w-12 text-xl font-black outline-none bg-transparent text-slate-800 dark:text-white text-center"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div>
                                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Masa Proteica Objetivo</p>
                                            <p className="text-2xl font-black text-slate-800 dark:text-white">{proteinaDiaria}g <span className="text-xs text-slate-400 font-bold">/ día</span></p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 text-right">Base de Cálculo</p>
                                            <p className="text-sm font-bold text-orange-500">{proteinBasisLabel} ({proteinTargetWeight}kg)</p>
                                        </div>
                                    </div>
                                    {proteinWarning && (
                                        <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800 text-amber-800 dark:text-amber-200">
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertDescription className="text-xs font-medium">{proteinWarning}</AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Perfil de Macronutrientes */}
                        <Card className="border-none shadow-md bg-white dark:bg-[#1e293b] overflow-hidden">
                            <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-[#334155] pb-4">
                                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-800 dark:text-white">
                                    <PieChart className="w-4 h-4 text-purple-600" />
                                    Perfil de Macronutrientes
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-6">
                                    <div className="h-10 w-full flex rounded-2xl overflow-hidden shadow-inner border-2 border-slate-100 dark:border-slate-800">
                                        <div className="h-full bg-blue-500 flex items-center justify-center transition-all" style={{ width: `${macroProteina}%` }}>
                                            <span className="text-[11px] font-black text-white px-2">P {macroProteina}%</span>
                                        </div>
                                        <div className="h-full bg-green-500 flex items-center justify-center transition-all" style={{ width: `${macroCarbohidratos}%` }}>
                                            <span className="text-[11px] font-black text-white px-2">C {macroCarbohidratos}%</span>
                                        </div>
                                        <div className="h-full bg-orange-500 flex items-center justify-center transition-all" style={{ width: `${macroGrasa}%` }}>
                                            <span className="text-[11px] font-black text-white px-2">G {macroGrasa}%</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[11.5px] text-slate-400 font-bold uppercase tracking-widest text-center block">Proteína %</Label>
                                            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 py-2 rounded-xl text-center font-black border border-blue-100 dark:border-blue-900/40">{macroProteina}%</div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[11.5px] text-slate-400 font-bold uppercase tracking-widest text-center block">Carbos %</Label>
                                            <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 py-2 rounded-xl text-center font-black border border-green-100 dark:border-green-900/40">{macroCarbohidratos}%</div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center block mb-1.5">Grasas %</Label>
                                            <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 py-2 rounded-xl text-center font-black border border-orange-100 dark:border-orange-900/40">{macroGrasa}%</div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Optional Sidebar (Calculator) */}
                {rightSideContent && (
                    <div className="xl:col-span-5 h-full sticky top-8">
                        {rightSideContent}
                    </div>
                )}
            </div>

            {/* 3. MEAL MOMENTS MANAGER - DISTRIBUTION (ALWAYS FULL WIDTH) */}
            <Card className="border-none shadow-md bg-white dark:bg-[#1e293b] overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-[#334155] pb-4 flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-800 dark:text-white">
                        <Clock className="w-4 h-4 text-amber-600" />
                        Gestión de Momentos de Comida
                    </CardTitle>
                    {(() => {
                        const meals = localConfig.mealMoments || [];
                        const totalRatio = meals.filter(m => m.enabled).reduce((sum, m) => sum + m.ratio, 0);
                        const isValid = Math.abs(totalRatio - 1.0) < 0.001;
                        return (
                            <div className="flex items-center gap-3">
                                {isValid ? (
                                    <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 py-1 font-bold text-xs">
                                        Distribución 100% OK
                                    </Badge>
                                ) : (
                                    <Badge variant="destructive" className="animate-pulse gap-1.5 py-1 text-xs">
                                        <AlertCircle className="w-3 h-3" />
                                        Total: {Math.round(totalRatio * 100)}%
                                    </Badge>
                                )}
                                {!isEditing && editable && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setIsEditing(true)}
                                        className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-[#ff8508] hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        );
                    })()}
                </CardHeader>
                <CardContent className="pt-3">
                    <MealMomentsManager
                        moments={localConfig.mealMoments || []}
                        totalCalories={totalCalories}
                        isEditing={isEditing}
                        onUpdate={(updated) => setLocalConfig(prev => ({ ...prev, mealMoments: updated }))}
                    />
                </CardContent>
            </Card>

            {/* STICKY ACTION BAR FOR EDITING */}
            {isEditing && (
                <div className="sticky bottom-6 left-0 right-0 z-[100] mt-8 animate-in slide-in-from-bottom-8 duration-500">
                    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-2xl flex items-center justify-between gap-4 max-w-4xl mx-auto ring-1 ring-black/5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                                <AlertTriangle className="w-6 h-6 animate-pulse" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">Modo Edición Activo</span>
                                <span className="text-xs text-slate-500 font-medium">Hay cambios en la configuración metabólica</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={handleCancel} className="gap-2 rounded-2xl h-12 px-6 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold hover:bg-slate-50 transition-all">
                                <X className="w-4 h-4" /> Descartar
                            </Button>
                            <Button onClick={handleSave} className="gap-2 rounded-2xl h-12 px-10 bg-[#ff8508] hover:bg-[#e67600] text-white font-black shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02]">
                                <Check className="w-5 h-5" /> GUARDAR CAMBIOS
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
