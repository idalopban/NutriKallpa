import { Alimento } from "./csv-parser";
import { PERUVIAN_RECIPES, PeruvianRecipe, RecipeComponent, MealType, Category } from "./peruvian-recipes";

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
}

export interface UserPreferences {
    likedFoods: string[];
    dislikedFoods: string[];
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

    return stats;
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

        // 1. Filter Foods based on Preferences (Disliked)
        let filteredFoods = [...availableFoods];

        if (preferences?.dislikedFoods && preferences.dislikedFoods.length > 0) {
            filteredFoods = filteredFoods.filter(f =>
                !preferences.dislikedFoods.some(dislike => f.nombre.toLowerCase().includes(dislike.toLowerCase()))
            );
        }

        // 2. Define Meal Structure & Targets
        const mealTargets: { name: string; type: MealType | 'snack'; ratio: number }[] = [
            { name: 'Desayuno', type: 'desayuno', ratio: 0.25 },
            { name: 'Almuerzo', type: 'almuerzo', ratio: 0.35 },
            { name: 'Cena', type: 'cena', ratio: 0.25 },
            { name: 'Colación', type: 'desayuno', ratio: 0.15 } // Reuse breakfast/light options for snack
        ];

        let meals: Meal[] = [];

        // 3. Generate Each Meal
        mealTargets.forEach(target => {
            const targetCalories = goals.calories * target.ratio;

            // Select a random recipe for this meal type
            const possibleRecipes = PERUVIAN_RECIPES.filter(r => r.mealTypes.includes(target.type as MealType));

            let recipe = getRandom(possibleRecipes);

            // Fallback if no recipe found
            if (!recipe) {
                recipe = getRandom(PERUVIAN_RECIPES);
            }

            if (!recipe) {
                // If absolutely no recipes exist, push empty meal
                meals.push({ name: target.name, items: [] });
                return;
            }

            const mealItems: MealItem[] = [];

            // Calculate Total Ratio Sum for this recipe
            const totalRatio = recipe.ingredients.reduce((sum, ing) => sum + ing.ratio, 0);

            recipe.ingredients.forEach(ing => {
                const food = findBestMatch(ing.searchTerms, filteredFoods, ing.category);

                if (food) {
                    // Formula: CaloriasIngrediente = (TotalMealCalories * Ingrediente.ratio) / SumaDeRatios
                    const ingredientCalories = (targetCalories * ing.ratio) / (totalRatio || 1); // Avoid div by 0

                    // Formula: Gramos = (CaloriasIngrediente / CaloriasPor100g_DelCSV) * 100
                    let grams = 0;
                    if (food.energia > 0) {
                        grams = (ingredientCalories / food.energia) * 100;
                    } else {
                        grams = 50; // Default for 0 calorie items like water/tea
                    }

                    mealItems.push({
                        id: Math.random().toString(36).substr(2, 9),
                        food,
                        quantity: Math.round(grams),
                        category: ing.category
                    });
                }
            });

            meals.push({ name: `${target.name} - ${recipe.name}`, items: mealItems });
        });

        // 4. Capa de Post-Procesamiento (Nutricionista)
        meals = applyRealismConstraints(meals);
        meals = applyNutritionistConstraints(meals);

        // 5. Calculate Final Stats
        const stats = calculateDailyStats(meals);

        return {
            day: dayName,
            meals,
            stats,
            goals
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
    const INGREDIENT_CAPS: Record<string, number> = {
        'verdura': 50,    // Máx 50g de cebolla/tomate por plato (si es aderezo)
        'ajo': 5,         // Máx 5g de ajo
        'grasa': 15,      // Máx 15g de aceite
        'olluco': 250,    // Máx 250g
        'guarnicion': 250 // Máx 250g (se usará lógica dinámica)
    };

    return meals.map(meal => {
        let items = [...meal.items];
        let caloriesPool = 0; // Calorías que "sobran" al recortar

        // PASO 1: Recortar Excesos
        items = items.map(item => {
            // Determinar cap basado en categoría o nombre
            let cap = 1000; // Default alto

            if (item.category === 'verdura') cap = INGREDIENT_CAPS['verdura'];
            if (item.category === 'grasa') cap = INGREDIENT_CAPS['grasa'];

            // Caps específicos por nombre (más prioritario)
            if (item.food.nombre.toLowerCase().includes('ajo')) cap = INGREDIENT_CAPS['ajo'];
            if (item.food.nombre.toLowerCase().includes('olluco')) cap = INGREDIENT_CAPS['olluco'];

            // Caps para carbohidratos densos (Arroz/Papa) para evitar platos de 400g
            if (item.category === 'carbohidrato') cap = INGREDIENT_CAPS['guarnicion'];

            if (item.quantity > cap) {
                const excessGrams = item.quantity - cap;
                // Calories saved = excess grams * (kcal/100g / 100) -> NO, kcal per 100g.
                // Kcal = grams * (energy / 100)
                const savedCalories = excessGrams * (item.food.energia / 100);
                caloriesPool += savedCalories;

                return { ...item, quantity: cap };
            }
            return item;
        });

        // PASO 2: Redistribuir al "Carbohidrato Denso" o "Proteína"
        // Buscamos el ingrediente más capaz de absorber calorías (Arroz > Papa > Pan)
        const denseCarb = items.find(i =>
            i.category === 'carbohidrato' &&
            (i.food.nombre.toLowerCase().includes('arroz') ||
                i.food.nombre.toLowerCase().includes('papa') ||
                i.food.nombre.toLowerCase().includes('pan'))
        );

        if (denseCarb && caloriesPool > 0) {
            // Convertimos las calorías sobrantes en gramos de ese carbohidrato
            // New Grams = Calories / (Energy / 100)
            if (denseCarb.food.energia > 0) {
                const addedGrams = caloriesPool / (denseCarb.food.energia / 100);
                // Actualizamos el item en el array
                denseCarb.quantity += addedGrams;
            }
        }

        return { ...meal, items };
    });
}
