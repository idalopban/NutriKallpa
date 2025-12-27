import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Paciente, User } from '@/types';
import { DailyPlan, DEFAULT_MICRO_GOALS } from './diet-generator';
import { generateShoppingList, ShoppingListSection } from './shopping-list-generator';

// =============================================
// 1. PALETA DE COLORES OFICIAL DE MARCA
// =============================================
const BRAND_PRIMARY: [number, number, number] = [108, 186, 0];    // #6cba00 - Verde Vida
const BRAND_SECONDARY: [number, number, number] = [255, 133, 8]; // #ff8508 - Naranja
const BRAND_TEXT_DARK: [number, number, number] = [51, 51, 51];  // #333333
const BRAND_TEXT_LIGHT: [number, number, number] = [255, 255, 255]; // #FFFFFF
const GRAY_TEXT: [number, number, number] = [100, 100, 100];     // Gris oscuro subtítulos
const ALTERNATE_ROW: [number, number, number] = [248, 252, 245]; // #f8fcf5 - Gris con tinte verdoso

// Helper: Load image from URL and convert to base64
const loadImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('[PDF] Error loading image:', error);
        return null;
    }
};

export const generateDietPDF = async (
    paciente: Paciente,
    weeklyPlan: DailyPlan[],
    user?: User | null
) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;

    // =============================================
    // 2. USAR DATOS REALES DEL PERFIL (sin fallbacks falsos)
    // =============================================
    const rawConfig = {
        nombreConsultorio: user?.clinicName ?? '',
        direccion: user?.clinicAddress ?? '',
        telefono: user?.telefono ?? user?.clinicPhone ?? '',
        nombreNutricionista: user?.nombre ?? '',
        colegiatura: user?.cmp ?? '',
        photoUrl: user?.photoUrl ?? '',
    };
    console.log('[PDF Generator Raw Config]', rawConfig);

    // Usar datos reales, sin fallbacks falsos que confundan
    const nombreNutri = (rawConfig.nombreNutricionista && rawConfig.nombreNutricionista.length > 2)
        ? rawConfig.nombreNutricionista
        : "Nutricionista"; // Fallback genérico

    const consultorio = (rawConfig.nombreConsultorio &&
        rawConfig.nombreConsultorio.length > 2 &&
        rawConfig.nombreConsultorio !== 'Consultorio nombre')
        ? rawConfig.nombreConsultorio
        : ""; // Sin fallback - vacío si no hay dato

    const direccion = (rawConfig.direccion &&
        rawConfig.direccion.length > 2 &&
        rawConfig.direccion !== 'Direccion')
        ? rawConfig.direccion
        : ""; // Sin fallback - vacío si no hay dato

    const telefono = rawConfig.telefono || "";
    const colegiatura = rawConfig.colegiatura || "";
    const photoUrl = rawConfig.photoUrl;

    console.log('[PDF Generator Final Config]', { nombreNutri, consultorio, direccion, telefono, colegiatura });

    // =============================================
    // LOAD PROFILE IMAGE AS BASE64
    // =============================================
    let profileImageBase64: string | null = null;
    if (photoUrl && photoUrl.startsWith('http')) {
        console.log('[PDF] Loading profile image from:', photoUrl);
        profileImageBase64 = await loadImageAsBase64(photoUrl);
        if (profileImageBase64) {
            console.log('[PDF] Profile image loaded successfully');
        }
    }

    // Patient info
    const fullName = `${paciente.datosPersonales.nombre} ${paciente.datosPersonales.apellido}`;
    const date = new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });

    // Calculate stats
    const daysCount = weeklyPlan.length || 1;
    const avgStats = weeklyPlan.reduce((acc, day) => {
        acc.calories += day.stats.calories;
        acc.protein += day.stats.macros.protein;
        acc.carbs += day.stats.macros.carbs;
        acc.fat += day.stats.macros.fat;
        return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    avgStats.calories /= daysCount;
    avgStats.protein /= daysCount;
    avgStats.carbs /= daysCount;
    avgStats.fat /= daysCount;

    const goals = weeklyPlan[0]?.goals || { calories: 2000, macros: { protein: 100, carbs: 250, fat: 70 } };

    // Track current page number
    let currentPageNumber = 1;

    // =============================================
    // 1. HEADER CONDICIONAL (Solo Página 1 = Grande, Resto = Mini)
    // =============================================

    // HEADER MINI - Para páginas 2, 3, 4+
    const addMiniHeader = (doc: jsPDF) => {
        // Barra delgada color BRAND_PRIMARY
        doc.setFillColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
        doc.rect(margin, 10, pageWidth - margin * 2, 8, 'F');

        // Texto "NutriKallpa | Plan Personalizado" alineado a la derecha
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(BRAND_TEXT_LIGHT[0], BRAND_TEXT_LIGHT[1], BRAND_TEXT_LIGHT[2]);
        doc.text('NutriKallpa | Plan Personalizado', pageWidth - margin - 2, 16, { align: 'right' });

        return 22; // Return Y position after mini header
    };

    // HEADER GRANDE - Solo para Página 1
    const addFullHeader = (doc: jsPDF) => {
        // Photo coordinates (X: 15, Y: 15, Radio: 12)
        const photoRadius = 12;
        const photoX = 15;
        const photoY = 15;

        // Draw gray circle background first
        doc.setFillColor(200, 200, 200);
        doc.circle(photoX + photoRadius, photoY + photoRadius, photoRadius, 'F');

        // Add actual photo if available
        if (profileImageBase64) {
            try {
                doc.addImage(
                    profileImageBase64,
                    'JPEG',
                    photoX,
                    photoY,
                    photoRadius * 2,
                    photoRadius * 2
                );
            } catch (e) {
                console.error('[PDF] Error adding image:', e);
                const initials = nombreNutri.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(BRAND_TEXT_LIGHT[0], BRAND_TEXT_LIGHT[1], BRAND_TEXT_LIGHT[2]);
                doc.text(initials, photoX + photoRadius, photoY + photoRadius + 3, { align: 'center' });
            }
        } else {
            const initials = nombreNutri.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(BRAND_TEXT_LIGHT[0], BRAND_TEXT_LIGHT[1], BRAND_TEXT_LIGHT[2]);
            doc.text(initials, photoX + photoRadius, photoY + photoRadius + 3, { align: 'center' });
        }

        const textStartX = photoX + photoRadius * 2 + 8;

        // Título: Nombre del Nutricionista (size 16, BRAND_PRIMARY)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
        doc.text(nombreNutri, textStartX, 20);

        // Subtítulo: CNP + Consultorio (gris oscuro)
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2]);

        let subtitleParts: string[] = [];
        if (colegiatura) subtitleParts.push(`CNP: ${colegiatura}`);
        if (consultorio) subtitleParts.push(consultorio);
        const subtitle = subtitleParts.join(' | ');
        if (subtitle) {
            doc.text(subtitle, textStartX, 27);
        }

        // Contact line
        doc.setFontSize(8);
        doc.text(`${direccion} | ${telefono}`, textStartX, 33);

        // META CALÓRICA - Right side (BRAND_SECONDARY)
        const metaX = pageWidth - margin;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2]);
        doc.text('META CALÓRICA', metaX, 16, { align: 'right' });

        doc.setFontSize(22);
        doc.setTextColor(BRAND_SECONDARY[0], BRAND_SECONDARY[1], BRAND_SECONDARY[2]);
        doc.text(`${goals.calories}`, metaX, 28, { align: 'right' });

        doc.setFontSize(10);
        doc.text('kcal/día', metaX, 35, { align: 'right' });

        // Divider line (BRAND_PRIMARY)
        doc.setDrawColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
        doc.setLineWidth(1.5);
        doc.line(margin, 42, pageWidth - margin, 42);

        return 50;
    };

    // Function to add correct header based on page number
    const addHeader = (doc: jsPDF, pageNum: number) => {
        if (pageNum === 1) {
            return addFullHeader(doc);
        } else {
            return addMiniHeader(doc);
        }
    };

    // =============================================
    // 3. PIE DE PÁGINA (Footer) LIMPIO
    // =============================================
    const addFooter = (doc: jsPDF, pageNum: number, totalPages: number) => {
        const footerY = pageHeight - 10;

        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

        // Izquierda: NutriKallpa (Negrita, color gris)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2]);
        doc.text('NutriKallpa', margin, footerY);

        // Centro: direccion + " | " + telefono
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`${direccion} | ${telefono}`, pageWidth / 2, footerY, { align: 'center' });

        // Derecha: Página X de Y
        doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
    };

    // --- 1. FIRST PAGE: FULL HEADER ---
    let yPos = addHeader(doc, currentPageNumber);

    // Patient info box
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 20, 3, 3, 'F');
    doc.setDrawColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 20, 3, 3, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2]);
    doc.text('PACIENTE', margin + 6, yPos + 8);

    doc.setFontSize(11);
    doc.setTextColor(BRAND_TEXT_DARK[0], BRAND_TEXT_DARK[1], BRAND_TEXT_DARK[2]);
    doc.text(fullName, margin + 6, yPos + 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2]);
    doc.text(`Inicio: ${date}`, pageWidth - margin - 6, yPos + 12, { align: 'right' });

    yPos += 28;

    // Section Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
    doc.text('Resumen Nutricional Promedio', margin, yPos);
    yPos += 8;

    // MACRO CARDS
    const cardWidth = (pageWidth - margin * 2 - 12) / 4;
    const cardHeight = 35;
    const cardY = yPos;
    const cardData = [
        { label: 'CALORÍAS', value: Math.round(avgStats.calories), unit: 'kcal' },
        { label: 'PROTEÍNA', value: Math.round(avgStats.protein), unit: 'g' },
        { label: 'CARBOHIDRATOS', value: Math.round(avgStats.carbs), unit: 'g' },
        { label: 'GRASAS', value: Math.round(avgStats.fat), unit: 'g' },
    ];

    cardData.forEach((card, i) => {
        const cardX = margin + i * (cardWidth + 4);

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
        doc.setLineWidth(0.5);
        doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 3, 3, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2]);
        doc.text(card.label, cardX + cardWidth / 2, cardY + 10, { align: 'center' });

        doc.setFontSize(14);
        doc.setTextColor(BRAND_TEXT_DARK[0], BRAND_TEXT_DARK[1], BRAND_TEXT_DARK[2]);
        doc.text(`${card.value}`, cardX + cardWidth / 2, cardY + 22, { align: 'center' });

        doc.setFontSize(8);
        doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2]);
        doc.text(card.unit, cardX + cardWidth / 2, cardY + 30, { align: 'center' });
    });

    yPos = cardY + cardHeight + 12;

    // --- WEEKLY PLAN SECTION ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
    doc.text('Tu Plan Semanal', margin, yPos);
    yPos += 6;

    // Track pages added by autoTable for correct counting
    let tablePageCount = 0;

    weeklyPlan.forEach((day, dayIndex) => {
        // =============================================
        // FIX 1: PRE-CALCULATION - Force page break if less than 60mm remaining
        // This prevents tables from breaking mid-render
        // =============================================
        const spaceRemaining = pageHeight - yPos;
        const minimumSpaceNeeded = 60; // Header (10) + Day title (10) + At least 2 rows (40)

        if (spaceRemaining < minimumSpaceNeeded) {
            doc.addPage();
            currentPageNumber++;
            yPos = addHeader(doc, currentPageNumber);
        }

        // Day Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(BRAND_TEXT_DARK[0], BRAND_TEXT_DARK[1], BRAND_TEXT_DARK[2]);
        doc.text(day.day, margin, yPos);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2]);
        const macroSummary = `${Math.round(day.stats.calories)} kcal | P: ${Math.round(day.stats.macros.protein)}g | C: ${Math.round(day.stats.macros.carbs)}g | G: ${Math.round(day.stats.macros.fat)}g`;
        doc.text(macroSummary, margin + 22, yPos);

        yPos += 5;

        const tableBody: string[][] = [];
        day.meals.forEach(meal => {
            const recipeName = meal.name.includes('-') ? meal.name.split('-')[1].trim() : meal.name;
            const mealType = meal.name.includes('-') ? meal.name.split('-')[0].trim() : meal.name;
            const ingredients = meal.items.map(item => `${item.food.nombre} (${Math.round(item.quantity)}g)`).join(', ');
            const calories = Math.round(meal.items.reduce((sum, item) => sum + (item.food.energia * item.quantity / 100), 0));
            tableBody.push([String(mealType), String(recipeName), String(ingredients), String(calories)]);
        });

        // Store page count before table
        const pagesBefore = doc.getNumberOfPages();

        autoTable(doc, {
            startY: yPos,
            head: [['Comida', 'Receta', 'Ingredientes', 'Kcal']],
            body: tableBody,
            // REMOVED pageBreak: 'avoid' - it was causing tables to render as plain text
            showHead: 'everyPage', // Show header on every page if table splits
            headStyles: {
                fillColor: [BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]],
                textColor: [BRAND_TEXT_LIGHT[0], BRAND_TEXT_LIGHT[1], BRAND_TEXT_LIGHT[2]],
                fontStyle: 'bold',
                fontSize: 9,
                cellPadding: 4,
            },
            bodyStyles: {
                fontSize: 8,
                cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
                textColor: [BRAND_TEXT_DARK[0], BRAND_TEXT_DARK[1], BRAND_TEXT_DARK[2]],
            },
            alternateRowStyles: {
                fillColor: [ALTERNATE_ROW[0], ALTERNATE_ROW[1], ALTERNATE_ROW[2]],
            },
            styles: {
                valign: 'middle',
                lineColor: [230, 230, 230],
                lineWidth: 0.1,
                overflow: 'linebreak',
            },
            columnStyles: {
                0: { cellWidth: 28, fontStyle: 'bold', fontSize: 8 },
                1: { cellWidth: 38, fontSize: 9 },
                2: { cellWidth: 'auto', fontSize: 8 },
                3: { cellWidth: 16, halign: 'right', fontStyle: 'bold' },
            },
            margin: { left: margin, right: margin, top: 25 }, // top margin for header space on new pages
            didDrawPage: (data) => {
                // Add mini header on pages created by autoTable (not the first page of this table)
                if (data.pageNumber > 1) {
                    addMiniHeader(doc);
                }
            },
        });

        // Update current page number if autoTable added pages
        const pagesAfter = doc.getNumberOfPages();
        if (pagesAfter > pagesBefore) {
            currentPageNumber += (pagesAfter - pagesBefore);
        }

        yPos = (doc as any).lastAutoTable.finalY + 10;
    });

    // PAGE BREAK CHECK FOR MICRONUTRIENTS
    if (yPos > pageHeight - 80) {
        doc.addPage();
        currentPageNumber++;
        yPos = addHeader(doc, currentPageNumber);
    }

    // --- MICRONUTRIENTS SECTION ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
    doc.text('Semáforo de Micronutrientes', margin, yPos);
    yPos += 6;

    const avgMicros = weeklyPlan.reduce((acc, day) => {
        acc.hierro += day.stats.micros.hierro;
        acc.calcio += day.stats.micros.calcio;
        acc.zinc += day.stats.micros.zinc;
        acc.vitC += day.stats.micros.vitaminaC;
        return acc;
    }, { hierro: 0, calcio: 0, zinc: 0, vitC: 0 });

    avgMicros.hierro /= daysCount;
    avgMicros.calcio /= daysCount;
    avgMicros.zinc /= daysCount;
    avgMicros.vitC /= daysCount;

    const microData = [
        { name: 'Hierro (Anemia)', value: avgMicros.hierro, target: DEFAULT_MICRO_GOALS.hierro, unit: 'mg' },
        { name: 'Calcio (Huesos)', value: avgMicros.calcio, target: DEFAULT_MICRO_GOALS.calcio, unit: 'mg' },
        { name: 'Zinc (Defensas)', value: avgMicros.zinc, target: DEFAULT_MICRO_GOALS.zinc, unit: 'mg' },
        { name: 'Vitamina C', value: avgMicros.vitC, target: DEFAULT_MICRO_GOALS.vitaminaC, unit: 'mg' },
    ];

    // =============================================
    // 4. SEMÁFORO VISUAL - didDrawCell con doc.circle radio 3mm
    // =============================================
    const microTableBody = microData.map(micro => [
        micro.name,
        `${Math.round(micro.value)} ${micro.unit}`,
        `${micro.target} ${micro.unit}`,
        micro.value >= micro.target * 0.8 ? 'Óptimo' : 'Bajo',
    ]);

    autoTable(doc, {
        startY: yPos,
        head: [['Micronutriente', 'Tu Promedio', 'Meta Diaria', 'Estado']],
        body: microTableBody,
        pageBreak: 'avoid',
        headStyles: {
            fillColor: [BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]],
            textColor: [BRAND_TEXT_LIGHT[0], BRAND_TEXT_LIGHT[1], BRAND_TEXT_LIGHT[2]],
            fontStyle: 'bold',
            fontSize: 9,
            cellPadding: 5,
        },
        bodyStyles: {
            fontSize: 9,
            cellPadding: 5,
            textColor: [BRAND_TEXT_DARK[0], BRAND_TEXT_DARK[1], BRAND_TEXT_DARK[2]],
        },
        alternateRowStyles: {
            fillColor: [ALTERNATE_ROW[0], ALTERNATE_ROW[1], ALTERNATE_ROW[2]],
        },
        columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 35, halign: 'center' },
            2: { cellWidth: 35, halign: 'center' },
            3: { cellWidth: 25, halign: 'center' },
        },
        // SEMÁFORO: didDrawCell hook - radio 3mm
        didDrawCell: function (data) {
            if (data.column.index === 3 && data.section === 'body') {
                const isOptimo = (data.cell.raw === 'Óptimo' || data.cell.raw === 'Optimo');
                const color = isOptimo ? BRAND_PRIMARY : BRAND_SECONDARY;

                // Limpiar celda completamente
                doc.setFillColor(255, 255, 255);
                doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');

                // Dibujar círculo - radio 3mm
                doc.setFillColor(color[0], color[1], color[2]);
                doc.circle(
                    data.cell.x + (data.cell.width / 2),
                    data.cell.y + (data.cell.height / 2),
                    3, // Radio 3mm
                    'F'
                );
            }
        },
        margin: { left: margin, right: margin },
    });

    // --- ADD FOOTERS TO ALL PAGES ---
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(doc, i, totalPages);
    }

    // =============================================
    // NUEVA SECCIÓN: LISTA DE COMPRAS CONSOLIDADA
    // =============================================
    const shoppingList = generateShoppingList(weeklyPlan);

    if (shoppingList.length > 0) {
        doc.addPage();
        currentPageNumber++;
        let shoppingY = addHeader(doc, currentPageNumber);

        // Título de la sección
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(BRAND_PRIMARY[0], BRAND_PRIMARY[1], BRAND_PRIMARY[2]);
        doc.text('🛒 Lista de Compras Semanal', margin, shoppingY);
        shoppingY += 8;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2]);
        doc.text('Ingredientes consolidados para todo el plan', margin, shoppingY);
        shoppingY += 10;

        // Renderizar cada sección de categoría
        for (const section of shoppingList) {
            // Verificar espacio disponible
            if (shoppingY > pageHeight - 50) {
                doc.addPage();
                currentPageNumber++;
                shoppingY = addHeader(doc, currentPageNumber);
            }

            // Título de categoría con emoji
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(section.color[0], section.color[1], section.color[2]);
            doc.text(`${section.emoji} ${section.title}`, margin, shoppingY);
            shoppingY += 5;

            // Tabla de items
            const tableBody = section.items.map(item => [
                item.name,
                item.practicalQuantity,
                `${item.occurrences}x`
            ]);

            autoTable(doc, {
                startY: shoppingY,
                head: [['Ingrediente', 'Cantidad', 'Veces']],
                body: tableBody,
                pageBreak: 'avoid',
                headStyles: {
                    fillColor: [section.color[0], section.color[1], section.color[2]],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 8,
                    cellPadding: 3,
                },
                bodyStyles: {
                    fontSize: 8,
                    cellPadding: 3,
                    textColor: [BRAND_TEXT_DARK[0], BRAND_TEXT_DARK[1], BRAND_TEXT_DARK[2]],
                },
                alternateRowStyles: {
                    fillColor: [ALTERNATE_ROW[0], ALTERNATE_ROW[1], ALTERNATE_ROW[2]],
                },
                columnStyles: {
                    0: { cellWidth: 80 },
                    1: { cellWidth: 50, halign: 'center', fontStyle: 'bold' },
                    2: { cellWidth: 30, halign: 'center' },
                },
                margin: { left: margin, right: margin },
            });

            shoppingY = (doc as any).lastAutoTable.finalY + 8;
        }

        // Update footer on shopping pages
        const finalTotalPages = doc.getNumberOfPages();
        for (let i = totalPages + 1; i <= finalTotalPages; i++) {
            doc.setPage(i);
            addFooter(doc, i, finalTotalPages);
        }

        // Also update first pages with correct total
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            addFooter(doc, i, finalTotalPages);
        }
    }

    // Save
    const fileName = `Plan_Nutricional_${paciente.datosPersonales.nombre}_${paciente.datosPersonales.apellido}.pdf`;
    doc.save(fileName);
};
