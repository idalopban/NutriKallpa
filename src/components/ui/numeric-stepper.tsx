"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumericStepperProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    label?: string;
    size?: "sm" | "md" | "lg";
    disabled?: boolean;
    className?: string;
    showInput?: boolean;
}

/**
 * NumericStepper - Componente táctil optimizado para tablet/móvil
 * Diseñado para nutricionistas con caliper en una mano
 */
export function NumericStepper({
    value,
    onChange,
    min = 0,
    max = 999,
    step = 0.1,
    unit = "mm",
    label,
    size = "md",
    disabled = false,
    className,
    showInput = true,
}: NumericStepperProps) {
    const handleIncrement = () => {
        const newValue = Math.min(max, Number((value + step).toFixed(2)));
        onChange(newValue);
    };

    const handleDecrement = () => {
        const newValue = Math.max(min, Number((value - step).toFixed(2)));
        onChange(newValue);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseFloat(e.target.value) || 0;
        if (newValue >= min && newValue <= max) {
            onChange(Number(newValue.toFixed(2)));
        }
    };

    // Size variants
    const sizeClasses = {
        sm: {
            button: "w-8 h-8",
            icon: "w-3 h-3",
            input: "w-14 h-8 text-sm",
            unit: "text-xs",
        },
        md: {
            button: "w-12 h-12",
            icon: "w-5 h-5",
            input: "w-20 h-12 text-lg",
            unit: "text-sm",
        },
        lg: {
            button: "w-16 h-16",
            icon: "w-7 h-7",
            input: "w-24 h-16 text-2xl",
            unit: "text-base",
        },
    };

    const sizes = sizeClasses[size];

    return (
        <div className={cn("flex flex-col gap-1", className)}>
            {label && (
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {label}
                </label>
            )}
            <div className="flex items-center gap-1">
                {/* Botón Decrementar */}
                <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={disabled || value <= min}
                    className={cn(
                        sizes.button,
                        "flex items-center justify-center rounded-xl",
                        "bg-slate-100 hover:bg-slate-200 active:bg-slate-300",
                        "dark:bg-slate-800 dark:hover:bg-slate-700 dark:active:bg-slate-600",
                        "border border-slate-200 dark:border-slate-700",
                        "text-slate-600 dark:text-slate-300",
                        "transition-all duration-150 select-none",
                        "disabled:opacity-40 disabled:cursor-not-allowed",
                        "touch-manipulation" // Optimiza para touch
                    )}
                    aria-label="Decrementar"
                >
                    <Minus className={sizes.icon} strokeWidth={2.5} />
                </button>

                {/* Input/Display Value */}
                {showInput ? (
                    <div className="relative">
                        <input
                            type="number"
                            value={value || ""}
                            onChange={handleInputChange}
                            disabled={disabled}
                            step={step}
                            min={min}
                            max={max}
                            className={cn(
                                sizes.input,
                                "text-center font-bold rounded-xl border-2",
                                "border-slate-200 dark:border-slate-700",
                                "bg-white dark:bg-slate-900",
                                "text-slate-800 dark:text-white",
                                "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
                                "disabled:opacity-50 disabled:cursor-not-allowed",
                                "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            )}
                        />
                        {unit && (
                            <span
                                className={cn(
                                    sizes.unit,
                                    "absolute right-2 top-1/2 -translate-y-1/2",
                                    "text-slate-400 dark:text-slate-500 font-medium"
                                )}
                            >
                                {unit}
                            </span>
                        )}
                    </div>
                ) : (
                    <div
                        className={cn(
                            sizes.input,
                            "flex items-center justify-center font-bold rounded-xl",
                            "bg-white dark:bg-slate-900 border-2",
                            "border-slate-200 dark:border-slate-700",
                            "text-slate-800 dark:text-white"
                        )}
                    >
                        {value.toFixed(1)}
                        {unit && (
                            <span className={cn(sizes.unit, "ml-1 text-slate-400")}>
                                {unit}
                            </span>
                        )}
                    </div>
                )}

                {/* Botón Incrementar */}
                <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={disabled || value >= max}
                    className={cn(
                        sizes.button,
                        "flex items-center justify-center rounded-xl",
                        "bg-blue-500 hover:bg-blue-600 active:bg-blue-700",
                        "dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400",
                        "text-white",
                        "transition-all duration-150 select-none",
                        "disabled:opacity-40 disabled:cursor-not-allowed",
                        "shadow-sm shadow-blue-500/30",
                        "touch-manipulation"
                    )}
                    aria-label="Incrementar"
                >
                    <Plus className={sizes.icon} strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );
}

/**
 * NumericStepperCompact - Versión más compacta para formularios densos
 */
export function NumericStepperCompact({
    value,
    onChange,
    min = 0,
    max = 999,
    step = 0.1,
    unit = "mm",
    disabled = false,
    className,
}: Omit<NumericStepperProps, "size" | "label" | "showInput">) {
    const handleIncrement = () => {
        const newValue = Math.min(max, Number((value + step).toFixed(2)));
        onChange(newValue);
    };

    const handleDecrement = () => {
        const newValue = Math.max(min, Number((value - step).toFixed(2)));
        onChange(newValue);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseFloat(e.target.value) || 0;
        if (newValue >= min && newValue <= max) {
            onChange(Number(newValue.toFixed(2)));
        }
    };

    return (
        <div className={cn("inline-flex items-center gap-0.5", className)}>
            <button
                type="button"
                onClick={handleDecrement}
                disabled={disabled || value <= min}
                className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-l-lg",
                    "bg-slate-100 hover:bg-slate-200 active:bg-slate-300",
                    "dark:bg-slate-800 dark:hover:bg-slate-700",
                    "text-slate-500 dark:text-slate-400",
                    "border border-r-0 border-slate-200 dark:border-slate-700",
                    "disabled:opacity-40 touch-manipulation"
                )}
            >
                <Minus className="w-3 h-3" strokeWidth={2.5} />
            </button>

            <div className="relative">
                <input
                    type="number"
                    value={value || ""}
                    onChange={handleInputChange}
                    disabled={disabled}
                    step={step}
                    className={cn(
                        "w-16 h-7 text-center text-sm font-semibold",
                        "border-y border-slate-200 dark:border-slate-700",
                        "bg-white dark:bg-slate-900",
                        "text-slate-800 dark:text-white",
                        "focus:outline-none focus:ring-1 focus:ring-blue-500",
                        "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    )}
                />
                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                    {unit}
                </span>
            </div>

            <button
                type="button"
                onClick={handleIncrement}
                disabled={disabled || value >= max}
                className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-r-lg",
                    "bg-blue-500 hover:bg-blue-600 active:bg-blue-700",
                    "text-white",
                    "border border-l-0 border-blue-500",
                    "disabled:opacity-40 touch-manipulation"
                )}
            >
                <Plus className="w-3 h-3" strokeWidth={2.5} />
            </button>
        </div>
    );
}
