import { useState, useEffect, useCallback } from 'react';
import {
    getUserDietHistoryAsync,
    saveWeeklyPlan,
    clonePlanToCurrentWeek,
    deleteSavedPlan,
    type SavedPlan
} from '@/lib/diet-service';
import { DailyPlan } from '@/lib/diet-generator';
import { toast } from 'sonner';

export function useDietHistory(userId: string | undefined) {
    const [history, setHistory] = useState<SavedPlan[]>([]);
    const [loading, setLoading] = useState(false);

    const refreshHistory = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const data = await getUserDietHistoryAsync(userId);
            setHistory(data);
        } catch (error) {
            console.error("Failed to load diet history", error);
            toast.error("Error al cargar el historial de dietas");
        } finally {
            setLoading(false);
        }
    }, [userId]);


    useEffect(() => {
        refreshHistory();
    }, [refreshHistory]);

    const savePlan = (plan: DailyPlan[], name: string, patientId?: string) => {
        if (!userId) return;
        try {
            saveWeeklyPlan(plan, name, userId, patientId);
            toast.success("Plan guardado exitosamente");
            refreshHistory();
        } catch (error) {
            console.error("Failed to save plan", error);
            toast.error("Error al guardar el plan");
            throw error;
        }
    };

    const clonePlan = async (planId: string) => {
        try {
            const clonedPlan = await clonePlanToCurrentWeek(planId);
            if (clonedPlan) {
                toast.success("Plan clonado a la semana actual");
                return clonedPlan;
            } else {
                toast.error("No se pudo encontrar el plan original");
                return null;
            }
        } catch (error) {
            console.error("Failed to clone plan", error);
            toast.error("Error al clonar el plan");
            return null;
        }
    };

    const deletePlan = (planId: string) => {
        try {
            deleteSavedPlan(planId);
            toast.success("Plan eliminado");
            refreshHistory();
        } catch (error) {
            console.error("Failed to delete plan", error);
            toast.error("Error al eliminar el plan");
        }
    };

    return {
        history,
        loading,
        savePlan,
        clonePlan,
        deletePlan,
        refreshHistory
    };
}
