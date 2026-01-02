import { Alimento } from "./csv-parser";
import { roundCalories, roundMacro, roundMicro } from "./csv-parser";
import { PERUVIAN_RECIPES, PeruvianRecipe, RecipeComponent, MealType, Category, FITNESS_DESSERT_RECIPES, TextureLevel, getCookingLossFactor, PreparationMethod, getSmartYieldFactor } from "./peruvian-recipes";
import { Pathologies, MealMomentConfig } from "@/types";
import { TrainingIntensity, calculatePeriodizedMacros, SportCategory } from "./sports-periodization";
import { getMedicationWarnings, checkFoodDrugInteraction } from "./drug-food-interactions";

// --- TYPES ---

export interface MealItem {
    id: string; // Unique ID for UI handling
    food: Alimento;
    quantity: number; // grams (net weight 'Peso Neto' for nutrients)
    grossQuantity?: number; // grams (gross weight 'Peso Bruto' for preparation/shopping)
    wasteFactor?: number; // derived from food.factorDesecho
    cookedQuantity?: number; // grams after cooking loss applied
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
    proteinBasisLabel?: string; // e.g. "Peso Total (Atleta)"
    proteinWarning?: string; // clinical alert
    // Sports periodization fields
    trainingIntensity?: TrainingIntensity;
    sportCategory?: SportCategory;
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
    periodizationInfo?: { // NEW: Include periodization context
        intensity: TrainingIntensity;
        carbsGKg?: number;
        proteinGKg?: number;
    };
}

export interface UserPreferences {
    likedFoods: string[];
    dislikedFoods: string[];
    pathologies?: string[]; // Audit Fix: Medical Constraints
    allergies?: AllergyEntrySimple[]; // Allergies with severity
    // NEW: Texture modification for dysphagia patients (IDDSI Framework)
    textureRequirement?: TextureLevel;
    // NEW: Sports periodization support
    trainingIntensity?: TrainingIntensity;
    sportCategory?: SportCategory;
    bodyWeightKg?: number; // For g/kg calculations
    age?: number; // Clinical Audit: Needed for pediatric safeguards
    // AUDIT FIX: Medication-food interaction support
    medications?: string[]; // List of current medications
    // AUDIT FIX: Insulin timing for diabetics
    insulinType?: 'rapida' | 'ultrarapida' | 'ninguna';
    // AUDIT FIX: Patient type for gastric volume validation
    patientType?: 'adulto' | 'geriatrico' | 'pediatrico';
    // NEW: Dynamic Meal Management
    mealMoments?: MealMomentConfig[];
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

/**
 * Filters foods based on IDDSI Texture Requirements (Dysphagia Safety).
 * @param foods - Available foods
 * @param texture - Required texture level
 * @returns Filtered foods and safety warnings
 */
function filterByTexture(
    foods: Alimento[],
    texture: TextureLevel
): { filtered: Alimento[], warnings: string[] } {
    let filtered = [...foods];
    const warnings: string[] = [];

    // Protocolos de Seguridad IDDSI
    // Protocolos de Seguridad IDDSI
    if (texture === 'puree' || texture === 'minced') {
        // Excluir sólidos duros, fibrosos, con piel, o riesgo de atragantamiento
        const UNSAFE_TERMS = [
            'manzana', 'pera', 'piña', 'naranja', 'mandarina', // Frutas duras/fibrosas o con hollejo
            'bistec', 'lomo', 'carne', 'pollo entero', 'trozo', // Carnes fibrosas
            'nuez', 'pecana', 'almendra', 'mani', 'cacahuete', 'avellana', 'frutos secos', // Frutos secos (Alto riesgo)
            'tostada', 'galleta', 'pan crocis', 'cancha', // Secos/Crujientes
            'choclo', 'maiz', 'mote', // Granos enteros con piel
            'lechuga', 'apio', 'zanahoria cruda' // Verduras crudas duras
        ];

        const initialCount = filtered.length;
        filtered = filtered.filter(f => {
            const name = f.nombre.toLowerCase();
            return !UNSAFE_TERMS.some(term => name.includes(term));
        });

        if (filtered.length < initialCount) {
            warnings.push(`🛡️ Protocolo Disfagia (${texture}): Se excluyeron ${initialCount - filtered.length} alimentos de alto riesgo.`);
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

// --- COOKING LOSS CALCULATION ---

/**
 * Calculate the cooked quantity from raw quantity using cooking loss factors
 */
export function calculateCookedQuantity(
    rawQuantity: number,
    category: Category,
    foodName: string,
    preparationMethod: PreparationMethod = 'boiled'
): number {
    const factor = getSmartYieldFactor(foodName, category, preparationMethod);
    return Math.round(rawQuantity * factor);
}

/**
 * Calculate the gross quantity (Peso Bruto) from net quantity using waste factor
 * @param netQuantity - Net weight in grams
 * @param wasteFactor - Food waste factor (e.g. 1.25 for 20% waste)
 * @returns Gross weight in grams
 */
export function calculateGrossQuantity(netQuantity: number, wasteFactor: number = 1.0): number {
    return Math.round(netQuantity * (wasteFactor || 1.0));
}

/**
 * Apply bromatology factors (waste and cooking) to all items in a meal
 */
export function applyBromatologyFactors(
    items: MealItem[],
    defaultMethod: PreparationMethod = 'boiled'
): MealItem[] {
    return items.map(item => {
        // 1. Waste Factor (Net to Gross)
        const wasteFactor = item.food.factorDesecho || 1.0;
        const grossQuantity = calculateGrossQuantity(item.quantity, wasteFactor);

        // 2. Cooking Factor (Raw to Cooked)
        // Categories typically eaten raw
        const rawCategories: Category[] = ['fruta', 'lacteo', 'grasa'];
        let cookedQuantity = item.quantity;

        if (!rawCategories.includes(item.category)) {
            cookedQuantity = calculateCookedQuantity(item.quantity, item.category, item.food.nombre, defaultMethod);
        }

        return {
            ...item,
            wasteFactor,
            grossQuantity,
            cookedQuantity
        };
    });
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
        // ALWAYS use raw weight (item.quantity) for nutritional calculations 
        // to match the Food Composition Table (TPCA) which uses raw edible portion.
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
    // BLACKLIST: Forbidden words for solid ingredients
    const BLACKLIST = ['Chicha', 'Bebida', 'Harina', 'Masato', 'Nectar', 'Jugo', 'Refresco'];

    let candidates = availableFoods;

    // Apply Blacklist for solid food groups
    if (category && ['proteina', 'carbohidrato', 'verdura', 'fruta'].includes(category)) {
        candidates = candidates.filter(f => {
            const name = f.nombre.toLowerCase();
            return !BLACKLIST.some(b => name.includes(b.toLowerCase()));
        });
    }

    for (const term of searchTerms) {
        const query = term.toLowerCase().trim();

        // 1. Try exact match (highest priority)
        let match = candidates.find(f => f.nombre.toLowerCase() === query);
        if (match) return match;

        // 2. Try includes with priority rules (Audit Fix: Semantic Ambiguity)
        const matches = candidates.filter(f => f.nombre.toLowerCase().includes(query));

        if (matches.length > 0) {
            if (matches.length === 1) return matches[0];

            // Priority Rules:
            // "Papa" -> "Blanca" (most common)
            if (query === 'papa') {
                const blanca = matches.find(m => m.nombre.toLowerCase().includes('blanca'));
                if (blanca) return blanca;
            }
            // "Arroz" -> "Blanco" (not integral, not harina)
            if (query === 'arroz') {
                const blanco = matches.find(m => m.nombre.toLowerCase().includes('blanco') && !m.nombre.toLowerCase().includes('integral'));
                if (blanco) return blanco;
            }
            // "Pollo" -> "Pechuga" (standard lean protein)
            if (query === 'pollo') {
                const pechuga = matches.find(m => m.nombre.toLowerCase().includes('pechuga'));
                if (pechuga) return pechuga;
            }

            // If no rule matches, pick the one with the shortest name (usually the base ingredient)
            return matches.sort((a, b) => a.nombre.length - b.nombre.length)[0];
        }

        // 3. Try regex if term contains |
        if (term.includes('|')) {
            try {
                const regex = new RegExp(term, 'i');
                match = candidates.find(f => regex.test(f.nombre));
                if (match) return match;
            } catch (e) { }
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

        // QA Fix: Validate minimum safe calorie threshold (Adjusted for Pediatrics)
        const MIN_SAFE_CALORIES = 400; // Lowered to support infants
        if (goals.calories < MIN_SAFE_CALORIES) {
            safetyWarnings.push(`🔴 ALERTA: Meta calórica (${goals.calories} kcal) por debajo del mínimo vital (${MIN_SAFE_CALORIES} kcal). Riesgo de déficit peligroso.`);
        }

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

        // D. FILTER: TEXTURE / DYSPHAGIA (Geriatric Safety)
        if (preferences?.textureRequirement && preferences.textureRequirement !== 'normal') {
            const textureResult = filterByTexture(filteredFoods, preferences.textureRequirement);
            filteredFoods = textureResult.filtered;
            safetyWarnings.push(...textureResult.warnings);
        }

        // QA Fix: PEDIATRIC GROWTH SAFETY (Age < 12)
        // Ensure no caloric deficit is applied to pre-pubertal children to avoid stunting
        if (preferences?.age !== undefined && preferences.age < 12) {
            // Assuming we don't have TDEE here directly easily, but we can warn if goal is suspiciously low for a growing child
            // Or if we had TDEEPassed in, we could compare. 
            // For now, general warning if calories < 1200 for a non-infant (e.g. > 1 year)
            if (preferences.age > 1 && goals.calories < 1000) {
                safetyWarnings.push(`⚠️ ATENCIÓN PEDIÁTRICA: Calorías (${goals.calories}) pueden ser insuficientes para crecimiento lineal en niño de ${preferences.age} años.`);
            }
        }

        // E. FILTER: DRUG-FOOD INTERACTIONS (Clinical Audit Fix)
        if (preferences?.medications && preferences.medications.length > 0) {
            // Add general medication warnings
            const medicationWarnings = getMedicationWarnings(preferences.medications);
            safetyWarnings.push(...medicationWarnings);

            // Filter out foods with critical interactions
            const initialCount = filteredFoods.length;
            filteredFoods = filteredFoods.filter(f => {
                const check = checkFoodDrugInteraction(f.nombre, preferences.medications!);
                return check.criticalCount === 0; // Only remove critical interactions
            });
            const removedCount = initialCount - filteredFoods.length;
            if (removedCount > 0) {
                safetyWarnings.push(`💊 Interacción Fármaco-Alimento: ${removedCount} alimentos excluidos por riesgo con medicación actual.`);
            }
        }

        // F. INSULIN TIMING WARNING (Clinical Audit Fix)
        if (preferences?.insulinType && preferences.insulinType !== 'ninguna') {
            const hasDiabetes = preferences.pathologies?.some(p =>
                p.toLowerCase().includes('diabetes')
            );
            if (hasDiabetes) {
                if (preferences.insulinType === 'rapida') {
                    safetyWarnings.push('⏱️ INSULINA RÁPIDA: Administrar 15-20 minutos ANTES de cada comida principal.');
                } else if (preferences.insulinType === 'ultrarapida') {
                    safetyWarnings.push('⏱️ INSULINA ULTRARRÁPIDA (Lispro/Aspart/Glulisina): Administrar 0-5 minutos antes de comer.');
                }
            }
        }

        // 2. Define Meal Structure & Targets
        let mealTargets: { name: string; type: MealType | 'snack'; ratio: number }[] = [];

        if (preferences?.mealMoments && preferences.mealMoments.length > 0) {
            // Filter only enabled moments and map to the required structure
            mealTargets = preferences.mealMoments
                .filter(m => m.enabled)
                .map(m => ({
                    name: m.name,
                    type: m.type as MealType | 'snack',
                    ratio: m.ratio
                }));

            // Safety: If no moments are enabled or ratios don't exist, we need a fallback or sum validation
            if (mealTargets.length === 0) {
                mealTargets = [{ name: 'Comida Única', type: 'almuerzo', ratio: 1.0 }];
            }
        } else {
            // DEFAULT FALLBACK
            mealTargets = [
                { name: 'Desayuno', type: 'desayuno', ratio: 0.25 },
                { name: 'Almuerzo', type: 'almuerzo', ratio: 0.35 },
                { name: 'Cena', type: 'cena', ratio: 0.25 },
                { name: 'Colación', type: 'snack', ratio: 0.15 }
            ];
        }

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
            // First filter by meal type
            let possibleRecipes = allRecipesPool.filter(r => r.mealTypes.includes(target.type as MealType));

            // Filter by medical flags based on patient pathologies
            if (preferences?.pathologies && preferences.pathologies.length > 0) {
                const pathologies = preferences.pathologies.map(p => p.toLowerCase());

                // Hipertensión: Evitar recetas altas en sodio
                if (pathologies.some(p => p.includes('hipertension') || p.includes('renal'))) {
                    const before = possibleRecipes.length;
                    possibleRecipes = possibleRecipes.filter(r => !r.highSodium);
                    if (before !== possibleRecipes.length) {
                        safetyWarnings.push(`🧂 Hipertensión: ${before - possibleRecipes.length} recetas altas en sodio excluidas.`);
                    }
                }

                // Dislipidemia/Obesidad: Evitar recetas altas en grasa
                if (pathologies.some(p => p.includes('dislipidemia') || p.includes('obesidad') || p.includes('cardiovascular'))) {
                    const before = possibleRecipes.length;
                    possibleRecipes = possibleRecipes.filter(r => !r.highFat);
                    if (before !== possibleRecipes.length) {
                        safetyWarnings.push(`🍳 Cardiovascular: ${before - possibleRecipes.length} recetas altas en grasa excluidas.`);
                    }
                }

                // Gota: Evitar recetas altas en purinas
                if (pathologies.some(p => p.includes('gota') || p.includes('hiperuricemia'))) {
                    const before = possibleRecipes.length;
                    possibleRecipes = possibleRecipes.filter(r => !r.highPurine);
                    if (before !== possibleRecipes.length) {
                        safetyWarnings.push(`🦴 Gota: ${before - possibleRecipes.length} recetas altas en purinas excluidas.`);
                    }
                }
            }

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

        // 5. GASTRIC VOLUME PROTECTION (Clinical Audit Fix)
        // Ensure portions fit patient capacity BEFORE final calibration
        const gastricConfigs = {
            maxVolume: preferences?.patientType === 'pediatrico' ? 300 : preferences?.patientType === 'geriatrico' ? 400 : 600,
            patientType: preferences?.patientType || (preferences?.age !== undefined && preferences.age < 18 ? 'pediatrico' : 'adulto')
        };
        meals = ensureGastricVolumeSafety(meals, gastricConfigs.maxVolume);

        // 6. CALORIC CALIBRATION SYSTEM (Precisión Estricta)
        // Step A: Run main calibration on all scalable ingredients
        meals = calibrateDailyPlan(meals, goals.calories);

        // Step B: Force adjustment if still outside tolerance (fallback)
        meals = forceAdjustLunchCarb(meals, goals.calories);

        // 6.5 Apply Bromatology Factors (Waste & Cooking Yield)
        // Audit Fix: Apply AFTER calibration so factors reflect final adjusted quantities
        meals = meals.map(meal => ({
            ...meal,
            items: applyBromatologyFactors(meal.items)
        }));

        // 7. FINAL VALIDATION & WARNINGS
        const patientType = preferences?.patientType ||
            (preferences?.age !== undefined && preferences.age < 18 ? 'pediatrico' :
                preferences?.age !== undefined && preferences.age >= 60 ? 'geriatrico' : 'adulto');
        const maxVolume = preferences?.patientType === 'pediatrico' ? 300 : preferences?.patientType === 'geriatrico' ? 400 : 600;

        meals.forEach(meal => {
            const totalVolume = meal.items.reduce((sum, item) => {
                const effectiveQty = item.cookedQuantity !== undefined ? item.cookedQuantity : item.quantity;
                return sum + effectiveQty * 1.2;
            }, 0);

            if (totalVolume > maxVolume + 50) { // Allow 50ml grace before critical warning
                safetyWarnings.push(
                    `🍽️ VOLUMEN EXCESIVO: ~${Math.round(totalVolume)}ml en ${meal.name.split(' - ')[0]}. El límite para ${patientType} es ${maxVolume}ml. Se recomienda fraccionar.`
                );
            }
        });

        // H. IRON-CALCIUM ABSORPTION INTERACTION (Clinical Audit Fix)
        // Calcium inhibits non-heme iron absorption by up to 50%
        const HIGH_IRON_FOODS = ['carne', 'res', 'higado', 'hígado', 'sangrecita', 'lentejas', 'espinaca', 'frejol', 'garbanzo'];
        const HIGH_CALCIUM_FOODS = ['leche', 'queso', 'yogur', 'yogurt', 'lacteo', 'lácteo'];

        meals.forEach(meal => {
            const mealFoods = meal.items.map(i => i.food.nombre.toLowerCase());

            const hasHighIron = mealFoods.some(food =>
                HIGH_IRON_FOODS.some(term => food.includes(term))
            );
            const hasHighCalcium = mealFoods.some(food =>
                HIGH_CALCIUM_FOODS.some(term => food.includes(term))
            );

            if (hasHighIron && hasHighCalcium) {
                safetyWarnings.push(
                    `🔬 ABSORCIÓN ${meal.name.split(' - ')[0].toUpperCase()}: Hierro + Calcio en la misma comida. El calcio puede reducir absorción de hierro no-hemo hasta 50%. Considerar separar por 2 horas.`
                );
            }
        });

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

    // Rule 1: Never scale items < 10g (likely condiments or small additions)
    // Decreased from 15g to support lower calorie diets (pediatrics)
    if (item.quantity < 10) {
        return false;
    }

    // Rule 3: Never scale small fixed ingredients unless they are significant
    if (FIXED_INGREDIENT_PATTERNS.some(pattern => foodName.includes(pattern)) && item.quantity < 20) {
        return false;
    }

    // Rule 4: Scale fats category only if quantity is significant (>5g)
    if (item.category === 'grasa' && item.quantity < 5) {
        return false;
    }

    // Rule 5: Never scale whole eggs (they come in units)
    if (foodName.includes('huevo') && item.quantity <= 60) {
        return false;
    }

    // Rule 6: Check if it's a scalable dense carb or protein
    const isDenseCarb = SCALABLE_CARB_PATTERNS.some(pattern => foodName.includes(pattern));
    const isMainProtein = SCALABLE_PROTEIN_PATTERNS.some(pattern => foodName.includes(pattern));

    if (isDenseCarb || isMainProtein) return true;

    // Rule 7: General fallback: anything else > 20g is scalable (decreased from 30g)
    if (item.quantity >= 20) return true;

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
    // Use a tighter internal tolerance (±2%) to ensure that after rounding 
    // to 5g increments, we still land within the user-facing ±5% window.
    const INTERNAL_TOLERANCE = 0.02;
    const minAllowed = targetCalories * (1 - INTERNAL_TOLERANCE);
    const maxAllowed = targetCalories * (1 + INTERNAL_TOLERANCE);

    // Final user-facing tolerance as fallback
    const FINAL_MIN = targetCalories * CALORIE_TOLERANCE_MIN;
    const FINAL_MAX = targetCalories * CALORIE_TOLERANCE_MAX;

    if (currentTotal >= minAllowed && currentTotal <= maxAllowed) {
        return meals;
    }

    let calibratedMeals = meals.map(meal => ({
        ...meal,
        items: meal.items.map(item => ({ ...item }))
    }));

    // Increased iterations from 5 to 10 for better convergence
    for (let i = 0; i < 10; i++) {
        const currentTotal = calculateTotalCalories(calibratedMeals);
        if (currentTotal >= minAllowed && currentTotal <= maxAllowed) break;

        const correctionFactor = targetCalories / currentTotal;

        calibratedMeals.forEach(meal => {
            meal.items.forEach(item => {
                if (isScalableIngredient(item)) {
                    let newQuantity = item.quantity * correctionFactor;
                    const cap = getHardCap(item);

                    // Clamp to realistic bounds (15g min for most scalable items)
                    newQuantity = Math.max(15, Math.min(cap, newQuantity));

                    // After 5 iterations, if still notConverged, allow 1g precision for better fit
                    if (i > 5) {
                        item.quantity = Math.round(newQuantity);
                    } else {
                        item.quantity = Math.round(newQuantity / 5) * 5;
                    }
                }
            });
        });
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
        // console.log(`[ForceAdjust] Success: ${Math.round(currentTotal)} -> ${Math.round(finalTotal)} kcal (target: ${targetCalories})`);
    } else {
        // Final desperate measure: scale everything (except tiny/fixed) proportionally
        const desperateFactor = targetCalories / finalTotal;
        adjustedMeals.forEach(meal => {
            meal.items.forEach(item => {
                const name = item.food.nombre.toLowerCase();
                if (item.quantity > 20 && !['sal', 'ajo', 'pimienta'].some(t => name.includes(t))) {
                    item.quantity = Math.round((item.quantity * desperateFactor) / 5) * 5;
                    item.quantity = Math.max(15, item.quantity); // Don't delete
                }
            });
        });
    }

    return adjustedMeals;
}

/**
 * Scales down meals that exceed gastric capacity.
 * Priority: Reducir carbohidratos > proteinas > otros.
 */
function ensureGastricVolumeSafety(meals: Meal[], maxVolume: number): Meal[] {
    return meals.map(meal => {
        let currentVolume = meal.items.reduce((sum, item) => {
            const qty = item.cookedQuantity !== undefined ? item.cookedQuantity : item.quantity;
            return sum + qty * 1.2;
        }, 0);

        if (currentVolume <= maxVolume + 20) return meal;

        const factor = maxVolume / currentVolume;

        // Scale only scalable items to maintain volume safety
        const scaledItems = meal.items.map(item => {
            if (isScalableIngredient(item)) {
                return { ...item, quantity: Math.round((item.quantity * factor) / 5) * 5 };
            }
            return item;
        });

        return { ...meal, items: scaledItems };
    });
}

