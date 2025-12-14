import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import { Paciente } from '@/types';
import { DailyPlan } from '@/lib/diet-generator';
import { generateDietPDF } from '@/lib/DietPDFGenerator';
import { useAuthStore } from '@/store/useAuthStore';

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
    const { user } = useAuthStore();

    const handleDownload = async () => {
        try {
            setLoading(true);
            // Small delay to allow UI to update
            await new Promise(resolve => setTimeout(resolve, 100));
            await generateDietPDF(paciente, weeklyPlan, user);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Hubo un error al generar el PDF. Por favor intente nuevamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="outline"
            onClick={handleDownload}
            disabled={loading}
            className="border-[#6cba00] text-[#6cba00] hover:bg-[#6cba00]/10 hover:text-[#5da600]"
        >
            {loading ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generando PDF...
                </>
            ) : (
                <>
                    <Printer className="w-4 h-4 mr-2" /> Descargar
                </>
            )}
        </Button>
    );
};
