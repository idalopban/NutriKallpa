/**
 * generateAnthropometryPDF.ts
 * 
 * Professional "Medical-Grade" PDF Report Generator
 * FINAL VERSION - v3.0
 * 
 * Fixes: Encoding, Somatochart labels, Progress bars, Footer typo
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MedidasAntropometricas, Paciente, getAnthroNumber } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { calculateSomatotype, getSomatotypeClassification } from '../somatotype-utils';
import { calculateFiveComponentFractionation } from '../fiveComponentMath';
import {
    PDF_COLORS,
    PDF_FONTS,
    PDF_LAYOUT,
    drawHeader,
    drawPatientBar,
    drawSectionTitle,
    TABLE_STYLES
} from './pdf-styles';

// ============================================================================
// TYPES
// ============================================================================

interface jsPDFWithAutoTable extends jsPDF {
    lastAutoTable: {
        finalY: number;
    };
}

interface PDFData {
    medida: MedidasAntropometricas;
    paciente: Paciente;
}

// ============================================================================
// HELPER: Sanitize table data (remove zeros/nulls)
// ============================================================================

function sanitizeTableData(data: [string, string][]): [string, string][] {
    return data.filter(([, value]) => {
        const numericPart = parseFloat(value);
        return !isNaN(numericPart) && numericPart > 0;
    });
}

// ============================================================================
// CUSTOM FOOTER (Fixed typo)
// ============================================================================

function drawFooterFixed(doc: jsPDF): void {
    const pageCount = doc.getNumberOfPages();
    const { margin, pageWidth, pageHeight } = PDF_LAYOUT;

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        const footerY = pageHeight - 15;

        // Green divider line
        doc.setDrawColor(...PDF_COLORS.primary);
        doc.setLineWidth(0.5);
        doc.line(margin.left, footerY - 3, pageWidth - margin.right, footerY - 3);

        // Footer text - FIXED TYPO
        doc.setTextColor(...PDF_COLORS.grayMedium);
        doc.setFont(PDF_FONTS.family, 'normal');
        doc.setFontSize(PDF_FONTS.sizes.footer);
        doc.text('Generado por NutriKallpa - Software de Nutricion Avanzada', pageWidth / 2, footerY, { align: 'center' });

        // Page number
        doc.text(`Pagina ${i} de ${pageCount}`, pageWidth - margin.right, footerY, { align: 'right' });
    }
}

// ============================================================================
// SOMATOCHART - DARK MODE PREMIUM VERSION
// Colors: Background=#0F172A, Meso=Green, Endo=Blue, Ecto=Amber
// ============================================================================

function drawSomatochart(
    doc: jsPDF,
    x: number,
    y: number,
    endo: number,
    meso: number,
    ecto: number,
    size: number = 70
): void {
    const centerX = x + size / 2;
    const centerY = y + size / 2 + 5;
    const scale = size / 14;

    // Heath-Carter projection coordinates
    const somatoX = ecto - endo;
    const somatoY = (2 * meso) - (endo + ecto);

    // --- 1. DARK CONTAINER ---
    doc.setFillColor(15, 23, 42); // #0F172A (Slate 900)
    doc.roundedRect(x - 5, y - 10, size + 10, size + 20, 4, 4, 'F');

    // --- 2. GRID LAYER (Dashed) ---
    doc.setGState(new (doc as any).GState({ opacity: 0.3 }));
    doc.setDrawColor(51, 65, 85); // #334155 (Slate 700)
    doc.setLineWidth(0.1);
    doc.setLineDashPattern([1, 1], 0);

    // Grid lines (every 2 units)
    for (let i = -8; i <= 8; i += 2) {
        if (i === 0) continue;
        // Vertical
        doc.line(centerX + i * scale, y, centerX + i * scale, y + size);
        // Horizontal
        doc.line(x, centerY - i * scale * 0.5, x + size, centerY - i * scale * 0.5);
    }
    doc.setLineDashPattern([], 0);
    doc.setGState(new (doc as any).GState({ opacity: 1.0 }));

    // --- 3. AXES & LABELS ---
    doc.setDrawColor(71, 85, 105); // #475569
    doc.setLineWidth(0.2);
    doc.line(centerX, y, centerX, y + size); // Y Axis
    doc.line(x, centerY, x + size, centerY); // X Axis

    doc.setFontSize(4);
    doc.setTextColor(148, 163, 184); // #94A3B8
    [-8, -4, 4, 8].forEach(val => {
        doc.text(val.toString(), centerX + val * scale, centerY + 3, { align: 'center' });
        doc.text(val.toString(), centerX - 3, centerY - val * scale * 0.5 + 1.5, { align: 'right' });
    });

    // --- 4. COLORED ZONES (Reuleaux-like Triangle) ---
    const triHeight = size * 0.7;
    const triBase = size * 0.8;
    const top = { x: centerX, y: centerY - triHeight * 0.6 };
    const left = { x: centerX - triBase * 0.5, y: centerY + triHeight * 0.4 };
    const right = { x: centerX + triBase * 0.5, y: centerY + triHeight * 0.4 };

    doc.setGState(new (doc as any).GState({ opacity: 0.6 }));

    // Meso (Top - Green)
    doc.setFillColor(22, 163, 74); // #16A34A
    doc.triangle(centerX, centerY, top.x, top.y, right.x - 5, centerY, 'F');
    doc.triangle(centerX, centerY, top.x, top.y, left.x + 5, centerY, 'F');

    // Endo (Left - Blue)
    doc.setFillColor(37, 99, 235); // #2563EB
    doc.triangle(centerX, centerY, left.x, left.y, left.x + 5, centerY, 'F');
    doc.triangle(centerX, centerY, left.x, left.y, centerX, left.y, 'F');

    // Ecto (Right - Orange)
    doc.setFillColor(217, 119, 6); // #D97706
    doc.triangle(centerX, centerY, right.x, right.y, right.x - 5, centerY, 'F');
    doc.triangle(centerX, centerY, right.x, right.y, centerX, right.y, 'F');

    doc.setGState(new (doc as any).GState({ opacity: 1.0 }));

    // --- 5. ZONE LABELS ---
    doc.setFontSize(6);
    doc.setFont(PDF_FONTS.family, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('MESO', top.x, top.y - 3, { align: 'center' });
    doc.text('ENDO', left.x - 3, left.y + 4, { align: 'right' });
    doc.text('ECTO', right.x + 3, right.y + 4, { align: 'left' });

    // --- 6. PATIENT POINT ---
    const plotX = centerX + (somatoX * scale);
    const plotY = centerY - (somatoY * scale * 0.5);
    const clampedX = Math.max(x + 2, Math.min(x + size - 2, plotX));
    const clampedY = Math.max(y + 2, Math.min(y + size - 2, plotY));

    // Outer Glow / Halo
    doc.setGState(new (doc as any).GState({ opacity: 0.4 }));
    doc.setFillColor(220, 38, 38); // #DC2626
    doc.circle(clampedX, clampedY, 4, 'F');
    doc.setGState(new (doc as any).GState({ opacity: 1.0 }));

    // Core Point
    doc.setFillColor(220, 38, 38);
    doc.circle(clampedX, clampedY, 2.5, 'F');
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.6);
    doc.circle(clampedX, clampedY, 2.5, 'S');

    // --- 7. TOOLTIP ---
    const tooltipY = clampedY - 7;
    const tooltipX = clampedX + 5;
    const coordText = `${somatoX.toFixed(1)}, ${somatoY.toFixed(1)}`;

    // Dark rounded rectangle
    doc.setFillColor(30, 41, 59); // #1E293B
    doc.roundedRect(tooltipX, tooltipY - 4, 18, 7, 1, 1, 'F');

    // White text
    doc.setFontSize(4.5);
    doc.setFont(PDF_FONTS.family, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(coordText, tooltipX + 9, tooltipY, { align: 'center' });

    // Reset colors
    doc.setTextColor(...PDF_COLORS.black);
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

export const generateAnthropometryPDF = async (data: PDFData) => {
    const { medida, paciente } = data;
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const { margin } = PDF_LAYOUT;

    // --- HEADER ---
    drawHeader(doc, 'REPORTE ANTROPOMETRICO', 'Evaluacion Profesional');

    // --- PATIENT BAR ---
    const patientName = `${paciente.datosPersonales.nombre} ${paciente.datosPersonales.apellido}`;
    const formattedDate = format(new Date(medida.fecha), "dd/MM/yyyy", { locale: es });
    let currentY = drawPatientBar(doc, patientName, medida.edad, formattedDate);

    // --- EXECUTIVE SUMMARY ---
    currentY = renderExecutiveSummary(doc, medida, currentY);

    // --- CONTENT BY PATIENT TYPE ---
    if (medida.tipoPaciente === 'pediatrico') {
        renderPediatricContent(doc, medida, currentY);
    } else if (medida.tipoPaciente === 'adulto_mayor') {
        renderGeriatricContent(doc, medida, currentY);
    } else {
        renderAdultContent(doc, medida, currentY);
    }

    // --- FOOTER (all pages) - FIXED ---
    drawFooterFixed(doc);

    // --- SAVE ---
    const fileName = `Evaluacion_${paciente.datosPersonales.apellido}_${format(new Date(medida.fecha), 'yyyyMMdd')}.pdf`;
    doc.save(fileName);
};

// ============================================================================
// EXECUTIVE SUMMARY
// ============================================================================

function renderExecutiveSummary(doc: jsPDFWithAutoTable, medida: MedidasAntropometricas, startY: number): number {
    const { margin } = PDF_LAYOUT;
    let y = startY;

    // Calculate fractionation first to get indices
    const fractionation = calculateFiveComponentFractionation({
        weight: medida.peso,
        height: medida.talla,
        age: medida.edad,
        gender: medida.sexo === 'femenino' ? 'female' : 'male',
        sittingHeight: medida.tallaSentado,
        triceps: getAnthroNumber(medida.pliegues?.triceps),
        subscapular: getAnthroNumber(medida.pliegues?.subscapular),
        biceps: getAnthroNumber(medida.pliegues?.biceps),
        suprailiac: getAnthroNumber(medida.pliegues?.supraspinale),
        abdominal: getAnthroNumber(medida.pliegues?.abdominal),
        thigh: getAnthroNumber(medida.pliegues?.thigh),
        calf: getAnthroNumber(medida.pliegues?.calf),
        armRelaxedGirth: getAnthroNumber(medida.perimetros?.brazoRelajado),
        thighGirth: getAnthroNumber(medida.perimetros?.musloMedio),
        calfGirth: getAnthroNumber(medida.perimetros?.pantorrilla),
        humerusBreadth: getAnthroNumber(medida.diametros?.humero),
        femurBreadth: getAnthroNumber(medida.diametros?.femur),
        biacromialBreadth: getAnthroNumber(medida.diametros?.biacromial),
        biiliocristalBreadth: getAnthroNumber(medida.diametros?.biiliocristal),
        wristBreadth: getAnthroNumber(medida.diametros?.biestiloideo)
    });

    drawSectionTitle(doc, 'RESUMEN EJECUTIVO', y);
    y += 12;

    const bmi = medida.imc || (medida.peso / Math.pow(medida.talla / 100, 2));
    let bmiClass = 'Normal';
    if (bmi < 18.5) bmiClass = 'Bajo peso';
    else if (bmi >= 25 && bmi < 30) bmiClass = 'Sobrepeso';
    else if (bmi >= 30) bmiClass = 'Obesidad';

    const summaryData = [
        ['Peso Actual', `${medida.peso} kg`, 'IMC', `${bmi.toFixed(1)} kg/m2`],
        ['Talla', `${medida.talla} cm`, 'Clasificacion', bmiClass],
        ['Talla Sentado', medida.tallaSentado ? `${medida.tallaSentado} cm` : '---', 'Indice Cormico', fractionation.cormicIndex ? `${fractionation.cormicIndex.toFixed(1)}%` : '---'],
        ['Edad', `${medida.edad} anos`, 'Sexo', medida.sexo === 'femenino' ? 'Femenino' : 'Masculino'],
    ];

    autoTable(doc, {
        startY: y,
        body: summaryData,
        theme: 'plain',
        styles: {
            fontSize: PDF_FONTS.sizes.small,
            cellPadding: 4,
            textColor: PDF_COLORS.black
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 40 },
            1: { cellWidth: 35 },
            2: { fontStyle: 'bold', cellWidth: 40 },
            3: { cellWidth: 50 }
        },
    });

    return doc.lastAutoTable.finalY + 15;
}

// ============================================================================
// ADULT CONTENT RENDERER
// ============================================================================

function renderAdultContent(doc: jsPDFWithAutoTable, medida: MedidasAntropometricas, startY: number): void {
    let y = startY;
    const { margin } = PDF_LAYOUT;

    // 1. ISAK MEASUREMENTS TABLE
    drawSectionTitle(doc, 'MEDICIONES ISAK', y);
    y += 12;

    const skinfolds = medida.pliegues || {};
    const girths = medida.perimetros || {};
    const breadths = medida.diametros || {};

    // Sanitize data - remove zero values
    const skinfoldData = sanitizeTableData([
        ['Triceps', `${getAnthroNumber(skinfolds.triceps)} mm`],
        ['Subescapular', `${getAnthroNumber(skinfolds.subscapular)} mm`],
        ['Biceps', `${getAnthroNumber(skinfolds.biceps)} mm`],
        ['Cresta Iliaca', `${getAnthroNumber(skinfolds.iliac_crest)} mm`],
        ['Supraespinal', `${getAnthroNumber(skinfolds.supraspinale)} mm`],
        ['Abdominal', `${getAnthroNumber(skinfolds.abdominal)} mm`],
        ['Muslo Frontal', `${getAnthroNumber(skinfolds.thigh)} mm`],
        ['Pantorrilla', `${getAnthroNumber(skinfolds.calf)} mm`],
    ]);

    const girthData = sanitizeTableData([
        ['Brazo Relajado', `${getAnthroNumber(girths.brazoRelajado)} cm`],
        ['Brazo Flex.', `${getAnthroNumber(girths.brazoFlex)} cm`],
        ['Cintura', `${getAnthroNumber(girths.cintura)} cm`],
        ['Cadera', `${getAnthroNumber(girths.cadera)} cm`],
        ['Muslo Medio', `${getAnthroNumber(girths.musloMedio)} cm`],
        ['Pantorrilla', `${getAnthroNumber(girths.pantorrilla)} cm`],
    ]);

    const breadthData = sanitizeTableData([
        ['Humero', `${getAnthroNumber(breadths.humero)} cm`],
        ['Femur', `${getAnthroNumber(breadths.femur)} cm`],
        ['Biacromial', `${getAnthroNumber(breadths.biacromial)} cm`],
        ['Biiliocristal', `${getAnthroNumber(breadths.biiliocristal)} cm`],
    ]);

    // Draw three tables side by side
    if (skinfoldData.length > 0) {
        autoTable(doc, {
            startY: y,
            head: [['PLIEGUES', 'mm']],
            body: skinfoldData,
            ...TABLE_STYLES.primary,
            margin: { left: margin.left },
            tableWidth: 55
        });
    }

    if (girthData.length > 0) {
        autoTable(doc, {
            startY: y,
            head: [['PERIMETROS', 'cm']],
            body: girthData,
            ...TABLE_STYLES.primary,
            margin: { left: margin.left + 60 },
            tableWidth: 55
        });
    }

    if (breadthData.length > 0) {
        autoTable(doc, {
            startY: y,
            head: [['DIAMETROS', 'cm']],
            body: breadthData,
            ...TABLE_STYLES.primary,
            margin: { left: margin.left + 120 },
            tableWidth: 55
        });
    }

    y = doc.lastAutoTable.finalY + 15;

    // Check page break
    if (y > 180) {
        doc.addPage();
        drawHeader(doc, 'REPORTE ANTROPOMETRICO', 'Evaluacion Profesional');
        y = PDF_LAYOUT.headerHeight + 15;
    }

    // 2. BODY COMPOSITION (KERR 5-C) with PROGRESS BARS
    drawSectionTitle(doc, 'COMPOSICION CORPORAL (KERR 5-C)', y);
    y += 12;

    const fractionation = calculateFiveComponentFractionation({
        weight: medida.peso,
        height: medida.talla,
        age: medida.edad,
        gender: medida.sexo === 'femenino' ? 'female' : 'male',
        triceps: getAnthroNumber(medida.pliegues?.triceps),
        subscapular: getAnthroNumber(medida.pliegues?.subscapular),
        biceps: getAnthroNumber(medida.pliegues?.biceps),
        suprailiac: getAnthroNumber(medida.pliegues?.supraspinale),
        abdominal: getAnthroNumber(medida.pliegues?.abdominal),
        thigh: getAnthroNumber(medida.pliegues?.thigh),
        calf: getAnthroNumber(medida.pliegues?.calf),
        armRelaxedGirth: getAnthroNumber(medida.perimetros?.brazoRelajado),
        thighGirth: getAnthroNumber(medida.perimetros?.musloMedio),
        calfGirth: getAnthroNumber(medida.perimetros?.pantorrilla),
        humerusBreadth: getAnthroNumber(medida.diametros?.humero),
        femurBreadth: getAnthroNumber(medida.diametros?.femur),
        biacromialBreadth: getAnthroNumber(medida.diametros?.biacromial),
        biiliocristalBreadth: getAnthroNumber(medida.diametros?.biiliocristal),
        wristBreadth: getAnthroNumber(medida.diametros?.biestiloideo),
        sittingHeight: medida.tallaSentado
    });

    if (fractionation.isValid) {
        // Component data with colors
        const components = [
            { name: 'Masa Adiposa', kg: fractionation.adipose.kg, pct: fractionation.adipose.percent, color: [251, 191, 36] as [number, number, number] },
            { name: 'Masa Muscular', kg: fractionation.muscle.kg, pct: fractionation.muscle.percent, color: [34, 197, 94] as [number, number, number], highlight: true },
            { name: 'Masa Ósea', kg: fractionation.bone.kg, pct: fractionation.bone.percent, color: [148, 163, 184] as [number, number, number] },
            { name: 'Masa Residual', kg: fractionation.residual.kg, pct: fractionation.residual.percent, color: [168, 162, 158] as [number, number, number] },
            { name: 'Masa de Piel', kg: fractionation.skin.kg, pct: fractionation.skin.percent, color: [253, 186, 116] as [number, number, number] },
        ];

        const compData = components.map(c => [
            c.highlight ? `* ${c.name}` : c.name,
            `${c.kg.toFixed(2)} kg`,
            `${c.pct.toFixed(1)}%`,
            '' // Empty for progress bar
        ]);

        autoTable(doc, {
            startY: y,
            head: [['COMPONENTE', 'MASA', '%', 'DISTRIBUCIÓN']],
            body: compData,
            headStyles: {
                fillColor: PDF_COLORS.composition,
                textColor: PDF_COLORS.white,
                fontSize: 9,
                halign: 'center'
            },
            bodyStyles: {
                fontSize: 8,
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 45, halign: 'left' },
                1: { cellWidth: 30 },
                2: { cellWidth: 25 },
                3: { cellWidth: 60 }
            },
            theme: 'grid',
            didDrawCell: (data) => {
                // Draw progress bars in column index 3 (DISTRIBUCION)
                if (data.section === 'body' && data.column.index === 3) {
                    const rowIdx = data.row.index;
                    if (rowIdx >= 0 && rowIdx < components.length) {
                        const comp = components[rowIdx];
                        const cellX = data.cell.x + 2;
                        const cellY = data.cell.y + (data.cell.height / 2) - 3;
                        const maxWidth = 54;
                        const barWidth = Math.min((comp.pct / 50) * maxWidth, maxWidth);
                        const barHeight = 6;

                        // Background bar (gray)
                        doc.setFillColor(229, 231, 235);
                        doc.roundedRect(cellX, cellY, maxWidth, barHeight, 1, 1, 'F');

                        // Progress bar (colored)
                        if (barWidth > 0) {
                            doc.setFillColor(comp.color[0], comp.color[1], comp.color[2]);
                            doc.roundedRect(cellX, cellY, barWidth, barHeight, 1, 1, 'F');
                        }
                    }
                }
            }
        });

        y = doc.lastAutoTable.finalY + 15;
    } else {
        doc.setFontSize(PDF_FONTS.sizes.small);
        doc.setFont(PDF_FONTS.family, 'italic');
        doc.setTextColor(150, 0, 0);
        doc.text('Datos insuficientes para composición corporal.', margin.left + 8, y);
        doc.setTextColor(...PDF_COLORS.black);
        y += 15;
    }

    // Page break check
    if (y > 200) {
        doc.addPage();
        drawHeader(doc, 'REPORTE ANTROPOMETRICO', 'Evaluacion Profesional');
        y = PDF_LAYOUT.headerHeight + 15;
    }

    // 3. SOMATOTYPE with SOMATOCHART
    drawSectionTitle(doc, 'SOMATOTIPO (HEATH-CARTER)', y);
    y += 12;

    const somato = calculateSomatotype({
        bioData: { peso: medida.peso, talla: medida.talla },
        skinfolds: {
            triceps: getAnthroNumber(skinfolds.triceps),
            subscapular: getAnthroNumber(skinfolds.subscapular),
            supraspinale: getAnthroNumber(skinfolds.supraspinale),
            calf: getAnthroNumber(skinfolds.calf)
        },
        girths: {
            brazoFlexionado: getAnthroNumber(girths.brazoFlex),
            pantorrilla: getAnthroNumber(girths.pantorrilla)
        },
        breadths: {
            humero: getAnthroNumber(breadths.humero),
            femur: getAnthroNumber(breadths.femur)
        }
    });

    if (somato.isValid) {
        const classif = getSomatotypeClassification(somato.endomorphy, somato.mesomorphy, somato.ectomorphy);

        // Table on left
        const somatoData = [
            ['ENDOMORFIA', somato.endomorphy.toFixed(1), 'Adiposidad relativa'],
            ['MESOMORFIA', somato.mesomorphy.toFixed(1), 'Desarrollo musculo-esqueletico'],
            ['ECTOMORFIA', somato.ectomorphy.toFixed(1), 'Linealidad relativa'],
        ];

        autoTable(doc, {
            startY: y,
            head: [['COMPONENTE', 'VALOR', 'DESCRIPCION']],
            body: somatoData,
            ...TABLE_STYLES.somatotype,
            margin: { left: margin.left }
        });

        y = doc.lastAutoTable.finalY + 8;

        // Classification badge
        doc.setFillColor(...PDF_COLORS.somatotype);
        doc.roundedRect(margin.left, y, 100, 12, 2, 2, 'F');
        doc.setTextColor(...PDF_COLORS.white);
        doc.setFont(PDF_FONTS.family, 'bold');
        doc.setFontSize(PDF_FONTS.sizes.body);
        doc.text(`Clasificacion: ${classif}`, margin.left + 5, y + 8);
        doc.setTextColor(...PDF_COLORS.black);

    } else {
        doc.setFontSize(PDF_FONTS.sizes.small);
        doc.setFont(PDF_FONTS.family, 'italic');
        doc.setTextColor(150, 0, 0);
        doc.text('Datos insuficientes para somatotipo.', margin.left + 8, y);
    }
}

// ============================================================================
// PEDIATRIC CONTENT
// ============================================================================

function renderPediatricContent(doc: jsPDFWithAutoTable, medida: MedidasAntropometricas, startY: number): void {
    let y = startY;
    const { margin } = PDF_LAYOUT;

    drawSectionTitle(doc, 'INDICADORES DE CRECIMIENTO (OMS)', y);
    y += 12;

    const headCirc = getAnthroNumber(medida.perimetros?.headCircumference);

    const pedData: [string, string, string][] = [
        ['Peso para la Edad', 'Evaluando...', 'Segun tablas OMS'],
        ['Talla para la Edad', 'Evaluando...', 'Percentil segun edad'],
        ['IMC para la Edad', 'Evaluando...', 'Indice de masa corporal ajustado'],
    ];

    if (headCirc > 0) {
        pedData.push(['Perimetro Cefalico', `${headCirc} cm`, 'Si aplica']);
    }

    autoTable(doc, {
        startY: y,
        head: [['INDICADOR', 'DIAGNOSTICO', 'REFERENCIA']],
        body: pedData,
        ...TABLE_STYLES.primary,
    });

    y = doc.lastAutoTable.finalY + 15;

    drawSectionTitle(doc, 'RECOMENDACIONES', y);
    y += 12;

    doc.setFont(PDF_FONTS.family, 'normal');
    doc.setFontSize(PDF_FONTS.sizes.small);
    doc.setTextColor(...PDF_COLORS.black);

    const recommendations = [
        '- Mantener controles de crecimiento cada 3 meses.',
        '- Asegurar alimentacion balanceada segun edad.',
        '- Monitorear hitos del desarrollo psicomotor.',
        '- Vacunacion al dia segun esquema nacional.'
    ];

    recommendations.forEach((rec, idx) => {
        doc.text(rec, margin.left + 8, y + (idx * 6));
    });
}

// ============================================================================
// GERIATRIC CONTENT
// ============================================================================

function renderGeriatricContent(doc: jsPDFWithAutoTable, medida: MedidasAntropometricas, startY: number): void {
    let y = startY;
    const { margin } = PDF_LAYOUT;

    drawSectionTitle(doc, 'EVALUACION GERIATRICA NUTRICIONAL', y);
    y += 12;

    const calfCirc = getAnthroNumber(medida.perimetros?.pantorrilla);
    const sarcopeniaRisk = calfCirc && calfCirc < 31 ? 'ALTO RIESGO' : 'Bajo Riesgo';
    const sarcopeniaColor = sarcopeniaRisk === 'ALTO RIESGO' ? PDF_COLORS.danger : PDF_COLORS.success;

    const bmi = medida.imc || (medida.peso / Math.pow(medida.talla / 100, 2));
    let bmiGeriatric = 'Normal';
    if (bmi < 22) bmiGeriatric = 'Bajo peso';
    else if (bmi > 27) bmiGeriatric = 'Sobrepeso';

    const geriatricData: [string, string, string, string][] = [
        ['IMC Geriatrico', `${bmi.toFixed(1)}`, bmiGeriatric, '22 - 27'],
    ];

    if (calfCirc > 0) {
        geriatricData.push(['Perim. Pantorrilla', `${calfCirc} cm`, sarcopeniaRisk, '> 31 cm']);
    }

    autoTable(doc, {
        startY: y,
        head: [['INDICADOR', 'VALOR', 'DIAGNOSTICO', 'REFERENCIA']],
        body: geriatricData,
        ...TABLE_STYLES.primary,
        didDrawCell: (data) => {
            if (data.row.index === 1 && data.column.index === 2 && data.section === 'body') {
                doc.setTextColor(sarcopeniaColor[0], sarcopeniaColor[1], sarcopeniaColor[2]);
                doc.setFont(PDF_FONTS.family, 'bold');
            }
        }
    });

    y = doc.lastAutoTable.finalY + 15;

    if (calfCirc > 0 && sarcopeniaRisk === 'ALTO RIESGO') {
        doc.setFillColor(254, 226, 226);
        doc.setDrawColor(...PDF_COLORS.danger);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin.left, y, PDF_LAYOUT.contentWidth, 20, 2, 2, 'FD');

        doc.setTextColor(...PDF_COLORS.danger);
        doc.setFont(PDF_FONTS.family, 'bold');
        doc.setFontSize(PDF_FONTS.sizes.small);
        doc.text('ALERTA: Riesgo de Sarcopenia Detectado', margin.left + 5, y + 8);
        doc.setFont(PDF_FONTS.family, 'normal');
        doc.setFontSize(PDF_FONTS.sizes.caption);
        doc.text('Se recomienda evaluacion funcional completa y derivacion a especialista.', margin.left + 5, y + 15);
        doc.setTextColor(...PDF_COLORS.black);
    }
}

export default generateAnthropometryPDF;
