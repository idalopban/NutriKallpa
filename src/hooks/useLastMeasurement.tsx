"use client";

/**
 * Hook: useLastMeasurement
 * 
 * Fetches the last anthropometry measurement for a patient
 * to pre-fill forms during follow-up visits.
 */

import { useState, useCallback } from 'react';
import { createBrowserClient } from '@/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface LastMeasurementData {
    id: string;
    created_at: string;
    weight: number;
    height: number;
    sitting_height?: number;
    age: number;
    // Skinfolds
    triceps?: number;
    subscapular?: number;
    biceps?: number;
    iliac_crest?: number;
    supraspinale?: number;
    abdominal?: number;
    thigh?: number;
    calf?: number;
    // Girths
    arm_relaxed?: number;
    arm_flexed?: number;
    waist?: number;
    hip?: number;
    thigh_mid?: number;
    calf_max?: number;
    // Breadths
    humerus?: number;
    femur?: number;
    // Results
    body_fat_percent?: number;
    muscle_mass_kg?: number;
}

interface UseLastMeasurementResult {
    lastMeasurement: LastMeasurementData | null;
    isLoading: boolean;
    error: string | null;
    fetchLastMeasurement: () => Promise<LastMeasurementData | null>;
    clearLastMeasurement: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useLastMeasurement(patientId: string | null): UseLastMeasurementResult {
    const [lastMeasurement, setLastMeasurement] = useState<LastMeasurementData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchLastMeasurement = useCallback(async (): Promise<LastMeasurementData | null> => {
        if (!patientId) {
            setError('No se proporcionó ID de paciente');
            return null;
        }

        setIsLoading(true);
        setError(null);

        try {
            const supabase = createBrowserClient();

            const { data, error: fetchError } = await supabase
                .from('anthropometry_records')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (fetchError) {
                if (fetchError.code === 'PGRST116') {
                    // No records found - this is not an error
                    setLastMeasurement(null);
                    return null;
                }
                throw fetchError;
            }

            setLastMeasurement(data);
            return data;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error al cargar última medición';
            setError(message);
            console.error('[useLastMeasurement] Error:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [patientId]);

    const clearLastMeasurement = useCallback(() => {
        setLastMeasurement(null);
        setError(null);
    }, []);

    return {
        lastMeasurement,
        isLoading,
        error,
        fetchLastMeasurement,
        clearLastMeasurement
    };
}

// ============================================================================
// HELPER: Convert DB record to form values
// ============================================================================

export function mapRecordToFormValues(record: LastMeasurementData): Record<string, number | undefined> {
    return {
        // Basic
        peso: record.weight,
        talla: record.height,
        sittingHeight: record.sitting_height,
        // Skinfolds
        triceps: record.triceps,
        subescapular: record.subscapular,
        biceps: record.biceps,
        crestaIliaca: record.iliac_crest,
        supraespinal: record.supraspinale,
        abdominal: record.abdominal,
        musloFrontal: record.thigh,
        pantorrillaMedial: record.calf,
        // Girths
        brazoRelajado: record.arm_relaxed,
        brazoFlexionado: record.arm_flexed,
        cintura: record.waist,
        cadera: record.hip,
        musloMedio: record.thigh_mid,
        pantorrillaMaxima: record.calf_max,
        // Breadths
        humero: record.humerus,
        femur: record.femur,
        biacromial: (record as any).biacromial,
        biiliocristal: (record as any).biiliocristal,
        biestiloideo: (record as any).biestiloideo,
    };
}

export default useLastMeasurement;
