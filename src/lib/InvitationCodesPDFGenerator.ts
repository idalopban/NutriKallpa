import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// =============================================
// BRAND COLORS
// =============================================
const BRAND_PRIMARY: [number, number, number] = [255, 133, 8];    // #ff8508 - NutriKallpa Orange
const BRAND_SECONDARY: [number, number, number] = [76, 175, 80];  // Green accent
const TEXT_DARK: [number, number, number] = [30, 41, 59];         // Slate 800
const TEXT_GRAY: [number, number, number] = [100, 116, 139];      // Slate 500
const WHITE: [number, number, number] = [255, 255, 255];

interface GeneratedCode {
    code: string;
    rol: string;
    createdAt: string;
}

/**
 * Generates a professional PDF document with invitation codes
 * Clean, organized layout with numbered codes in a grid
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
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let currentY = margin;

    // =============================================
    // HEADER - Compact and clean
    // =============================================

    // Orange header bar
    doc.setFillColor(...BRAND_PRIMARY);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 28, 2, 2, 'F');

    // Title
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('NutriKallpa', margin + 10, currentY + 12);

    // Subtitle
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Códigos de Invitación', margin + 10, currentY + 20);

    // Date on right side
    doc.setFontSize(9);
    const currentDate = new Date().toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    const currentTime = new Date().toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit'
    });
    doc.text(`${currentDate}`, pageWidth - margin - 10, currentY + 12, { align: 'right' });
    doc.text(`${currentTime}`, pageWidth - margin - 10, currentY + 20, { align: 'right' });

    currentY += 35;

    // =============================================
    // INFO BAR - Single line
    // =============================================
    const rol = codes[0]?.rol === 'admin' ? 'Administrador' : 'Nutricionista';

    doc.setFillColor(248, 250, 252); // Light gray background
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 10, 1, 1, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...TEXT_GRAY);

    const infoText = `Total: ${codes.length} códigos  •  Rol: ${rol}${generatedBy ? `  •  Generado por: ${generatedBy}` : ''}`;
    doc.text(infoText, pageWidth / 2, currentY + 6.5, { align: 'center' });

    currentY += 18;

    // =============================================
    // CODES GRID - Clean numbered layout
    // =============================================

    doc.setTextColor(...TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Códigos Generados', margin, currentY);
    currentY += 8;

    // Grid configuration
    const cols = 4;
    const codeBoxWidth = (pageWidth - margin * 2 - (cols - 1) * 4) / cols;
    const codeBoxHeight = 18;
    const gap = 4;

    codes.forEach((codeObj, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = margin + col * (codeBoxWidth + gap);
        const y = currentY + row * (codeBoxHeight + gap);

        // Check if we need a new page
        if (y + codeBoxHeight > pageHeight - 25) {
            doc.addPage();
            currentY = margin;
            return;
        }

        // Card background
        doc.setFillColor(...WHITE);
        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.roundedRect(x, y, codeBoxWidth, codeBoxHeight, 2, 2, 'FD');

        // Number badge
        doc.setFillColor(...BRAND_PRIMARY);
        doc.circle(x + 6, y + 6, 4, 'F');
        doc.setTextColor(...WHITE);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(`${index + 1}`, x + 6, y + 7.5, { align: 'center' });

        // Code text
        doc.setFont('courier', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...TEXT_DARK);
        doc.text(codeObj.code, x + codeBoxWidth / 2, y + 12.5, { align: 'center' });
    });

    // Calculate final Y after all codes
    const totalRows = Math.ceil(codes.length / cols);
    const codesEndY = currentY + totalRows * (codeBoxHeight + gap);

    // =============================================
    // INSTRUCTIONS SECTION
    // =============================================

    const instructionsY = Math.min(codesEndY + 10, pageHeight - 50);

    if (instructionsY < pageHeight - 40) {
        doc.setDrawColor(226, 232, 240);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(margin, instructionsY, pageWidth - margin, instructionsY);
        doc.setLineDashPattern([], 0);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...TEXT_GRAY);
        doc.text('Instrucciones: Comparta estos códigos con los usuarios que desea registrar. Cada código es de un solo uso.',
            pageWidth / 2, instructionsY + 8, { align: 'center' });
    }

    // =============================================
    // FOOTER
    // =============================================
    const footerY = pageHeight - 12;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_GRAY);
    doc.text('NutriKallpa - Sistema de Gestión Nutricional', margin, footerY);
    doc.text(`Página 1 de 1`, pageWidth - margin, footerY, { align: 'right' });

    // =============================================
    // SAVE PDF
    // =============================================
    const fileName = `codigos_invitacion_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
}
