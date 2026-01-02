"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Save, FileDown, Loader2 } from "lucide-react";
import { MedidasAntropometricas, Paciente } from "@/types";
import { FullMeasurementData } from "./UnifiedMeasurementForm";
import { generateAnthropometryPDF } from "@/lib/pdf/generateAnthropometryPDF";
import { useToast } from "@/hooks/use-toast";

interface EvaluationActionsProps {
    data: FullMeasurementData;
    paciente?: Paciente;
    medidas: MedidasAntropometricas[]; // To find the current/latest mesurement if needed
    onSave: (data: FullMeasurementData) => void;
}

export function EvaluationActions({ data, paciente, medidas, onSave }: EvaluationActionsProps) {
    const [isExporting, setIsExporting] = useState(false);
    const { toast } = useToast();

    const handleExportPDF = async () => {
        if (!paciente) {
            toast({
                title: "Error de exportación",
                description: "No hay un paciente seleccionado para generar el reporte.",
                variant: "destructive"
            });
            return;
        }

        setIsExporting(true);
        try {
            // We create a temporary MedidasAntropometricas object from current form data
            // to pass it to the generator. In a real scenario, we might want to save first.
            const tempMedida: MedidasAntropometricas = {
                id: 'temp',
                pacienteId: paciente.id,
                fecha: new Date().toISOString(),
                peso: data.bioData.peso,
                talla: data.bioData.talla,
                edad: data.bioData.edad,
                sexo: data.bioData.genero,
                imc: data.bioData.peso / Math.pow(data.bioData.talla / 100, 2),
                pliegues: { ...data.skinfolds },
                perimetros: {
                    brazoRelajado: data.girths.brazoRelajado,
                    brazoFlex: data.girths.brazoFlexionado,
                    cintura: data.girths.cintura,
                    musloMedio: data.girths.musloMedio,
                    pantorrilla: data.girths.pantorrilla
                },
                diametros: {
                    humero: data.breadths.humero,
                    femur: data.breadths.femur,
                    biacromial: data.breadths.biacromial,
                    biiliocristal: data.breadths.biiliocristal
                },
                tipoPaciente: medidas[0]?.tipoPaciente || (data.bioData.edad >= 60 ? "adulto_mayor" : data.bioData.edad < 18 ? "pediatrico" : "adulto")
            };

            await generateAnthropometryPDF({
                medida: tempMedida,
                paciente: paciente
            });

            toast({
                title: "Reporte Generado",
                description: "El PDF se ha descargado correctamente.",
                className: "bg-[#6cba00] text-white border-none"
            });
        } catch (error) {
            console.error("PDF Export Error:", error);
            toast({
                title: "Error al generar PDF",
                description: "Hubo un problema procesando los datos del reporte.",
                variant: "destructive"
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex flex-col sm:flex-row gap-2">
            <Button
                variant="outline"
                className="h-11 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-semibold"
                onClick={handleExportPDF}
                disabled={isExporting || data.bioData.peso === 0}
            >
                {isExporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <FileDown className="w-4 h-4 mr-2 text-indigo-500" />
                )}
                {isExporting ? "Generando..." : "Exportar PDF"}
            </Button>

            <Button
                className="h-11 rounded-xl bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600 transition-all font-semibold shadow-lg shadow-slate-900/20"
                onClick={() => onSave(data)}
                disabled={data.bioData.peso === 0}
            >
                <Save className="w-4 h-4 mr-2 text-[#ff8508]" />
                Guardar Evaluación
            </Button>
        </div>
    );
}
