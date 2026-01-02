/**
 * allergy-validator.ts
 *
 * Sistema de validación de alergias alimentarias para NutriKallpa.
 * Garantiza que los alimentos sugeridos en dietas no contengan alérgenos
 * peligrosos para el paciente.
 *
 * Referencias:
 * - CODEX Alimentarius: Etiquetado de alérgenos
 * - FDA Food Allergen Labeling (FALCPA)
 * - Reglamento (UE) 1169/2011
 */

// ============================================================================
// TYPES
// ============================================================================

export type AllergenCategory =
    | "gluten"
    | "lactosa"
    | "lacteos"
    | "huevo"
    | "pescado"
    | "mariscos"
    | "frutos_secos"
    | "mani"
    | "soya"
    | "apio"
    | "mostaza"
    | "sesamo"
    | "sulfitos"
    | "moluscos"
    | "altramuz";

export interface AllergenValidation {
    isSafe: boolean;
    allergenFound?: string;
    foodItem: string;
    severity?: "high" | "medium" | "low";
    alternatives?: string[];
}

export interface BatchValidationResult {
    safeCount: number;
    unsafeCount: number;
    results: AllergenValidation[];
    unsafeFoods: string[];
}

// ============================================================================
// ALLERGEN DATABASE
// ============================================================================

/**
 * Mapa de alérgenos con alimentos que los contienen.
 * Basado en los 14 alérgenos principales de regulación internacional.
 */
export const ALLERGEN_MAP: Record<AllergenCategory, string[]> = {
    gluten: [
        "trigo",
        "centeno",
        "cebada",
        "avena",
        "espelta",
        "kamut",
        "pan",
        "pasta",
        "fideos",
        "galletas",
        "bizcocho",
        "torta",
        "harina",
        "cerveza",
        "sémola",
        "cuscús",
        "bulgur",
        "seitan",
        "empanada",
        "pizza",
        "churro",
    ],
    lactosa: [
        "leche",
        "queso",
        "yogurt",
        "yogur",
        "mantequilla",
        "crema",
        "nata",
        "helado",
        "flan",
        "natilla",
        "manjar",
        "dulce de leche",
        "suero",
        "caseína",
        "lactosuero",
        "requesón",
        "ricotta",
        "mozzarella",
        "parmesano",
    ],
    lacteos: [
        "leche",
        "queso",
        "yogurt",
        "yogur",
        "mantequilla",
        "crema",
        "nata",
        "helado",
        "flan",
        "natilla",
        "manjar",
        "dulce de leche",
        "suero",
        "caseína",
        "lactosuero",
        "requesón",
        "ricotta",
        "kéfir",
    ],
    huevo: [
        "huevo",
        "clara",
        "yema",
        "omelette",
        "tortilla",
        "mayonesa",
        "merengue",
        "bizcocho",
        "pastel",
        "flan",
        "albúmina",
        "lecitina",
        "lysozima",
    ],
    pescado: [
        "pescado",
        "salmón",
        "atún",
        "bonito",
        "jurel",
        "caballa",
        "sardina",
        "anchoveta",
        "anchoa",
        "merluza",
        "corvina",
        "lenguado",
        "trucha",
        "tilapia",
        "pejerrey",
        "cojinova",
        "tollo",
        "ceviche",
        "chicharrón de pescado",
        "sudado",
    ],
    mariscos: [
        "camarón",
        "langostino",
        "cangrejo",
        "jaiba",
        "langosta",
        "conchas",
        "choro",
        "mejillón",
        "almeja",
        "calamar",
        "pulpo",
        "ostión",
        "ostra",
        "erizo",
        "mariscos",
        "arroz con mariscos",
        "jalea",
        "parihuela",
    ],
    frutos_secos: [
        "almendra",
        "nuez",
        "pecana",
        "avellana",
        "pistacho",
        "anacardo",
        "marañón",
        "castaña",
        "macadamia",
        "nuez de brasil",
        "castaña de cajú",
        "praliné",
        "mazapán",
        "turrón",
    ],
    mani: [
        "maní",
        "cacahuate",
        "cacahuete",
        "mantequilla de maní",
        "crema de maní",
        "aceite de maní",
    ],
    soya: [
        "soya",
        "soja",
        "tofu",
        "tempeh",
        "miso",
        "salsa de soya",
        "edamame",
        "lecitina de soya",
        "proteína de soya",
        "leche de soya",
    ],
    apio: ["apio", "apio nabo", "sal de apio"],
    mostaza: ["mostaza", "semilla de mostaza", "salsa mostaza"],
    sesamo: [
        "sésamo",
        "ajonjolí",
        "tahini",
        "tahina",
        "aceite de sésamo",
        "semilla de sésamo",
        "hummus",
    ],
    sulfitos: [
        "vino",
        "vinagre",
        "fruta seca",
        "pasas",
        "orejones",
        "sidra",
        "cerveza",
        "mostaza",
    ],
    moluscos: [
        "calamar",
        "pulpo",
        "caracol",
        "babosa",
        "almeja",
        "mejillón",
        "ostra",
        "vieira",
    ],
    altramuz: ["lupino", "altramuz", "tremoso"],
};

/**
 * Alternativas seguras para cada categoría de alérgeno.
 * Útil para sugerir sustitutos al paciente.
 */
export const SAFE_ALTERNATIVES: Record<AllergenCategory, string[]> = {
    gluten: [
        "arroz",
        "quinua",
        "kiwicha",
        "maíz",
        "papa",
        "yuca",
        "camote",
        "harina de arroz",
        "harina de maíz",
    ],
    lactosa: [
        "leche de almendras",
        "leche de soya",
        "leche de coco",
        "leche de avena",
        "queso vegano",
    ],
    lacteos: [
        "leche de almendras",
        "leche de soya",
        "leche de coco",
        "leche de avena",
        "yogurt de coco",
    ],
    huevo: [
        "chía (como sustituto)",
        "linaza (como sustituto)",
        "puré de plátano",
        "aquafaba",
    ],
    pescado: [
        "pollo",
        "pavo",
        "carne de res",
        "cerdo",
        "tofu",
        "legumbres",
        "quinua",
    ],
    mariscos: ["pollo", "pavo", "carne de res", "cerdo", "pescado", "tofu"],
    frutos_secos: [
        "semillas de girasol",
        "semillas de calabaza",
        "coco rallado",
        "semillas de chía",
    ],
    mani: [
        "mantequilla de almendras",
        "mantequilla de semillas de girasol",
        "mantequilla de soya",
    ],
    soya: [
        "legumbres",
        "lentejas",
        "garbanzos",
        "frijoles",
        "proteína de guisante",
    ],
    apio: ["hinojo", "perejil", "cilantro"],
    mostaza: ["wasabi", "rábano picante", "jengibre"],
    sesamo: [
        "semillas de girasol",
        "semillas de calabaza",
        "semillas de chía",
        "linaza",
    ],
    sulfitos: ["frutas frescas", "vinagre de manzana casero"],
    moluscos: ["pescado", "pollo", "tofu", "legumbres"],
    altramuz: ["otras legumbres", "lentejas", "garbanzos"],
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Normaliza un string para comparación (lowercase, sin tildes).
 */
function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

/**
 * Valida si un alimento es seguro para un paciente con las alergias indicadas.
 *
 * @param food - Nombre del alimento a validar
 * @param patientAllergies - Lista de alergias del paciente
 * @returns Resultado de la validación con información del alérgeno si se encuentra
 */
export function validateFoodAgainstAllergies(
    food: string,
    patientAllergies: string[]
): AllergenValidation {
    const normalizedFood = normalizeText(food);

    if (!patientAllergies || patientAllergies.length === 0) {
        return { isSafe: true, foodItem: food };
    }

    for (const allergy of patientAllergies) {
        const normalizedAllergy = normalizeText(allergy);

        // Buscar la categoría de alérgeno correspondiente
        const allergenKey = Object.keys(ALLERGEN_MAP).find(
            (key) =>
                normalizedAllergy.includes(normalizeText(key)) ||
                normalizeText(key).includes(normalizedAllergy)
        ) as AllergenCategory | undefined;

        if (allergenKey) {
            const allergenFoods = ALLERGEN_MAP[allergenKey];

            // Verificar si el alimento contiene el alérgeno
            const foundAllergen = allergenFoods.find(
                (allergenFood) =>
                    normalizedFood.includes(normalizeText(allergenFood)) ||
                    normalizeText(allergenFood).includes(normalizedFood)
            );

            if (foundAllergen) {
                return {
                    isSafe: false,
                    allergenFound: allergy,
                    foodItem: food,
                    severity: getSeverity(allergenKey),
                    alternatives: SAFE_ALTERNATIVES[allergenKey]?.slice(0, 5),
                };
            }
        }

        // También verificar coincidencia directa con el texto de la alergia
        const directMatch = Object.entries(ALLERGEN_MAP).find(([, foods]) =>
            foods.some(
                (f) =>
                    normalizedFood.includes(normalizeText(f)) ||
                    normalizeText(f).includes(normalizedFood)
            )
        );

        if (directMatch) {
            const [category] = directMatch;
            if (normalizedAllergy.includes(normalizeText(category))) {
                return {
                    isSafe: false,
                    allergenFound: allergy,
                    foodItem: food,
                    severity: getSeverity(category as AllergenCategory),
                    alternatives: SAFE_ALTERNATIVES[category as AllergenCategory]?.slice(
                        0,
                        5
                    ),
                };
            }
        }
    }

    return { isSafe: true, foodItem: food };
}

/**
 * Determina la severidad de una reacción alérgica típica.
 */
function getSeverity(
    category: AllergenCategory
): "high" | "medium" | "low" {
    const highSeverity: AllergenCategory[] = [
        "mariscos",
        "mani",
        "frutos_secos",
        "pescado",
    ];
    const mediumSeverity: AllergenCategory[] = [
        "huevo",
        "lacteos",
        "soya",
        "gluten",
    ];

    if (highSeverity.includes(category)) return "high";
    if (mediumSeverity.includes(category)) return "medium";
    return "low";
}

/**
 * Valida una lista de alimentos contra las alergias del paciente.
 *
 * @param foods - Lista de alimentos a validar
 * @param patientAllergies - Lista de alergias del paciente
 * @returns Resultado de validación por lotes
 */
export function validateFoodList(
    foods: string[],
    patientAllergies: string[]
): BatchValidationResult {
    const results = foods.map((food) =>
        validateFoodAgainstAllergies(food, patientAllergies)
    );

    const unsafeResults = results.filter((r) => !r.isSafe);

    return {
        safeCount: results.length - unsafeResults.length,
        unsafeCount: unsafeResults.length,
        results,
        unsafeFoods: unsafeResults.map((r) => r.foodItem),
    };
}

/**
 * Obtiene alternativas seguras para un alérgeno específico.
 *
 * @param allergy - Alergia del paciente
 * @returns Lista de alternativas seguras
 */
export function getSafeAlternatives(allergy: string): string[] {
    const normalizedAllergy = normalizeText(allergy);

    const allergenKey = Object.keys(ALLERGEN_MAP).find(
        (key) =>
            normalizedAllergy.includes(normalizeText(key)) ||
            normalizeText(key).includes(normalizedAllergy)
    ) as AllergenCategory | undefined;

    if (allergenKey) {
        return SAFE_ALTERNATIVES[allergenKey] || [];
    }

    return [];
}

/**
 * Filtra una lista de alimentos, eliminando los que contienen alérgenos.
 *
 * @param foods - Lista de alimentos
 * @param patientAllergies - Lista de alergias del paciente
 * @returns Lista de alimentos seguros
 */
export function filterSafeFoods(
    foods: string[],
    patientAllergies: string[]
): string[] {
    return foods.filter(
        (food) => validateFoodAgainstAllergies(food, patientAllergies).isSafe
    );
}
