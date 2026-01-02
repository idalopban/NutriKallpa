"use client";

import { useAnthropometryStore } from "@/store/useAnthropometryStore";
import { WizardProgress } from "./WizardProgress";
import { BioDataForm } from "./steps/BioDataForm";
import { SkinfoldInput } from "./steps/SkinfoldInput";
import { GirthsAndBreadths } from "./steps/GirthsAndBreadths";
import { ResultsDashboard } from "./steps/ResultsDashboard";
import { ChevronLeft, ChevronRight, RotateCcw, CheckCircle } from "lucide-react";

export function AnthropometryWizard() {
    const { currentStep, nextStep, prevStep, resetAll, bioData, skinfolds, girths, breadths } = useAnthropometryStore();

    // Validación por paso
    const canProceed = (): boolean => {
        switch (currentStep) {
            case 1:
                return bioData.peso > 0 && bioData.talla > 0 && bioData.edad > 0;
            case 2:
                return Object.values(skinfolds).filter(v => v > 0).length >= 3;
            case 3:
                return Object.values(girths).filter(v => v > 0).length >= 2 &&
                    Object.values(breadths).filter(v => v > 0).length >= 1;
            case 4:
                return true;
            default:
                return false;
        }
    };

    const getNextButtonText = (): string => {
        switch (currentStep) {
            case 1: return 'Continuar a Pliegues';
            case 2: return 'Continuar a Perímetros';
            case 3: return 'Calcular Resultados';
            case 4: return 'Finalizado';
            default: return 'Siguiente';
        }
    };

    return (
        <div className="min-h-[calc(100vh-200px)] flex flex-col">

            {/* Progress Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-20">
                <WizardProgress />
            </div>

            {/* Step Content */}
            <div className="flex-1 py-8 px-4 overflow-y-auto">
                <div className="max-w-5xl mx-auto">
                    {currentStep === 1 && <BioDataForm />}
                    {currentStep === 2 && <SkinfoldInput />}
                    {currentStep === 3 && <GirthsAndBreadths />}
                    {currentStep === 4 && <ResultsDashboard />}
                </div>
            </div>

            {/* Navigation Footer */}
            <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-4 sticky bottom-0">
                <div className="max-w-5xl mx-auto flex items-center justify-between">

                    {/* Left Side */}
                    <div className="flex items-center gap-3">
                        {currentStep > 1 && currentStep < 4 && (
                            <button
                                onClick={prevStep}
                                className="flex items-center gap-2 px-5 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Atrás
                            </button>
                        )}

                        {currentStep === 4 && (
                            <button
                                onClick={resetAll}
                                className="flex items-center gap-2 px-5 py-3 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Nueva Evaluación
                            </button>
                        )}
                    </div>

                    {/* Center - Step indicator */}
                    <div className="hidden md:flex items-center gap-2 text-sm text-slate-400">
                        <span>Paso {currentStep}</span>
                        <span>de</span>
                        <span>4</span>
                    </div>

                    {/* Right Side */}
                    <div>
                        {currentStep < 4 ? (
                            <button
                                onClick={nextStep}
                                disabled={!canProceed()}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${canProceed()
                                    ? 'bg-gradient-to-r from-[#ff8508] to-[#e67607] text-white shadow-lg shadow-[#ff8508]/30 hover:shadow-xl hover:shadow-[#ff8508]/40 hover:-translate-y-0.5'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                    }`}
                            >
                                {getNextButtonText()}
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 px-6 py-3 bg-[#6cba00]/10 text-[#6cba00] rounded-xl font-bold">
                                <CheckCircle className="w-5 h-5" />
                                Evaluación Completa
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
