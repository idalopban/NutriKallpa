"use client";

/**
 * MNASFForm
 * 
 * Mini Nutritional Assessment Short Form (MNA-SF)
 * Screening tool for malnutrition in elderly patients (≥65 years).
 * Based on the official MNA-SF questionnaire.
 */

import { useState, useMemo } from "react";
import { ClipboardCheck, AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react";
import {
    calculateMNASF,
    classifyMNASFScore,
    getMNASFQ6FromBMI,
    getMNASFQ6FromCalf,
    MNASF_QUESTIONS,
    type MNASFInput,
    type MNASFClassification
} from "@/lib/clinical-calculations";

interface MNASFFormProps {
    onComplete: (result: {
        score: number;
        classification: MNASFClassification;
        answers: MNASFInput;
    }) => void;
    patientBMI?: number;
    patientCalfCircumference?: number;
}

export function MNASFForm({ onComplete, patientBMI, patientCalfCircumference }: MNASFFormProps) {
    const [answers, setAnswers] = useState<Partial<MNASFInput>>({});
    const [useCalfForQ6, setUseCalfForQ6] = useState(!patientBMI && !!patientCalfCircumference);

    // Auto-calculate Q6 if we have BMI or calf
    const autoQ6 = useMemo(() => {
        if (!useCalfForQ6 && patientBMI) {
            return getMNASFQ6FromBMI(patientBMI);
        }
        if (useCalfForQ6 && patientCalfCircumference) {
            return getMNASFQ6FromCalf(patientCalfCircumference);
        }
        return undefined;
    }, [patientBMI, patientCalfCircumference, useCalfForQ6]);

    const updateAnswer = <K extends keyof MNASFInput>(key: K, value: MNASFInput[K]) => {
        setAnswers(prev => ({ ...prev, [key]: value }));
    };

    const isComplete = useMemo(() => {
        return (
            answers.ingestaAlimentaria !== undefined &&
            answers.perdidaPeso !== undefined &&
            answers.movilidad !== undefined &&
            answers.estresAgudo !== undefined &&
            answers.problemasNeuropsicologicos !== undefined &&
            (answers.imcOPantorrilla !== undefined || autoQ6 !== undefined)
        );
    }, [answers, autoQ6]);

    const handleSubmit = () => {
        if (!isComplete) return;

        const finalAnswers: MNASFInput = {
            ingestaAlimentaria: answers.ingestaAlimentaria!,
            perdidaPeso: answers.perdidaPeso!,
            movilidad: answers.movilidad!,
            estresAgudo: answers.estresAgudo!,
            problemasNeuropsicologicos: answers.problemasNeuropsicologicos!,
            imcOPantorrilla: answers.imcOPantorrilla ?? autoQ6!
        };

        const score = calculateMNASF(finalAnswers);
        const classification = classifyMNASFScore(score);

        onComplete({ score, classification, answers: finalAnswers });
    };

    const getClassificationBadge = (classification: MNASFClassification) => {
        switch (classification) {
            case 'normal':
                return (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs font-bold">Estado Nutricional Normal</span>
                    </div>
                );
            case 'riesgo_desnutricion':
                return (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs font-bold">Riesgo de Desnutrición</span>
                    </div>
                );
            case 'desnutricion':
                return (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                        <XCircle className="w-4 h-4" />
                        <span className="text-xs font-bold">Desnutrición</span>
                    </div>
                );
        }
    };

    // Calculate preview score
    const previewScore = useMemo(() => {
        if (!isComplete) return null;
        const finalAnswers: MNASFInput = {
            ingestaAlimentaria: answers.ingestaAlimentaria!,
            perdidaPeso: answers.perdidaPeso!,
            movilidad: answers.movilidad!,
            estresAgudo: answers.estresAgudo!,
            problemasNeuropsicologicos: answers.problemasNeuropsicologicos!,
            imcOPantorrilla: answers.imcOPantorrilla ?? autoQ6!
        };
        return calculateMNASF(finalAnswers);
    }, [answers, autoQ6, isComplete]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                <ClipboardCheck className="w-6 h-6 text-purple-500 flex-shrink-0" />
                <div>
                    <h3 className="text-sm font-bold text-purple-800 dark:text-purple-300">
                        Mini Nutritional Assessment - Short Form (MNA-SF)
                    </h3>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                        Tamizaje nutricional para adultos mayores (≥65 años). Puntaje máximo: 14 puntos.
                    </p>
                </div>
            </div>

            {/* Questions */}
            <div className="space-y-5">
                {/* Q1: Ingesta */}
                <QuestionBlock
                    number={1}
                    question={MNASF_QUESTIONS.q1_ingesta.label}
                    options={MNASF_QUESTIONS.q1_ingesta.options}
                    value={answers.ingestaAlimentaria}
                    onChange={(v) => updateAnswer('ingestaAlimentaria', v as 0 | 1 | 2)}
                />

                {/* Q2: Pérdida de peso */}
                <QuestionBlock
                    number={2}
                    question={MNASF_QUESTIONS.q2_perdida_peso.label}
                    options={MNASF_QUESTIONS.q2_perdida_peso.options}
                    value={answers.perdidaPeso}
                    onChange={(v) => updateAnswer('perdidaPeso', v as 0 | 1 | 2 | 3)}
                />

                {/* Q3: Movilidad */}
                <QuestionBlock
                    number={3}
                    question={MNASF_QUESTIONS.q3_movilidad.label}
                    options={MNASF_QUESTIONS.q3_movilidad.options}
                    value={answers.movilidad}
                    onChange={(v) => updateAnswer('movilidad', v as 0 | 1 | 2)}
                />

                {/* Q4: Estrés */}
                <QuestionBlock
                    number={4}
                    question={MNASF_QUESTIONS.q4_estres.label}
                    options={MNASF_QUESTIONS.q4_estres.options}
                    value={answers.estresAgudo}
                    onChange={(v) => updateAnswer('estresAgudo', v as 0 | 2)}
                />

                {/* Q5: Neuropsicológico */}
                <QuestionBlock
                    number={5}
                    question={MNASF_QUESTIONS.q5_neuropsicologico.label}
                    options={MNASF_QUESTIONS.q5_neuropsicologico.options}
                    value={answers.problemasNeuropsicologicos}
                    onChange={(v) => updateAnswer('problemasNeuropsicologicos', v as 0 | 1 | 2)}
                />

                {/* Q6: IMC or Calf */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Pregunta 6
                        </span>
                        {/* Toggle between IMC and Calf */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500">Usar:</span>
                            <button
                                onClick={() => setUseCalfForQ6(false)}
                                className={`text-[10px] px-2 py-1 rounded ${!useCalfForQ6 ? 'bg-purple-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}
                            >
                                IMC
                            </button>
                            <button
                                onClick={() => setUseCalfForQ6(true)}
                                className={`text-[10px] px-2 py-1 rounded ${useCalfForQ6 ? 'bg-purple-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}
                            >
                                Pantorrilla
                            </button>
                        </div>
                    </div>

                    {autoQ6 !== undefined ? (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-2">
                                <Info className="w-4 h-4 text-green-600" />
                                <span className="text-xs text-green-700 dark:text-green-400">
                                    Calculado automáticamente: <strong>{autoQ6} puntos</strong>
                                    {!useCalfForQ6 && patientBMI && ` (IMC: ${patientBMI.toFixed(1)})`}
                                    {useCalfForQ6 && patientCalfCircumference && ` (Pantorrilla: ${patientCalfCircumference} cm)`}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <QuestionBlock
                            number={6}
                            question={useCalfForQ6 ? MNASF_QUESTIONS.q6_pantorrilla.label : MNASF_QUESTIONS.q6_imc.label}
                            options={useCalfForQ6 ? MNASF_QUESTIONS.q6_pantorrilla.options : MNASF_QUESTIONS.q6_imc.options}
                            value={answers.imcOPantorrilla}
                            onChange={(v) => updateAnswer('imcOPantorrilla', v as 0 | 1 | 2 | 3)}
                        />
                    )}
                </div>
            </div>

            {/* Score Preview & Submit */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Puntaje Total:
                    </span>
                    <span className={`text-2xl font-bold ${previewScore === null ? 'text-slate-400' :
                            previewScore >= 12 ? 'text-green-600' :
                                previewScore >= 8 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                        {previewScore !== null ? `${previewScore}/14` : '--/14'}
                    </span>
                </div>

                {previewScore !== null && (
                    <div className="mb-4 flex justify-center">
                        {getClassificationBadge(classifyMNASFScore(previewScore))}
                    </div>
                )}

                <button
                    onClick={handleSubmit}
                    disabled={!isComplete}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
                >
                    Guardar Evaluación MNA-SF
                </button>
            </div>
        </div>
    );
}

// Question Block Component
function QuestionBlock({
    number,
    question,
    options,
    value,
    onChange
}: {
    number: number;
    question: string;
    options: { value: number; label: string }[];
    value?: number;
    onChange: (value: number) => void;
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full flex items-center justify-center text-xs font-bold">
                    {number}
                </span>
                <p className="text-sm text-slate-700 dark:text-slate-300">{question}</p>
            </div>
            <div className="ml-8 space-y-1.5">
                {options.map(option => (
                    <button
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={`w-full text-left p-2.5 rounded-lg border-2 transition-all text-xs ${value === option.value
                                ? 'bg-purple-500 border-purple-500 text-white font-medium'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-purple-300'
                            }`}
                    >
                        <span className="font-bold mr-2">{option.value}pt:</span>
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
