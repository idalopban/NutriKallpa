"use client";

import { AlertTriangle, Lightbulb, CheckCircle2, Info, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import type { FormulaValidation, FormulaProfile } from "@/lib/formula-advisor";
import { FORMULA_METADATA } from "@/lib/formula-advisor";

interface FormulaAlertBannerProps {
    validation: FormulaValidation;
    onSwitchFormula?: (formula: FormulaProfile) => void;
}

/**
 * Displays a contextual alert when the selected formula doesn't match
 * the patient's profile, with an option to switch to the recommended formula.
 */
export function FormulaAlertBanner({ validation, onSwitchFormula }: FormulaAlertBannerProps) {
    const [dismissed, setDismissed] = useState(false);

    // Don't show if optimal or dismissed
    if (validation.isOptimal || dismissed) {
        return null;
    }

    const severityStyles = {
        critical: {
            variant: "destructive" as const,
            icon: AlertTriangle,
            bgClass: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900",
            iconClass: "text-red-600 dark:text-red-400"
        },
        warning: {
            variant: "default" as const,
            icon: Lightbulb,
            bgClass: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900",
            iconClass: "text-amber-600 dark:text-amber-400"
        },
        info: {
            variant: "default" as const,
            icon: Info,
            bgClass: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900",
            iconClass: "text-blue-600 dark:text-blue-400"
        }
    };

    const style = severityStyles[validation.severity];
    const Icon = style.icon;
    const recommendedMeta = FORMULA_METADATA[validation.recommended];

    return (
        <Alert className={`relative ${style.bgClass} mb-4`}>
            {/* Dismiss button */}
            <button
                onClick={() => setDismissed(true)}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                aria-label="Cerrar alerta"
            >
                <X className="w-4 h-4 text-slate-400" />
            </button>

            <Icon className={`h-5 w-5 ${style.iconClass}`} />

            <AlertTitle className="flex items-center gap-2 pr-6">
                {validation.message}
                {validation.severity === 'critical' && (
                    <Badge variant="destructive" className="text-xs">Precisión Reducida</Badge>
                )}
            </AlertTitle>

            <AlertDescription className="mt-2 space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                    {validation.suggestion}
                </p>

                {onSwitchFormula && (
                    <div className="flex items-center gap-3 pt-1">
                        <Button
                            size="sm"
                            variant={validation.severity === 'critical' ? 'default' : 'outline'}
                            onClick={() => onSwitchFormula(validation.recommended)}
                            className="gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Usar {recommendedMeta.name}
                        </Button>
                        <span className="text-xs text-slate-500">
                            {recommendedMeta.author} ({recommendedMeta.year})
                        </span>
                    </div>
                )}
            </AlertDescription>
        </Alert>
    );
}

/**
 * Compact version for use in sidebars or smaller spaces
 */
export function FormulaAlertCompact({ validation, onSwitchFormula }: FormulaAlertBannerProps) {
    if (validation.isOptimal) {
        return (
            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Fórmula óptima</span>
            </div>
        );
    }

    const colors = {
        critical: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30",
        warning: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30",
        info: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30"
    };

    return (
        <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${colors[validation.severity]}`}>
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Hay una fórmula más precisa</span>
            {onSwitchFormula && (
                <button
                    onClick={() => onSwitchFormula(validation.recommended)}
                    className="underline hover:no-underline whitespace-nowrap"
                >
                    Cambiar
                </button>
            )}
        </div>
    );
}
