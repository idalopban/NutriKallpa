"use client";

import { AntropometriaLayout } from "../AntropometriaLayout";
import { FullMeasurementData } from "../UnifiedMeasurementForm";
import { MedidasAntropometricas } from "@/types";

// This layout basically delegates to the existing AntropometriaLayout which is the fully functional Adult module.
// We are preserving the existing functionality 100% as requested.

interface AdultAnthropometryLayoutProps {
    patientName?: string;
    patientGender?: 'masculino' | 'femenino';
    patientBirthDate?: string;
    initialWeight?: number;
    initialHeight?: number;
    medidas: MedidasAntropometricas[];
    onSave?: (data: FullMeasurementData, formula: string, result?: any) => void;
    onDeleteMedida?: (id: string) => void;
    patientId?: string;
}

export function AdultAnthropometryLayout(props: AdultAnthropometryLayoutProps) {
    return <AntropometriaLayout {...props} />;
}
