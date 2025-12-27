/**
 * Shopping List Generator
 * Consolida todos los ingredientes de un plan semanal en una lista de compras práctica
 */

import { DailyPlan, MealItem } from './diet-generator';
import { Category } from './peruvian-recipes';

export interface ShoppingItem {
    name: string;
    totalQuantityRaw: number;      // Cantidad total en gramos (peso crudo)
    totalQuantityCooked: number;   // Cantidad total cocida (para referencia)
    unit: string;                  // Unidad de medida práctica
    practicalQuantity: string;     // Ej: "1.5 kg", "12 unidades"
    category: Category;
    occurrences: number;           // En cuántas comidas aparece
}

export interface ShoppingListSection {
    title: string;
    emoji: string;
    items: ShoppingItem[];
    color: [number, number, number]; // RGB para PDF
}

// Conversiones a unidades prácticas
const UNIT_CONVERSIONS: Record<string, { unit: string; gramsPerUnit: number }> = {
    // Proteínas
    'pollo': { unit: 'kg', gramsPerUnit: 1000 },
    'pechuga': { unit: 'kg', gramsPerUnit: 1000 },
    'carne': { unit: 'kg', gramsPerUnit: 1000 },
    'res': { unit: 'kg', gramsPerUnit: 1000 },
    'pescado': { unit: 'kg', gramsPerUnit: 1000 },
    'atún': { unit: 'latas', gramsPerUnit: 170 },
    'huevo': { unit: 'unidades', gramsPerUnit: 60 },
    'huevos': { unit: 'unidades', gramsPerUnit: 60 },

    // Carbohidratos
    'arroz': { unit: 'kg', gramsPerUnit: 1000 },
    'papa': { unit: 'kg', gramsPerUnit: 1000 },
    'camote': { unit: 'kg', gramsPerUnit: 1000 },
    'fideos': { unit: 'paquetes (500g)', gramsPerUnit: 500 },
    'avena': { unit: 'kg', gramsPerUnit: 1000 },
    'pan': { unit: 'unidades', gramsPerUnit: 40 },
    'quinua': { unit: 'kg', gramsPerUnit: 1000 },

    // Lácteos
    'leche': { unit: 'litros', gramsPerUnit: 1000 },
    'yogurt': { unit: 'litros', gramsPerUnit: 1000 },
    'queso': { unit: 'kg', gramsPerUnit: 1000 },

    // Vegetales
    'tomate': { unit: 'kg', gramsPerUnit: 1000 },
    'cebolla': { unit: 'kg', gramsPerUnit: 1000 },
    'lechuga': { unit: 'unidades', gramsPerUnit: 300 },
    'espinaca': { unit: 'atados', gramsPerUnit: 250 },
    'brócoli': { unit: 'kg', gramsPerUnit: 1000 },
    'zanahoria': { unit: 'kg', gramsPerUnit: 1000 },
    'pimiento': { unit: 'kg', gramsPerUnit: 1000 },
    'pepino': { unit: 'unidades', gramsPerUnit: 200 },

    // Frutas
    'plátano': { unit: 'unidades', gramsPerUnit: 120 },
    'manzana': { unit: 'unidades', gramsPerUnit: 180 },
    'naranja': { unit: 'unidades', gramsPerUnit: 200 },
    'mandarina': { unit: 'unidades', gramsPerUnit: 80 },
    'papaya': { unit: 'kg', gramsPerUnit: 1000 },
    'piña': { unit: 'unidades', gramsPerUnit: 1500 },

    // Aceites y grasas
    'aceite': { unit: 'litros', gramsPerUnit: 900 },
    'mantequilla': { unit: 'barras (200g)', gramsPerUnit: 200 },
    'palta': { unit: 'unidades', gramsPerUnit: 200 },
    'aguacate': { unit: 'unidades', gramsPerUnit: 200 },
};

// Categorías para organizar la lista (usando tipos correctos del sistema)
const CATEGORY_CONFIG: Record<Category, { title: string; emoji: string; color: [number, number, number] }> = {
    'proteina': { title: 'Proteínas', emoji: '🥩', color: [220, 53, 69] },
    'carbohidrato': { title: 'Carbohidratos', emoji: '🍚', color: [255, 193, 7] },
    'verdura': { title: 'Vegetales', emoji: '🥬', color: [40, 167, 69] },
    'fruta': { title: 'Frutas', emoji: '🍎', color: [255, 133, 8] },
    'lacteo': { title: 'Lácteos', emoji: '🥛', color: [108, 186, 0] },
    'grasa': { title: 'Aceites y Grasas', emoji: '🫒', color: [102, 51, 153] },
    'miscelaneo': { title: 'Otros', emoji: '📦', color: [108, 117, 125] },
};

/**
 * Encuentra la conversión de unidad apropiada para un alimento
 */
function findUnitConversion(foodName: string): { unit: string; gramsPerUnit: number } | null {
    const lowerName = foodName.toLowerCase();

    for (const [keyword, conversion] of Object.entries(UNIT_CONVERSIONS)) {
        if (lowerName.includes(keyword)) {
            return conversion;
        }
    }

    return null;
}

/**
 * Convierte gramos a una cantidad práctica
 */
function toPracticalQuantity(grams: number, foodName: string): string {
    const conversion = findUnitConversion(foodName);

    if (conversion) {
        const quantity = grams / conversion.gramsPerUnit;

        // Redondear a números prácticos
        if (quantity < 1) {
            return `${Math.ceil(quantity * 10) / 10} ${conversion.unit}`;
        } else if (quantity < 10) {
            return `${Math.round(quantity * 2) / 2} ${conversion.unit}`; // Redondear a 0.5
        } else {
            return `${Math.round(quantity)} ${conversion.unit}`;
        }
    }

    // Default: mostrar en gramos o kg
    if (grams >= 1000) {
        return `${(grams / 1000).toFixed(1)} kg`;
    }
    return `${Math.round(grams)} g`;
}

/**
 * Genera la lista de compras consolidada a partir de un plan semanal
 */
export function generateShoppingList(weeklyPlan: DailyPlan[]): ShoppingListSection[] {
    // Mapa para acumular ingredientes
    const ingredientMap = new Map<string, ShoppingItem>();

    // Recorrer todos los días y comidas
    for (const day of weeklyPlan) {
        for (const meal of day.meals) {
            for (const item of meal.items) {
                const key = item.food.nombre.toLowerCase().trim();

                if (ingredientMap.has(key)) {
                    const existing = ingredientMap.get(key)!;
                    existing.totalQuantityRaw += item.quantity;
                    existing.totalQuantityCooked += item.cookedQuantity || item.quantity;
                    existing.occurrences += 1;
                } else {
                    ingredientMap.set(key, {
                        name: item.food.nombre,
                        totalQuantityRaw: item.quantity,
                        totalQuantityCooked: item.cookedQuantity || item.quantity,
                        unit: 'g',
                        practicalQuantity: '',
                        category: item.category,
                        occurrences: 1,
                    });
                }
            }
        }
    }

    // Calcular cantidades prácticas
    for (const item of ingredientMap.values()) {
        item.practicalQuantity = toPracticalQuantity(item.totalQuantityRaw, item.name);
    }

    // Agrupar por categoría
    const sections: ShoppingListSection[] = [];
    const categoryOrder: Category[] = ['proteina', 'carbohidrato', 'verdura', 'fruta', 'lacteo', 'grasa', 'miscelaneo'];

    for (const category of categoryOrder) {
        const config = CATEGORY_CONFIG[category];
        const items = Array.from(ingredientMap.values())
            .filter(item => item.category === category)
            .sort((a, b) => b.totalQuantityRaw - a.totalQuantityRaw); // Mayor cantidad primero

        if (items.length > 0) {
            sections.push({
                title: config.title,
                emoji: config.emoji,
                items,
                color: config.color,
            });
        }
    }

    return sections;
}

/**
 * Genera un resumen de la lista de compras (para mostrar en UI)
 */
export function getShoppingListSummary(sections: ShoppingListSection[]): {
    totalItems: number;
    totalCategories: number;
    estimatedBudget?: string;
} {
    const totalItems = sections.reduce((sum, section) => sum + section.items.length, 0);

    return {
        totalItems,
        totalCategories: sections.length,
    };
}
