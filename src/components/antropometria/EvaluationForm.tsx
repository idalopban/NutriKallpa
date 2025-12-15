"use client";

import { useState, useCallback, useMemo } from "react";
import { getAllSites, SkinfoldSiteKey, SkinfoldMeasurement } from "@/lib/skinfold-map";
import { validateSkinfold, ValidationResult } from "@/lib/validation/anthropometry-heuristics";
import { ClipboardList, Save, RotateCcw, AlertTriangle, AlertCircle } from "lucide-react";

interface EvaluationFormProps {
    measurements: SkinfoldMeasurement[];
    onUpdateMeasurement: (siteKey: SkinfoldSiteKey, value: number) => void;
    onClearAll: () => void;
}

export function EvaluationForm({ measurements, onUpdateMeasurement, onClearAll }: EvaluationFormProps) {
    const [formValues, setFormValues] = useState<Record<string, string>>(() => {
        // Inicializar con valores existentes
        const initial: Record<string, string> = {};
        measurements.forEach(m => {
            initial[m.siteKey] = m.value.toString();
        });
        return initial;
    });

    // Track validation results for each field
    const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});

    const sites = getAllSites();

    // Memoize validation for current form values
    const currentValidations = useMemo(() => {
        const results: Record<string, ValidationResult> = {};
        Object.entries(formValues).forEach(([key, value]) => {
            const numValue = parseFloat(value || "0");
            if (!isNaN(numValue) && numValue > 0) {
                results[key] = validateSkinfold(key, numValue);
            }
        });
        return results;
    }, [formValues]);

    const handleInputChange = (siteKey: SkinfoldSiteKey, value: string) => {
        setFormValues(prev => ({ ...prev, [siteKey]: value }));

        // Validate on change
        const numValue = parseFloat(value || "0");
        if (!isNaN(numValue) && numValue > 0) {
            const validation = validateSkinfold(siteKey, numValue);
            setValidationResults(prev => ({ ...prev, [siteKey]: validation }));
        } else {
            setValidationResults(prev => {
                const updated = { ...prev };
                delete updated[siteKey];
                return updated;
            });
        }
    };

    const handleBlur = (siteKey: SkinfoldSiteKey) => {
        const value = parseFloat(formValues[siteKey] || "0");
        if (!isNaN(value) && value > 0) {
            // Only save if validation is not an error
            const validation = validationResults[siteKey];
            if (validation?.level !== 'error') {
                onUpdateMeasurement(siteKey, value);
            }
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent, siteKey: SkinfoldSiteKey) => {
        if (e.key === "Enter") {
            handleBlur(siteKey);
            (e.target as HTMLInputElement).blur();
        }
    };

    const getMeasurementValue = (siteKey: SkinfoldSiteKey): number | null => {
        const m = measurements.find(m => m.siteKey === siteKey);
        return m ? m.value : null;
    };

    const handleReset = () => {
        setFormValues({});
        setValidationResults({});
        onClearAll();
    };

    const savedCount = measurements.length;

    // Count warnings and errors
    const warningCount = Object.values(currentValidations).filter(v => v.level === 'warn').length;
    const errorCount = Object.values(currentValidations).filter(v => v.level === 'error').length;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-[#ff8508]/5 to-transparent">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#ff8508]/10 flex items-center justify-center">
                            <ClipboardList className="w-5 h-5 text-[#ff8508]" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white">Pliegues Cutáneos</h3>
                            <p className="text-xs text-slate-500">Ingresa los valores en milímetros</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Validation status indicators */}
                        {errorCount > 0 && (
                            <span className="text-xs text-red-500 font-medium bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {errorCount} error{errorCount > 1 ? 'es' : ''}
                            </span>
                        )}
                        {warningCount > 0 && (
                            <span className="text-xs text-amber-500 font-medium bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {warningCount} aviso{warningCount > 1 ? 's' : ''}
                            </span>
                        )}
                        {savedCount > 0 && (
                            <>
                                <span className="text-xs text-[#6cba00] font-medium bg-[#6cba00]/10 px-2.5 py-1 rounded-full">
                                    {savedCount} guardados
                                </span>
                                <button
                                    onClick={handleReset}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Limpiar todo"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Form Grid */}
            <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                {sites.map(([key, site]) => {
                    const savedValue = getMeasurementValue(key);
                    const hasValue = savedValue !== null;
                    const validation = currentValidations[key];
                    const hasWarning = validation?.level === 'warn';
                    const hasError = validation?.level === 'error';

                    // Determine styling based on validation state
                    let containerClass = 'bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700';
                    let indicatorClass = 'bg-slate-300 dark:bg-slate-600';
                    let inputClass = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200';

                    if (hasError) {
                        containerClass = 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800';
                        indicatorClass = 'bg-red-500';
                        inputClass = 'border-red-300 dark:border-red-700 bg-white dark:bg-slate-800 text-red-600 font-bold';
                    } else if (hasWarning) {
                        containerClass = 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800';
                        indicatorClass = 'bg-amber-500';
                        inputClass = 'border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-amber-600 font-bold';
                    } else if (hasValue) {
                        containerClass = 'bg-[#6cba00]/5 border border-[#6cba00]/20';
                        indicatorClass = 'bg-[#6cba00]';
                        inputClass = 'border-[#6cba00]/30 bg-white dark:bg-slate-800 text-[#6cba00] font-bold';
                    }

                    return (
                        <div key={key}>
                            <div
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${containerClass}`}
                            >
                                {/* Indicador */}
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${indicatorClass}`} />

                                {/* Nombre del sitio */}
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                        {site.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-2">
                                        {site.type}
                                    </span>
                                </div>

                                {/* Input */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        value={formValues[key] || ""}
                                        onChange={(e) => handleInputChange(key, e.target.value)}
                                        onBlur={() => handleBlur(key)}
                                        onKeyPress={(e) => handleKeyPress(e, key)}
                                        placeholder="0"
                                        className={`w-20 px-3 py-2 text-right text-sm font-mono rounded-lg border transition-all ${inputClass} focus:ring-2 focus:ring-[#6cba00]/30 focus:border-[#6cba00] outline-none`}
                                    />
                                    <span className="text-xs text-slate-400 w-8">mm</span>
                                </div>
                            </div>

                            {/* Validation message */}
                            {validation?.message && (
                                <div className={`mt-1 ml-5 text-xs flex items-center gap-1 ${hasError ? 'text-red-500' : 'text-amber-500'
                                    }`}>
                                    {hasError ? <AlertCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                    {validation.message}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer hint */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
                    <Save className="w-3 h-3" />
                    Los valores se guardan automáticamente al salir del campo
                </p>
            </div>
        </div>
    );
}

