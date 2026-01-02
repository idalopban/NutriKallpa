/**
 * anemia-nts-protocol.ts
 * 
 * Motor de reglas para el manejo de la Anemia en población pediátrica, gestantes y adultos.
 * Basado estrictamente en la NTS N° 213-MINSA/DGIESP-2024 (Perú).
 */

export type AnemiaStatus = "SI" | "NO" | "RIESGO";
export type AnemiaSeverity = "NORMAL" | "LEVE" | "MODERADA" | "SEVERA";

export interface AnemiaInput {
    ageInMonths: number;
    weightKg: number;
    anemiaStatus: AnemiaStatus;
    hbValue?: number;
    altitudeMeters?: number;
    isPregnant?: boolean;
    trimester?: 1 | 2 | 3;
    isPuerpera?: boolean;
    gestationalWeeks?: number; // < 37 is premature
    sex?: "masculino" | "femenino";
    isLowBirthWeight?: boolean; // < 2500g
    isPremature?: boolean;
}

export interface AnemiaProtocolResult {
    doseMg: number;
    drops: number;
    syrupMl: number;
    folicAcidMg?: number;
    protocolType: "TRATAMIENTO CURATIVO" | "PREVENCIÓN";
    diagnosisLabel: string;
    severity: AnemiaSeverity;
    hbCorrected?: number;
    altitudeAdjustment?: number;
    texture: string;
    portionSize: string;
    mealFrequency: string;
    ironRichFoodRule: string;
    energyFoods: string[];
    protectiveFoods: string[];
    meta: string;
    duration: string;
    frequencyDescription: string;
    maxDoseDailyMg?: number;
}

/**
 * Obtiene el factor de ajuste de hemoglobina por altitud (NTS 213-2024)
 */
export function getAltitudeAdjustment(altitude: number): number {
    if (altitude < 500) return 0;
    if (altitude < 1000) return 0.4;
    if (altitude < 1500) return 0.8;
    if (altitude < 2000) return 1.1;
    if (altitude < 2500) return 1.4;
    if (altitude < 3000) return 1.8;
    if (altitude < 3500) return 2.1;
    if (altitude < 4000) return 2.5;
    if (altitude < 4500) return 2.9;
    return 3.3;
}

/**
 * Clasifica la anemia según población y hemoglobina corregida (NTS 213-2024)
 */
function classifyAnemia(input: AnemiaInput, hbCorrected: number): { severity: AnemiaSeverity; isAnemic: boolean } {
    const { ageInMonths, isPregnant, trimester, isPuerpera, gestationalWeeks } = input;

    // 1. GESTANTES Y PUÉRPERAS
    if (isPregnant) {
        if (trimester === 2) {
            if (hbCorrected >= 10.5) return { severity: "NORMAL", isAnemic: false };
            if (hbCorrected >= 10.0) return { severity: "LEVE", isAnemic: true };
            if (hbCorrected >= 7.0) return { severity: "MODERADA", isAnemic: true };
            return { severity: "SEVERA", isAnemic: true };
        } else {
            if (hbCorrected >= 11.0) return { severity: "NORMAL", isAnemic: false };
            if (hbCorrected >= 10.0) return { severity: "LEVE", isAnemic: true };
            if (hbCorrected >= 7.0) return { severity: "MODERADA", isAnemic: true };
            return { severity: "SEVERA", isAnemic: true };
        }
    }
    if (isPuerpera) {
        if (hbCorrected >= 12.0) return { severity: "NORMAL", isAnemic: false };
        if (hbCorrected >= 11.0) return { severity: "LEVE", isAnemic: true };
        if (hbCorrected >= 8.0) return { severity: "MODERADA", isAnemic: true };
        return { severity: "SEVERA", isAnemic: true };
    }

    // 2. RECIÉN NACIDOS Y LACTANTES PEQUEÑOS (< 6 meses)
    if (ageInMonths < 6) {
        const ageInWeeks = (ageInMonths * 30.44) / 7;

        if (gestationalWeeks && gestationalWeeks < 37) {
            if (ageInWeeks <= 1) return { severity: hbCorrected > 13.0 ? "NORMAL" : "MODERADA", isAnemic: hbCorrected <= 13.0 };
            if (ageInWeeks <= 4) return { severity: hbCorrected > 10.0 ? "NORMAL" : "MODERADA", isAnemic: hbCorrected <= 10.0 };
            if (ageInWeeks <= 8) return { severity: hbCorrected > 8.0 ? "NORMAL" : "MODERADA", isAnemic: hbCorrected <= 8.0 };
        }

        if (ageInMonths < 2) return { severity: hbCorrected >= 13.5 ? "NORMAL" : "MODERADA", isAnemic: hbCorrected < 13.5 };
        return { severity: hbCorrected >= 9.5 ? "NORMAL" : "MODERADA", isAnemic: hbCorrected < 9.5 };
    }

    // 3. NIÑOS, ADOLESCENTES Y ADULTOS (>= 6 meses)
    if (ageInMonths < 24) {
        if (hbCorrected >= 10.5) return { severity: "NORMAL", isAnemic: false };
        if (hbCorrected >= 10.0) return { severity: "LEVE", isAnemic: true };
        if (hbCorrected >= 7.0) return { severity: "MODERADA", isAnemic: true };
        return { severity: "SEVERA", isAnemic: true };
    }
    if (ageInMonths < 60) {
        if (hbCorrected >= 11.0) return { severity: "NORMAL", isAnemic: false };
        if (hbCorrected >= 10.0) return { severity: "LEVE", isAnemic: true };
        if (hbCorrected >= 7.0) return { severity: "MODERADA", isAnemic: true };
        return { severity: "SEVERA", isAnemic: true };
    }
    if (ageInMonths < 144) {
        if (hbCorrected >= 11.5) return { severity: "NORMAL", isAnemic: false };
        if (hbCorrected >= 11.0) return { severity: "LEVE", isAnemic: true };
        if (hbCorrected >= 8.0) return { severity: "MODERADA", isAnemic: true };
        return { severity: "SEVERA", isAnemic: true };
    }

    const isMale = input.sex === "masculino";
    if (ageInMonths < 180) {
        if (hbCorrected >= 12.0) return { severity: "NORMAL", isAnemic: false };
        if (hbCorrected >= 11.0) return { severity: "LEVE", isAnemic: true };
        if (hbCorrected >= 8.0) return { severity: "MODERADA", isAnemic: true };
        return { severity: "SEVERA", isAnemic: true };
    }

    const normalHb = isMale ? 13.0 : 12.0;
    if (hbCorrected >= normalHb) return { severity: "NORMAL", isAnemic: false };
    if (hbCorrected >= 11.0) return { severity: "LEVE", isAnemic: true };
    if (hbCorrected >= 8.0) return { severity: "MODERADA", isAnemic: true };
    return { severity: "SEVERA", isAnemic: true };
}

/**
 * Calcula la dosis de hierro y las recomendaciones nutricionales según NTS 213-2024
 * y tabla detallada de condiciones.
 */
export function generateAnemiaProtocol(input: AnemiaInput): AnemiaProtocolResult {
    const {
        ageInMonths,
        weightKg,
        anemiaStatus,
        hbValue,
        altitudeMeters = 0,
        isPregnant,
        isPuerpera,
        isPremature,
        isLowBirthWeight,
        sex
    } = input;

    let hbCorrected = hbValue;
    let altitudeAdjustment = 0;
    let effectiveSeverity: AnemiaSeverity = "NORMAL";
    let effectiveAnemiaStatus = anemiaStatus;

    if (hbValue !== undefined) {
        altitudeAdjustment = getAltitudeAdjustment(altitudeMeters);
        hbCorrected = Math.round((hbValue - altitudeAdjustment) * 10) / 10;
        const classification = classifyAnemia(input, hbCorrected);
        effectiveSeverity = classification.severity;
        effectiveAnemiaStatus = classification.isAnemic ? "SI" : "NO";
    }

    const isAnemic = effectiveAnemiaStatus === "SI";
    let doseMg = 0;
    let folicAcidMg = 0;
    let maxDoseDailyMg = 0;
    let duration = "";
    let frequencyDescription = "Diaria";

    // --- LÓGICA DE DOSIFICACIÓN BASADA EN TABLA ---

    // 1. Prematuro / Bajo Peso al Nacer
    if (isPremature || isLowBirthWeight) {
        if (!isAnemic) {
            doseMg = weightKg * 2;
            duration = "Hasta los 5 meses y 29 días";
            frequencyDescription = "Diaria, inicia a los 30 días de nacido";
        } else {
            doseMg = 0; // Indicación médica especializada (hospitalario)
            duration = "Manejo habitualmente hospitalario. Dosis según especialista.";
        }
    }
    // 2. Niño a Término (< 6 meses)
    else if (ageInMonths < 6) {
        if (!isAnemic) {
            doseMg = weightKg * 2;
            duration = "Hasta los 6 meses cumplidos";
            frequencyDescription = "Diaria, inicia a los 4 meses de edad";
        } else {
            doseMg = weightKg * 3;
            duration = "6 meses continuos";
            maxDoseDailyMg = 40;
        }
    }
    // 3. 6 a 11 meses
    else if (ageInMonths < 12) {
        doseMg = isAnemic ? weightKg * 3 : weightKg * 2;
        duration = "6 meses continuos";
        maxDoseDailyMg = isAnemic ? 70 : 0;
    }
    // 4. 12 a 23 meses
    else if (ageInMonths < 24) {
        doseMg = isAnemic ? weightKg * 3 : weightKg * 2;
        duration = isAnemic ? "6 meses continuos" : "6 meses tras 3 meses de descanso";
        maxDoseDailyMg = isAnemic ? 70 : 0;
    }
    // 5. 24 a 35 meses
    else if (ageInMonths < 36) {
        doseMg = isAnemic ? weightKg * 3 : 30; // 30mg elemental preventivo
        duration = "6 meses continuos";
        maxDoseDailyMg = isAnemic ? 70 : 0;
    }
    // 6. 36 a 59 meses (3 a 4 años)
    else if (ageInMonths < 60) {
        doseMg = isAnemic ? weightKg * 3 : 30;
        duration = isAnemic ? "6 meses continuos" : "3 meses continuos al año";
        maxDoseDailyMg = isAnemic ? 90 : 0;
    }
    // 7. 5 a 11 años
    else if (ageInMonths < 144) {
        doseMg = isAnemic ? weightKg * 3 : 60;
        duration = isAnemic ? "6 meses continuos" : "3 meses continuos al año";
        maxDoseDailyMg = isAnemic ? 120 : 0;
    }
    // 8. Adolescentes (12-17 años)
    else if (ageInMonths < 216) {
        if (!isAnemic) {
            doseMg = 60;
            folicAcidMg = 0.4;
            duration = "3 meses continuos por año";
            frequencyDescription = "2 veces por semana";
        } else {
            doseMg = 120;
            folicAcidMg = 0.8;
            duration = "6 meses continuos";
            frequencyDescription = "Diaria";
        }
    }
    // 9. Gestante
    else if (isPregnant) {
        if (!isAnemic) {
            doseMg = 60;
            folicAcidMg = 0.4;
            duration = "Hasta el parto";
            frequencyDescription = "Diaria, inicia semana 14";
        } else {
            doseMg = 120;
            folicAcidMg = 0.8;
            duration = "6 meses continuos";
            frequencyDescription = "Diaria";
        }
    }
    // 10. Puérpera
    else if (isPuerpera) {
        if (!isAnemic) {
            doseMg = 60;
            folicAcidMg = 0.4;
            duration = "Hasta 30 días post parto";
            frequencyDescription = "Diaria";
        } else {
            doseMg = 120;
            folicAcidMg = 0.8;
            duration = "6 meses continuos";
            frequencyDescription = "Diaria";
        }
    }
    // 11. Mujer en Edad Fértil (Adulto mujer no gestante)
    else if (sex === "femenino" && ageInMonths < 600) { // Hasta ≈50 años
        if (!isAnemic) {
            doseMg = 60;
            folicAcidMg = 0.4;
            duration = "3 meses continuos por año";
            frequencyDescription = "2 veces por semana";
        } else {
            doseMg = 120;
            folicAcidMg = 0.8;
            duration = "6 meses continuos";
            frequencyDescription = "Diaria";
        }
    }
    // Default Adulto Varón
    else {
        doseMg = isAnemic ? 120 : 0;
        duration = isAnemic ? "6 meses" : "N/A";
    }

    // Aplicar tope de dosis máxima si existe
    if (maxDoseDailyMg > 0 && doseMg > maxDoseDailyMg) {
        doseMg = maxDoseDailyMg;
    }

    // Cálculo de formas farmacéuticas (aproximado)
    const drops = Math.round(doseMg / 1.25);
    const syrupMl = Math.round((doseMg / 3) * 10) / 10;

    const protocolType = isAnemic ? "TRATAMIENTO CURATIVO" : "PREVENCIÓN";

    let diagnosisLabel = protocolType;
    if (hbValue !== undefined) {
        diagnosisLabel = isAnemic
            ? `Anemia ${effectiveSeverity} (Hb Corr: ${hbCorrected})`
            : `Normal (Hb Corr: ${hbCorrected})`;
    }

    // Nutrición base
    let texture = ageInMonths < 6 ? "Lactancia Materna Exclusiva (LME)" : "Aplatada / Papilla";
    let portionSize = ageInMonths < 6 ? "A libre demanda" : "2 a 3 cucharadas colmadas";
    let mealFrequency = ageInMonths < 6 ? "Exclusivamente pecho/fórmula" : "2 comidas al día";

    if (ageInMonths >= 9 && ageInMonths <= 11) {
        texture = "Picado fino";
        portionSize = "5 a 7 cucharadas colmadas";
        mealFrequency = "3 comidas + 1 snack";
    } else if (ageInMonths >= 12 && ageInMonths <= 35) {
        texture = "Olla familiar (trozos pequeños)";
        portionSize = "7 a 10 cucharadas colmadas";
        mealFrequency = "3 comidas + 2 snacks";
    }

    return {
        doseMg,
        drops,
        syrupMl,
        folicAcidMg: folicAcidMg > 0 ? folicAcidMg : undefined,
        protocolType,
        diagnosisLabel,
        severity: effectiveSeverity,
        hbCorrected,
        altitudeAdjustment,
        texture,
        portionSize,
        mealFrequency,
        ironRichFoodRule: "2 cucharadas colmadas de alimentos de origen animal ricos en hierro diariamente.",
        energyFoods: ["Papa", "Camote", "Arroz", "Yuca"],
        protectiveFoods: ["Zanahoria", "Zapallo", "Espinaca", "Brócoli"],
        meta: isAnemic ? "Tu meta es subir la Hb. Control en 30 días." : "Mantener Hb. Seguir con prevención.",
        duration,
        frequencyDescription,
        maxDoseDailyMg: maxDoseDailyMg > 0 ? maxDoseDailyMg : undefined
    };
}
