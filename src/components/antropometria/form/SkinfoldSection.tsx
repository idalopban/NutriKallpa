"use client";

import { UseFormRegister, UseFormWatch } from "react-hook-form";
import { Ruler } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    NumericInput,
    CollapsibleSection,
    SKINFOLD_LABELS,
    REQUIRED_SKINFOLDS,
    TipoPaciente,
} from "./FormComponents";

// ============================================================================
// TYPES
// ============================================================================

interface SkinfoldSectionProps {
    register: UseFormRegister<any>;
    watch: UseFormWatch<any>;
    isOpen: boolean;
    onToggle: () => void;
    tipoPaciente: TipoPaciente;
}

// ============================================================================
// SKINFOLD SECTION COMPONENT
// ============================================================================

export function SkinfoldSection({
    register,
    watch,
    isOpen,
    onToggle,
    tipoPaciente,
}: SkinfoldSectionProps) {
    const pliegues = watch("pliegues") || {};
    const requiredSkinfolds = REQUIRED_SKINFOLDS[tipoPaciente] || [];

    // Count completed required skinfolds
    const completedCount = requiredSkinfolds.filter(
        (key) => (pliegues[key] as number) > 0
    ).length;

    const isRequired = (key: string) => requiredSkinfolds.includes(key);
    const hasValue = (key: string) => (pliegues[key] as number) > 0;

    return (
        <CollapsibleSection
            title="Pliegues Cutáneos"
            icon={Ruler}
            iconColor="text-orange-600"
            isOpen={isOpen}
            onToggle={onToggle}
            badge={
                <Badge
                    variant="outline"
                    className="text-[10px] ml-2 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800"
                >
                    {completedCount}/{requiredSkinfolds.length} requeridos
                </Badge>
            }
        >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(SKINFOLD_LABELS).map(([key, label]) => (
                    <NumericInput
                        key={key}
                        name={`pliegues.${key}`}
                        label={label}
                        unit="mm"
                        register={register}
                        required={isRequired(key)}
                        hasValue={hasValue(key)}
                    />
                ))}
            </div>
        </CollapsibleSection>
    );
}
