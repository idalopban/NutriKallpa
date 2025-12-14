"use client";

import { useAnthropometryStore, WizardStep } from "@/store/useAnthropometryStore";
import { Check, User, Layers, Circle, Activity } from "lucide-react";

const STEPS: { step: WizardStep; name: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { step: 1, name: 'Datos Básicos', icon: User },
    { step: 2, name: 'Pliegues', icon: Layers },
    { step: 3, name: 'Perímetros', icon: Circle },
    { step: 4, name: 'Resultados', icon: Activity }
];

export function WizardProgress() {
    const { currentStep, goToStep, bioData, skinfolds, girths } = useAnthropometryStore();

    // Determinar qué pasos están completos
    const isStepComplete = (step: WizardStep): boolean => {
        switch (step) {
            case 1:
                return bioData.peso > 0 && bioData.talla > 0 && bioData.edad > 0;
            case 2:
                return Object.values(skinfolds).filter(v => v > 0).length >= 3;
            case 3:
                return Object.values(girths).filter(v => v > 0).length >= 2;
            case 4:
                return false;
            default:
                return false;
        }
    };

    return (
        <div className="w-full py-6">
            <div className="flex items-center justify-between max-w-3xl mx-auto px-4">
                {STEPS.map((item, index) => {
                    const isActive = currentStep === item.step;
                    const isCompleted = isStepComplete(item.step);
                    const isPast = item.step < currentStep;
                    const canNavigate = item.step <= currentStep || isStepComplete(item.step - 1 as WizardStep);
                    const Icon = item.icon;

                    return (
                        <div key={item.step} className="flex items-center flex-1">
                            {/* Step Circle */}
                            <button
                                onClick={() => canNavigate && goToStep(item.step)}
                                disabled={!canNavigate}
                                className={`relative flex flex-col items-center group ${canNavigate ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                            >
                                <div className={`
                                    w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 
                                    ${isActive
                                        ? 'bg-gradient-to-br from-[#ff8508] to-[#e67607] text-white shadow-lg shadow-[#ff8508]/40 scale-110'
                                        : isPast || isCompleted
                                            ? 'bg-[#6cba00] text-white'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                                    }
                                    ${canNavigate && !isActive ? 'hover:scale-105' : ''}
                                `}>
                                    {isPast || (isCompleted && !isActive) ? (
                                        <Check className="w-5 h-5" />
                                    ) : (
                                        <Icon className="w-5 h-5" />
                                    )}
                                </div>

                                {/* Step Name */}
                                <span className={`
                                    mt-2 text-xs font-medium transition-colors whitespace-nowrap
                                    ${isActive
                                        ? 'text-[#ff8508] font-bold'
                                        : isPast
                                            ? 'text-[#6cba00]'
                                            : 'text-slate-400 dark:text-slate-500'
                                    }
                                `}>
                                    {item.name}
                                </span>

                                {/* Active Indicator */}
                                {isActive && (
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#ff8508]" />
                                )}
                            </button>

                            {/* Connector Line */}
                            {index < STEPS.length - 1 && (
                                <div className="flex-1 mx-3 h-0.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                                    <div
                                        className={`h-full bg-[#6cba00] transition-all duration-500 ${isPast || isStepComplete(item.step) ? 'w-full' : 'w-0'
                                            }`}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
