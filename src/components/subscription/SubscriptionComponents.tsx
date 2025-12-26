"use client";

/**
 * Subscription Status Badge and Feature Gate Components
 * 
 * Visual components to show subscription status and gate premium features.
 */

import { useState } from 'react';
import {
    useSubscriptionGuard,
    useFeatureAccess,
    usePatientLimit,
    type SubscriptionInfo,
    type SubscriptionTier,
    TIER_FEATURES
} from '@/hooks/useSubscriptionGuard';
import {
    Crown,
    AlertTriangle,
    WifiOff,
    Check,
    X,
    Lock,
    Zap,
    Users,
    Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

// ============================================================================
// STATUS BADGE
// ============================================================================

interface SubscriptionBadgeProps {
    subscription: SubscriptionInfo;
    showDetails?: boolean;
}

const STATUS_COLORS = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    expired: 'bg-red-100 text-red-700 border-red-200',
    grace_period: 'bg-amber-100 text-amber-700 border-amber-200',
    blocked: 'bg-red-100 text-red-700 border-red-200',
    loading: 'bg-slate-100 text-slate-500 border-slate-200',
    error: 'bg-red-100 text-red-700 border-red-200'
};

const TIER_LABELS: Record<SubscriptionTier, { label: string; icon: React.ReactNode }> = {
    free: { label: 'Gratuito', icon: null },
    basic: { label: 'Básico', icon: <Zap className="w-3 h-3" /> },
    professional: { label: 'Profesional', icon: <Crown className="w-3 h-3" /> },
    enterprise: { label: 'Enterprise', icon: <Sparkles className="w-3 h-3" /> }
};

export function SubscriptionBadge({ subscription, showDetails = false }: SubscriptionBadgeProps) {
    const tierInfo = TIER_LABELS[subscription.tier];
    const colorClass = STATUS_COLORS[subscription.status];

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
            {subscription.isOffline && <WifiOff className="w-3 h-3" />}
            {subscription.status === 'grace_period' && <AlertTriangle className="w-3 h-3" />}
            {tierInfo.icon}
            <span>{tierInfo.label}</span>
            {showDetails && subscription.daysRemaining !== null && subscription.daysRemaining > 0 && (
                <span className="opacity-70">• {subscription.daysRemaining}d</span>
            )}
        </div>
    );
}

// ============================================================================
// SUBSCRIPTION STATUS CARD (for settings/profile)
// ============================================================================

interface SubscriptionStatusCardProps {
    subscription: SubscriptionInfo;
    onUpgrade?: () => void;
}

export function SubscriptionStatusCard({ subscription, onUpgrade }: SubscriptionStatusCardProps) {
    const features = TIER_FEATURES[subscription.tier];

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                        {TIER_LABELS[subscription.tier].icon}
                        Plan {TIER_LABELS[subscription.tier].label}
                    </h3>
                    <p className="text-sm text-slate-500">{subscription.message}</p>
                </div>
                <SubscriptionBadge subscription={subscription} />
            </div>

            {/* Progress bar for days remaining */}
            {subscription.daysRemaining !== null && subscription.daysRemaining > 0 && (
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>Días restantes</span>
                        <span>{subscription.daysRemaining} días</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (subscription.daysRemaining / 30) * 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Grace period warning */}
            {subscription.status === 'grace_period' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-medium text-amber-700 dark:text-amber-300">
                                Período de gracia activo
                            </p>
                            <p className="text-amber-600 dark:text-amber-400 text-xs mt-1">
                                Tienes {subscription.gracePeriodDays - (subscription.daysInGracePeriod || 0)} días
                                para renovar antes de perder acceso a funciones premium.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Features list */}
            <div className="space-y-2">
                <h4 className="text-xs font-medium text-slate-500 uppercase">Incluye:</h4>
                <ul className="space-y-1">
                    {features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <Check className="w-4 h-4 text-emerald-500" />
                            {feature}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Upgrade button */}
            {subscription.tier !== 'enterprise' && (
                <Button
                    onClick={onUpgrade}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                >
                    <Crown className="w-4 h-4 mr-2" />
                    Actualizar Plan
                </Button>
            )}
        </div>
    );
}

// ============================================================================
// FEATURE GATE (wraps content that requires subscription)
// ============================================================================

interface FeatureGateProps {
    children: React.ReactNode;
    subscription: SubscriptionInfo;
    requiredTier: SubscriptionTier;
    fallback?: React.ReactNode;
    showUpgradePrompt?: boolean;
}

export function FeatureGate({
    children,
    subscription,
    requiredTier,
    fallback,
    showUpgradePrompt = true
}: FeatureGateProps) {
    const { hasAccess, reason } = useFeatureAccess(subscription, requiredTier);
    const [showDialog, setShowDialog] = useState(false);

    if (hasAccess) {
        return <>{children}</>;
    }

    // Show fallback or upgrade prompt
    if (fallback) {
        return <>{fallback}</>;
    }

    if (!showUpgradePrompt) {
        return null;
    }

    return (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
                <div className="relative cursor-pointer group">
                    {/* Blurred content preview */}
                    <div className="blur-sm pointer-events-none opacity-50">
                        {children}
                    </div>

                    {/* Lock overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20 backdrop-blur-[2px] rounded-lg">
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-lg text-center max-w-[200px]">
                            <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                {reason}
                            </p>
                            <Button size="sm" className="mt-2" variant="default">
                                Ver planes
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogTrigger>

            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Crown className="w-5 h-5 text-amber-500" />
                        Función Premium
                    </DialogTitle>
                    <DialogDescription>
                        Esta función requiere un plan {requiredTier} o superior.
                        Actualiza tu plan para desbloquear todas las funciones.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4 space-y-3">
                    <h4 className="font-medium text-sm">Plan {TIER_LABELS[requiredTier].label} incluye:</h4>
                    <ul className="space-y-2">
                        {TIER_FEATURES[requiredTier].map((feature, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm">
                                <Check className="w-4 h-4 text-emerald-500" />
                                {feature}
                            </li>
                        ))}
                    </ul>

                    <Button className="w-full mt-4">
                        Actualizar a {TIER_LABELS[requiredTier].label}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ============================================================================
// PATIENT LIMIT INDICATOR
// ============================================================================

interface PatientLimitIndicatorProps {
    subscription: SubscriptionInfo;
    currentPatientCount: number;
}

export function PatientLimitIndicator({ subscription, currentPatientCount }: PatientLimitIndicatorProps) {
    const { limit, remaining, canAddMore, message } = usePatientLimit(subscription, currentPatientCount);

    const percentage = limit === 'Ilimitado' ? 0 : (currentPatientCount / (limit as number)) * 100;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <Users className="w-4 h-4" />
                    Pacientes
                </span>
                <span className="font-medium">
                    {currentPatientCount} / {limit}
                </span>
            </div>

            {limit !== 'Ilimitado' && (
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                </div>
            )}

            {message && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {message}
                </p>
            )}
        </div>
    );
}

export default SubscriptionBadge;
