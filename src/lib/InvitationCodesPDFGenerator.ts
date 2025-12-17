import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// =============================================
// BRAND COLORS
// =============================================
const BRAND_PRIMARY: [number, number, number] = [255, 133, 8];    // #ff8508 - NutriKallpa Orange
const TEXT_DARK: [number, number, number] = [30, 41, 59];         // Slate 800
const TEXT_GRAY: [number, number, number] = [100, 116, 139];      // Slate 500

interface GeneratedCode {
    code: string;
    rol: string;
    createdAt: string;
}

/**
 * Generates a clean, well-organized PDF with invitation codes
 */
export function generateInvitationCodesPDF(
    codes: GeneratedCode[],
    generatedBy?: string
): void {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    // =============================================
    // HEADER
    // =============================================

    // Orange header bar
    doc.setFillColor(...BRAND_PRIMARY);
    doc.rect(0, 0, pageWidth, 25, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('NutriKallpa', margin, 15);

    // Subtitle
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Códigos de Invitación', pageWidth - margin, 10, { align: 'right' });

    // Date
    const currentDate = new Date().toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    doc.setFontSize(9);
    doc.text(currentDate, pageWidth - margin, 18, { align: 'right' });

    // =============================================
    // INFO SECTION
    // =============================================
    const rol = codes[0]?.rol === 'admin' ? 'Administrador' : 'Nutricionista';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_DARK);
    doc.text(`Total: ${codes.length} códigos  |  Rol: ${rol}${generatedBy ? `  |  Generado por: ${generatedBy}` : ''}`, margin, 35);

    // =============================================
    // CODES TABLE - Using autoTable for proper pagination
    // =============================================

    // Create table data with 4 columns
    const cols = 4;
    const tableData: string[][] = [];

    for (let i = 0; i < codes.length; i += cols) {
        const row: string[] = [];
        for (let j = 0; j < cols; j++) {
            row.push(codes[i + j]?.code || '');
        }
        tableData.push(row);
    }

    autoTable(doc, {
        startY: 42,
        head: [['#1', '#2', '#3', '#4'].map((_, i) => `Código ${i + 1}`)],
        body: tableData.map((row, rowIndex) =>
            row.map((code, colIndex) => code ? `${rowIndex * cols + colIndex + 1}. ${code}` : '')
        ),
        theme: 'grid',
        styles: {
            font: 'courier',
            fontSize: 10,
            cellPadding: 5,
            halign: 'center',
            valign: 'middle',
            minCellHeight: 10,
        },
        headStyles: {
            fillColor: BRAND_PRIMARY,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
        },
        bodyStyles: {
            fillColor: [255, 255, 255],
            textColor: TEXT_DARK,
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: [254, 247, 240], // Very light orange
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 'auto' },
        },
        margin: { left: margin, right: margin },
        didDrawPage: (data) => {
            // Footer on each page
            const pageHeight = doc.internal.pageSize.getHeight();
            doc.setFontSize(8);
            doc.setTextColor(...TEXT_GRAY);
            doc.text(
                'NutriKallpa - Sistema de Gestión Nutricional',
                margin,
                pageHeight - 10
            );
            doc.text(
                `Página ${data.pageNumber}`,
                pageWidth - margin,
                pageHeight - 10,
                { align: 'right' }
            );
        },
    });

    // =============================================
    // INSTRUCTIONS (after table)
    // =============================================
    const finalY = (doc as any).lastAutoTable?.finalY || 100;

    if (finalY < doc.internal.pageSize.getHeight() - 30) {
        doc.setFontSize(8);
        doc.setTextColor(...TEXT_GRAY);
        doc.setFont('helvetica', 'italic');
        doc.text(
            'Instrucciones: Comparta estos códigos con los usuarios que desea registrar. Cada código es de un solo uso.',
            pageWidth / 2,
            finalY + 10,
            { align: 'center' }
        );
    }

    // =============================================
    // SAVE PDF
    // =============================================
    const fileName = `codigos_invitacion_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
}
