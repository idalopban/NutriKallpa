/**
 * PDF Styles - NutriKallpa Corporate Design System
 * 
 * Shared constants, colors, and helper functions for all PDF reports.
 * Ensures consistent branding across Anthropometry, Diet Plans, etc.
 */

import jsPDF from 'jspdf';

// ============================================================================
// COLOR PALETTE - NutriKallpa Brand
// ============================================================================

export const PDF_COLORS = {
    // Primary Brand - NutriKallpa Orange
    primary: [255, 133, 8] as [number, number, number],            // #ff8508 - Orange
    primaryDark: [230, 120, 0] as [number, number, number],        // Darker Orange
    accent: [76, 175, 80] as [number, number, number],             // #4CAF50 - Green (secondary accent)

    // Neutral
    white: [255, 255, 255] as [number, number, number],
    black: [51, 51, 51] as [number, number, number],              // #333333 - Soft black for text
    grayDark: [100, 100, 100] as [number, number, number],
    grayMedium: [150, 150, 150] as [number, number, number],
    grayLight: [243, 244, 246] as [number, number, number],       // #F3F4F6 - Background
    grayVeryLight: [250, 250, 250] as [number, number, number],   // #FAFAFA - Alternate rows

    // Semantic
    success: [34, 197, 94] as [number, number, number],
    warning: [234, 179, 8] as [number, number, number],
    danger: [239, 68, 68] as [number, number, number],
    info: [59, 130, 246] as [number, number, number],

    // Table Headers by Section
    composition: [51, 65, 85] as [number, number, number],        // Slate - Body Composition
    somatotype: [79, 70, 229] as [number, number, number],        // Indigo - Somatotype
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const PDF_FONTS = {
    family: 'helvetica',
    sizes: {
        title: 22,
        subtitle: 14,
        sectionTitle: 12,
        body: 10,
        small: 9,
        caption: 8,
        footer: 7
    }
};

// ============================================================================
// LAYOUT CONSTANTS
// ============================================================================

export const PDF_LAYOUT = {
    pageWidth: 210,  // A4
    pageHeight: 297, // A4
    margin: {
        left: 15,
        right: 15,
        top: 15,
        bottom: 20
    },
    headerHeight: 45,
    patientBarHeight: 25,
    footerHeight: 15,
    contentWidth: 180 // 210 - 15 - 15
};

// ============================================================================
// LOGO PLACEHOLDER (Base64 - Replace with actual logo)
// ============================================================================

export const NUTRIKALLPA_LOGO_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF8ElEQVR4nO2dW4hVVRjHf2MpZmVlZmVlZl4mNTVNUxPNNEsTM80UNTU1NTU1NTU1NTU1EkJEIkQkQkREIkQkQkREJEREQkREIiISISISISIREYmISISIRIhIhIhEiEhEiEiEiETk/8EX/nCYOXv2nrX3d/a35vfAC3Nmzlprztprr+/y/b/loqOjo6Ojo6Ojo6OjUy5OAOYA9wGPA08Cq4AngY+AWuBeoLYJXK8NtAE3AHm89nxgPvC4yX8BLAFeB14DXgJeBJ4FngYeAR4EHjDk3g/cC9xjshuBu4DbgduAW4GbgRuB64HrgGuBq4ErgcuBy4BLgYuBi4ALgfOBBcB5wLnAOcBcYA4wC5gJzACmA1OBycAkYCIwHhgHjAXGAKOBkcAIYDgwDBgKDAEGAwOBAUA/oA/QG+gJ9AC6A12BzkAnoCPQAWgPtAPaAq2BVkBLoAXQHDAAdUA9cBJwIlAH1ALdgG5AF6Az0AnoCHQA2gPt4nW0AVoDrYCWQAugOWCAOqAeaAF0B7oSz19sQDuwLXAb0BpoC7QD2gMdgI5AJ6Az0AXoCnQDugM9gJ5AL6A30AfoC/QD+gMDgEHAYGAIMBQYBgwHRgAjgVHAaGAMMBYYB4wHJgCTgMnAFGAqMA2YDswEZgGzgTnAPGABsBC4ALgQuAi4BLgUuBy4ErgauAa4HrgBuAm4BbgNuB24E7gLuAe4D3gAeAh4GHgUeAJ4CngGeB54EXgZeBV4HXgTeAt4B3gP+BD4GPgU+BxYBqwAVgGrgTXAOuBrYCPwHfA98CPwM/Ar8AfwF/A3cBT4BzgG/AscB/4DTgD/RoEuIqJTFhFpA7SmGiIiJHVBIiIiIiIk9aIu6BCNHCMJ/w4g/DOA8I8Awj8CCP8EIPzTfxpH+DPmBOHvnBMJPzjlBOEfnVIJv75SdCI1gxUxJYJMnEwkxDxYgvD3U+MEodN+KFqkMZ/IEBjzYAnCz0knBOEX7BREpMxULEghCB9UnCAI746HoHaC8G/hA9Xk3m5b1mwB2gH/ETMiMg+4HlgK/AUcJ/yrWMKPY7YAJxN+9XUioejp9pSwkfC7fJ0ATgKmAmcSfunVycBUYCbhr7HOBE4DZgCzCb8Onw3MAuYAc4F5hF+7zwfmAQuBC4ALgYuAS4BLgcuBK4CrgKuBa4DrgOuBGwi/9LwRuAm4BbgNuAO4C7gHuA+4H3gQeBh4FHgCeAp4BngOeAF4CXgFeB14E3gLeAd4D/gA+Aj4BPgMWAasAFYCq4A1wDpgPbAB+Br'; // Truncated placeholder

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Draws the professional header on the current page
 */
export function drawHeader(
    doc: jsPDF,
    title: string = 'REPORTE ANTROPOMÉTRICO',
    subtitle: string = 'NutriKallpa Professional'
): void {
    const { margin, pageWidth, headerHeight } = PDF_LAYOUT;

    // Green gradient header background
    doc.setFillColor(...PDF_COLORS.primary);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');

    // Darker green accent line at bottom
    doc.setFillColor(...PDF_COLORS.primaryDark);
    doc.rect(0, headerHeight - 3, pageWidth, 3, 'F');

    // Logo placeholder (left side)
    try {
        doc.addImage(NUTRIKALLPA_LOGO_BASE64, 'PNG', margin.left, 10, 25, 25);
    } catch (e) {
        // If logo fails, draw text alternative with full branding
        doc.setTextColor(...PDF_COLORS.white);
        doc.setFont(PDF_FONTS.family, 'bold');
        doc.setFontSize(16);
        doc.text('NutriKallpa', margin.left, 25);
    }

    // Title (right side)
    doc.setTextColor(...PDF_COLORS.white);
    doc.setFont(PDF_FONTS.family, 'bold');
    doc.setFontSize(PDF_FONTS.sizes.title);
    doc.text(title, pageWidth - margin.right, 20, { align: 'right' });

    // Subtitle
    doc.setFont(PDF_FONTS.family, 'normal');
    doc.setFontSize(PDF_FONTS.sizes.body);
    doc.text(subtitle, pageWidth - margin.right, 30, { align: 'right' });
}

/**
 * Draws the patient info bar (gray background with patient data)
 */
export function drawPatientBar(
    doc: jsPDF,
    patientName: string,
    age: number,
    date: string,
    startY: number = PDF_LAYOUT.headerHeight + 5
): number {
    const { margin, pageWidth, patientBarHeight, contentWidth } = PDF_LAYOUT;

    // Gray background with green border
    doc.setFillColor(...PDF_COLORS.grayLight);
    doc.setDrawColor(...PDF_COLORS.primary);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin.left, startY, contentWidth, patientBarHeight, 3, 3, 'FD');

    // Patient info text
    doc.setTextColor(...PDF_COLORS.black);
    doc.setFont(PDF_FONTS.family, 'bold');
    doc.setFontSize(PDF_FONTS.sizes.small);

    const textY = startY + 10;
    const col1X = margin.left + 10;
    const col2X = margin.left + 80;
    const col3X = margin.left + 130;

    doc.text('PACIENTE:', col1X, textY);
    doc.setFont(PDF_FONTS.family, 'normal');
    doc.text(patientName, col1X + 22, textY);

    doc.setFont(PDF_FONTS.family, 'bold');
    doc.text('EDAD:', col2X, textY);
    doc.setFont(PDF_FONTS.family, 'normal');
    doc.text(`${age} años`, col2X + 15, textY);

    doc.setFont(PDF_FONTS.family, 'bold');
    doc.text('FECHA:', col3X, textY);
    doc.setFont(PDF_FONTS.family, 'normal');
    doc.text(date, col3X + 16, textY);

    return startY + patientBarHeight + 10;
}

/**
 * Draws section title with green accent
 */
export function drawSectionTitle(
    doc: jsPDF,
    title: string,
    y: number
): void {
    const { margin } = PDF_LAYOUT;

    // Green accent line
    doc.setFillColor(...PDF_COLORS.primary);
    doc.rect(margin.left, y - 4, 4, 12, 'F');

    // Title text
    doc.setTextColor(...PDF_COLORS.primaryDark);
    doc.setFont(PDF_FONTS.family, 'bold');
    doc.setFontSize(PDF_FONTS.sizes.sectionTitle);
    doc.text(title, margin.left + 8, y + 4);
}

/**
 * Draws footer on all pages
 */
export function drawFooter(doc: jsPDF): void {
    const pageCount = doc.getNumberOfPages();
    const { margin, pageWidth, pageHeight } = PDF_LAYOUT;

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        const footerY = pageHeight - 15;

        // Green divider line
        doc.setDrawColor(...PDF_COLORS.primary);
        doc.setLineWidth(0.5);
        doc.line(margin.left, footerY - 3, pageWidth - margin.right, footerY - 3);

        // Footer text
        doc.setTextColor(...PDF_COLORS.grayMedium);
        doc.setFont(PDF_FONTS.family, 'normal');
        doc.setFontSize(PDF_FONTS.sizes.footer);
        doc.text('Generado por NutriKallpa - Software de Nutrición Avanzada', pageWidth / 2, footerY, { align: 'center' });

        // Page number
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin.right, footerY, { align: 'right' });
    }
}

/**
 * AutoTable default styles for professional look
 */
export const TABLE_STYLES = {
    primary: {
        headStyles: {
            fillColor: PDF_COLORS.primary,
            textColor: PDF_COLORS.white,
            fontSize: 9,
            fontStyle: 'bold' as const,
            halign: 'center' as const
        },
        bodyStyles: {
            textColor: PDF_COLORS.black,
            fontSize: 8,
            halign: 'center' as const
        },
        alternateRowStyles: {
            fillColor: PDF_COLORS.grayVeryLight
        },
        styles: {
            cellPadding: 3,
            lineWidth: 0.1,
            lineColor: [220, 220, 220] as [number, number, number]
        },
        theme: 'grid' as const
    },
    composition: {
        headStyles: {
            fillColor: PDF_COLORS.composition,
            textColor: PDF_COLORS.white,
            fontSize: 9,
            fontStyle: 'bold' as const,
            halign: 'center' as const
        },
        bodyStyles: {
            textColor: PDF_COLORS.black,
            fontSize: 8,
            halign: 'center' as const
        },
        alternateRowStyles: {
            fillColor: PDF_COLORS.grayVeryLight
        },
        theme: 'grid' as const
    },
    somatotype: {
        headStyles: {
            fillColor: PDF_COLORS.somatotype,
            textColor: PDF_COLORS.white,
            fontSize: 9,
            fontStyle: 'bold' as const,
            halign: 'center' as const
        },
        bodyStyles: {
            textColor: PDF_COLORS.black,
            fontSize: 8,
            halign: 'center' as const
        },
        alternateRowStyles: {
            fillColor: PDF_COLORS.grayVeryLight
        },
        theme: 'grid' as const
    }
};
