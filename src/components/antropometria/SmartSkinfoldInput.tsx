"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { ISAK_RANGES } from "@/lib/fiveComponentMath";

interface SmartSkinfoldInputProps {
    label: string;
    fieldKey: keyof typeof ISAK_RANGES.skinfolds;
    value: number;
    onChange: (value: number) => void;
    onEnter?: () => void;
    description?: string;
    autoFocus?: boolean;
}

/**
 * SmartSkinfoldInput - ISAK-validated input with real-time feedback
 * 
 * Features:
 * - Real-time ISAK range validation
 * - Visual feedback (green/amber/red)
 * - Mobile numeric keyboard
 * - Enter key navigation
 * - Descriptive tooltips
 */
export function SmartSkinfoldInput({
    label,
    fieldKey,
    value,
    onChange,
    onEnter,
    description,
    autoFocus = false,
}: SmartSkinfoldInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    // Get ISAK range for this field
    const range = ISAK_RANGES.skinfolds[fieldKey] || { min: 0, max: 80, warn: 60 };

    // Validation state
    const isValid = value === 0 || (value >= range.min && value <= range.max);
    const isWarning = value > range.warn && value <= range.max;
    const isError = value > 0 && (value < range.min || value > range.max);

    // Handle Enter key navigation
    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            onEnter?.();
        }
    };

    // Handle input change with validation
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseFloat(e.target.value) || 0;
        onChange(Math.max(0, newValue));
    };

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus]);

    return (
        <div className="relative group">
            {/* Label with tooltip trigger */}
            <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    {label}
                    {description && (
                        <button
                            type="button"
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                            aria-label={`Información sobre ${label}`}
                        >
                            <Info className="w-3 h-3" />
                        </button>
                    )}
                </label>

                {/* Range indicator */}
                <span className="text-[10px] text-slate-400">
                    {range.min}-{range.max} mm
                </span>
            </div>

            {/* Tooltip */}
            {showTooltip && description && (
                <div className="absolute left-0 bottom-full mb-2 z-50 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl animate-in fade-in duration-200">
                    <p className="font-bold text-[#6cba00] mb-0.5">{label}</p>
                    <p>{description}</p>
                    <div className="absolute left-4 top-full border-4 border-transparent border-t-slate-800" />
                </div>
            )}

            {/* Input field */}
            <div className="relative">
                <input
                    ref={inputRef}
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min={0}
                    max={range.max * 1.5}
                    value={value || ""}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="0.0"
                    className={cn(
                        "w-full h-11 px-3 pr-16 text-sm font-semibold rounded-xl border-2 transition-all duration-200 outline-none",
                        "placeholder:text-slate-300 dark:placeholder:text-slate-600",
                        // Default state
                        !isFocused && !isError && !isWarning && value === 0 &&
                        "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200",
                        // Focused state
                        isFocused && !isError &&
                        "bg-white dark:bg-slate-800 border-[#6cba00] ring-4 ring-[#6cba00]/10",
                        // Valid with value
                        value > 0 && isValid && !isWarning &&
                        "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300",
                        // Warning state
                        isWarning &&
                        "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300",
                        // Error state
                        isError &&
                        "bg-red-50 dark:bg-red-950/30 border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 animate-shake"
                    )}
                />

                {/* Unit and status indicator */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-medium">mm</span>

                    {value > 0 && isValid && !isWarning && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                    {isWarning && (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                    {isError && (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                </div>
            </div>

            {/* Error/Warning message */}
            {(isError || isWarning) && (
                <p className={cn(
                    "text-[10px] mt-1 font-medium animate-in slide-in-from-top-1",
                    isError ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                )}>
                    {isError
                        ? `Valor fuera de rango ISAK (${range.min}-${range.max}mm)`
                        : `Valor alto - verificar medición`
                    }
                </p>
            )}
        </div>
    );
}

// Export ISAK descriptions for tooltips
export const SKINFOLD_DESCRIPTIONS = {
    triceps: "Pliegue vertical en la parte posterior del brazo, sobre el tríceps. Punto medio entre acromion y olécranon.",
    subscapular: "Pliegue oblicuo (45°) debajo del ángulo inferior de la escápula.",
    biceps: "Pliegue vertical en la parte anterior del brazo, sobre el bíceps.",
    suprailiac: "Pliegue oblicuo sobre la cresta ilíaca, en la línea axilar media.",
    abdominal: "Pliegue vertical a 5cm lateral del ombligo.",
    thigh: "Pliegue vertical en la cara anterior del muslo, punto medio entre ingle y rótula.",
    calf: "Pliegue vertical en la cara medial de la pantorrilla, en su punto de mayor circunferencia.",
} as const;
