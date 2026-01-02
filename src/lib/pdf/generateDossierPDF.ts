/**
 * generateDossierPDF.ts
 * 
 * Professional "Executive Summary" PDF for patients.
 * Resumes entire clinical status, nutrition goals, and hydration.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Paciente, MedidasAntropometricas } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    PDF_COLORS,
    PDF_FONTS,
    PDF_LAYOUT,
    drawHeader,
    drawPatientBar,
    drawSectionTitle,
    drawFooter,
    TABLE_STYLES
} from './pdf-styles';

interface DossierData {
    paciente: Paciente;
    ultimaMedida?: MedidasAntropometricas;
    nutrition: {
        totalCalories: number;
        proteinaGramos: number;
        carbsGramos: number;
        grasasGramos: number;
        proteinBasisLabel: string;
        objetivoLabel: string;
        tdee: number;
    };
    hydration: {
        totalDailyML: number;
        glassesPerDay: number;
    };
    mealMoments: any[];
}

export const generateDossierPDF = async (data: DossierData) => {
    const { paciente, ultimaMedida, nutrition, hydration, mealMoments } = data;
    const doc = new jsPDF();
    const { margin, contentWidth } = PDF_LAYOUT;

    // --- 1. HEADER ---
    drawHeader(doc, 'EXPEDIENTE CLÍNICO INTEGRAL', 'Resumen Nutricional & Metabólico');

    // --- 2. PATIENT BAR ---
    const patientName = `${paciente.datosPersonales.nombre} ${paciente.datosPersonales.apellido}`;
    const dateStr = format(new Date(), "dd/MM/yyyy", { locale: es });
    let currentY = drawPatientBar(doc, patientName, ultimaMedida?.edad || 0, dateStr);

    // --- 3. ANTECEDENTES Y CLÍNICA ---
    drawSectionTitle(doc, 'ANTECEDENTES Y CLÍNICA', currentY);
    currentY += 10;

    const patologias = paciente.historiaClinica?.patologias || [];
    const antecedentes = paciente.historiaClinica?.antecedentesFamiliares || [];
    const objetivosClinicos = paciente.historiaClinica?.objetivos || 'No especificado';

    const clinicalData = [
        ['Patologías', patologias.length > 0
            ? patologias.map((p: any) => typeof p === 'string' ? p : p.nombre).join(', ')
            : 'Sin patologías registradas'],
        ['Antecedentes', antecedentes.length > 0
            ? antecedentes.join(', ')
            : 'Sin antecedentes relevantes'],
        ['Objetivo Clínico', objetivosClinicos]
    ];

    autoTable(doc, {
        startY: currentY,
        body: clinicalData,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 40, textColor: [100, 100, 100] },
            1: { cellWidth: 'auto' }
        },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // --- 4. ESTADO ANTROPOMETRICO ACTUAL ---
    drawSectionTitle(doc, 'ESTADO ANTROPOMETRICO', currentY);
    currentY += 10;

    const bmi = ultimaMedida?.imc || 0;
    const anthropometryData = [
        ['Peso Actual', `${ultimaMedida?.peso || '--'} kg`, 'Talla', `${ultimaMedida?.talla || '--'} cm`],
        ['IMC', bmi > 0 ? `${bmi.toFixed(1)} kg/m²` : '--', 'Diagnóstico', getBMIDiagnosis(bmi)],
        ['% Grasa (Estimado)', ultimaMedida?.pliegues ? 'Calculado' : '--', 'Masa Muscular', '--']
    ];

    autoTable(doc, {
        startY: currentY,
        body: anthropometryData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3, lineColor: [240, 240, 240] },
        headStyles: { fillColor: [245, 245, 245], textColor: [50, 50, 50] },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 35 },
            1: { cellWidth: 30 },
            2: { fontStyle: 'bold', cellWidth: 35 },
            3: { cellWidth: 30 }
        },
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;

    // --- 5. ESTRATEGIA NUTRICIONAL (MACROS) ---
    drawSectionTitle(doc, 'ESTRATEGIA NUTRICIONAL', currentY);
    currentY += 10;

    // Summary Row
    const strategyData = [
        ['Meta Calórica', `${nutrition.totalCalories} kcal`, 'Fórmula', nutrition.proteinBasisLabel || 'Mifflin-St Jeor'],
        ['Proteína Objetiva', `${nutrition.proteinaGramos}g`, 'Objetivo Peso', nutrition.objetivoLabel]
    ];

    autoTable(doc, {
        startY: currentY,
        body: strategyData,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 40, textColor: [37, 99, 235] }, // Blue
            1: { fontStyle: 'bold', cellWidth: 30 },
            2: { fontStyle: 'bold', cellWidth: 40, textColor: [37, 99, 235] },
            3: { fontStyle: 'bold', cellWidth: 40 }
        }
    });

    currentY = (doc as any).lastAutoTable.finalY + 5;

    // Macros Detail Table
    const macrosTable = [
        ['PROTEÍNA', `${nutrition.proteinaGramos}g`, 'Estructural & Reparación'],
        ['CARBOHIDRATOS', `${nutrition.carbsGramos}g`, 'Energía & Rendimiento'],
        ['GRASAS', `${nutrition.grasasGramos}g`, 'Hormonal & Vitaminas'],
    ];

    autoTable(doc, {
        startY: currentY,
        head: [['MACRONUTRIENTE', 'CANTIDAD META', 'FUNCIÓN PRINCIPAL']],
        body: macrosTable,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' }, // Blue Header
        columnStyles: {
            0: { fontStyle: 'bold' },
            1: { fontStyle: 'bold' },
            2: { fontStyle: 'italic', textColor: [100, 100, 100] }
        }
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;

    // --- 6. DISTRIBUCIÓN DE COMIDAS ---
    if (mealMoments && mealMoments.length > 0) {
        drawSectionTitle(doc, 'DISTRIBUCION SUGERIDA DE COMIDAS', currentY);
        currentY += 10;

        const mealsData = mealMoments
            .filter((m: any) => m.enabled)
            .map((m: any) => [
                m.name,
                `${Math.round(m.ratio * 100)}%`,
                `${Math.round(m.ratio * nutrition.totalCalories)} kcal`,
                '---' // Could add notes here if available
            ]);

        autoTable(doc, {
            startY: currentY,
            head: [['TIEMPO DE COMIDA', '% DEL DÍA', 'CALORÍAS', 'NOTAS']],
            body: mealsData,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [249, 115, 22], textColor: 255 }, // Orange Header
            columnStyles: {
                0: { fontStyle: 'bold' },
                1: { halign: 'center' },
                2: { fontStyle: 'bold', halign: 'center' }
            }
        });

        currentY = (doc as any).lastAutoTable.finalY + 12;
    }

    // --- 7. HIDRATACIÓN ---
    drawSectionTitle(doc, 'HIDRATACION', currentY);
    currentY += 10;

    const hydrationLiters = (hydration.totalDailyML / 1000).toFixed(1);
    const sportsData = paciente.historiaClinica?.estiloVida?.deporte;

    const hydrationInfo = [
        ['Meta Diaria Base', `${hydrationLiters} Litros (~${hydration.glassesPerDay} vasos)`, 'Consumo distribuido durante el día'],
    ];

    if (sportsData?.tasaSudoracion) {
        hydrationInfo.push([
            'Reposición Deportiva',
            `${sportsData.tasaSudoracion} L/h`,
            `Beber ${Math.round(sportsData.tasaSudoracion * 1.5 * 10) / 10}L por cada hora de entrenamiento intenso`
        ]);
    }

    autoTable(doc, {
        startY: currentY,
        body: hydrationInfo,
        theme: 'striped',
        styles: { fontSize: 9 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 40 },
            1: { fontStyle: 'bold', cellWidth: 50 },
            2: { fontStyle: 'italic', textColor: [80, 80, 80] }
        },
    });

    currentY = (doc as any).lastAutoTable.finalY + 20;

    // --- 6. FOOTER NOTES ---
    doc.setFontSize(8);
    doc.setFont(PDF_FONTS.family, 'italic');
    doc.setTextColor(100, 100, 100);
    const footerNotes = "Este resumen ejecutivo es una guía basada en su última evaluación clínica. Los objetivos pueden ser ajustados por su nutricionista según su progreso y adherencia.";
    doc.text(doc.splitTextToSize(footerNotes, contentWidth), margin.left, currentY);

    // --- FOOTER & SAVE ---
    drawFooter(doc);

    const fileName = `Dossier_${paciente.datosPersonales.apellido}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    doc.save(fileName);
};

function getBMIDiagnosis(bmi: number): string {
    if (bmi === 0) return '---';
    if (bmi < 18.5) return 'Bajo Peso';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Sobrepeso';
    if (bmi < 35) return 'Obesidad I';
    if (bmi < 40) return 'Obesidad II';
    return 'Obesidad III';
}
