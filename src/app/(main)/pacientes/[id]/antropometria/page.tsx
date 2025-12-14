"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardAntropometria } from "@/components/antropometria/DashboardAntropometria";
import { PatientNutritionConfig } from "@/components/patient/PatientNutritionConfig";
import { usePatientStore } from "@/store/usePatientStore";
import type { MedidasAntropometricas, Paciente } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PaginaAntropometria() {
    const params = useParams();
    const router = useRouter();
    const pacienteId = params.id as string;

    // Use centralized patient store
    const {
        patient: paciente,
        medidas,
        isLoading: loading,
        loadPatient,
        refreshMedidas
    } = usePatientStore();

    useEffect(() => {
        if (pacienteId) {
            loadPatient(pacienteId);
        }
    }, [pacienteId, loadPatient]);

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Cargando datos...</div>;
    }

    if (!paciente) {
        return <div className="p-8 text-center text-red-500">Paciente no encontrado</div>;
    }

    return (
        <div className="container mx-auto max-w-7xl p-6 space-y-8">
            <div className="mb-2">
                <Button variant="ghost" onClick={() => router.back()} className="gap-2 pl-0 hover:pl-2 transition-all">
                    <ArrowLeft className="w-4 h-4" /> Volver al Perfil
                </Button>
            </div>

            <header className="border-b border-slate-200 dark:border-[#334155] pb-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard Antropométrico</h1>
                <p className="text-gray-500 dark:text-slate-400">
                    Registro de nuevas medidas y visualización del historial. Paciente: {paciente.datosPersonales.nombre} {paciente.datosPersonales.apellido}
                </p>
            </header>

            {/* Configuración Nutricional del Paciente - Editable */}
            <PatientNutritionConfig editable={true} />

            <DashboardAntropometria
                paciente={paciente}
                medidas={medidas}
                onSuccess={(nuevaMedida) => {
                    // Refresh medidas from store (syncs with storage)
                    refreshMedidas();
                }}
            />
        </div>
    );
}