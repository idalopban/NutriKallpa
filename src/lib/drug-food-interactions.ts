/**
 * drug-food-interactions.ts
 *
 * Sistema de detección de interacciones fármaco-alimento para NutriKallpa.
 * Previene combinaciones peligrosas en pacientes polimedicados.
 *
 * Referencias:
 * - FDA Drug-Nutrient Interactions Database
 * - Stockley's Drug Interactions (13th Edition)
 * - MINSA Perú: Guía de Práctica Clínica
 */

// ============================================================================
// TYPES
// ============================================================================

export type InteractionSeverity = "critical" | "moderate" | "minor";

export interface DrugFoodInteraction {
    /** Alimentos que deben evitarse con este medicamento */
    avoid: string[];
    /** Alimentos que reducen absorción (tomar separados) */
    reduceAbsorption?: string[];
    /** Alimentos que aumentan absorción (potencialmente peligroso) */
    increaseAbsorption?: string[];
    /** Alimentos que tienen efecto sinérgico/aditivo con el fármaco (ej: K+ con IECA) */
    synergisticRisk?: string[];
    /** Mensaje de advertencia para el paciente */
    warning: string;
    /** Severidad de la interacción */
    severity: InteractionSeverity;
    /** Recomendación clínica */
    recommendation?: string;
}

export interface InteractionCheckResult {
    hasInteraction: boolean;
    warnings: string[];
    criticalCount: number;
    moderateCount: number;
}

// ============================================================================
// DATABASE - INTERACCIONES FÁRMACO-ALIMENTO
// ============================================================================

/**
 * Base de datos de interacciones fármaco-alimento.
 * Organizada por nombre genérico del medicamento (normalizado a minúsculas).
 */
export const DRUG_FOOD_INTERACTIONS: Record<string, DrugFoodInteraction> = {
    // === ANTICOAGULANTES ===
    warfarina: {
        avoid: [
            "espinaca",
            "brocoli",
            "brócoli",
            "col",
            "acelga",
            "lechuga",
            "kale",
            "perejil",
            "cilantro",
            "repollo",
            "coliflor",
            "te verde",
            "té verde",
            // Arándano puede AUMENTAR efecto anticoagulante (riesgo sangrado)
            "arandano",
            "arándano",
            "cranberry",
        ],
        severity: "critical",
        warning:
            "⚠️ WARFARINA: Vitamina K alta reduce efecto. Arándano/cranberry AUMENTA riesgo de sangrado.",
        recommendation:
            "Mantener ingesta de vitamina K CONSTANTE. EVITAR arándano en exceso. Monitorear INR.",
    },

    acenocumarol: {
        avoid: [
            "espinaca",
            "brocoli",
            "brócoli",
            "col",
            "acelga",
            "lechuga",
            "kale",
            "perejil",
        ],
        severity: "critical",
        warning:
            "⚠️ ACENOCUMAROL: Misma interacción con vitamina K que warfarina.",
        recommendation: "Mantener ingesta de vitamina K constante. Control de INR frecuente.",
    },

    // === ANTIDIABÉTICOS ===
    metformina: {
        avoid: [],
        reduceAbsorption: ["alcohol"],
        severity: "moderate",
        warning:
            "💊 METFORMINA: Uso prolongado (>4 años) puede causar deficiencia de vitamina B12.",
        recommendation:
            "Monitorear B12 anualmente. Considerar suplementación si hay síntomas neurológicos.",
    },

    // === TIROIDES ===
    levotiroxina: {
        avoid: [],
        reduceAbsorption: [
            "calcio",
            "hierro",
            "soya",
            "soja",
            "cafe",
            "café",
            "fibra",
            "salvado",
        ],
        severity: "moderate",
        warning:
            "⏰ LEVOTIROXINA: Tomar en AYUNAS, 30-60 min antes del desayuno.",
        recommendation:
            "Separar de calcio/hierro por 4 horas. Evitar café en la primera hora.",
    },

    // === ANTIHIPERTENSIVOS ===
    enalapril: {
        avoid: [],
        synergisticRisk: ["potasio", "platano", "plátano", "naranja", "tomate", "aguacate", "palta"],
        severity: "moderate",
        warning:
            "🧂 ENALAPRIL (IECA): Retiene potasio. Exceso de K+ dietético puede causar hiperpotasemia.",
        recommendation: "Monitorear potasio sérico. Evitar sustitutos de sal (KCl). Moderar plátano/palta.",
    },

    lisinopril: {
        avoid: [],
        synergisticRisk: ["potasio", "platano", "plátano", "naranja", "aguacate", "palta"],
        severity: "moderate",
        warning: "🧂 LISINOPRIL (IECA): Retiene potasio. Riesgo de hiperpotasemia.",
        recommendation: "Monitorear potasio sérico regularmente. Moderar alimentos ricos en K+.",
    },

    losartan: {
        avoid: [],
        synergisticRisk: ["potasio", "platano", "plátano", "naranja", "aguacate", "palta"],
        severity: "moderate",
        warning: "🧂 LOSARTÁN (ARA-II): Puede elevar potasio sérico.",
        recommendation: "Moderar ingesta de potasio. Monitorear electrolitos.",
    },

    // === ESTATINAS ===
    simvastatina: {
        avoid: ["toronja", "pomelo", "grapefruit"],
        severity: "critical",
        warning:
            "🍊 SIMVASTATINA: El pomelo/toronja aumenta niveles hasta 15x. Riesgo de rabdomiólisis.",
        recommendation: "EVITAR pomelo completamente durante el tratamiento.",
    },

    atorvastatina: {
        avoid: ["toronja", "pomelo", "grapefruit"],
        severity: "moderate",
        warning: "🍊 ATORVASTATINA: Pomelo aumenta niveles. Menor riesgo que simvastatina.",
        recommendation: "Limitar pomelo a 1 porción ocasional.",
    },

    // === ANTIBIÓTICOS ===
    ciprofloxacino: {
        avoid: [],
        reduceAbsorption: ["leche", "yogurt", "queso", "calcio", "hierro", "zinc"],
        severity: "moderate",
        warning:
            "🥛 CIPROFLOXACINO: Lácteos y minerales reducen absorción hasta 50%.",
        recommendation: "Tomar 2 horas antes o 6 horas después de lácteos.",
    },

    tetraciclina: {
        avoid: [],
        reduceAbsorption: ["leche", "yogurt", "queso", "calcio", "hierro", "antiácidos"],
        severity: "critical",
        warning: "🥛 TETRACICLINA: Lácteos ANULAN completamente el efecto.",
        recommendation: "NO consumir lácteos 2 horas antes ni 2 horas después.",
    },

    // === ANTICONVULSIVANTES ===
    fenitoina: {
        avoid: [],
        reduceAbsorption: ["nutricion enteral", "sonda"],
        increaseAbsorption: ["alcohol"],
        severity: "moderate",
        warning:
            "🧠 FENITOÍNA: Interacción compleja con alimentos y ácido fólico.",
        recommendation:
            "Si usa sonda, pausar alimentación 2h antes/después. Suplementar ácido fólico.",
    },

    // === ANTIINFLAMATORIOS ===
    ibuprofeno: {
        avoid: ["alcohol"],
        severity: "moderate",
        warning: "💊 IBUPROFENO: Tomar CON alimentos para proteger mucosa gástrica.",
        recommendation: "Administrar con comida. Evitar alcohol (aumenta riesgo de sangrado GI).",
    },

    naproxeno: {
        avoid: ["alcohol"],
        severity: "moderate",
        warning: "💊 NAPROXENO: Tomar con alimentos. Alcohol aumenta riesgo de úlcera.",
        recommendation: "Administrar con comida.",
    },

    // === ANTIDEPRESIVOS IMAO ===
    fenelzina: {
        avoid: [
            "queso curado",
            "vino",
            "cerveza",
            "embutido",
            "salame",
            "jamón curado",
            "soya",
            "fermentado",
        ],
        severity: "critical",
        warning:
            "🚨 IMAO (Fenelzina): Alimentos con TIRAMINA causan crisis hipertensiva MORTAL.",
        recommendation:
            "EVITAR absolutamente: quesos curados, vino tinto, embutidos fermentados, soya.",
    },

    // === INMUNOSUPRESORES ===
    ciclosporina: {
        avoid: ["toronja", "pomelo"],
        increaseAbsorption: ["toronja", "pomelo"],
        severity: "critical",
        warning: "🔴 CICLOSPORINA: Pomelo aumenta niveles a rangos tóxicos.",
        recommendation: "EVITAR pomelo. Monitorear niveles séricos de ciclosporina.",
    },

    // === INHIBIDORES BOMBA PROTONES ===
    omeprazol: {
        avoid: [],
        reduceAbsorption: ["hierro", "magnesio", "b12", "vitamina b12"],
        severity: "moderate",
        warning: "💊 OMEPRAZOL (IBP): Uso crónico (>1 año) reduce absorción de B12, hierro y magnesio.",
        recommendation: "Monitorear B12 y Mg anualmente en uso crónico. Considerar suplementación.",
    },

    esomeprazol: {
        avoid: [],
        reduceAbsorption: ["hierro", "magnesio", "b12", "vitamina b12"],
        severity: "moderate",
        warning: "💊 ESOMEPRAZOL (IBP): Mismo riesgo que omeprazol en uso prolongado.",
        recommendation: "Monitorear B12 y Mg anualmente. Considerar suplementación en uso >1 año.",
    },

    // === CARDIOTÓNICOS ===
    digoxina: {
        avoid: ["hiperico", "hipérico", "hierba de san juan", "st john", "regaliz", "licorice"],
        reduceAbsorption: ["fibra", "avena", "salvado", "antiacidos", "antiácidos"],
        severity: "critical",
        warning: "❤️ DIGOXINA: Rango terapéutico ESTRECHO. Hipérico reduce niveles. Regaliz aumenta toxicidad.",
        recommendation: "EVITAR hipérico y regaliz. Separar de fibra alta. Monitorear digoxinemia.",
    },

    // === ESTATINAS (COMPLETAR) ===
    rosuvastatina: {
        avoid: [],
        severity: "minor",
        warning: "💊 ROSUVASTATINA: Menor interacción con pomelo que otras estatinas.",
        recommendation: "Mantener dieta baja en grasas saturadas. Puede tomarse con o sin alimentos.",
    },

    // === DIURÉTICOS ===
    furosemida: {
        avoid: ["regaliz", "licorice"],
        synergisticRisk: ["alcohol"],
        severity: "critical",
        warning: "💧 FUROSEMIDA (Diurético de asa): Aumenta excreción de Potasio, Sodio y Magnesio.",
        recommendation: "Monitorear electrolitos séricos. Asegurar ingesta adecuada de Potasio y Magnesio. EVITAR regaliz (aumenta hipopotasemia).",
    },

    hidroclorotiazida: {
        avoid: ["regaliz", "licorice"],
        severity: "moderate",
        warning: "💧 HIDROCLOROTIAZIDA (Tiazida): Puede causar pérdida de Potasio y Magnesio.",
        recommendation: "Monitorear electrolitos. Moderar ingesta de sodio. Evitar regaliz.",
    },

    espironolactona: {
        avoid: [],
        synergisticRisk: ["potasio", "platano", "plátano", "naranja", "aguacate", "palta"],
        severity: "critical",
        warning: "🧂 ESPIRONOLACTONA (Ahorrador de K+): Riesgo elevado de HIPERPOTASEMIA.",
        recommendation: "EVITAR suplementos de Potasio y sustitutos de sal (KCl). Monitorear potasio sérico.",
    },
};

// ============================================================================
// MEDICATION ALIASES (Nombres comerciales → Genéricos)
// ============================================================================

/**
 * Mapeo de nombres comerciales comunes en Perú a sus nombres genéricos.
 */
export const MEDICATION_ALIASES: Record<string, string> = {
    // Anticoagulantes
    coumadin: "warfarina",
    sintrom: "acenocumarol",

    // Antidiabéticos
    glucophage: "metformina",
    glucofage: "metformina",
    dianben: "metformina",

    // Tiroides
    eutirox: "levotiroxina",
    synthroid: "levotiroxina",
    euthyrox: "levotiroxina",

    // Antihipertensivos
    renitec: "enalapril",
    zestril: "lisinopril",
    cozaar: "losartan",

    // Estatinas
    zocor: "simvastatina",
    lipitor: "atorvastatina",
    crestor: "rosuvastatina",

    // Antibióticos
    cipro: "ciprofloxacino",
    bactrim: "trimetoprim",

    // AINES
    advil: "ibuprofeno",
    motrin: "ibuprofeno",
    aleve: "naproxeno",

    // IBP (Inhibidores Bomba Protones)
    prilosec: "omeprazol",
    nexium: "esomeprazol",
    pariet: "rabeprazol",

    // Cardiotónicos
    lanoxin: "digoxina",
    digoxin: "digoxina",

    // Diuréticos
    lasix: "furosemida",
    nuriban: "furosemida",
    hidrosaluretil: "hidroclorotiazida",
    aldactone: "espironolactona",
};

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Normaliza el nombre de un medicamento a su forma genérica.
 */
function normalizeMedicationName(medication: string): string {
    const normalized = medication.toLowerCase().trim();
    return MEDICATION_ALIASES[normalized] || normalized;
}

/**
 * Verifica si un alimento tiene interacción con los medicamentos del paciente.
 *
 * @param foodName - Nombre del alimento
 * @param medications - Lista de medicamentos del paciente
 * @returns Resultado con advertencias si hay interacciones
 */
export function checkFoodDrugInteraction(
    foodName: string,
    medications: string[]
): InteractionCheckResult {
    const warnings: string[] = [];
    let criticalCount = 0;
    let moderateCount = 0;

    const normalizedFood = foodName.toLowerCase();

    for (const med of medications) {
        const genericName = normalizeMedicationName(med);
        const interaction = DRUG_FOOD_INTERACTIONS[genericName];

        if (!interaction) continue;

        // Check if food is in avoid list
        const isAvoided = interaction.avoid.some((term) =>
            normalizedFood.includes(term.toLowerCase())
        );

        // Check if food reduces absorption
        const reducesAbsorption = interaction.reduceAbsorption?.some((term) =>
            normalizedFood.includes(term.toLowerCase())
        );

        // Check if food increases absorption (dangerous)
        const increasesAbsorption = interaction.increaseAbsorption?.some((term) =>
            normalizedFood.includes(term.toLowerCase())
        );

        if (isAvoided) {
            warnings.push(
                `🚫 ${foodName.toUpperCase()} + ${med.toUpperCase()}: ${interaction.warning}`
            );
            if (interaction.severity === "critical") criticalCount++;
            else moderateCount++;
        }

        if (reducesAbsorption) {
            warnings.push(
                `⏱️ ${foodName} reduce absorción de ${med}. Separar por 2-4 horas.`
            );
            moderateCount++;
        }

        if (increasesAbsorption) {
            warnings.push(
                `⚠️ ${foodName} aumenta niveles de ${med}. Riesgo de toxicidad.`
            );
            if (interaction.severity === "critical") criticalCount++;
            else moderateCount++;
        }

        // Check if food has synergistic/additive effect (e.g., potassium with IECA)
        const hasSynergisticRisk = interaction.synergisticRisk?.some((term) =>
            normalizedFood.includes(term.toLowerCase())
        );

        if (hasSynergisticRisk) {
            warnings.push(
                `🧂 ${foodName.toUpperCase()} + ${med.toUpperCase()}: Efecto aditivo. ${interaction.recommendation || 'Moderar consumo.'}`
            );
            moderateCount++;
        }
    }

    return {
        hasInteraction: warnings.length > 0,
        warnings,
        criticalCount,
        moderateCount,
    };
}

/**
 * Genera advertencias generales para todos los medicamentos del paciente.
 * Útil para mostrar al inicio de la generación de dieta.
 *
 * @param medications - Lista de medicamentos del paciente
 * @returns Lista de advertencias generales
 */
export function getMedicationWarnings(medications: string[]): string[] {
    const warnings: string[] = [];

    for (const med of medications) {
        const genericName = normalizeMedicationName(med);
        const interaction = DRUG_FOOD_INTERACTIONS[genericName];

        if (interaction) {
            warnings.push(interaction.warning);
            if (interaction.recommendation) {
                warnings.push(`   → ${interaction.recommendation}`);
            }
        }
    }

    return warnings;
}

/**
 * Filtra alimentos seguros basándose en los medicamentos del paciente.
 *
 * @param foods - Lista de nombres de alimentos
 * @param medications - Lista de medicamentos del paciente
 * @param strictMode - Si es true, también filtra reducción de absorción
 * @returns Lista de alimentos seguros
 */
export function filterSafeFoodsForMedications(
    foods: string[],
    medications: string[],
    strictMode: boolean = false
): { safe: string[]; removed: string[]; warnings: string[] } {
    const safe: string[] = [];
    const removed: string[] = [];
    const warnings: string[] = [];

    for (const food of foods) {
        const check = checkFoodDrugInteraction(food, medications);

        if (check.criticalCount > 0) {
            removed.push(food);
            warnings.push(...check.warnings);
        } else if (strictMode && check.moderateCount > 0) {
            removed.push(food);
            warnings.push(...check.warnings);
        } else {
            safe.push(food);
        }
    }

    return { safe, removed, warnings };
}
