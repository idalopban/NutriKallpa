"use client";

import { useEffect, useRef } from 'react';
import { usePatientStore } from '@/store/usePatientStore';
import type { Paciente, MedidasAntropometricas } from '@/types';

interface PatientServerWrapperProps {
    patient: Paciente | null;
    medidas: MedidasAntropometricas[];
    children: React.ReactNode;
}

/**
 * Hydration Bridge Component
 * 
 * Takes server-fetched data and injects it into the Zustand store
 * before the main UI renders. This eliminates the "Cache Miss" wait time.
 */
export function PatientServerWrapper({ patient, medidas, children }: PatientServerWrapperProps) {
    const { initServerData } = usePatientStore();

    useEffect(() => {
        if (patient) {
            initServerData(patient, medidas);
        }
    }, [patient, medidas, initServerData]);

    return <>{children}</>;
}
