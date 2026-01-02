'use client';

import React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import { Paciente } from '@/types';
import { DailyPlan } from '@/lib/diet-generator';
import { DietPDFDocument } from './DietPDFDocument';

interface DownloadButtonProps {
    paciente: Paciente;
    weeklyPlan: DailyPlan[];
    goals: {
        calories: number;
        macros: { protein: number; carbs: number; fat: number };
    };
}

export const DownloadButton = ({ paciente, weeklyPlan, goals }: DownloadButtonProps) => {
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        try {
            setLoading(true);

            // Imperative import to avoid layout-time execution
            const { pdf } = await import('@react-pdf/renderer');

            const fileName = `Plan_Nutricional_${paciente.datosPersonales.nombre}_${paciente.datosPersonales.apellido}.pdf`;
            const startDate = new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });

            // Generate the document imperatively
            const doc = <DietPDFDocument paciente={paciente} weeklyPlan={weeklyPlan} goals={goals} startDate={startDate} />;
            const blob = await pdf(doc).toBlob();

            // Trigger download
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Hubo un error al generar el PDF. Por favor reintente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="outline"
            onClick={handleDownload}
            disabled={loading}
            className="border-[#84CC16] text-[#84CC16] hover:bg-[#84CC16]/10 hover:text-[#65a30d] font-bold shadow-sm"
        >
            {loading ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generando...
                </>
            ) : (
                <>
                    <Printer className="w-4 h-4 mr-2" /> Descargar Plan
                </>
            )}
        </Button>
    );
};
