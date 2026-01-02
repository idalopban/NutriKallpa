"use client";

import { UseFormRegister, UseFormWatch } from "react-hook-form";
import { Dumbbell } from "lucide-react";
import {
    NumericInput,
    CollapsibleSection,
    BREADTH_LABELS,
} from "./FormComponents";

// ============================================================================
// TYPES
// ============================================================================

interface BreadthSectionProps {
    register: UseFormRegister<any>;
    watch: UseFormWatch<any>;
    isOpen: boolean;
    onToggle: () => void;
}

// ============================================================================
// BREADTH SECTION COMPONENT
// ============================================================================

export function BreadthSection({
    register,
    watch,
    isOpen,
    onToggle,
}: BreadthSectionProps) {
    const diametros = watch("diametros") || {};

    const hasValue = (key: string) => (diametros[key] as number) > 0;

    return (
        <CollapsibleSection
            title="Diámetros Óseos"
            icon={Dumbbell}
            iconColor="text-teal-600"
            isOpen={isOpen}
            onToggle={onToggle}
        >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(BREADTH_LABELS).map(([key, label]) => (
                    <NumericInput
                        key={key}
                        name={`diametros.${key}`}
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
