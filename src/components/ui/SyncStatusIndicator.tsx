'use client';

/**
 * SyncStatusIndicator Component
 * 
 * Visual indicator for optimistic UI synchronization status.
 * Shows when changes are being saved, saved successfully, or failed.
 */

import React from 'react';
import { Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSyncStatus, SyncStatusProps } from '@/hooks/useDietOptimistic';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface SyncStatusIndicatorProps extends SyncStatusProps {
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function SyncStatusIndicator({
    hasPendingActions,
    pendingCount,
    lastError,
    onRetry,
    onDismissError,
    showLabel = true,
    size = 'md',
    className = ''
}: SyncStatusIndicatorProps) {
    const status = getSyncStatus({ hasPendingActions, pendingCount, lastError });

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
        lg: 'text-base px-4 py-2'
    };

    const iconSizes = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5'
    };

    // Error state
    if (status.status === 'error') {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <div className={`flex items-center gap-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full ${sizeClasses[size]}`}>
                    <AlertCircle className={iconSizes[size]} />
                    {showLabel && (
                        <span className="max-w-[200px] truncate">{status.message}</span>
                    )}
                </div>

                {onRetry && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRetry}
                        className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-100"
                    >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Reintentar
                    </Button>
                )}

                {onDismissError && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDismissError}
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                    >
                        ×
                    </Button>
                )}
            </div>
        );
    }

    // Syncing state
    if (status.status === 'syncing') {
        return (
            <div className={`flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full ${sizeClasses[size]} ${className}`}>
                <Loader2 className={`${iconSizes[size]} animate-spin`} />
                {showLabel && <span>{status.message}</span>}
            </div>
        );
    }

    // Synced state
    return (
        <div className={`flex items-center gap-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full ${sizeClasses[size]} ${className}`}>
            <Check className={iconSizes[size]} />
            {showLabel && <span>{status.message}</span>}
        </div>
    );
}

// ============================================================================
// MINIMAL DOT INDICATOR
// ============================================================================

interface SyncDotProps {
    hasPendingActions: boolean;
    lastError: string | null;
    className?: string;
}

export function SyncDot({ hasPendingActions, lastError, className = '' }: SyncDotProps) {
    if (lastError) {
        return (
            <div
                className={`w-2 h-2 rounded-full bg-red-500 ${className}`}
                title={lastError}
            />
        );
    }

    if (hasPendingActions) {
        return (
            <div
                className={`w-2 h-2 rounded-full bg-amber-500 animate-pulse ${className}`}
                title="Guardando cambios..."
            />
        );
    }

    return (
        <div
            className={`w-2 h-2 rounded-full bg-green-500 ${className}`}
            title="Todos los cambios guardados"
        />
    );
}

// ============================================================================
// TOAST-STYLE NOTIFICATION
// ============================================================================

interface SyncToastProps {
    hasPendingActions: boolean;
    pendingCount: number;
    lastError: string | null;
    onRetry?: () => void;
    onDismiss?: () => void;
}

export function SyncToast({
    hasPendingActions,
    pendingCount,
    lastError,
    onRetry,
    onDismiss
}: SyncToastProps) {
    // Only show when there's activity
    if (!hasPendingActions && !lastError) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-300">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${lastError
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-800 text-white'
                }`}>
                {lastError ? (
                    <>
                        <AlertCircle className="w-5 h-5" />
                        <span className="max-w-[250px] truncate">{lastError}</span>
                        {onRetry && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onRetry}
                                className="text-white hover:bg-red-700"
                            >
                                Reintentar
                            </Button>
                        )}
                    </>
                ) : (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>
                            Guardando {pendingCount} cambio{pendingCount > 1 ? 's' : ''}...
                        </span>
                    </>
                )}

                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="ml-2 hover:opacity-80"
                    >
                        ×
                    </button>
                )}
            </div>
        </div>
    );
}
