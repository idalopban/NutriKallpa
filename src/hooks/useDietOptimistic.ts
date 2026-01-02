/**
 * useDietOptimistic Hook
 * 
 * Implements Optimistic UI Updates for the diet editor.
 * Changes are reflected IMMEDIATELY in the UI while
 * synchronization with the server happens in the background.
 * 
 * Benefits:
 * - Feels instant even on slow hospital connections
 * - Automatic rollback on failure
 * - Visual indicator for pending changes
 */

import { useCallback, useState, useTransition, useRef } from 'react';
import { Alimento } from '@/lib/csv-parser';
import { Meal, MealItem, calculateMealStats, calculateDailyStats, DailyStats } from '@/lib/diet-generator';

// ============================================================================
// TYPES
// ============================================================================

export interface PendingAction {
    id: string;
    type: 'add' | 'update' | 'remove';
    mealIndex: number;
    itemIndex?: number;
    timestamp: number;
}

export interface OptimisticState {
    meals: Meal[];
    isPending: boolean;
    hasPendingActions: boolean;
    pendingCount: number;
    pendingActions: PendingAction[];
    stats: DailyStats;
    lastError: string | null;
}

export interface UseDietOptimisticReturn extends OptimisticState {
    setMeals: React.Dispatch<React.SetStateAction<Meal[]>>;
    addFoodOptimistic: (mealIndex: number, food: Alimento, quantity?: number) => void;
    updateQuantityOptimistic: (mealIndex: number, itemIndex: number, newQuantity: number) => void;
    removeFoodOptimistic: (mealIndex: number, itemIndex: number) => void;
    clearError: () => void;
    retryFailed: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a temporary ID for optimistic items
 */
function generateTempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Check if an ID is a temporary (pending) ID
 */
export function isTempId(id: string): boolean {
    return id.startsWith('temp_');
}

// ============================================================================
// MOCK SERVER FUNCTIONS
// In production, these would call Supabase or your API
// ============================================================================

async function saveMealItemToServer(
    mealIndex: number,
    item: MealItem
): Promise<string> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));

    // Simulate occasional failure (5% chance)
    if (Math.random() < 0.05) {
        throw new Error('Network error: Could not save meal item');
    }

    // Return a "confirmed" ID
    return `confirmed_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function updateQuantityOnServer(
    mealIndex: number,
    itemIndex: number,
    quantity: number
): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 100));

    // Simulate occasional failure
    if (Math.random() < 0.03) {
        throw new Error('Network error: Could not update quantity');
    }
}

async function removeItemFromServer(
    mealIndex: number,
    itemId: string
): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 100));

    // Simulate occasional failure
    if (Math.random() < 0.02) {
        throw new Error('Network error: Could not remove item');
    }
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Hook that implements Optimistic Updates for the diet editor.
 * 
 * @param initialMeals - Initial meals array
 * @param onError - Optional callback when an error occurs
 * @returns Optimistic state and action functions
 */
export function useDietOptimistic(
    initialMeals: Meal[],
    onError?: (error: string) => void
): UseDietOptimisticReturn {
    const [meals, setMeals] = useState<Meal[]>(initialMeals);
    const [isPending, startTransition] = useTransition();
    const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
    const [lastError, setLastError] = useState<string | null>(null);

    // Keep track of failed actions for retry
    const failedActionsRef = useRef<Map<string, () => Promise<void>>>(new Map());

    // Calculate stats whenever meals change
    const stats = calculateDailyStats(meals);

    /**
     * Add a food item to a meal optimistically
     */
    const addFoodOptimistic = useCallback((
        mealIndex: number,
        food: Alimento,
        quantity: number = 100
    ) => {
        const tempId = generateTempId();
        const newItem: MealItem = {
            id: tempId,
            food,
            quantity,
            category: (food as any).categoria || 'otro'
        };

        const actionId = tempId;

        // 1. OPTIMISTIC: Update UI immediately
        setMeals(current => {
            const updated = [...current];
            if (updated[mealIndex]) {
                updated[mealIndex] = {
                    ...updated[mealIndex],
                    items: [...updated[mealIndex].items, newItem]
                };
            }
            return updated;
        });

        // Track pending action
        setPendingActions(prev => [...prev, {
            id: actionId,
            type: 'add',
            mealIndex,
            timestamp: Date.now()
        }]);

        // 2. BACKGROUND: Sync with server
        const syncAction = async () => {
            try {
                const confirmedId = await saveMealItemToServer(mealIndex, newItem);

                // Replace temp ID with confirmed ID
                setMeals(current => {
                    const updated = [...current];
                    if (updated[mealIndex]) {
                        const itemIndex = updated[mealIndex].items.findIndex(i => i.id === tempId);
                        if (itemIndex !== -1) {
                            updated[mealIndex].items[itemIndex] = {
                                ...updated[mealIndex].items[itemIndex],
                                id: confirmedId
                            };
                        }
                    }
                    return updated;
                });

                // Remove from pending
                setPendingActions(prev => prev.filter(a => a.id !== actionId));
                failedActionsRef.current.delete(actionId);

            } catch (error) {
                // ROLLBACK: Remove the item
                setMeals(current => {
                    const updated = [...current];
                    if (updated[mealIndex]) {
                        updated[mealIndex] = {
                            ...updated[mealIndex],
                            items: updated[mealIndex].items.filter(i => i.id !== tempId)
                        };
                    }
                    return updated;
                });

                // Track for retry
                failedActionsRef.current.set(actionId, syncAction);

                const errorMsg = `Error al agregar ${food.nombre}`;
                setLastError(errorMsg);
                onError?.(errorMsg);

                // Remove from pending
                setPendingActions(prev => prev.filter(a => a.id !== actionId));
            }
        };

        startTransition(() => {
            syncAction();
        });
    }, [onError]);

    /**
     * Update the quantity of a food item optimistically
     */
    const updateQuantityOptimistic = useCallback((
        mealIndex: number,
        itemIndex: number,
        newQuantity: number
    ) => {
        // Store previous value for rollback
        let previousQuantity: number = 0;

        const actionId = `update_${mealIndex}_${itemIndex}_${Date.now()}`;

        // 1. OPTIMISTIC: Update UI immediately
        setMeals(current => {
            const updated = [...current];
            if (updated[mealIndex]?.items[itemIndex]) {
                previousQuantity = updated[mealIndex].items[itemIndex].quantity;
                updated[mealIndex] = {
                    ...updated[mealIndex],
                    items: updated[mealIndex].items.map((item, idx) =>
                        idx === itemIndex ? { ...item, quantity: newQuantity } : item
                    )
                };
            }
            return updated;
        });

        // Track pending action
        setPendingActions(prev => [...prev, {
            id: actionId,
            type: 'update',
            mealIndex,
            itemIndex,
            timestamp: Date.now()
        }]);

        // 2. BACKGROUND: Sync with server
        const syncAction = async () => {
            try {
                await updateQuantityOnServer(mealIndex, itemIndex, newQuantity);

                // Remove from pending
                setPendingActions(prev => prev.filter(a => a.id !== actionId));
                failedActionsRef.current.delete(actionId);

            } catch (error) {
                // ROLLBACK: Restore previous quantity
                setMeals(current => {
                    const updated = [...current];
                    if (updated[mealIndex]?.items[itemIndex]) {
                        updated[mealIndex] = {
                            ...updated[mealIndex],
                            items: updated[mealIndex].items.map((item, idx) =>
                                idx === itemIndex ? { ...item, quantity: previousQuantity } : item
                            )
                        };
                    }
                    return updated;
                });

                // Track for retry
                failedActionsRef.current.set(actionId, syncAction);

                const errorMsg = 'Error al actualizar cantidad';
                setLastError(errorMsg);
                onError?.(errorMsg);

                // Remove from pending
                setPendingActions(prev => prev.filter(a => a.id !== actionId));
            }
        };

        startTransition(() => {
            syncAction();
        });
    }, [onError]);

    /**
     * Remove a food item from a meal optimistically
     */
    const removeFoodOptimistic = useCallback((
        mealIndex: number,
        itemIndex: number
    ) => {
        let removedItem: MealItem | null = null;

        const actionId = `remove_${mealIndex}_${itemIndex}_${Date.now()}`;

        // 1. OPTIMISTIC: Remove from UI immediately
        setMeals(current => {
            const updated = [...current];
            if (updated[mealIndex]?.items[itemIndex]) {
                removedItem = updated[mealIndex].items[itemIndex];
                updated[mealIndex] = {
                    ...updated[mealIndex],
                    items: updated[mealIndex].items.filter((_, idx) => idx !== itemIndex)
                };
            }
            return updated;
        });

        // Track pending action
        setPendingActions(prev => [...prev, {
            id: actionId,
            type: 'remove',
            mealIndex,
            itemIndex,
            timestamp: Date.now()
        }]);

        // 2. BACKGROUND: Sync with server
        const syncAction = async () => {
            if (!removedItem) return;

            try {
                await removeItemFromServer(mealIndex, removedItem.id);

                // Remove from pending
                setPendingActions(prev => prev.filter(a => a.id !== actionId));
                failedActionsRef.current.delete(actionId);

            } catch (error) {
                // ROLLBACK: Restore the item
                setMeals(current => {
                    const updated = [...current];
                    if (updated[mealIndex] && removedItem) {
                        updated[mealIndex] = {
                            ...updated[mealIndex],
                            items: [
                                ...updated[mealIndex].items.slice(0, itemIndex),
                                removedItem,
                                ...updated[mealIndex].items.slice(itemIndex)
                            ]
                        };
                    }
                    return updated;
                });

                // Track for retry
                failedActionsRef.current.set(actionId, syncAction);

                const errorMsg = `Error al eliminar ${removedItem?.food.nombre || 'alimento'}`;
                setLastError(errorMsg);
                onError?.(errorMsg);

                // Remove from pending
                setPendingActions(prev => prev.filter(a => a.id !== actionId));
            }
        };

        startTransition(() => {
            syncAction();
        });
    }, [onError]);

    /**
     * Clear the last error
     */
    const clearError = useCallback(() => {
        setLastError(null);
    }, []);

    /**
     * Retry all failed actions
     */
    const retryFailed = useCallback(() => {
        const failedActions = Array.from(failedActionsRef.current.entries());
        failedActionsRef.current.clear();
        setLastError(null);

        for (const [id, action] of failedActions) {
            startTransition(() => {
                action();
            });
        }
    }, []);

    return {
        meals,
        setMeals,
        isPending,
        hasPendingActions: pendingActions.length > 0,
        pendingCount: pendingActions.length,
        pendingActions,
        stats,
        lastError,
        addFoodOptimistic,
        updateQuantityOptimistic,
        removeFoodOptimistic,
        clearError,
        retryFailed
    };
}

// ============================================================================
// UI HELPER COMPONENT
// ============================================================================

/**
 * Props for the sync status indicator
 */
export interface SyncStatusProps {
    hasPendingActions: boolean;
    pendingCount: number;
    lastError: string | null;
    onRetry?: () => void;
    onDismissError?: () => void;
}

/**
 * Get the appropriate status for the sync indicator
 */
export function getSyncStatus(props: SyncStatusProps): {
    status: 'synced' | 'syncing' | 'error';
    message: string;
    color: string;
} {
    if (props.lastError) {
        return {
            status: 'error',
            message: props.lastError,
            color: 'red'
        };
    }

    if (props.hasPendingActions) {
        return {
            status: 'syncing',
            message: `Guardando ${props.pendingCount} cambio${props.pendingCount > 1 ? 's' : ''}...`,
            color: 'amber'
        };
    }

    return {
        status: 'synced',
        message: 'Todos los cambios guardados',
        color: 'green'
    };
}
