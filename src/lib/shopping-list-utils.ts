import { DailyPlan } from "./diet-generator";

type WeeklyPlan = DailyPlan[];

export interface ShoppingItem {
    name: string;
    category: string;
    quantity: number;
    unit: string;
    checked: boolean;
    householdMeasure?: string;
}

export interface ShoppingCategory {
    name: string;
    items: ShoppingItem[];
}

const HOUSEHOLD_UNITS: Record<string, { unit: string, weight: number }> = {
    // Frutas
    'huevo': { unit: 'u', weight: 60 },
    'plátano': { unit: 'u', weight: 150 },
    'banana': { unit: 'u', weight: 150 },
    'manzana': { unit: 'u', weight: 150 },
    'naranja': { unit: 'u', weight: 200 },
    'mandarina': { unit: 'u', weight: 100 },
    'durazno': { unit: 'u', weight: 120 },
    'pera': { unit: 'u', weight: 150 },
    'limon': { unit: 'u', weight: 40 },
    'palta': { unit: 'u', weight: 200 },
    'kiwi': { unit: 'u', weight: 80 },
    'granadilla': { unit: 'u', weight: 100 },
    'tuna': { unit: 'u', weight: 100 },
    'mango': { unit: 'u', weight: 300 },
    'papaya': { unit: 'u peq', weight: 1500 },
    'piña': { unit: 'u med', weight: 2000 },
    'fresa': { unit: 'taza', weight: 150 },
    'arandano': { unit: 'taza', weight: 150 },
    'uva': { unit: 'taza', weight: 150 },

    // Verduras y Tubérculos
    'papa': { unit: 'u med', weight: 150 },
    'camote': { unit: 'u med', weight: 150 },
    'yuca': { unit: 'trozo', weight: 200 },
    'choclo': { unit: 'u', weight: 300 },
    'cebolla': { unit: 'u med', weight: 100 },
    'zanahoria': { unit: 'u med', weight: 80 },
    'tomate': { unit: 'u med', weight: 100 },
    'pepino': { unit: 'u', weight: 200 },
    'pimiento': { unit: 'u', weight: 150 },
    'rocoto': { unit: 'u', weight: 80 },
    'aji': { unit: 'u', weight: 15 },
    'vainita': { unit: 'taza', weight: 100 },
    'brócoli': { unit: 'arbolito', weight: 50 },
    'coliflor': { unit: 'arbolito', weight: 50 },
    'zapallo': { unit: 'tajada', weight: 200 },
    'calabaza': { unit: 'tajada', weight: 200 },
    'lechuga': { unit: 'hoja', weight: 20 },
    'espinaca': { unit: 'taza', weight: 60 },
    'acelga': { unit: 'hoja', weight: 30 },
    'apio': { unit: 'tallo', weight: 40 },
    'poro': { unit: 'tallo', weight: 100 },
    'nabo': { unit: 'u peq', weight: 100 },
    'beterraga': { unit: 'u med', weight: 120 },
    'rabanito': { unit: 'u', weight: 20 },
    'ajo': { unit: 'diente', weight: 5 },
    'kion': { unit: 'trozo', weight: 10 },
    'jengibre': { unit: 'trozo', weight: 10 },
    'culantro': { unit: 'atado', weight: 50 },
    'perejil': { unit: 'atado', weight: 50 },
    'huacatay': { unit: 'atado', weight: 50 },
    'hierbabuena': { unit: 'atado', weight: 50 },
    'albahaca': { unit: 'atado', weight: 50 },

    // Pan y Cereales
    'pan': { unit: 'u', weight: 40 },
    'tostada': { unit: 'u', weight: 15 },
    'galleta': { unit: 'paquete', weight: 30 },
    'arroz': { unit: 'taza', weight: 200 },
    'avena': { unit: 'taza', weight: 90 },
    'quinua': { unit: 'taza', weight: 170 },
    'trigo': { unit: 'taza', weight: 180 },
    'fideos': { unit: 'taza', weight: 100 },
    'pasta': { unit: 'taza', weight: 100 },
    'lenteja': { unit: 'taza', weight: 200 },
    'frijol': { unit: 'taza', weight: 200 },
    'pallap': { unit: 'taza', weight: 200 },
    'garbanzo': { unit: 'taza', weight: 200 },

    // Proteínas
    'pechuga de pollo': { unit: 'filete', weight: 150 },
    'pollo': { unit: 'presa', weight: 120 },
    'pavita': { unit: 'filete', weight: 150 },
    'bisteck': { unit: 'bisteck', weight: 120 },
    'carne': { unit: 'taza', weight: 150 },
    'molida': { unit: 'taza', weight: 150 },
    'chuleta': { unit: 'unidad', weight: 150 },
    'pescado': { unit: 'filete', weight: 150 },
    'atun': { unit: 'lata', weight: 170 },
    'queso': { unit: 'tajada', weight: 30 },
    'jamon': { unit: 'tajada', weight: 20 },
    'jamonada': { unit: 'tajada', weight: 20 },

    // Lácteos y Líquidos
    'leche': { unit: 'taza', weight: 240 },
    'yogurt': { unit: 'taza', weight: 240 },
    'bebida': { unit: 'taza', weight: 240 },
    'agua': { unit: 'vaso', weight: 250 },

    // Grasas y Varios
    'aceite': { unit: 'cda', weight: 15 },
    'mantequilla': { unit: 'cdta', weight: 5 },
    'margarina': { unit: 'cdta', weight: 5 },
    'mayonesa': { unit: 'cdta', weight: 10 },
    'mostaza': { unit: 'cdta', weight: 10 },
    'ketchup': { unit: 'cdta', weight: 10 },
    'azucar': { unit: 'cdta', weight: 5 },
    'miel': { unit: 'cdta', weight: 7 },
    'sal': { unit: 'pizca', weight: 1 },
    'pecana': { unit: 'unid', weight: 2 },
    'nuez': { unit: 'unid', weight: 3 },
    'almendra': { unit: 'unid', weight: 1 },
    'aceituna': { unit: 'unid', weight: 5 },
};

export function generateShoppingList(weeklyPlan: WeeklyPlan): ShoppingCategory[] {
    const itemMap = new Map<string, ShoppingItem>();

    // 1. Iterate through all meals in the week
    weeklyPlan.forEach(dayPlan => {
        dayPlan.meals.forEach(meal => {
            meal.items.forEach(item => {
                const key = item.food.nombre.toLowerCase(); // Simple normalization

                // Calculate gross weight (buying weight)
                // If the item has a waste factor, use it. Otherwise assume 1.0 (no waste)
                // Default factorDesecho is usually > 1 (e.g. 1.2 for potato peel)
                // If it's stored as < 1 in DB (yield), invert logic. 
                // Assuming standard factor (e.g. 1.1 = 10% waste).
                const wasteFactor = item.food.factorDesecho || 1.0;
                const buyingQuantity = item.quantity * wasteFactor;

                if (itemMap.has(key)) {
                    const existing = itemMap.get(key)!;
                    existing.quantity += buyingQuantity;
                } else {
                    itemMap.set(key, {
                        name: item.food.nombre,
                        category: item.category || 'Otros',
                        quantity: buyingQuantity,
                        unit: 'g', // Standardize to grams for now
                        checked: false
                    });
                }
            });
        });
    });

    // 2. Normalize and Format Items
    const items = Array.from(itemMap.values()).map(item => {
        // Ensure at least 1g if it exists
        if (item.quantity > 0 && item.quantity < 1) {
            item.quantity = 1;
        } else {
            item.quantity = Math.ceil(item.quantity);
        }

        // --- HOUSEHOLD MEASURE CALCULATION ---
        const lowerName = item.name.toLowerCase();
        // Find matching key in HOUSEHOLD_UNITS
        const householdKey = Object.keys(HOUSEHOLD_UNITS).find(k => lowerName.includes(k));

        if (householdKey) {
            const measure = HOUSEHOLD_UNITS[householdKey];
            const units = item.quantity / measure.weight;

            // Round to 1 decimal place
            const formattedUnits = Math.round(units * 10) / 10;

            // Only show if >= 0.1 to avoid "≈ 0.0 units"
            if (formattedUnits >= 0.1) {
                item.householdMeasure = `≈ ${formattedUnits} ${measure.unit}`;
            }
        }

        // Convert large quantities to kg
        if (item.quantity >= 1000) {
            item.quantity = Number((item.quantity / 1000).toFixed(2));
            item.unit = 'kg';
        }

        return item;
    });

    // 3. Group by Category
    const categoryMap = new Map<string, ShoppingItem[]>();
    items.forEach(item => {
        const cat = normalizeCategory(item.category);
        if (!categoryMap.has(cat)) {
            categoryMap.set(cat, []);
        }
        categoryMap.get(cat)!.push(item);
    });

    // 4. Sort Categories and Items
    const sortedCategories: ShoppingCategory[] = [];
    const preferredOrder = ['Vegetales', 'Frutas', 'Carnes y Proteínas', 'Lácteos', 'Cereales y Tubérculos', 'Grasas', 'Otros'];

    preferredOrder.forEach(catName => {
        if (categoryMap.has(catName)) {
            sortedCategories.push({
                name: catName,
                items: categoryMap.get(catName)!.sort((a, b) => a.name.localeCompare(b.name))
            });
            categoryMap.delete(catName);
        }
    });

    // Add remaining categories
    categoryMap.forEach((items, name) => {
        sortedCategories.push({
            name: name,
            items: items.sort((a, b) => a.name.localeCompare(b.name))
        });
    });

    return sortedCategories;
}

function normalizeCategory(cat: string): string {
    const map: Record<string, string> = {
        'vegetal': 'Vegetales',
        'verdura': 'Vegetales',
        'fruta': 'Frutas',
        'carne': 'Carnes y Proteínas',
        'pollo': 'Carnes y Proteínas',
        'pescado': 'Carnes y Proteínas',
        'huevo': 'Carnes y Proteínas',
        'proteina': 'Carnes y Proteínas', // Fix for generic proteins
        'lacteo': 'Lácteos',
        'cereal': 'Cereales y Tubérculos',
        'tuberculo': 'Cereales y Tubérculos',
        'menestra': 'Cereales y Tubérculos',
        'carbohidrato': 'Cereales y Tubérculos', // Fix for generic carbs
        'grasa': 'Grasas',
        'aceite': 'Grasas',
        'fruto_seco': 'Grasas',
        'bebida': 'Bebidas e Infusiones',
        'suplemento': 'Suplementos'
    };
    return map[cat] || 'Otros';
}
