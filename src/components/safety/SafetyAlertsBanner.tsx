"use client";

import { AlertTriangle, AlertCircle, AlertOctagon, Info, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { SafetyAlert, AlertSeverity } from "@/lib/safety-alerts";

interface SafetyAlertsBannerProps {
    alerts: SafetyAlert[];
    className?: string;
    dismissible?: boolean;
    compact?: boolean;
}

const severityConfig: Record<
    AlertSeverity,
    {
        icon: typeof AlertTriangle;
        bgColor: string;
        borderColor: string;
        textColor: string;
        iconColor: string;
    }
> = {
    emergency: {
        icon: AlertOctagon,
        bgColor: "bg-red-50 dark:bg-red-950/50",
        borderColor: "border-red-500",
        textColor: "text-red-800 dark:text-red-200",
        iconColor: "text-red-600 dark:text-red-400",
    },
    critical: {
        icon: AlertTriangle,
        bgColor: "bg-orange-50 dark:bg-orange-950/50",
        borderColor: "border-orange-500",
        textColor: "text-orange-800 dark:text-orange-200",
        iconColor: "text-orange-600 dark:text-orange-400",
    },
    warning: {
        icon: AlertCircle,
        bgColor: "bg-yellow-50 dark:bg-yellow-950/50",
        borderColor: "border-yellow-500",
        textColor: "text-yellow-800 dark:text-yellow-200",
        iconColor: "text-yellow-600 dark:text-yellow-400",
    },
    info: {
        icon: Info,
        bgColor: "bg-blue-50 dark:bg-blue-950/50",
        borderColor: "border-blue-500",
        textColor: "text-blue-800 dark:text-blue-200",
        iconColor: "text-blue-600 dark:text-blue-400",
    },
};

export function SafetyAlertsBanner({
    alerts,
    className,
    dismissible = true,
    compact = false,
}: SafetyAlertsBannerProps) {
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

    if (!alerts || alerts.length === 0) return null;

    const visibleAlerts = alerts.filter((alert) => !dismissedIds.has(alert.id));

    if (visibleAlerts.length === 0) return null;

    const handleDismiss = (id: string) => {
        setDismissedIds((prev) => new Set([...prev, id]));
    };

    return (
        <div className={cn("space-y-2", className)}>
            {visibleAlerts.map((alert) => {
                const config = severityConfig[alert.severity];
                const Icon = config.icon;

                return (
                    <div
                        key={alert.id}
                        className={cn(
                            "relative rounded-lg border-l-4 p-4",
                            config.bgColor,
                            config.borderColor,
                            compact && "p-3"
                        )}
                        role="alert"
                    >
                        <div className="flex items-start gap-3">
                            <Icon
                                className={cn(
                                    "h-5 w-5 flex-shrink-0 mt-0.5",
                                    config.iconColor,
                                    compact && "h-4 w-4"
                                )}
                            />
                            <div className="flex-1 min-w-0">
                                <h4
                                    className={cn(
                                        "font-semibold text-sm",
                                        config.textColor,
                                        compact && "text-xs"
                                    )}
                                >
                                    {alert.title}
                                </h4>
                                <p
                                    className={cn(
                                        "mt-1 text-sm opacity-90",
                                        config.textColor,
                                        compact && "text-xs mt-0.5"
                                    )}
                                >
                                    {alert.message}
                                </p>
                                {!compact && alert.recommendation && (
                                    <p className={cn("mt-2 text-xs opacity-75", config.textColor)}>
                                        <strong>Recomendación:</strong> {alert.recommendation}
                                    </p>
                                )}
                                {!compact && alert.referral && (
                                    <p
                                        className={cn(
                                            "mt-1 text-xs font-medium opacity-80",
                                            config.textColor
                                        )}
                                    >
                                        📋 {alert.referral}
                                    </p>
                                )}
                            </div>
                            {dismissible && (
                                <button
                                    onClick={() => handleDismiss(alert.id)}
                                    className={cn(
                                        "flex-shrink-0 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors",
                                        config.textColor
                                    )}
                                    aria-label="Descartar alerta"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Compact inline alert for use in forms or cards
 */
export function SafetyAlertBadge({
    alert,
    className,
}: {
    alert: SafetyAlert;
    className?: string;
}) {
    const config = severityConfig[alert.severity];
    const Icon = config.icon;

    return (
        <div
            className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                config.bgColor,
                config.textColor,
                className
            )}
        >
            <Icon className="h-3 w-3" />
            <span className="truncate max-w-[200px]">{alert.title}</span>
        </div>
    );
}

/**
 * Summary count badge for sidebar or headers
 */
export function SafetyAlertCount({
    alerts,
    className,
}: {
    alerts: SafetyAlert[];
    className?: string;
}) {
    if (!alerts || alerts.length === 0) return null;

    const emergencyCount = alerts.filter((a) => a.severity === "emergency").length;
    const criticalCount = alerts.filter((a) => a.severity === "critical").length;
    const warningCount = alerts.filter((a) => a.severity === "warning").length;

    const highPriority = emergencyCount + criticalCount;

    if (highPriority > 0) {
        return (
            <span
                className={cn(
                    "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold",
                    emergencyCount > 0
                        ? "bg-red-500 text-white"
                        : "bg-orange-500 text-white",
                    className
                )}
            >
                {highPriority}
            </span>
        );
    }

    if (warningCount > 0) {
        return (
            <span
                className={cn(
                    "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold bg-yellow-500 text-yellow-900",
                    className
                )}
            >
                {warningCount}
            </span>
        );
    }

    return null;
}
