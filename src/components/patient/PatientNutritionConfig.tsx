"use client";

/**
 * PatientNutritionConfig
 * 
 * Reusable component for viewing and editing a patient's nutritional configuration.
 * Can be embedded in anthropometry and diet pages.
 */

import { useState } from "react";
import { Scale, Utensils, Edit2, Check, X } from "lucide-react";
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
        kcalAjuste
    } = usePatientNutrition();

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
            <div className="flex flex-wrap gap-2 items-center text-sm">
                <span className="px-2 py-1 bg-green-500/10 text-green-600 rounded-md flex items-center gap-1">
                    <Scale className="w-3 h-3" />
                    {nivelActividad && activityLabels[nivelActividad]}
                </span>
                <span className="px-2 py-1 bg-orange-500/10 text-orange-600 rounded-md">
                    {objetivoPeso && goalLabels[objetivoPeso]}
                </span>
                <span className="px-2 py-1 bg-blue-500/10 text-blue-600 rounded-md">
                    {proteinaRatio}g/kg proteína
                </span>
                {editable && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="h-7 px-2"
                    >
                        <Edit2 className="w-3 h-3" />
                    </Button>
                )}
            </div>
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
