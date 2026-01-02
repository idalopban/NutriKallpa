"use client";

import { useState, useMemo, useEffect } from "react";
import {
    FormulaType,
    Gender,
    SkinfoldData,
    FORMULA_INFO,
    calculateBodyComposition,
    getRequiredSkinfoldsLabels,
    getMissingSkinfoldLabels,
    BodyCompositionResult
} from "@/lib/bodyCompositionMath";
import {
    validateFormulaMatch,
    type FormulaProfile
} from "@/lib/formula-advisor";
import { FormulaAlertBanner } from "./FormulaAlertBanner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Scale, Activity, TrendingUp, Info } from "lucide-react";
import type { Paciente } from "@/types";

interface FormulaSelectorProps {
    skinfolds: SkinfoldData;
    gender: Gender;
    weightKg: number;
    heightCm?: number;
    age?: number;
    activityLevel?: string;
    patient?: Partial<Paciente>;
    selectedFormula?: FormulaType;
    onFormulaChange?: (formula: FormulaType) => void;
    onResultChange?: (result: BodyCompositionResult | null) => void;
}

export function FormulaSelector({
    skinfolds,
    gender,
    weightKg,
    heightCm,
    age,
    activityLevel,
    patient,
    selectedFormula: controlledFormula,
    onFormulaChange,
    onResultChange
}: FormulaSelectorProps) {
    const [internalFormula, setInternalFormula] = useState<FormulaType>('general');
    const selectedFormula = controlledFormula || internalFormula;

    const setSelectedFormula = (formula: FormulaType) => {
        if (onFormulaChange) {
            onFormulaChange(formula);
        } else {
            setInternalFormula(formula);
        }
    };

    // Calcular resultado
    const result = useMemo(() => {
        return calculateBodyComposition(selectedFormula, gender, skinfolds, weightKg, heightCm, age);
    }, [selectedFormula, gender, skinfolds, weightKg, heightCm, age]);

    // Validate formula-profile match
    const formulaValidation = useMemo(() => {
        // Build patient data for validation
        const patientData = {
            datosPersonales: {
                nombre: patient?.datosPersonales?.nombre || '',
                apellido: patient?.datosPersonales?.apellido || '',
                email: patient?.datosPersonales?.email || '',
                fechaNacimiento: patient?.datosPersonales?.fechaNacimiento || new Date().toISOString(),
                peso: heightCm ? weightKg : undefined,
                talla: heightCm
            },
            configuracionNutricional: {
                nivelActividad: activityLevel as 'sedentario' | 'ligera' | 'moderada' | 'intensa' | 'muy_intensa' | undefined,
                ...patient?.configuracionNutricional
            }
        };

        const measurements = {
            peso: weightKg,
            talla: heightCm || 170,
            edad: age || 30
        };

        // Map FormulaType to FormulaProfile
        const formulaProfileMap: Record<FormulaType, FormulaProfile> = {
            general: 'general',
            control: 'control',
            fitness: 'fitness',
            athlete: 'atleta',
            rapid: 'rapida'
        };
        const selectedProfile = formulaProfileMap[selectedFormula] || 'general';

        return validateFormulaMatch(selectedProfile, patientData, measurements);
    }, [selectedFormula, weightKg, heightCm, age, activityLevel, patient]);

    // Handle switching to recommended formula
    const handleSwitchFormula = (recommended: FormulaProfile) => {
        const profileToFormulaMap: Record<FormulaProfile, FormulaType> = {
            general: 'general',
            control: 'control',
            fitness: 'control', // Fitness maps to control in this system
            atleta: 'athlete',
            rapida: 'rapid'
        };
        setSelectedFormula(profileToFormulaMap[recommended] || 'general');
    };

    // Notificar cambios
    useEffect(() => {
        onResultChange?.(result.isValid ? result : null);
    }, [result, onResultChange]);

    // Obtener pliegues requeridos para mostrar
    const requiredLabels = getRequiredSkinfoldsLabels(selectedFormula, gender);
    const missingLabels = getMissingSkinfoldLabels(result.missingSkinfolds);

    return (
        <div className="space-y-4">
            {/* Selector de Fórmula */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-[#ff8508]" />
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Seleccionar Fórmula</h4>
                </div>

                <Select value={selectedFormula} onValueChange={(v) => setSelectedFormula(v as FormulaType)}>
                    <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:ring-[#ff8508] focus:border-[#ff8508] h-12">
                        <SelectValue placeholder="Selecciona fórmula..." />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.values(FORMULA_INFO).map((formula) => (
                            <SelectItem key={formula.id} value={formula.id} className="py-3">
                                <div>
                                    <div className="font-semibold">{formula.name}</div>
                                    <div className="text-xs text-slate-400">
                                        {formula.author} ({formula.year})
                                    </div>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Pliegues requeridos */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="text-[10px] text-slate-400 font-medium">Requiere:</span>
                    {requiredLabels.map((label, idx) => (
                        <span
                            key={idx}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${missingLabels.includes(label)
                                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-[#6cba00]/10 text-[#6cba00]'
                                }`}
                        >
                            {label}
                        </span>
                    ))}
                </div>

                {/* Descripción de fórmula */}
                <div className="mt-3 flex items-start gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {FORMULA_INFO[selectedFormula].description}
                    </p>
                </div>
            </div>

            {/* Formula-Profile Match Alert */}
            {(heightCm || age || activityLevel || patient) && (
                <FormulaAlertBanner
                    validation={formulaValidation}
                    onSwitchFormula={handleSwitchFormula}
                />
            )}

            {/* Alerta de pliegues faltantes */}
            {missingLabels.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 animate-in fade-in duration-300">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <div>
                        <div className="font-semibold text-amber-700 dark:text-amber-300 text-sm">
                            Faltan pliegues requeridos
                        </div>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            Ingresa: {missingLabels.join(', ')} para usar esta fórmula.
                        </p>
                    </div>
                </div>
            )}

            {/* Resultados */}
            {result.isValid && (
                <div className="space-y-3 animate-in fade-in duration-500">

                    {/* Tarjeta principal: % Grasa */}
                    <div className="bg-gradient-to-br from-[#ff8508] to-[#e67607] rounded-2xl p-6 text-white shadow-xl shadow-[#ff8508]/30">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-white/80">% Grasa Corporal</div>
                                <div className="text-xs text-white/60 mt-0.5">
                                    Fórmula: {FORMULA_INFO[selectedFormula].name}
                                </div>
                            </div>
                            <CheckCircle2 className="w-6 h-6 text-white/70" />
                        </div>
                        <div className="mt-4">
                            <span className="text-5xl font-black">{result.fatPercent}</span>
                            <span className="text-2xl font-bold ml-1">%</span>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/20 text-xs text-white/70">
                            Densidad Corporal: {result.bodyDensity} g/cm³ (Siri)
                        </div>
                    </div>

                    {/* Tarjetas secundarias: Masas */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Masa Grasa */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                    <Scale className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                                {result.fatMassKg}
                                <span className="text-sm font-medium text-amber-500/70 ml-1">kg</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1">Masa Grasa</div>
                        </div>

                        {/* Masa Libre de Grasa */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-[#6cba00]/10 flex items-center justify-center">
                                    <TrendingUp className="w-4 h-4 text-[#6cba00]" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-[#6cba00]">
                                {result.leanMassKg}
                                <span className="text-sm font-medium text-[#6cba00]/70 ml-1">kg</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1">Masa Libre de Grasa</div>
                        </div>
                    </div>

                    {/* Interpretación */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Clasificación</span>
                            <span className={`font-bold ${result.fatPercent < 15 ? 'text-blue-500' :
                                result.fatPercent < 25 ? 'text-[#6cba00]' :
                                    result.fatPercent < 32 ? 'text-amber-500' :
                                        'text-red-500'
                                }`}>
                                {gender === 'male'
                                    ? (result.fatPercent < 12 ? 'Atlético' : result.fatPercent < 20 ? 'Fitness' : result.fatPercent < 25 ? 'Aceptable' : 'Sobrepeso')
                                    : (result.fatPercent < 20 ? 'Atlético' : result.fatPercent < 28 ? 'Fitness' : result.fatPercent < 32 ? 'Aceptable' : 'Sobrepeso')
                                }
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Estado vacío cuando falta peso */}
            {weightKg <= 0 && (
                <div className="text-center py-6 text-slate-400 text-sm">
                    Ingresa el peso corporal para calcular
                </div>
            )}
        </div>
    );
}
