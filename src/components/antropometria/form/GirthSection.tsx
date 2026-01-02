"use client";

import { UseFormRegister, UseFormWatch } from "react-hook-form";
import { Activity } from "lucide-react";
import {
    NumericInput,
    CollapsibleSection,
    GIRTH_LABELS,
} from "./FormComponents";

// ============================================================================
// TYPES
// ============================================================================

interface GirthSectionProps {
    register: UseFormRegister<any>;
    watch: UseFormWatch<any>;
    isOpen: boolean;
    onToggle: () => void;
}

// ============================================================================
// GIRTH SECTION COMPONENT
// ============================================================================

export function GirthSection({
    register,
    watch,
    isOpen,
    onToggle,
}: GirthSectionProps) {
    const perimetros = watch("perimetros") || {};

    const hasValue = (key: string) => (perimetros[key] as number) > 0;
    const completedCount = Object.keys(GIRTH_LABELS).filter(hasValue).length;

    return (
        <CollapsibleSection
            title="Perímetros"
            icon={Activity}
            iconColor="text-purple-600"
            isOpen={isOpen}
            onToggle={onToggle}
        >
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {Object.entries(GIRTH_LABELS).map(([key, label]) => (
                    <NumericInput
                        key={key}
                        name={`perimetros.${key}`}
                        label={label}
                        unit="cm"
                        register={register}
                        hasValue={hasValue(key)}
                    />
                ))}
            </div>
        </CollapsibleSection>
    );
}
