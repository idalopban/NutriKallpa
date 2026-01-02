"use client";

import { useState } from "react";
import { AlertTriangle, X, ShieldAlert, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AllergenValidation } from "@/lib/allergy-validator";

interface AllergyAlertProps {
    validations: AllergenValidation[];
    className?: string;
    showAlternatives?: boolean;
}

/**
 * Displays allergy warnings for foods that contain allergens
 */
export function AllergyAlert({
    validations,
    className,
    showAlternatives = true,
}: AllergyAlertProps) {
    const unsafeItems = validations.filter((v) => !v.isSafe);

    if (unsafeItems.length === 0) return null;

    const severityColors = {
        high: {
            bg: "bg-red-50 dark:bg-red-950/50",
            border: "border-red-500",
            text: "text-red-800 dark:text-red-200",
            icon: "text-red-600",
        },
        medium: {
            bg: "bg-orange-50 dark:bg-orange-950/50",
            border: "border-orange-500",
            text: "text-orange-800 dark:text-orange-200",
            icon: "text-orange-600",
        },
        low: {
            bg: "bg-yellow-50 dark:bg-yellow-950/50",
            border: "border-yellow-500",
            text: "text-yellow-800 dark:text-yellow-200",
            icon: "text-yellow-600",
        },
    };

    // Group by severity
    const highSeverity = unsafeItems.filter((i) => i.severity === "high");
    const otherSeverity = unsafeItems.filter((i) => i.severity !== "high");

    return (
        <div className={cn("space-y-3", className)}>
            {/* High severity items first */}
            {highSeverity.length > 0 && (
                <div
                    className={cn(
                        "rounded-lg border-l-4 p-4",
                        severityColors.high.bg,
                        severityColors.high.border
                    )}
                    role="alert"
                >
                    <div className="flex items-start gap-3">
                        <ShieldAlert className={cn("h-5 w-5 flex-shrink-0", severityColors.high.icon)} />
                        <div className="flex-1">
                            <h4 className={cn("font-semibold text-sm", severityColors.high.text)}>
                                ⚠️ Alerta de Alergia Severa
                            </h4>
                            <p className={cn("mt-1 text-sm", severityColors.high.text)}>
                                Los siguientes alimentos contienen alérgenos de alto riesgo:
                            </p>
                            <ul className="mt-2 space-y-1">
                                {highSeverity.map((item, idx) => (
                                    <li
                                        key={idx}
                                        className={cn("text-sm font-medium", severityColors.high.text)}
                                    >
                                        • <strong>{item.foodItem}</strong> → contiene{" "}
                                        <span className="underline">{item.allergenFound}</span>
                                    </li>
                                ))}
                            </ul>
                            {showAlternatives && highSeverity[0]?.alternatives && (
                                <div className="mt-3 flex items-start gap-2">
                                    <Leaf className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-green-700 dark:text-green-400">
                                        <strong>Alternativas seguras:</strong>{" "}
                                        {highSeverity[0].alternatives.slice(0, 4).join(", ")}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Other severity items */}
            {otherSeverity.length > 0 && (
                <div
                    className={cn(
                        "rounded-lg border-l-4 p-3",
                        severityColors.medium.bg,
                        severityColors.medium.border
                    )}
                >
                    <div className="flex items-start gap-3">
                        <AlertTriangle
                            className={cn("h-4 w-4 flex-shrink-0", severityColors.medium.icon)}
                        />
                        <div className="flex-1">
                            <h4 className={cn("font-medium text-sm", severityColors.medium.text)}>
                                Alimentos con Alérgenos
                            </h4>
                            <div className="mt-1 flex flex-wrap gap-2">
                                {otherSeverity.map((item, idx) => (
                                    <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/50 text-xs text-orange-800 dark:text-orange-200"
                                    >
                                        {item.foodItem} ({item.allergenFound})
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Compact allergy badge for inline display
 */
export function AllergyBadge({
    allergen,
    severity = "medium",
    className,
}: {
    allergen: string;
    severity?: "high" | "medium" | "low";
    className?: string;
}) {
    const colors = {
        high: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
        medium: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
        low: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200",
    };

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                colors[severity],
                className
            )}
        >
            <AlertTriangle className="h-3 w-3" />
            {allergen}
        </span>
    );
}

/**
 * Food item with allergy indicator
 */
export function FoodItemWithAllergyCheck({
    foodName,
    validation,
    className,
}: {
    foodName: string;
    validation: AllergenValidation;
    className?: string;
}) {
    if (validation.isSafe) {
        return (
            <span className={cn("flex items-center gap-1", className)}>
                <span className="text-green-600">✓</span>
                {foodName}
            </span>
        );
    }

    return (
        <span
            className={cn(
                "flex items-center gap-2 text-red-600 dark:text-red-400",
                className
            )}
        >
            <AlertTriangle className="h-4 w-4" />
            <span className="line-through opacity-60">{foodName}</span>
            <span className="text-xs">({validation.allergenFound})</span>
        </span>
    );
}
