import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * useAutoSave - Debounced auto-save hook with visual indicator
 * 
 * @param data - The data to auto-save
 * @param saveFn - The save function (async)
 * @param delay - Debounce delay in ms (default: 30000 = 30s)
 * @param enabled - Whether auto-save is enabled
 */
export function useAutoSave<T>(
    data: T,
    saveFn: (data: T) => Promise<{ success: boolean }>,
    delay: number = 30000,
    enabled: boolean = true
) {
    const [status, setStatus] = useState<'idle' | 'pending' | 'saving' | 'saved' | 'error'>('idle');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const dataRef = useRef(data);
    const isMountedRef = useRef(true);

    // Keep dataRef updated
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // Trigger save function
    const triggerSave = useCallback(async () => {
        if (!isMountedRef.current) return;

        setStatus('saving');
        try {
            const result = await saveFn(dataRef.current);
            if (isMountedRef.current) {
                if (result.success) {
                    setStatus('saved');
                    setLastSaved(new Date());
                    // Reset to idle after 3s
                    setTimeout(() => {
                        if (isMountedRef.current) {
                            setStatus('idle');
                        }
                    }, 3000);
                } else {
                    setStatus('error');
                }
            }
        } catch (error) {
            console.error('[useAutoSave] Save failed:', error);
            if (isMountedRef.current) {
                setStatus('error');
            }
        }
    }, [saveFn]);

    // Setup debounced auto-save
    useEffect(() => {
        if (!enabled) return;

        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Set pending status
        setStatus('pending');

        // Schedule save
        timeoutRef.current = setTimeout(() => {
            triggerSave();
        }, delay);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [data, delay, enabled, triggerSave]);

    // Manual save function
    const saveNow = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        triggerSave();
    }, [triggerSave]);

    return {
        status,
        lastSaved,
        saveNow,
        isPending: status === 'pending',
        isSaving: status === 'saving',
        isSaved: status === 'saved',
        isError: status === 'error',
    };
}

/**
 * AutoSaveIndicator - Visual component for auto-save status
 */
export function AutoSaveIndicator({
    status,
    lastSaved
}: {
    status: 'idle' | 'pending' | 'saving' | 'saved' | 'error';
    lastSaved: Date | null;
}) {
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    };

    if (status === 'idle' && !lastSaved) return null;

    return (
        <div className="flex items-center gap-2 text-xs">
            {status === 'pending' && (
                <>
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-amber-600 dark:text-amber-400">Cambios sin guardar</span>
                </>
            )}
            {status === 'saving' && (
                <>
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-spin" />
                    <span className="text-blue-600 dark:text-blue-400">Guardando...</span>
                </>
            )}
            {status === 'saved' && (
                <>
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">
                        Guardado {lastSaved && `a las ${formatTime(lastSaved)}`}
                    </span>
                </>
            )}
            {status === 'error' && (
                <>
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-red-600 dark:text-red-400">Error al guardar</span>
                </>
            )}
        </div>
    );
}
