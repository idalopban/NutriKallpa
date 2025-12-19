"use client";

/**
 * PatientNutritionConfig
 * 
 * Reusable component for viewing and editing a patient's nutritional configuration.
 * Can be embedded in anthropometry and diet pages.
 */

import { useState } from "react";
import { Scale, Utensils, Edit2, Check, X, PieChart } from "lucide-react";
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

import { usePatientNutrition } from "@/store/usePatientStore";
import type { NivelActividad, ObjetivoPeso, FormulaGET } from "@/types";

interface Props {
    editable?: boolean;
    compact?: boolean;
}

export function PatientNutritionConfig({ editable = true, compact = false }: Props) {
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
        macroGrasa
    } = usePatientNutrition();

    // Validate macros sum to 100%
    const macrosTotal = (config.macroProteina ?? 25) + (config.macroCarbohidratos ?? 50) + (config.macroGrasa ?? 25);
    const macrosValid = macrosTotal === 100;

    const [isEditing, setIsEditing] = useState(false);
    const [localConfig, setLocalConfig] = useState(config);

    const handleSave = () => {
        updateConfig(localConfig);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setLocalConfig(config);
        setIsEditing(false);
    };

    const activityLabels: Record<NivelActividad, string> = {
        sedentario: "Sedentario",
        ligera: "Ligera (1-3 días/sem)",
        moderada: "Moderada (3-5 días/sem)",
        intensa: "Intensa (6-7 días/sem)",
        muy_intensa: "Muy Intensa (Doble sesión)"
    };

    const goalLabels: Record<ObjetivoPeso, string> = {
        perder: "Perder Grasa",
        mantenimiento: "Mantenimiento",
        ganar: "Ganar Músculo"
    };

    const formulaLabels: Record<FormulaGET, string> = {
        mifflin: "Mifflin-St Jeor",
        harris: "Harris-Benedict",
        fao: "FAO/OMS"
    };

    // Compact view (just displays values)
    if (compact && !isEditing) {
        return (
            <Card className="border border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50 shadow-sm overflow-hidden">
                <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                        {/* Left: Config Tags */}
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-medium border border-emerald-200 dark:border-emerald-800">
                                <Scale className="w-3 h-3" />
                                {nivelActividad && activityLabels[nivelActividad]}
                            </div>
                            <div className="px-3 py-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium border border-amber-200 dark:border-amber-800">
                                {objetivoPeso && goalLabels[objetivoPeso]}
                            </div>
                            <div className="px-3 py-1.5 bg-sky-500/10 text-sky-700 dark:text-sky-400 rounded-full text-xs font-medium border border-sky-200 dark:border-sky-800">
                                {proteinaRatio}g/kg proteína
                            </div>
                        </div>

                        {/* Right: Macro Distribution Visual */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                <PieChart className="w-4 h-4" />
                                <span className="font-medium">Macros:</span>
                            </div>

                            {/* Visual Macro Bars */}
                            <div className="flex items-center gap-1 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 overflow-hidden min-w-[180px]">
                                {/* Protein */}
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-md flex items-center justify-center transition-all"
                                    style={{ width: `${macroProteina}%` }}
                                >
                                    <span className="text-[10px] font-bold text-white drop-shadow-sm">P {macroProteina}%</span>
                                </div>
                                {/* Carbs */}
                                <div
                                    className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-md flex items-center justify-center transition-all"
                                    style={{ width: `${macroCarbohidratos}%` }}
                                >
                                    <span className="text-[10px] font-bold text-white drop-shadow-sm">C {macroCarbohidratos}%</span>
                                </div>
                                {/* Fat */}
                                <div
                                    className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-md flex items-center justify-center transition-all"
                                    style={{ width: `${macroGrasa}%` }}
                                >
                                    <span className="text-[10px] font-bold text-white drop-shadow-sm">G {macroGrasa}%</span>
                                </div>
                            </div>

                            {/* Edit Button */}
                            {editable && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsEditing(true)}
                                    className="h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"
                                >
                                    <Edit2 className="w-4 h-4 text-slate-500" />
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Antropometría Base */}
            <Card className="border-none shadow-md bg-white dark:bg-[#1e293b] overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-[#334155] pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-3 text-lg text-slate-800 dark:text-white">
                            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 shadow-sm">
                                <Scale className="w-4 h-4" />
                            </div>
                            Antropometría Base
                        </CardTitle>
                        {editable && !isEditing && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEditing(true)}
                                className="text-slate-500 hover:text-slate-700"
                            >
                                <Edit2 className="w-4 h-4 mr-1" /> Editar
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-slate-600 dark:text-slate-400">Nivel de Actividad Física</Label>
                            {isEditing ? (
                                <Select
                                    value={localConfig.nivelActividad}
                                    onValueChange={(v) => setLocalConfig({ ...localConfig, nivelActividad: v as NivelActividad })}
                                >
                                    <SelectTrigger className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(activityLabels).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md text-slate-700 dark:text-slate-300">
                                    {nivelActividad && activityLabels[nivelActividad]}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Configuración Nutricional */}
            <Card className="border-none shadow-md bg-white dark:bg-[#1e293b] overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-[#334155] pb-4">
                    <CardTitle className="flex items-center gap-3 text-lg text-slate-800 dark:text-white">
                        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 shadow-sm">
                            <Utensils className="w-4 h-4" />
                        </div>
                        Configuración Nutricional
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Objetivo */}
                        <div className="space-y-2">
                            <Label className="text-slate-600 dark:text-slate-400">Objetivo Principal</Label>
                            {isEditing ? (
                                <Select
                                    value={localConfig.objetivoPeso}
                                    onValueChange={(v) => setLocalConfig({ ...localConfig, objetivoPeso: v as ObjetivoPeso })}
                                >
                                    <SelectTrigger className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(goalLabels).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md text-slate-700 dark:text-slate-300">
                                    {objetivoPeso && goalLabels[objetivoPeso]}
                                </div>
                            )}
                        </div>

                        {/* Fórmula GET */}
                        <div className="space-y-2">
                            <Label className="text-slate-600 dark:text-slate-400">Fórmula Predictiva (GET)</Label>
                            {isEditing ? (
                                <Select
                                    value={localConfig.formulaGET}
                                    onValueChange={(v) => setLocalConfig({ ...localConfig, formulaGET: v as FormulaGET })}
                                >
                                    <SelectTrigger className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(formulaLabels).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md text-slate-700 dark:text-slate-300">
                                    {formulaGET && formulaLabels[formulaGET]}
                                </div>
                            )}
                        </div>

                        {/* Proteína Ratio */}
                        <div className="space-y-2">
                            <Label className="text-slate-600 dark:text-slate-400">Ratio Proteína (g/kg)</Label>
                            {isEditing ? (
                                <div className="relative">
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={localConfig.proteinaRatio}
                                        onChange={(e) => setLocalConfig({ ...localConfig, proteinaRatio: parseFloat(e.target.value) })}
                                        className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] pr-12"
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">g/kg</span>
                                </div>
                            ) : (
                                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md text-slate-700 dark:text-slate-300">
                                    {proteinaRatio} g/kg
                                </div>
                            )}
                            <p className="text-xs text-slate-500">Recomendado: 1.6 - 2.2 g/kg</p>
                        </div>

                        {/* Ajuste Calórico */}
                        <div className="space-y-2">
                            <Label className="text-slate-600 dark:text-slate-400">Ajuste Calórico (kcal)</Label>
                            {isEditing ? (
                                <div className="relative">
                                    <Input
                                        type="number"
                                        step="50"
                                        value={localConfig.kcalAjuste}
                                        onChange={(e) => setLocalConfig({ ...localConfig, kcalAjuste: parseInt(e.target.value) })}
                                        className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] pr-12"
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">kcal</span>
                                </div>
                            ) : (
                                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md text-slate-700 dark:text-slate-300">
                                    {kcalAjuste && kcalAjuste > 0 ? '+' : ''}{kcalAjuste} kcal
                                </div>
                            )}
                            <p className="text-xs text-slate-500">Ej: -500 (Déficit) o +300 (Superávit)</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Distribución de Macronutrientes */}
            <Card className="border-none shadow-md bg-white dark:bg-[#1e293b] overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-[#334155] pb-4">
                    <CardTitle className="flex items-center gap-3 text-lg text-slate-800 dark:text-white">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 shadow-sm">
                            <PieChart className="w-4 h-4" />
                        </div>
                        Distribución de Macronutrientes
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Proteína % */}
                        <div className="space-y-2">
                            <Label className="text-slate-600 dark:text-slate-400">Proteína (%)</Label>
                            {isEditing ? (
                                <div className="relative">
                                    <Input
                                        type="number"
                                        min={5}
                                        max={60}
                                        step={5}
                                        value={localConfig.macroProteina ?? 25}
                                        onChange={(e) => setLocalConfig({ ...localConfig, macroProteina: parseInt(e.target.value) || 0 })}
                                        className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] pr-8"
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">%</span>
                                </div>
                            ) : (
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md text-blue-700 dark:text-blue-300 font-medium">
                                    {macroProteina}%
                                </div>
                            )}
                        </div>

                        {/* Carbohidratos % */}
                        <div className="space-y-2">
                            <Label className="text-slate-600 dark:text-slate-400">Carbohidratos (%)</Label>
                            {isEditing ? (
                                <div className="relative">
                                    <Input
                                        type="number"
                                        min={10}
                                        max={70}
                                        step={5}
                                        value={localConfig.macroCarbohidratos ?? 50}
                                        onChange={(e) => setLocalConfig({ ...localConfig, macroCarbohidratos: parseInt(e.target.value) || 0 })}
                                        className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] pr-8"
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">%</span>
                                </div>
                            ) : (
                                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-md text-green-700 dark:text-green-300 font-medium">
                                    {macroCarbohidratos}%
                                </div>
                            )}
                        </div>

                        {/* Grasa % */}
                        <div className="space-y-2">
                            <Label className="text-slate-600 dark:text-slate-400">Grasa (%)</Label>
                            {isEditing ? (
                                <div className="relative">
                                    <Input
                                        type="number"
                                        min={10}
                                        max={50}
                                        step={5}
                                        value={localConfig.macroGrasa ?? 25}
                                        onChange={(e) => setLocalConfig({ ...localConfig, macroGrasa: parseInt(e.target.value) || 0 })}
                                        className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] pr-8"
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">%</span>
                                </div>
                            ) : (
                                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-yellow-700 dark:text-yellow-300 font-medium">
                                    {macroGrasa}%
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Validation message */}
                    {isEditing && (
                        <div className={`mt-4 p-3 rounded-md text-sm flex items-center gap-2 ${((localConfig.macroProteina ?? 25) + (localConfig.macroCarbohidratos ?? 50) + (localConfig.macroGrasa ?? 25)) === 100
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                            }`}>
                            <span className="font-medium">
                                Total: {(localConfig.macroProteina ?? 25) + (localConfig.macroCarbohidratos ?? 50) + (localConfig.macroGrasa ?? 25)}%
                            </span>
                            {((localConfig.macroProteina ?? 25) + (localConfig.macroCarbohidratos ?? 50) + (localConfig.macroGrasa ?? 25)) === 100
                                ? '✓ Los porcentajes suman 100%'
                                : '⚠ Los porcentajes deben sumar 100%'}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Action Buttons when Editing */}
            {isEditing && (
                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={handleCancel} className="gap-2">
                        <X className="w-4 h-4" /> Cancelar
                    </Button>
                    <Button onClick={handleSave} className="gap-2 bg-green-600 hover:bg-green-700">
                        <Check className="w-4 h-4" /> Guardar Cambios
                    </Button>
                </div>
            )}
        </div>
    );
}
