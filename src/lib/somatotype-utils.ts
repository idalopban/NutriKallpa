/**
 * Somatotype Calculation Utilities
 * Heath-Carter method for somatotype analysis
 */

// ============================================================================
// LOCAL TYPES (standalone, no component import)
// ============================================================================

export interface SomatotypeBioData {
    peso: number;
    talla: number;
}

export interface SomatotypeSkinfolds {
    triceps: number;
    subscapular: number;
    supraspinale: number;
    calf: number;
}

export interface SomatotypeGirths {
    brazoFlexionado: number;
    pantorrilla: number;
}

export interface SomatotypeBreadths {
    humero: number;
    femur: number;
}

export interface SomatotypeMeasurementData {
    bioData: SomatotypeBioData;
    skinfolds: SomatotypeSkinfolds;
    girths: SomatotypeGirths;
    breadths: SomatotypeBreadths;
}

// ============================================================================
// COMPONENT TYPES
// ============================================================================

export type ComponentLevel = "Bajo" | "Moderado" | "Alto" | "Muy Alto";

export interface ComponentInterpretation {
    value: number;
    level: ComponentLevel;
    description: string;
    color: string;
}

export interface SomatotypeResult {
    endomorphy: number;
    mesomorphy: number;
    ectomorphy: number;
    somatoX: number;
    somatoY: number;
    isValid: boolean;
    missingData: {
        skinfolds: boolean;
        girths: boolean;
        breadths: boolean;
    };
}

// ============================================================================
// SOMATOTYPE CALCULATIONS (Heath-Carter)
// ============================================================================

/**
 * Calculate somatotype components using Heath-Carter method
 */
export function calculateSomatotype(data: SomatotypeMeasurementData): SomatotypeResult {
    const { bioData, skinfolds, girths, breadths } = data;
    const hasBasicData = bioData.peso > 0 && bioData.talla > 0;
    const sumSkinfolds = Object.values(skinfolds).reduce((a: number, b: number) => a + b, 0);

    let endomorphy = 0, mesomorphy = 0, ectomorphy = 0;

    if (hasBasicData && sumSkinfolds > 0) {
        // ENDOMORFIA: sumatoria corregida de 3 pliegues (Triceps, Subescapular, Supraespinal)
        const sumTSS = skinfolds.triceps + skinfolds.subscapular + skinfolds.supraspinale;
        const correctedSum = sumTSS * (170.18 / bioData.talla);
        endomorphy = -0.7182 + 0.1451 * correctedSum - 0.00068 * Math.pow(correctedSum, 2) + 0.0000014 * Math.pow(correctedSum, 3);
        endomorphy = Math.max(0.1, endomorphy); // Minimum 0.1

        // MESOMORFIA: requiere perímetros y diámetros
        if (girths.brazoFlexionado > 0 && girths.pantorrilla > 0 && breadths.humero > 0 && breadths.femur > 0) {
            const brazoCorr = girths.brazoFlexionado - (skinfolds.triceps / 10);
            const pantorrillaCorr = girths.pantorrilla - (skinfolds.calf / 10);
            mesomorphy = 0.858 * breadths.humero + 0.601 * breadths.femur + 0.188 * brazoCorr + 0.161 * pantorrillaCorr - 0.131 * bioData.talla + 4.5;
            mesomorphy = Math.max(0.5, mesomorphy);
        }

        // ECTOMORFIA: índice ponderal
        const HWR = bioData.talla / Math.pow(bioData.peso, 1 / 3);
        if (HWR >= 40.75) {
            ectomorphy = 0.732 * HWR - 28.58;
        } else if (HWR > 38.25) {
            ectomorphy = 0.463 * HWR - 17.63;
        } else {
            ectomorphy = 0.1;
        }
        ectomorphy = Math.max(0.1, ectomorphy);
    }

    // Coordenadas para somatocarta
    const somatoX = ectomorphy - endomorphy;
    const somatoY = 2 * mesomorphy - (endomorphy + ectomorphy);

    return {
        endomorphy: Math.round(endomorphy * 10) / 10,
        mesomorphy: Math.round(mesomorphy * 10) / 10,
        ectomorphy: Math.round(ectomorphy * 10) / 10,
        somatoX: Math.round(somatoX * 10) / 10,
        somatoY: Math.round(somatoY * 10) / 10,
        isValid: endomorphy > 0 && mesomorphy > 0 && ectomorphy > 0,
        missingData: {
            skinfolds: sumSkinfolds === 0,
            girths: girths.brazoFlexionado === 0 || girths.pantorrilla === 0,
            breadths: breadths.humero === 0 || breadths.femur === 0
        }
    };
}

// ============================================================================
// SOMATOTYPE CLASSIFICATION (13 Categories)
// ============================================================================

/**
 * Classify somatotype into one of 13 Heath-Carter categories
 */
export function getSomatotypeClassification(endo: number, meso: number, ecto: number): string {
    const diffEndoMeso = Math.abs(endo - meso);
    const diffMesoEcto = Math.abs(meso - ecto);
    const diffEctoEndo = Math.abs(ecto - endo);

    // 1. CENTRAL: Ningún componente difiere más de 1 unidad de los otros dos
    if (diffEndoMeso <= 1 && diffMesoEcto <= 1 && diffEctoEndo <= 1) {
        return "Central";
    }

    // 2. ENDOMORFO DOMINANTE
    if (endo > meso + 0.5 && endo > ecto + 0.5) {
        if (diffMesoEcto <= 0.5) return "Endomorfo Balanceado";
        if (meso > ecto) return "Endo-Mesomórfico";
        return "Endo-Ectomórfico";
    }

    // 3. MESOMORFO DOMINANTE
    if (meso > endo + 0.5 && meso > ecto + 0.5) {
        if (diffEctoEndo <= 0.5) return "Mesomorfo Balanceado";
        if (endo > ecto) return "Meso-Endomórfico";
        return "Meso-Ectomórfico";
    }

    // 4. ECTOMORFO DOMINANTE
    if (ecto > endo + 0.5 && ecto > meso + 0.5) {
        if (diffEndoMeso <= 0.5) return "Ectomorfo Balanceado";
        if (meso > endo) return "Ecto-Mesomórfico";
        return "Ecto-Endomórfico";
    }

    // 5. TIPOS MIXTOS
    if (diffEndoMeso <= 0.5 && endo > ecto && meso > ecto) {
        return "Mesomorfo-Endomorfo";
    }
    if (diffMesoEcto <= 0.5 && meso > endo && ecto > endo) {
        return "Mesomorfo-Ectomorfo";
    }
    if (diffEctoEndo <= 0.5 && endo > meso && ecto > meso) {
        return "Endomorfo-Ectomorfo";
    }

    // Fallback
    if (endo >= meso && endo >= ecto) return "Endomorfo";
    if (meso >= endo && meso >= ecto) return "Mesomorfo";
    return "Ectomorfo";
}

// ============================================================================
// COMPONENT INTERPRETATIONS
// ============================================================================

export function getComponentLevel(value: number): ComponentLevel {
    if (value < 3) return "Bajo";
    if (value <= 5.5) return "Moderado";
    if (value <= 7.5) return "Alto";
    return "Muy Alto";
}

export function getEndomorphyInterpretation(value: number): ComponentInterpretation {
    const level = getComponentLevel(value);
    let description = "";

    switch (level) {
        case "Bajo":
            description = "Baja adiposidad relativa; poca grasa subcutánea; contornos musculares y óseos visibles.";
            break;
        case "Moderado":
            description = "Moderada adiposidad relativa; la grasa subcutánea cubre los contornos musculares y óseos; apariencia más blanda.";
            break;
        case "Alto":
        case "Muy Alto":
            description = "Alta adiposidad relativa; abundante grasa subcutánea; redondez en tronco y extremidades; mayor acumulación de grasa en el abdomen.";
            break;
    }

    return { value, level, description, color: "rose" };
}

export function getMesomorphyInterpretation(value: number): ComponentInterpretation {
    const level = getComponentLevel(value);
    let description = "";

    switch (level) {
        case "Bajo":
            description = "Bajo desarrollo músculo-esquelético relativo; diámetros óseos y musculares estrechos; pequeñas articulaciones en las extremidades.";
            break;
        case "Moderado":
            description = "Moderado desarrollo músculo-esquelético relativo; mayor volumen muscular, y huesos y articulaciones de mayores dimensiones.";
            break;
        case "Alto":
        case "Muy Alto":
            description = "Alto desarrollo músculo-esquelético relativo; diámetros óseos grandes; músculos de gran volumen; articulaciones grandes.";
            break;
    }

    return { value, level, description, color: "blue" };
}

export function getEctomorphyInterpretation(value: number): ComponentInterpretation {
    const level = getComponentLevel(value);
    let description = "";

    switch (level) {
        case "Bajo":
            description = "Linealidad relativa baja; gran volumen por unidad de altura; extremidades relativamente voluminosas.";
            break;
        case "Moderado":
            description = "Linealidad relativa moderada; menos volumen por unidad de altura; más estirado.";
            break;
        case "Alto":
        case "Muy Alto":
            description = "Linealidad relativa elevada; poco volumen por unidad de altura; apariencia muy estirada.";
            break;
    }

    return { value, level, description, color: "emerald" };
}
