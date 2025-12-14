"use client";

import { UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, LucideIcon } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface NumericInputProps {
    name: string;
    label: string;
    unit: string;
    register: UseFormRegister<any>;
    step?: string;
    required?: boolean;
    hasValue?: boolean;
    className?: string;
}

export interface CollapsibleSectionProps {
    title: string;
    icon: LucideIcon;
    iconColor: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    badge?: React.ReactNode;
}

// ============================================================================
// NUMERIC INPUT COMPONENT
// ============================================================================

export function NumericInput({
    name,
    label,
    unit,
    register,
    step = "0.1",
    required = false,
    hasValue = false,
    className,
}: NumericInputProps) {
    return (
        <div className={cn("space-y-1.5", className)}>
            <Label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                {label}
                {required && !hasValue && (
                    <span className="text-red-500 text-[8px]">*</span>
                )}
                {hasValue && (
                    <span className="text-green-500 text-[8px]">✓</span>
                )}
            </Label>
            <div className="relative">
                <Input
                    {...register(name, { valueAsNumber: true })}
                    type="number"
                    step={step}
                    placeholder="0"
                    className={cn(
                        "pl-3 pr-8 h-9 text-sm font-medium",
                        "border-slate-200 dark:border-slate-700",
                        "focus:border-primary focus:ring-primary/20",
                        hasValue && "border-green-300 dark:border-green-700"
                    )}
                />
                <span className="absolute right-2 top-2 text-xs text-slate-400">
                    {unit}
                </span>
            </div>
        </div>
    );
}

// ============================================================================
// COLLAPSIBLE SECTION COMPONENT
// ============================================================================

export function CollapsibleSection({
    title,
    icon: Icon,
    iconColor,
    isOpen,
    onToggle,
    children,
    badge,
}: CollapsibleSectionProps) {
    return (
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <button
                type="button"
                onClick={onToggle}
                className={cn(
                    "w-full flex items-center justify-between p-4",
                    "bg-slate-50/50 dark:bg-slate-800/50",
                    "hover:bg-slate-100 dark:hover:bg-slate-700/50",
                    "transition-colors"
                )}
            >
                <div className="flex items-center gap-2">
                    <Icon className={cn("w-4 h-4", iconColor)} />
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {title}
                    </h3>
                    {badge}
                </div>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
            </button>

            {/* Content */}
            {isOpen && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-700">
                    {children}
                </div>
            )}
        </section>
    );
}

// ============================================================================
// SKINFOLD LABELS
// ============================================================================

export const SKINFOLD_LABELS: Record<string, string> = {
    triceps: "Triceps",
    subscapular: "Subescapular",
    biceps: "Biceps",
    iliac_crest: "Cresta Ilíaca",
    supraspinale: "Supraespinal",
    abdominal: "Abdominal",
    thigh: "Muslo",
    calf: "Pantorrilla",
};

export const GIRTH_LABELS: Record<string, string> = {
    brazoFlex: "Brazo Flex.",
    musloMedio: "Muslo Medio",
    pantorrilla: "Pantorrilla",
    cintura: "Cintura",
    cadera: "Cadera",
};

export const BREADTH_LABELS: Record<string, string> = {
    humero: "Húmero",
    femur: "Fémur",
    biacromial: "Biacromial",
    biiliocristal: "Biiliocristal",
};

// ============================================================================
// REQUIRED SKINFOLDS BY PROFILE TYPE
// ============================================================================

export type TipoPaciente = "general" | "control" | "fitness" | "atleta" | "rapida";

export const REQUIRED_SKINFOLDS: Record<TipoPaciente, string[]> = {
    general: ["triceps", "subscapular", "supraspinale", "abdominal"],
    control: ["triceps", "subscapular", "biceps", "iliac_crest"],
    fitness: ["triceps", "subscapular", "supraspinale", "abdominal", "thigh", "calf"],
    atleta: ["triceps", "subscapular", "biceps", "iliac_crest", "supraspinale", "abdominal", "thigh", "calf"],
    rapida: ["triceps", "subscapular"],
};
