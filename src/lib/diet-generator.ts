import { Alimento } from "./csv-parser";
import { roundCalories, roundMacro, roundMicro } from "./csv-parser";
import { PERUVIAN_RECIPES, PeruvianRecipe, RecipeComponent, MealType, Category, FITNESS_DESSERT_RECIPES } from "./peruvian-recipes";
import { Pathologies } from "@/types";

// --- TYPES ---

export interface MealItem {
    id: string; // Unique ID for UI handling
    food: Alimento;
    quantity: number; // grams
    category: Category;
}

export interface Meal {
    name: string;
    items: MealItem[];
}

export interface MacroSplit {
    protein: number; // %
    carbs: number; // %
    fat: number; // %
}

export interface NutritionalGoals {
    calories: number;
    macros: MacroSplit;
    micros: Partial<Record<keyof Alimento, number>>; // Minimum targets
}

export interface DailyStats {
    calories: number;
    macros: {
        protein: number;
        carbs: number;
        fat: number;
    };
    micros: {
        calcio: number;
        fosforo: number;
        zinc: number;
        hierro: number;
        vitaminaA: number;
        tiamina: number;
        riboflavina: number; // B2
        niacina: number; // B3
        vitaminaC: number;
        acidoFolico: number;
        sodio: number;
        potasio: number;
    };
}

export interface DailyPlan {
    day: string;
    meals: Meal[];
    stats: DailyStats;
    goals: NutritionalGoals;
    safetyWarnings?: string[]; // Audit Fix: Warn about potential conflicts
}

export interface UserPreferences {
    likedFoods: string[];
    dislikedFoods: string[];
    pathologies?: string[]; // Audit Fix: Medical Constraints
    allergies?: AllergyEntrySimple[]; // New: Allergies with severity
}

// Simplified allergy entry for diet generator (matches types/index.ts AllergyEntry)
interface AllergyEntrySimple {
    allergen: string;
    severity: 'fatal' | 'intolerance' | 'preference';
}

// --- ALLERGY FILTERS (Medical Grade) ---
// For fatal allergies, these derivatives must ALSO be excluded
const ALLERGEN_DERIVATIVES: Record<string, string[]> = {
    'Lácteos': ['leche', 'queso', 'yogur', 'mantequilla', 'crema', 'caseína', 'suero', 'whey', 'lactosa', 'nata', 'requesón', 'kefir', 'helado'],
    'Huevo': ['huevo', 'clara', 'yema', 'mayonesa', 'albumina', 'ovoalbumina', 'lecitina', 'merengue'],
    'Maní': ['maní', 'cacahuete', 'cacahuate', 'crema de maní', 'mantequilla de maní'],
    'Frutos Secos': ['nuez', 'almendra', 'avellana', 'castaña', 'pistacho', 'pecana', 'marañón', 'anacardo', 'macadamia'],
    'Trigo': ['trigo', 'harina', 'pan', 'fideo', 'galleta', 'sémola', 'cuscús', 'salvado'],
    'Gluten': ['trigo', 'avena', 'cebada', 'centeno', 'espelta', 'kamut', 'gluten', 'seitan'],
    'Mariscos': ['camarón', 'langostino', 'cangrejo', 'langosta', 'mejillón', 'almeja', 'ostra', 'calamar', 'pulpo', 'conchas'],
    'Pescado': ['pescado', 'atún', 'salmón', 'tilapia', 'bonito', 'jurel', 'caballa', 'anchoa', 'sardina', 'trucha'],
    'Soya': ['soya', 'soja', 'tofu', 'tempeh', 'edamame', 'miso', 'leche de soya', 'salsa de soya', 'sillao'],
    'Ajonjolí': ['ajonjolí', 'sésamo', 'tahini', 'tahina'],
};

// Simple allergen terms for direct matching
const ALLERGEN_SIMPLE_TERMS: Record<string, string[]> = {
    'Lácteos': ['leche', 'queso', 'yogur'],
    'Huevo': ['huevo'],
    'Maní': ['maní', 'cacahuete'],
    'Frutos Secos': ['nuez', 'almendra', 'pecana'],
    'Trigo': ['trigo', 'harina de trigo'],
    'Gluten': ['trigo', 'gluten'],
    'Mariscos': ['camarón', 'langostino', 'mariscos'],
    'Pescado': ['pescado', 'atún'],
    'Soya': ['soya', 'soja'],
};

// --- SAFETY CONSTANTS ---
const SAFETY_FILTERS: Record<string, string[]> = {
    'Diabetes Tipo 1': ['azucar', 'miel', 'chancaca', 'panela', 'rubia', 'refinada', 'jarabe', 'dulce', 'mermelada', 'gaseosa', 'bebida', 'nectar', 'frugos', 'frutado', 'reposteria'],
    'Diabetes Tipo 2': ['azucar', 'miel', 'chancaca', 'panela', 'rubia', 'refinada', 'jarabe', 'dulce', 'mermelada', 'gaseosa', 'bebida', 'nectar', 'frugos', 'frutado'],
    'Hipertensión Arterial': ['sal', 'sodio', 'siyau', 'sillao', 'soya', 'conserva', 'enlatado', 'embutido', 'hot dog', 'chorizo', 'salchicha', 'jamon', 'tocino', 'caldo', 'cubito'],
    'Enfermedad Renal Crónica': ['plátano', 'platano', 'naranja', 'tomate', 'espinaca', 'acelga', 'palta', 'frutos secos', 'pecana', 'nuez', 'almendra', 'mani', 'chocolate', 'cacao', 'integral', 'salvado'],
    'Celiaquía': ['trigo', 'avena', 'cebada', 'centeno', 'pan', 'fideo', 'tallarin', 'harina', 'galleta', 'semola', 'cuscus', 'cerveza', 'maltha'],
    'Dislipidemia': ['mantequilla', 'manteca', 'tocino', 'cerdo', 'chancho', 'chicharrón', 'piel', 'entera', 'queso mantecoso', 'fritura', 'frito', 'aceite de palma', 'coco'],
    'Obesidad': ['azucar', 'miel', 'fritura', 'frito', 'gaseosa', 'galleta', 'golosina', 'chocolates'],
    'Gastritis': ['aj', 'rocoto', 'pimienta', 'comino', 'limon', 'cafe', 'alcohol', 'cerveza', 'vino', 'gaseosa', 'chocolate', 'fritura', 'grasa', 'citrico', 'naranja'],
    'Reflujo GE': ['aj', 'rocoto', 'pimienta', 'comino', 'limon', 'cafe', 'alcohol', 'cerveza', 'vino', 'gaseosa', 'chocolate', 'menta', 'tomate', 'citrico'],
    // Nuevas patologías agregadas
    'Hipotiroidismo': ['soya', 'soja', 'tofu', 'edamame', 'leche de soya', 'miso', 'tempeh', 'col cruda', 'brocoli crudo', 'coliflor cruda', 'repollo crudo', 'nabo', 'rabano', 'mani crudo', 'linaza', 'yuca cruda'],
    'Hipertiroidismo': ['alga', 'nori', 'kombu', 'wakame', 'kelp', 'marisco', 'camaron', 'langostino', 'cangrejo', 'langosta', 'mejillon', 'almeja', 'pulpo', 'calamar', 'cafe', 'te negro', 'bebida energizante', 'chocolate', 'cacao'],
    'SOP': ['azucar', 'miel', 'chancaca', 'panela', 'jarabe', 'dulce', 'gaseosa', 'galleta', 'golosina', 'pan blanco', 'arroz blanco', 'fideo refinado', 'leche entera', 'queso mantecoso', 'crema de leche', 'helado', 'fritura', 'frito'],
    'Anemia': ['cafe', 'te', 'te negro', 'te verde', 'leche con comida', 'calcio', 'coca cola', 'gaseosa', 'chocolate', 'salvado', 'fibra']
};

/**
 * Filter foods based on allergy severity
 * @param foods - Available foods
 * @param allergies - Patient allergies with severity
 * @returns Filtered foods and warnings
 */
function filterByAllergySeverity(
    foods: Alimento[],
    allergies: AllergyEntrySimple[]
): { filtered: Alimento[], warnings: string[] } {
    let filtered = [...foods];
    const warnings: string[] = [];

    for (const allergy of allergies) {
        const { allergen, severity } = allergy;

        // Get terms to filter based on severity
        let termsToExclude: string[] = [];

        if (severity === 'fatal') {
            // Fatal: Exclude ALL derivatives and traces
            termsToExclude = ALLERGEN_DERIVATIVES[allergen] || [allergen.toLowerCase()];
            warnings.push(`🔴 ALERGIA FATAL: ${allergen} - Excluidos ${termsToExclude.length} términos y derivados.`);
        } else if (severity === 'intolerance') {
            // Intolerance: Exclude direct sources only
            termsToExclude = ALLERGEN_SIMPLE_TERMS[allergen] || [allergen.toLowerCase()];
            warnings.push(`🟠 Intolerancia: ${allergen} - Excluidos ${termsToExclude.length} alimentos directos.`);
        } else {
            // Preference: Only exclude if there are alternatives (handled elsewhere)
            // We still track but don't force-filter
            continue;
        }

        const beforeCount = filtered.length;
        filtered = filtered.filter(f => {
            const name = f.nombre.toLowerCase();
            return !termsToExclude.some(term => name.includes(term.toLowerCase()));
        });
        const removedCount = beforeCount - filtered.length;

        if (removedCount > 0) {
            warnings[warnings.length - 1] += ` (${removedCount} alimentos removidos)`;
        }
    }

    return { filtered, warnings };
}


// --- CONSTANTS ---

export const DEFAULT_MICRO_GOALS = {
    calcio: 1000,
    fosforo: 700,
    zinc: 11,
    hierro: 14, // Avg men/women
    vitaminaA: 900,
    tiamina: 1.2,
    riboflavina: 1.3,
    niacina: 16,
    vitaminaC: 90,
    acidoFolico: 400,
    sodio: 2300, // Limit
    potasio: 4700
};

const FILLERS = {
    protein: [
        { searchTerms: ["huevo", "sancochado"], ratio: 0.25, name: "Huevo Duro (Extra)" },
        { searchTerms: ["queso", "fresco"], ratio: 0.2, name: "Queso Fresco (Extra)" },
        { searchTerms: ["atun", "conserva"], ratio: 0.25, name: "Atún en Agua (Extra)" }
    ],
    carb: [
        { searchTerms: ["papa", "sancochada"], ratio: 0.25, name: "Papa Sancochada" },
        { searchTerms: ["arroz", "cocido"], ratio: 0.25, name: "Porción de Arroz" },
        { searchTerms: ["choclo"], ratio: 0.2, name: "Choclo Desgranado" },
        { searchTerms: ["camote"], ratio: 0.25, name: "Camote Sancochado" }
    ],
    veggie: [
        { searchTerms: ["lechuga", "tomate"], ratio: 0.2, name: "Ensalada Fresca" },
        { searchTerms: ["pepino", "limon"], ratio: 0.15, name: "Ensalada de Pepino" },
        { searchTerms: ["vainita", "zanahoria"], ratio: 0.15, name: "Verduras al Vapor" }
    ]
};

// Hard Caps - Maximum realistic portion sizes by food type (in grams)
export const HARD_CAPS: Record<string, number> = {
    // By category
    'fruta': 200,        // Max 200g fruit per serving
    'lacteo': 250,       // Max 250g dairy
    'grasa': 15,         // Max 15g oils/fats
    'verdura': 150,      // Max 150g vegetables per ingredient

    // By specific food patterns (higher priority)
    'avena': 80,         // Dry oats max 80g
    'cereal': 80,        // Cereals max 80g
    'arroz': 250,        // Cooked rice max 250g
    'papa': 250,         // Potatoes max 250g
    'camote': 250,       // Sweet potato max 250g
    'yuca': 250,         // Yuca max 250g
    'quinua': 200,       // Quinoa max 200g (cooked)
    'fideo': 200,        // Pasta max 200g
    'pan': 120,          // Bread max 120g
    'proteina': 180,     // Protein sources max 180g

    // Specific ingredients
    'ajo': 5,
    'aceite': 15,
    'cebolla': 60,
    'huevo': 150,        // ~2-3 eggs max

    // Snack-specific caps
    'whey': 30,          // Protein powder max 30g per serving
    'proteina polvo': 30,
    'cacao': 15,         // Cacao powder max 15g
    'chocolate': 30,     // Chocolate max 30g
    'crema cacahuete': 30, // Peanut butter max 30g
    'mani': 30,
    'almendra': 30,
    'nueces': 30,
    'avellana': 30,
};

// Synonym map for ingredients that may not exist in CSV
export const INGREDIENT_SYNONYMS: Record<string, string[]> = {
    'queso batido': ['yogur griego', 'queso cottage', 'yogur natural', 'requesón'],
    'queso quark': ['yogur griego', 'queso cottage', 'yogur natural'],
    'whey': ['proteína', 'suero de leche'],
    'proteina': ['suero de leche', 'clara de huevo'],
    'harina avena': ['avena', 'hojuelas de avena', 'avena en hojuelas'],
    'crema cacahuete': ['mantequilla maní', 'maní', 'cacahuete'],
    'leche almendra': ['leche de soja', 'leche descremada'],
    'leche soja': ['leche descremada', 'leche evaporada'],
};

// Helper: Get the hard cap for a MealItem based on category and food name
function getHardCap(item: MealItem): number {
    const foodName = item.food.nombre.toLowerCase();

    // Check specific food patterns first (higher priority)
    for (const [pattern, cap] of Object.entries(HARD_CAPS)) {
        if (pattern !== item.category && foodName.includes(pattern)) {
            return cap;
        }
    }

    // Fallback to category cap
    if (HARD_CAPS[item.category]) {
        return HARD_CAPS[item.category];
    }

    // Default high cap for uncategorized items
    return 500;
}

// Helper: Get snack-specific cap (for fitness desserts)
function getSnackCap(foodName: string, category?: string): number {
    const name = foodName.toLowerCase();

    // Protein powder: max 30g
    if (name.includes('whey') || name.includes('proteina') || name.includes('proteína')) {
        return 30;
    }

    // Cacao: max 15g
    if (name.includes('cacao')) {
        return 15;
    }

    // Nuts and nut butters: max 30g
    if (name.includes('nuez') || name.includes('almendra') || name.includes('cacahuete') ||
        name.includes('mani') || name.includes('avellana') || name.includes('crema')) {
        return 30;
    }

    // Use default hard caps for other items
    if (category && HARD_CAPS[category]) {
        return HARD_CAPS[category];
    }

    return 200; // Default snack portion
}

// --- CALCULATIONS ---

export function calculateMealStats(items: MealItem[]): DailyStats {
    const stats: DailyStats = {
        calories: 0,
        macros: { protein: 0, carbs: 0, fat: 0 },
        micros: {
            calcio: 0, fosforo: 0, zinc: 0, hierro: 0, vitaminaA: 0,
            tiamina: 0, riboflavina: 0, niacina: 0, vitaminaC: 0,
            acidoFolico: 0, sodio: 0, potasio: 0
        }
    };

    items.forEach(item => {
        const ratio = item.quantity / 100;
        const f = item.food;

        stats.calories += f.energia * ratio;
        stats.macros.protein += f.proteinas * ratio;
        stats.macros.carbs += f.carbohidratos * ratio;
        stats.macros.fat += f.grasa * ratio;

        stats.micros.calcio += (f.calcio || 0) * ratio;
        stats.micros.fosforo += (f.fosforo || 0) * ratio;
        stats.micros.zinc += (f.zinc || 0) * ratio;
        stats.micros.hierro += (f.hierro || 0) * ratio;
        stats.micros.vitaminaA += (f.vitaminaA || 0) * ratio;
        stats.micros.tiamina += (f.tiamina || 0) * ratio;
        stats.micros.riboflavina += (f.riboflavina || 0) * ratio;
        stats.micros.niacina += (f.niacina || 0) * ratio;
        stats.micros.vitaminaC += (f.vitaminaC || 0) * ratio;
        stats.micros.acidoFolico += (f.acidoFolico || 0) * ratio;
        stats.micros.sodio += (f.sodio || 0) * ratio;
        stats.micros.potasio += (f.potasio || 0) * ratio;
    });

    // Apply rounding at the END to prevent floating-point accumulation errors
    // Audit Fix: Ensures clean values like 0.1 + 0.2 = 0.3 (not 0.30000000000000004)
    return {
        calories: roundCalories(stats.calories),
        macros: {
            protein: roundMacro(stats.macros.protein),
            carbs: roundMacro(stats.macros.carbs),
            fat: roundMacro(stats.macros.fat),
        },
        micros: {
            calcio: roundMicro(stats.micros.calcio),
            fosforo: roundMicro(stats.micros.fosforo),
            zinc: roundMicro(stats.micros.zinc),
            hierro: roundMicro(stats.micros.hierro),
            vitaminaA: roundMicro(stats.micros.vitaminaA),
            tiamina: roundMicro(stats.micros.tiamina),
            riboflavina: roundMicro(stats.micros.riboflavina),
            niacina: roundMicro(stats.micros.niacina),
            vitaminaC: roundMicro(stats.micros.vitaminaC),
            acidoFolico: roundMicro(stats.micros.acidoFolico),
            sodio: roundMicro(stats.micros.sodio),
            potasio: roundMicro(stats.micros.potasio),
        }
    };
}

export function calculateDailyStats(meals: Meal[]): DailyStats {
    const allItems = meals.flatMap(m => m.items);
    return calculateMealStats(allItems);
}

// --- GENERATION LOGIC ---

function findBestMatch(searchTerms: string[], availableFoods: Alimento[], category?: Category): Alimento | null {
    // BLACKLIST: Palabras prohibidas para ingredientes sólidos
    const BLACKLIST = ['Chicha', 'Bebida', 'Harina', 'Masato', 'Nectar', 'Jugo', 'Refresco'];

    let candidates = availableFoods;

    // Aplicar Blacklist si es comida solida (proteina, carbohidrato, verdura, fruta)
    if (category && ['proteina', 'carbohidrato', 'verdura', 'fruta'].includes(category)) {
        candidates = candidates.filter(f => {
            const name = f.nombre.toLowerCase();
            return !BLACKLIST.some(b => name.includes(b.toLowerCase()));
        });
    }

    for (const term of searchTerms) {
        // 1. Try exact match (case insensitive)
        let match = candidates.find(f => f.nombre.toLowerCase() === term.toLowerCase());
        if (match) return match;

        // 2. Try includes
        match = candidates.find(f => f.nombre.toLowerCase().includes(term.toLowerCase()));
        if (match) return match;

        // 3. Try regex if term contains | (legacy support or advanced patterns)
        if (term.includes('|')) {
            try {
                const regex = new RegExp(term, 'i');
                match = candidates.find(f => regex.test(f.nombre));
                if (match) return match;
            } catch (e) {
                // Ignore invalid regex
            }
        }
    }
    return null;
}

function getRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Detects if a macro group is present using keywords in searchTerms,
 * AND ensuring the ingredient actually exists in the provided foods.
 */
function hasMacro(ingredients: RecipeComponent[], keywords: string[], availableFoods: Alimento[]): boolean {
    return ingredients.some(ing => {
        // 1. Check Keywords
        const matchesKeyword = ing.searchTerms.some(term =>
            keywords.some(kw => term.toLowerCase().includes(kw))
        );
        if (!matchesKeyword) return false;

        // 2. Check Availability
        const match = findBestMatch(ing.searchTerms, availableFoods, ing.category);
        return match !== null;
    });
}

/**
 * Ensures a recipe has at least one item from each critical macro group:
 * protein, carb and veggie, using keyword detection and checking food availability.
 */
function ensureBalancedMeal(ingredients: RecipeComponent[], availableFoods: Alimento[]): RecipeComponent[] {
    const PROTEIN_KEYWORDS = ["pollo", "res", "carne", "pescado", "atun", "huevo", "pavita", "higado", "sangrecita", "queso", "lomo", "bistec", "cerdo", "chancho", "lechon", "cordero", "pavo", "pato"];
    const CARB_KEYWORDS = ["arroz", "papa", "camote", "yuca", "fideo", "tallarin", "pan", "avena", "quinua", "trigo", "menestra", "lenteja", "frejol", "garbanzo", "haba", "mote", "maiz", "choclo"];
    const VEGGIE_KEYWORDS = ["ensalada", "lechuga", "tomate", "cebolla", "zanahoria", "vainita", "brocoli", "espinaca", "zapallo", "caigua", "acelga", "apio", "pepino", "rabanito", "beterraga"];

    const result = [...ingredients];

    if (!hasMacro(result, PROTEIN_KEYWORDS, availableFoods)) {
        const filler = getRandom(FILLERS.protein);
        result.push({ category: 'proteina', searchTerms: filler.searchTerms, ratio: filler.ratio });
    }
    if (!hasMacro(result, CARB_KEYWORDS, availableFoods)) {
        const filler = getRandom(FILLERS.carb);
        result.push({ category: 'carbohidrato', searchTerms: filler.searchTerms, ratio: filler.ratio });
    }
    if (!hasMacro(result, VEGGIE_KEYWORDS, availableFoods)) {
        const filler = getRandom(FILLERS.veggie);
        result.push({ category: 'verdura', searchTerms: filler.searchTerms, ratio: filler.ratio });
    }

    return result;
}

export function generateSmartDailyPlan(
    goals: NutritionalGoals,
    availableFoods: Alimento[],
    dayName: string,
    preferences?: UserPreferences
): DailyPlan {
    try {
        // Safety check: if no foods loaded, return empty plan
        if (!availableFoods || availableFoods.length === 0) {
            console.warn("generateSmartDailyPlan: No available foods provided.");
            return {
                day: dayName,
                meals: [],
                stats: {
                    calories: 0,
                    macros: { protein: 0, carbs: 0, fat: 0 },
                    micros: { calcio: 0, fosforo: 0, zinc: 0, hierro: 0, vitaminaA: 0, tiamina: 0, riboflavina: 0, niacina: 0, vitaminaC: 0, acidoFolico: 0, sodio: 0, potasio: 0 }
                },
                goals
            };
        }

        // 1. Filter Foods based on Preferences & SAFETY (Pathologies)
        let filteredFoods = [...availableFoods];
        const safetyWarnings: string[] = [];

        // A. FILTER: Disliked Foods
        if (preferences?.dislikedFoods && preferences.dislikedFoods.length > 0) {
            filteredFoods = filteredFoods.filter(f =>
                !preferences.dislikedFoods.some(dislike => f.nombre.toLowerCase().includes(dislike.toLowerCase()))
            );
        }

        // B. FILTER: MEDICAL SAFETY (Critical Audit Fix)
        if (preferences?.pathologies && preferences.pathologies.length > 0) {
            preferences.pathologies.forEach(pathology => {
                const forbiddenTerms = SAFETY_FILTERS[pathology];
                if (forbiddenTerms) {
                    const initialCount = filteredFoods.length;
                    filteredFoods = filteredFoods.filter(f => {
                        const name = f.nombre.toLowerCase();
                        // Strict check: if name includes any forbidden term, exclude it
                        return !forbiddenTerms.some(term => name.includes(term.toLowerCase()));
                    });
                    const removedCount = initialCount - filteredFoods.length;
                    if (removedCount > 0) {
                        safetyWarnings.push(`⚠️ Protocolo ${pathology.toUpperCase()}: ${removedCount} alimentos excluidos (riesgo clínico).`);
                    }
                }
            });
        }

        // C. FILTER: ALLERGY SEVERITY (Medical Grade)
        if (preferences?.allergies && preferences.allergies.length > 0) {
            const allergyResult = filterByAllergySeverity(filteredFoods, preferences.allergies);
            filteredFoods = allergyResult.filtered;
            safetyWarnings.push(...allergyResult.warnings);
        }

        // 2. Define Meal Structure & Targets
        const mealTargets: { name: string; type: MealType | 'snack'; ratio: number }[] = [
            { name: 'Desayuno', type: 'desayuno', ratio: 0.25 },
            { name: 'Almuerzo', type: 'almuerzo', ratio: 0.35 },
            { name: 'Cena', type: 'cena', ratio: 0.25 },
            { name: 'Colación', type: 'snack', ratio: 0.15 }
        ];

        // 3. Prepare All Recipes Pool
        const normalizedDesserts: PeruvianRecipe[] = FITNESS_DESSERT_RECIPES.map((r, i) => ({
            id: `fit-dessert-${i}`,
            name: r.name,
            mealTypes: ['snack'],
            ingredients: r.ingredients.map(ing => ({
                category: ing.category || 'miscelaneo',
                searchTerms: ing.searchTerms,
                ratio: ing.ratio
            }))
        }));

        const allRecipesPool = [...PERUVIAN_RECIPES, ...normalizedDesserts];

        let meals: Meal[] = [];

        // 4. Generate Each Meal
        mealTargets.forEach(target => {
            const targetCalories = goals.calories * target.ratio;

            // Select a random recipe for this meal type
            const possibleRecipes = allRecipesPool.filter(r => r.mealTypes.includes(target.type as MealType));

            let recipe = getRandom(possibleRecipes);

            // Fallback if no recipe found
            if (!recipe) {
                recipe = getRandom(allRecipesPool);
            }

            if (!recipe) {
                // If absolutely no recipes exist, push empty meal
                meals.push({ name: target.name, items: [] });
                return;
            }

            const mealItems: MealItem[] = [];

            // --- Balanced Plate Guarantee ---
            // Mutate/Refine ingredients to ensure balance using keyword detection and food availability
            const ingredientsToProcess = ensureBalancedMeal(recipe.ingredients, filteredFoods);

            // Calculate Total Ratio Sum for this recipe (including fillers)
            const totalRatio = ingredientsToProcess.reduce((sum, ing) => sum + ing.ratio, 0);

            ingredientsToProcess.forEach(ing => {
                const food = findBestMatch(ing.searchTerms, filteredFoods, ing.category);

                if (food) {
                    // Formula: CaloriasIngrediente = (TotalMealCalories * Ingrediente.ratio) / SumaDeRatios
                    const ingredientCalories = (targetCalories * ing.ratio) / (totalRatio || 1);

                    let grams = 0;
                    if (food.energia > 0) {
                        grams = (ingredientCalories / food.energia) * 100;
                    } else {
                        grams = 50;
                    }

                    mealItems.push({
                        id: Math.random().toString(36).substr(2, 9),
                        food,
                        quantity: Math.round(grams),
                        category: ing.category
                    });
                }
            });

            // --- FAIL-SAFE Balanced Plate Guarantee ---
            const PROT_REGEX = /\b(pollo|res|carne|pescado|atun|huevo|pavita|higado|sangrecita|queso|lomo|bistec|cerdo|chancho|lechon|cordero|pavo|pato)\b/i;
            const CARB_REGEX = /\b(arroz|papa|camote|yuca|fideo|tallarin|pan|avena|quinua|trigo|menestra|lenteja|frejol|garbanzo|haba|mote|maiz|choclo)\b/i;
            const VEGG_REGEX = /\b(ensalada|lechuga|tomate|cebolla|zanahoria|vainita|brocoli|espinaca|zapallo|caigua|acelga|apio|pepino|rabanito|beterraga)\b/i;

            const isProtein = (i: MealItem) => i.category === 'proteina' || PROT_REGEX.test(i.food.nombre);
            const isCarb = (i: MealItem) => i.category === 'carbohidrato' || CARB_REGEX.test(i.food.nombre);
            const isVeggie = (i: MealItem) => i.category === 'verdura' || VEGG_REGEX.test(i.food.nombre);

            if (!mealItems.some(isProtein)) {
                const filler = getRandom(FILLERS.protein);
                const food = findBestMatch(filler.searchTerms, filteredFoods, 'proteina');
                if (food) mealItems.push({ id: Math.random().toString(36).substr(2, 9), food, quantity: 80, category: 'proteina' });
            }
            if (!mealItems.some(isCarb)) {
                const filler = getRandom(FILLERS.carb);
                const food = findBestMatch(filler.searchTerms, filteredFoods, 'carbohidrato');
                if (food) mealItems.push({ id: Math.random().toString(36).substr(2, 9), food, quantity: 100, category: 'carbohidrato' });
            }
            if (!mealItems.some(isVeggie)) {
                const filler = getRandom(FILLERS.veggie);
                const food = findBestMatch(filler.searchTerms, filteredFoods, 'verdura');
                if (food) mealItems.push({ id: Math.random().toString(36).substr(2, 9), food, quantity: 100, category: 'verdura' });
            }

            meals.push({ name: `${target.name} - ${recipe.name}`, items: mealItems });
        });

        // 4. Capa de Post-Procesamiento (Nutricionista)
        meals = applyRealismConstraints(meals);
        meals = applyNutritionistConstraints(meals);

        // 5. CALORIC CALIBRATION SYSTEM (Precisión Estricta)
        // Step A: Run main calibration on all scalable ingredients
        meals = calibrateDailyPlan(meals, goals.calories);

        // Step B: Force adjustment if still outside tolerance (fallback)
        meals = forceAdjustLunchCarb(meals, goals.calories);

        // 6. Calculate Final Stats
        const stats = calculateDailyStats(meals);

        return {
            day: dayName,
            meals,
            stats,
            goals,
            safetyWarnings
        };
    } catch (error) {
        console.error("Error generating daily plan:", error);
        // Return safe empty plan on error
        return {
            day: dayName,
            meals: [],
            stats: {
                calories: 0,
                macros: { protein: 0, carbs: 0, fat: 0 },
                micros: { calcio: 0, fosforo: 0, zinc: 0, hierro: 0, vitaminaA: 0, tiamina: 0, riboflavina: 0, niacina: 0, vitaminaC: 0, acidoFolico: 0, sodio: 0, potasio: 0 }
            },
            goals
        };
    }
}

function applyNutritionistConstraints(meals: Meal[]): Meal[] {
    return meals.map(meal => {
        const isMainMeal = meal.name.toLowerCase().includes('almuerzo') || meal.name.toLowerCase().includes('cena');

        let newItems = meal.items.map(item => {
            let amount = item.quantity;

            // 1. Redondeo Estético (Múltiplos de 5)
            // Regla: "Nunca entregues decimales"
            if (amount < 5 && amount > 0) amount = 5; // Mínimo detectable
            else amount = Math.round(amount / 5) * 5;

            // 2. Protein Sparing (Mínimo 80g en almuerzo/cena)
            // Regla: "Mínimo 80g - 100g de carne/pollo/pescado crudo"
            if (isMainMeal && item.category === 'proteina') {
                if (amount < 80) amount = 80;
            }

            // 3. Aderezo Fijo (Piso de verduras de sabor)
            // Regla: "Mínimo 30-40g para dar sabor"
            if (item.category === 'verdura') {
                // Asumimos que todas las verduras en recetas compuestas son aderezos o guarniciones
                // Si es ensalada aparte, 30g es poco, pero es un piso seguro.
                if (amount < 30 && amount > 0) amount = 30;
            }

            // 4. Restricción de Grasas (Aceite)
            // Regla: "Limita el aceite añadido para cocinar a máx 10-15g"
            if (item.category === 'grasa') {
                if (amount > 15) amount = 15;
            }

            return { ...item, quantity: amount };
        });

        // 5. Coherencia de Guarniciones (Carbohidratos)
        const carbs = newItems.filter(i => i.category === 'carbohidrato');
        if (carbs.length > 1) {
            // Identificar carbohidratos ridículamente pequeños (<30g)
            const tinyCarbs = carbs.filter(c => c.quantity < 30);

            if (tinyCarbs.length > 0) {
                // Regla: "elimina uno ... y suma esa energía al otro"
                // Simplificación: Eliminamos los pequeños.
                newItems = newItems.filter(i => !tinyCarbs.includes(i));
            }
        }

        // Filtrar items con 0 o negativo (security)
        newItems = newItems.filter(i => i.quantity > 0);

        return { ...meal, items: newItems };
    });
}

function applyRealismConstraints(meals: Meal[]): Meal[] {
    return meals.map(meal => {
        let items = [...meal.items];
        let overflowCalories = 0; // Calories "lost" when capping ingredients

        // PASO 1: Apply Hard Caps and collect overflow
        items = items.map(item => {
            const cap = getHardCap(item);

            if (item.quantity > cap) {
                const excessGrams = item.quantity - cap;
                // Calculate calories lost: kcal = grams * (energy / 100)
                const savedCalories = excessGrams * (item.food.energia / 100);
                overflowCalories += savedCalories;

                return { ...item, quantity: cap };
            }
            return item;
        });

        // PASO 2: Redistribute overflow calories intelligently
        if (overflowCalories > 10) { // Only redistribute if significant
            // Priority order for redistribution:
            // 1. Dense carbs (arroz, papa, pan) - can absorb more calories
            // 2. Protein sources - if carbs are already at limits
            // 3. Any remaining ingredient proportionally

            const redistributionTargets = items
                .filter(item => {
                    const cap = getHardCap(item);
                    const headroom = cap - item.quantity;
                    // Only consider items with at least 20g of headroom
                    return headroom >= 20 && item.food.energia > 0;
                })
                .sort((a, b) => {
                    // Prioritize dense carbs
                    const aIsDenseCarb = ['arroz', 'papa', 'pan', 'fideo', 'quinua'].some(
                        term => a.food.nombre.toLowerCase().includes(term)
                    );
                    const bIsDenseCarb = ['arroz', 'papa', 'pan', 'fideo', 'quinua'].some(
                        term => b.food.nombre.toLowerCase().includes(term)
                    );
                    if (aIsDenseCarb && !bIsDenseCarb) return -1;
                    if (!aIsDenseCarb && bIsDenseCarb) return 1;

                    // Then prioritize by energy density (more efficient absorption)
                    return b.food.energia - a.food.energia;
                });

            // Distribute overflow across targets
            for (const target of redistributionTargets) {
                if (overflowCalories <= 0) break;

                const cap = getHardCap(target);
                const headroom = cap - target.quantity;

                // How many grams can we add to this target?
                const maxGramsToAdd = headroom;

                // How many grams would absorb remaining overflow?
                const gramsNeeded = (overflowCalories * 100) / target.food.energia;

                // Add the minimum of what we need and what's available
                const gramsToAdd = Math.min(maxGramsToAdd, gramsNeeded);

                if (gramsToAdd > 0) {
                    target.quantity += gramsToAdd;
                    const absorbedCalories = gramsToAdd * (target.food.energia / 100);
                    overflowCalories -= absorbedCalories;
                }
            }
        }

        // PASO 3: Ensure no item exceeds its hard cap after redistribution
        items = items.map(item => {
            const cap = getHardCap(item);
            if (item.quantity > cap) {
                return { ...item, quantity: cap };
            }
            return item;
        });

        return { ...meal, items };
    });
}

// --- CALORIC CALIBRATION SYSTEM ---
// Constants for calibration tolerance
const CALORIE_TOLERANCE_MIN = 0.95; // 95% of target
const CALORIE_TOLERANCE_MAX = 1.05; // 105% of target

// Patterns for identifying scalable vs fixed ingredients
const SCALABLE_CARB_PATTERNS = ['arroz', 'papa', 'camote', 'avena', 'fideo', 'quinua', 'yuca', 'pan', 'menestra', 'lenteja', 'frejol'];
const SCALABLE_PROTEIN_PATTERNS = ['pollo', 'res', 'carne', 'pescado', 'atun', 'pavita', 'lomo', 'bistec', 'cerdo'];
const FIXED_INGREDIENT_PATTERNS = ['aceite', 'ajo', 'sal', 'pimienta', 'oregano', 'comino', 'limon', 'vinagre'];

/**
 * Determines if a MealItem is "scalable" for calorie calibration.
 * Scalable ingredients are dense carbs and main proteins that can be adjusted.
 * Fixed ingredients (oils, condiments, small portions, whole units) are NOT scaled.
 */
function isScalableIngredient(item: MealItem): boolean {
    const foodName = item.food.nombre.toLowerCase();

    // Rule 1: Never scale items < 15g (likely condiments or small additions)
    if (item.quantity < 15) {
        return false;
    }

    // Rule 2: Never scale fixed ingredients (oils, condiments)
    if (FIXED_INGREDIENT_PATTERNS.some(pattern => foodName.includes(pattern))) {
        return false;
    }

    // Rule 3: Never scale fats category (aceites)
    if (item.category === 'grasa') {
        return false;
    }

    // Rule 4: Never scale whole eggs (they come in units)
    if (foodName.includes('huevo') && item.quantity <= 60) {
        return false; // ~1 egg, treat as a fixed unit
    }

    // Rule 5: Check if it's a scalable dense carb
    const isDenseCarb = SCALABLE_CARB_PATTERNS.some(pattern => foodName.includes(pattern));
    if (isDenseCarb) {
        return true;
    }

    // Rule 6: Check if it's a main protein source
    const isMainProtein = SCALABLE_PROTEIN_PATTERNS.some(pattern => foodName.includes(pattern));
    if (isMainProtein) {
        return true;
    }

    // Rule 7: Category-based fallback for proteins and carbs with sufficient quantity
    if ((item.category === 'proteina' || item.category === 'carbohidrato') && item.quantity >= 50) {
        return true;
    }

    return false;
}

/**
 * Calculate the current caloric sum of all meals in the plan.
 */
function calculateTotalCalories(meals: Meal[]): number {
    return meals.reduce((total, meal) => {
        return total + meal.items.reduce((mealTotal, item) => {
            return mealTotal + (item.food.energia * item.quantity / 100);
        }, 0);
    }, 0);
}

/**
 * Main Calibration Function: Adjusts scalable ingredients proportionally
 * to bring the total daily calories within 95-105% of the target.
 */
function calibrateDailyPlan(meals: Meal[], targetCalories: number): Meal[] {
    const currentTotal = calculateTotalCalories(meals);
    const minAllowed = targetCalories * CALORIE_TOLERANCE_MIN;
    const maxAllowed = targetCalories * CALORIE_TOLERANCE_MAX;

    // Step 1: Check if already within tolerance
    if (currentTotal >= minAllowed && currentTotal <= maxAllowed) {
        return meals; // No calibration needed
    }

    // Step 2: Calculate correction factor
    const correctionFactor = targetCalories / currentTotal;

    // Step 3: Clone meals and identify all scalable ingredients
    const calibratedMeals = meals.map(meal => ({
        ...meal,
        items: meal.items.map(item => ({ ...item }))
    }));

    // Step 4: Apply correction factor to scalable ingredients
    for (const meal of calibratedMeals) {
        for (const item of meal.items) {
            if (isScalableIngredient(item)) {
                // Calculate new quantity with correction factor
                let newQuantity = item.quantity * correctionFactor;

                // Apply bounds: minimum 30g, maximum from hard cap
                const cap = getHardCap(item);
                newQuantity = Math.max(30, Math.min(cap, newQuantity));

                // Round to nearest 5g for aesthetic portions
                newQuantity = Math.round(newQuantity / 5) * 5;

                item.quantity = newQuantity;
            }
        }
    }

    // Step 5: Recalculate and verify
    const newTotal = calculateTotalCalories(calibratedMeals);

    // Step 6: If still outside tolerance (edge case), return calibrated anyway
    // The force adjustment in generateSmartDailyPlan will handle extreme cases
    if (newTotal < minAllowed || newTotal > maxAllowed) {
        console.log(`[Calibration] After initial pass: ${Math.round(newTotal)} kcal (target: ${targetCalories}). Needs force adjustment.`);
    } else {
        console.log(`[Calibration] Success: ${Math.round(currentTotal)} -> ${Math.round(newTotal)} kcal (target: ${targetCalories})`);
    }

    return calibratedMeals;
}

/**
 * Force adjustment on carbs when calibration couldn't fully correct the deviation.
 * This is the last resort to ensure mathematical accuracy.
 * Now searches across ALL meals if lunch adjustment isn't sufficient.
 */
function forceAdjustLunchCarb(meals: Meal[], targetCalories: number): Meal[] {
    const currentTotal = calculateTotalCalories(meals);
    let calorieGap = targetCalories - currentTotal;
    const minAllowed = targetCalories * CALORIE_TOLERANCE_MIN;
    const maxAllowed = targetCalories * CALORIE_TOLERANCE_MAX;

    // Only act if still outside tolerance
    if (currentTotal >= minAllowed && currentTotal <= maxAllowed) {
        return meals;
    }

    // Clone for modification
    const adjustedMeals = meals.map(meal => ({
        ...meal,
        items: meal.items.map(item => ({ ...item }))
    }));

    // Priority order: Lunch > Dinner > Breakfast > Snack
    const mealPriority = ['almuerzo', 'cena', 'desayuno', 'colación'];
    const carbPatterns = ['arroz', 'papa', 'quinua', 'fideo', 'camote', 'avena', 'pan', 'yuca'];

    // Try to find and adjust carbs in priority order
    for (const mealPattern of mealPriority) {
        if (Math.abs(calorieGap) < 10) break; // Close enough

        const mealIndex = adjustedMeals.findIndex(m => m.name.toLowerCase().includes(mealPattern));
        if (mealIndex === -1) continue;

        const meal = adjustedMeals[mealIndex];

        // Find main carbs in this meal
        const mainCarbs = meal.items.filter(item =>
            item.category === 'carbohidrato' &&
            carbPatterns.some(term => item.food.nombre.toLowerCase().includes(term)) &&
            item.food.energia > 0
        );

        for (const carb of mainCarbs) {
            if (Math.abs(calorieGap) < 10) break;

            // Calculate grams needed to close the gap
            const gramsNeeded = (calorieGap * 100) / carb.food.energia;
            const cap = getHardCap(carb);
            const minQty = 40;

            // Calculate how much we can actually adjust
            const maxAddable = cap - carb.quantity;
            const maxRemovable = carb.quantity - minQty;

            let actualGramsChange = gramsNeeded;
            if (gramsNeeded > 0) {
                // Need to add
                actualGramsChange = Math.min(gramsNeeded, maxAddable);
            } else {
                // Need to remove
                actualGramsChange = Math.max(gramsNeeded, -maxRemovable);
            }

            if (Math.abs(actualGramsChange) >= 5) {
                carb.quantity += actualGramsChange;
                carb.quantity = Math.round(carb.quantity / 5) * 5;
                const caloriesAdjusted = actualGramsChange * (carb.food.energia / 100);
                calorieGap -= caloriesAdjusted;
            }
        }
    }

    // Fallback: If still outside tolerance, try to adjust ANY carb in ANY meal
    const newTotal = calculateTotalCalories(adjustedMeals);
    if (newTotal < minAllowed || newTotal > maxAllowed) {
        const remainingGap = targetCalories - newTotal;

        // Find all adjustable carbs across all meals
        for (const meal of adjustedMeals) {
            for (const item of meal.items) {
                if (Math.abs(remainingGap) < 10) break;

                if (item.category === 'carbohidrato' && item.food.energia > 0) {
                    const cap = getHardCap(item);
                    const gramsNeeded = (remainingGap * 100) / item.food.energia;

                    if (remainingGap > 0 && item.quantity < cap) {
                        const addable = Math.min(gramsNeeded, cap - item.quantity);
                        item.quantity += addable;
                        item.quantity = Math.round(item.quantity / 5) * 5;
                    } else if (remainingGap < 0 && item.quantity > 40) {
                        const removable = Math.min(Math.abs(gramsNeeded), item.quantity - 40);
                        item.quantity -= removable;
                        item.quantity = Math.round(item.quantity / 5) * 5;
                    }
                }
            }
        }
    }

    const finalTotal = calculateTotalCalories(adjustedMeals);
    if (finalTotal >= minAllowed && finalTotal <= maxAllowed) {
        console.log(`[ForceAdjust] Success: ${Math.round(currentTotal)} -> ${Math.round(finalTotal)} kcal (target: ${targetCalories})`);
    } else {
        console.warn(`[ForceAdjust] Could not fully calibrate: ${Math.round(finalTotal)} kcal (target: ${targetCalories}, allowed: ${Math.round(minAllowed)}-${Math.round(maxAllowed)})`);
    }

    return adjustedMeals;
}

