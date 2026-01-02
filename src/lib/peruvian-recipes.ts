export type MealType = 'desayuno' | 'almuerzo' | 'cena' | 'snack';
export type Category = 'proteina' | 'carbohidrato' | 'grasa' | 'verdura' | 'fruta' | 'lacteo' | 'miscelaneo';

// Texture levels for dysphagia patients (IDDSI Framework inspired)
export type TextureLevel = 'normal' | 'soft' | 'minced' | 'puree' | 'liquid';

// Preparation methods for cooking loss calculation
export type PreparationMethod = 'raw' | 'boiled' | 'grilled' | 'fried' | 'sauteed' | 'baked' | 'steamed';

/**
 * Cooking loss factors by preparation method
 * Factor represents the percentage of weight retained after cooking
 * e.g., 0.75 means 25% weight loss, final portion = raw weight * 0.75
 */
/**
 * Cooking factor represents the conversion from RAW to COOKED weight.
 * - For meats/veggies: Loss (< 1.0) due to water evaporation/drainage.
 * - For dry grains/pasta: Yield (> 1.0) due to water absorption.
 */
export const COOKING_LOSS_FACTORS: Record<PreparationMethod, Record<Category, number>> = {
    raw: { proteina: 1.0, carbohidrato: 1.0, grasa: 1.0, verdura: 1.0, fruta: 1.0, lacteo: 1.0, miscelaneo: 1.0 },
    // Boiled: 
    // - Legumbres/Arroz: x2.5-3.0 expansion
    // - Proteinas: x0.75-0.80 contraction
    // - Tubérculos (Papa/Camote): x1.0 - 1.1 (minimal change)
    boiled: { proteina: 0.80, carbohidrato: 2.6, grasa: 0.95, verdura: 0.85, fruta: 1.0, lacteo: 1.0, miscelaneo: 1.0 },
    grilled: { proteina: 0.75, carbohidrato: 0.90, grasa: 0.70, verdura: 0.80, fruta: 1.0, lacteo: 1.0, miscelaneo: 0.95 },
    fried: { proteina: 0.70, carbohidrato: 0.85, grasa: 0.65, verdura: 0.75, fruta: 0.90, lacteo: 1.0, miscelaneo: 0.90 },
    sauteed: { proteina: 0.75, carbohidrato: 0.95, grasa: 0.80, verdura: 0.85, fruta: 0.95, lacteo: 1.0, miscelaneo: 0.95 },
    baked: { proteina: 0.78, carbohidrato: 0.95, grasa: 0.85, verdura: 0.82, fruta: 0.92, lacteo: 1.0, miscelaneo: 0.95 },
    steamed: { proteina: 0.85, carbohidrato: 2.5, grasa: 0.95, verdura: 0.90, fruta: 1.0, lacteo: 1.0, miscelaneo: 1.0 },
};

/**
 * Get highly precise yield factor based on food name and preparation
 */
export function getSmartYieldFactor(foodName: string, category: Category, method: PreparationMethod): number {
    const name = foodName.toLowerCase();

    // SMART DETECTION: If the food name indicates it's already cooked/prepared, 
    // the yield factor should be 1.0 (no further weight change).
    const isAlreadyPrepared = [
        'cocido', 'cocida', 'hervido', 'hervida', 'asado', 'asada',
        'plancha', 'frito', 'frita', 'horneado', 'horneada', 'vapor',
        'sancochado', 'sancochada', 'guisado', 'guisada'
    ].some(term => name.includes(term));

    if (isAlreadyPrepared) return 1.0;

    const baseFactor = COOKING_LOSS_FACTORS[method]?.[category] ?? 1.0;

    // Special case: Tubers vs Grains (both are carbohidrato)
    if (category === 'carbohidrato' && (method === 'boiled' || method === 'steamed')) {
        const isTuber = ['papa', 'camote', 'yuca', 'olluco'].some(t => name.includes(t));
        if (isTuber) return 1.05; // Tubers don't expand like rice

        const isGrain = ['arroz', 'quinua', 'avena', 'lenteja', 'frejol', 'garbanzo'].some(g => name.includes(g));
        if (isGrain) return 2.8; // Grains expand significantly
    }

    return baseFactor;
}

/**
 * Get the cooking conversion factor (Yield or Loss)
 */
export function getCookingLossFactor(method: PreparationMethod, category: Category): number {
    return COOKING_LOSS_FACTORS[method]?.[category] ?? 1.0;
}

export interface RecipeComponent {
    category: Category;
    searchTerms: string[]; // El sistema buscará en el CSV en este orden hasta encontrar match
    ratio: number; // Peso relativo del ingrediente en el plato (0.0 - 1.0)
    preparationMethod?: PreparationMethod; // For cooking loss calculation
    cookingLossFactor?: number; // Override default factor (0.0 - 1.0)
}

export interface PeruvianRecipe {
    id: string;
    name: string;
    mealTypes: MealType[];
    ingredients: RecipeComponent[];
    textureLevel?: TextureLevel; // For dysphagia filtering, default is 'normal'
    economyTier?: 'budget' | 'moderate' | 'premium'; // For cost-conscious filtering
    // Medical flags for pathology filtering
    highSodium?: boolean;   // For hypertension filtering (marinados, encurtidos, embutidos)
    highFat?: boolean;      // For cardiovascular/obesity filtering (frituras)
    highPurine?: boolean;   // For gout filtering (vísceras, mariscos)
}

// Simplified snack recipe interface for fitness desserts
export interface SnackRecipe {
    name: string;
    type: 'snack';
    ingredients: {
        searchTerms: string[];
        ratio: number;
        category?: Category; // Optional, will be inferred
    }[];
}

export const PERUVIAN_RECIPES: PeruvianRecipe[] = [
    // ==================== DESAYUNOS (VARIEDAD TOTAL) ====================
    {
        id: 'des-pan-sangrecita',
        name: 'Pan con Sangrecita (Combatir Anemia)',
        mealTypes: ['desayuno'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Pan francés', 'Pan'], ratio: 1.0 },
            { category: 'proteina', searchTerms: ['Pollo, sangre cocida', 'Sangre', 'Morcilla'], ratio: 0.8 },
            { category: 'verdura', searchTerms: ['Cebolla china', 'Cebolla'], ratio: 0.2 },
            { category: 'grasa', searchTerms: ['Aceite vegetal'], ratio: 0.1 }
        ],
        highPurine: true // Vísceras - evitar en gota
    },
    {
        id: 'des-pan-palta',
        name: 'Pan con Palta y Huevo',
        mealTypes: ['desayuno'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Pan integral', 'Pan'], ratio: 1.0 },
            { category: 'grasa', searchTerms: ['Palta', 'Aguacate'], ratio: 0.7 },
            { category: 'proteina', searchTerms: ['Huevo', 'Queso'], ratio: 0.5 }
        ]
    },
    {
        id: 'des-pan-chicharron',
        name: 'Pan con Chicharrón Casero',
        mealTypes: ['desayuno'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Pan francés', 'Pan'], ratio: 1.0 },
            { category: 'proteina', searchTerms: ['Cerdo, carne', 'Chancho', 'Cerdo'], ratio: 0.8 },
            { category: 'carbohidrato', searchTerms: ['Camote frito', 'Camote'], ratio: 0.4 },
            { category: 'verdura', searchTerms: ['Cebolla', 'Hierbabuena'], ratio: 0.2 }
        ],
        highFat: true, // Fritura
        highSodium: true // Sal en preparación
    },
    {
        id: 'des-quinua-manzana',
        name: 'Quinua Carretillera con Manzana',
        mealTypes: ['desayuno'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Quinua', 'Quinua cocida'], ratio: 1.0 },
            { category: 'fruta', searchTerms: ['Manzana', 'Piña'], ratio: 0.5 },
            { category: 'lacteo', searchTerms: ['Leche', 'Yogur'], ratio: 0.3 }
        ]
    },
    {
        id: 'des-avena-fruta',
        name: 'Avena Clásica con Fruta',
        mealTypes: ['desayuno'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Avena'], ratio: 0.8 },
            { category: 'lacteo', searchTerms: ['Leche de vaca', 'Yogur'], ratio: 0.5 },
            { category: 'fruta', searchTerms: ['Plátano', 'Manzana', 'Fresa'], ratio: 0.5 }
        ]
    },
    {
        id: 'des-tamal',
        name: 'Tamal con Salsa Criolla',
        mealTypes: ['desayuno'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Tamal', 'Maíz, mote', 'Maíz'], ratio: 1.0 },
            { category: 'proteina', searchTerms: ['Pollo', 'Cerdo'], ratio: 0.3 },
            { category: 'verdura', searchTerms: ['Cebolla', 'Ají amarillo'], ratio: 0.3 },
            { category: 'grasa', searchTerms: ['Aceite'], ratio: 0.1 }
        ],
        highFat: true // Alto contenido grasa en preparación tradicional
    },
    {
        id: 'des-pan-pejerrey',
        name: 'Pan con Pejerrey Arrebozado',
        mealTypes: ['desayuno'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Pan francés', 'Pan'], ratio: 1.0 },
            { category: 'proteina', searchTerms: ['Pescado pejerrey', 'Pescado'], ratio: 0.8 },
            { category: 'grasa', searchTerms: ['Aceite vegetal'], ratio: 0.2 },
            { category: 'verdura', searchTerms: ['Cebolla', 'Ají'], ratio: 0.2 }
        ]
    },
    {
        id: 'des-camote-relleno',
        name: 'Camote con Relleno',
        mealTypes: ['desayuno'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Camote amarillo', 'Camote'], ratio: 1.0 },
            { category: 'proteina', searchTerms: ['Huevo', 'Sangrecita'], ratio: 0.6 },
            { category: 'grasa', searchTerms: ['Aceite'], ratio: 0.1 }
        ]
    },
    {
        id: 'des-caldo-cabeza',
        name: 'Caldo de Mote/Cabeza (Andino)',
        mealTypes: ['desayuno'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Carnero', 'Res'], ratio: 0.8 },
            { category: 'carbohidrato', searchTerms: ['Mote', 'Maíz', 'Papa'], ratio: 1.0 },
            { category: 'verdura', searchTerms: ['Cebolla china', 'Rocoto'], ratio: 0.2 }
        ]
    },
    {
        id: 'des-tortilla-verdura',
        name: 'Tortilla de Verduras y Avena',
        mealTypes: ['desayuno'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Huevo'], ratio: 0.8 },
            { category: 'verdura', searchTerms: ['Espinaca', 'Zanahoria'], ratio: 0.5 },
            { category: 'carbohidrato', searchTerms: ['Avena', 'Harina'], ratio: 0.2 },
            { category: 'grasa', searchTerms: ['Aceite'], ratio: 0.2 }
        ]
    },

    // ==================== ALMUERZOS (CRIOLLOS, MARINOS, ANDINOS) ====================
    {
        id: 'alm-lomo-saltado',
        name: 'Lomo Saltado Clásico',
        mealTypes: ['almuerzo', 'cena'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Res, carne pulpa', 'Lomo', 'Bisteck'], ratio: 1.0 },
            { category: 'carbohidrato', searchTerms: ['Papa frita', 'Papa blanca'], ratio: 0.6 },
            { category: 'carbohidrato', searchTerms: ['Arroz blanco'], ratio: 0.4 },
            { category: 'verdura', searchTerms: ['Cebolla', 'Tomate'], ratio: 0.5 },
            { category: 'grasa', searchTerms: ['Aceite vegetal'], ratio: 0.15 }
        ],
        highSodium: true // Sillao/soya
    },
    {
        id: 'alm-aji-gallina',
        name: 'Ají de Gallina',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Gallina', 'Pollo, pechuga'], ratio: 1.0 },
            { category: 'carbohidrato', searchTerms: ['Papa amarilla'], ratio: 0.5 },
            { category: 'carbohidrato', searchTerms: ['Arroz blanco'], ratio: 0.5 },
            { category: 'grasa', searchTerms: ['Pecanas', 'Nueces', 'Aceite'], ratio: 0.15 },
            { category: 'verdura', searchTerms: ['Ají amarillo', 'Cebolla'], ratio: 0.1 }
        ]
    },
    {
        id: 'alm-arroz-pollo',
        name: 'Arroz con Pollo',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Pollo, presa', 'Pollo'], ratio: 1.0 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco'], ratio: 0.8 },
            { category: 'verdura', searchTerms: ['Culantro', 'Espinaca', 'Zanahoria', 'Arveja'], ratio: 0.5 },
            { category: 'grasa', searchTerms: ['Aceite vegetal'], ratio: 0.15 }
        ]
    },
    {
        id: 'alm-seco-res',
        name: 'Seco de Res con Frejoles',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Res', 'Carnero'], ratio: 1.0 },
            { category: 'carbohidrato', searchTerms: ['Frejol', 'Canario', 'Lenteja'], ratio: 0.6 },
            { category: 'carbohidrato', searchTerms: ['Arroz blanco'], ratio: 0.4 },
            { category: 'verdura', searchTerms: ['Culantro', 'Zapallo'], ratio: 0.3 },
            { category: 'grasa', searchTerms: ['Aceite'], ratio: 0.1 }
        ]
    },
    {
        id: 'alm-olluquito',
        name: 'Olluquito con Charqui/Carne',
        mealTypes: ['almuerzo', 'cena'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Olluco', 'Olluco picado'], ratio: 0.4 },
            { category: 'proteina', searchTerms: ['Charqui', 'Res, carne seca', 'Res'], ratio: 0.6 },
            { category: 'carbohidrato', searchTerms: ['Arroz blanco'], ratio: 0.8 },
            { category: 'verdura', searchTerms: ['Cebolla', 'Perejil'], ratio: 0.2 },
            { category: 'grasa', searchTerms: ['Aceite'], ratio: 0.1 }
        ]
    },
    {
        id: 'alm-locro',
        name: 'Locro de Zapallo',
        mealTypes: ['almuerzo', 'cena'],
        ingredients: [
            { category: 'verdura', searchTerms: ['Zapallo macre', 'Zapallo'], ratio: 1.0 },
            { category: 'carbohidrato', searchTerms: ['Papa blanca', 'Papa'], ratio: 0.5 },
            { category: 'carbohidrato', searchTerms: ['Arroz blanco'], ratio: 0.4 },
            { category: 'lacteo', searchTerms: ['Queso fresco', 'Leche'], ratio: 0.3 },
            { category: 'carbohidrato', searchTerms: ['Choclo'], ratio: 0.2 }
        ]
    },
    {
        id: 'alm-ceviche',
        name: 'Ceviche de Pescado',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Pescado bonito', 'Pescado jurel', 'Pescado'], ratio: 1.0 },
            { category: 'carbohidrato', searchTerms: ['Camote', 'Yuca', 'Papa'], ratio: 0.7 },
            { category: 'carbohidrato', searchTerms: ['Maíz, grano fresco', 'Choclo'], ratio: 0.3 },
            { category: 'verdura', searchTerms: ['Limón, jugo de', 'Cebolla', 'Ají'], ratio: 0.5 }
        ]
    },
    {
        id: 'alm-lentejas-pescado',
        name: 'Lentejitas con Pescado',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Pescado bonito', 'Jurel', 'Pescado'], ratio: 1.0 },
            { category: 'carbohidrato', searchTerms: ['Lenteja', 'Lenteja chica'], ratio: 0.7 },
            { category: 'carbohidrato', searchTerms: ['Arroz blanco'], ratio: 0.4 },
            { category: 'verdura', searchTerms: ['Cebolla', 'Tomate'], ratio: 0.2 },
            { category: 'grasa', searchTerms: ['Aceite'], ratio: 0.15 }
        ]
    },
    {
        id: 'alm-cau-cau',
        name: 'Cau Cau',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Mondongo', 'Pollo', 'Res'], ratio: 1.0 },
            { category: 'carbohidrato', searchTerms: ['Papa blanca', 'Papa'], ratio: 0.8 },
            { category: 'carbohidrato', searchTerms: ['Arroz blanco'], ratio: 0.5 },
            { category: 'verdura', searchTerms: ['Hierbabuena', 'Zanahoria'], ratio: 0.2 },
            { category: 'grasa', searchTerms: ['Aceite'], ratio: 0.1 }
        ]
    },
    {
        id: 'alm-chanfainita',
        name: 'Chanfainita',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Bofe', 'Pulmón', 'Res'], ratio: 1.0 },
            { category: 'carbohidrato', searchTerms: ['Papa', 'Papa blanca'], ratio: 0.8 },
            { category: 'carbohidrato', searchTerms: ['Mote', 'Arroz'], ratio: 0.4 },
            { category: 'verdura', searchTerms: ['Hierbabuena'], ratio: 0.2 }
        ]
    },
    {
        id: 'alm-sudado',
        name: 'Sudado de Pescado',
        mealTypes: ['almuerzo', 'cena'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Pescado', 'Bonito', 'Jurel'], ratio: 1.0 },
            { category: 'carbohidrato', searchTerms: ['Yuca', 'Papa'], ratio: 0.6 },
            { category: 'carbohidrato', searchTerms: ['Arroz blanco'], ratio: 0.3 },
            { category: 'verdura', searchTerms: ['Tomate', 'Cebolla', 'Culantro'], ratio: 0.5 },
            { category: 'grasa', searchTerms: ['Aceite'], ratio: 0.1 }
        ]
    },
    {
        id: 'alm-escabeche',
        name: 'Escabeche de Pescado',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Pescado', 'Bonito'], ratio: 1.0 },
            { category: 'verdura', searchTerms: ['Cebolla', 'Ají amarillo'], ratio: 0.8 },
            { category: 'carbohidrato', searchTerms: ['Camote', 'Yuca'], ratio: 0.5 },
            { category: 'grasa', searchTerms: ['Aceite', 'Aceituna'], ratio: 0.3 }
        ]
    },
    {
        id: 'alm-pachamanca',
        name: 'Pachamanca a la Olla',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Cerdo', 'Pollo', 'Res', 'Carnero'], ratio: 1.0 },
            { category: 'carbohidrato', searchTerms: ['Papa', 'Papa huayro'], ratio: 0.5 },
            { category: 'carbohidrato', searchTerms: ['Camote', 'Oca'], ratio: 0.5 },
            { category: 'carbohidrato', searchTerms: ['Haba', 'Choclo'], ratio: 0.4 },
            { category: 'verdura', searchTerms: ['Huacatay', 'Chincho'], ratio: 0.2 }
        ]
    },
    {
        id: 'alm-carapulcra',
        name: 'Carapulcra',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Papa seca'], ratio: 0.8 },
            { category: 'proteina', searchTerms: ['Cerdo', 'Pollo'], ratio: 0.8 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Yuca'], ratio: 0.4 },
            { category: 'grasa', searchTerms: ['Mani', 'Aceite'], ratio: 0.2 },
            { category: 'verdura', searchTerms: ['Ají panca'], ratio: 0.1 }
        ]
    },
    {
        id: 'alm-quinua-guiso',
        name: 'Guiso de Quinua',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Quinua'], ratio: 0.8 },
            { category: 'carbohidrato', searchTerms: ['Papa'], ratio: 0.3 },
            { category: 'lacteo', searchTerms: ['Queso fresco'], ratio: 0.4 },
            { category: 'verdura', searchTerms: ['Espinaca', 'Cebolla'], ratio: 0.2 }
        ]
    },
    {
        id: 'alm-adobo',
        name: 'Adobo de Cerdo',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Cerdo', 'Chancho'], ratio: 1.0 },
            { category: 'carbohidrato', searchTerms: ['Camote', 'Papa'], ratio: 0.5 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Pan'], ratio: 0.4 },
            { category: 'verdura', searchTerms: ['Cebolla', 'Ají panca'], ratio: 0.3 }
        ]
    },

    // ==================== CENAS / SOPAS (LIGERAS) ====================
    {
        id: 'cen-sopa-criolla',
        name: 'Sopa Criolla',
        mealTypes: ['cena'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Res, carne molida', 'Carne'], ratio: 0.6 },
            { category: 'carbohidrato', searchTerms: ['Fideo cabello', 'Fideo'], ratio: 0.6 },
            { category: 'lacteo', searchTerms: ['Leche', 'Huevo'], ratio: 0.4 },
            { category: 'verdura', searchTerms: ['Tomate', 'Orégano'], ratio: 0.2 },
            { category: 'carbohidrato', searchTerms: ['Pan'], ratio: 0.2 }
        ]
    },
    {
        id: 'cen-caldo-gallina',
        name: 'Caldo de Gallina',
        mealTypes: ['almuerzo', 'cena'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Gallina', 'Pollo'], ratio: 0.8 },
            { category: 'carbohidrato', searchTerms: ['Fideo', 'Espagueti'], ratio: 0.7 },
            { category: 'carbohidrato', searchTerms: ['Papa amarilla'], ratio: 0.4 },
            { category: 'proteina', searchTerms: ['Huevo'], ratio: 0.3 },
            { category: 'verdura', searchTerms: ['Cebolla china'], ratio: 0.1 }
        ]
    },
    {
        id: 'cen-higado-encebollado',
        name: 'Hígado Encebollado',
        mealTypes: ['cena', 'almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Hígado de res', 'Hígado'], ratio: 1.0 },
            { category: 'verdura', searchTerms: ['Cebolla', 'Tomate'], ratio: 0.6 },
            { category: 'carbohidrato', searchTerms: ['Papa sancochada', 'Yuca'], ratio: 0.6 },
            { category: 'grasa', searchTerms: ['Aceite'], ratio: 0.15 }
        ]
    },
    {
        id: 'cen-solterito',
        name: 'Solterito de Queso',
        mealTypes: ['cena', 'almuerzo'],
        ingredients: [
            { category: 'lacteo', searchTerms: ['Queso fresco', 'Queso'], ratio: 0.8 },
            { category: 'carbohidrato', searchTerms: ['Choclo', 'Maíz'], ratio: 0.6 },
            { category: 'carbohidrato', searchTerms: ['Haba fresca'], ratio: 0.4 },
            { category: 'verdura', searchTerms: ['Cebolla', 'Tomate', 'Aceituna'], ratio: 0.5 },
            { category: 'grasa', searchTerms: ['Aceite de oliva', 'Aceite'], ratio: 0.1 }
        ]
    },
    {
        id: 'cen-chaufa-quinua',
        name: 'Chaufa de Quinua',
        mealTypes: ['cena', 'almuerzo'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Quinua', 'Quinua blanca'], ratio: 1.0 },
            { category: 'proteina', searchTerms: ['Pollo', 'Huevo', 'Cerdo'], ratio: 0.6 },
            { category: 'verdura', searchTerms: ['Cebolla china', 'Pimiento', 'Kion'], ratio: 0.3 },
            { category: 'grasa', searchTerms: ['Aceite'], ratio: 0.15 }
        ]
    },
    {
        id: 'cen-crema-zapallo',
        name: 'Crema de Zapallo',
        mealTypes: ['cena'],
        ingredients: [
            { category: 'verdura', searchTerms: ['Zapallo'], ratio: 1.0 },
            { category: 'carbohidrato', searchTerms: ['Papa amarilla'], ratio: 0.3 },
            { category: 'lacteo', searchTerms: ['Leche', 'Queso'], ratio: 0.3 },
            { category: 'carbohidrato', searchTerms: ['Pan'], ratio: 0.2 }
        ]
    },
    {
        id: 'cen-tortilla-atun',
        name: 'Tortilla de Atún',
        mealTypes: ['cena'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Huevo'], ratio: 0.8 },
            { category: 'proteina', searchTerms: ['Atún'], ratio: 0.6 },
            { category: 'verdura', searchTerms: ['Cebolla', 'Tomate'], ratio: 0.3 },
            { category: 'grasa', searchTerms: ['Aceite'], ratio: 0.15 }
        ]
    },
    {
        id: 'cen-dieta-pollo',
        name: 'Dieta de Pollo (Sopa)',
        mealTypes: ['cena'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Pollo, pechuga'], ratio: 0.8 },
            { category: 'carbohidrato', searchTerms: ['Fideo cabello', 'Arroz'], ratio: 0.4 },
            { category: 'carbohidrato', searchTerms: ['Papa amarilla'], ratio: 0.3 },
            { category: 'verdura', searchTerms: ['Zanahoria', 'Apio'], ratio: 0.3 }
        ]
    },

    // ==================== NUEVAS RECETAS SALUDABLES ====================
    {
        id: 'des-avena-manzana-canela',
        name: 'Avena con Manzana y Canela',
        mealTypes: ['desayuno'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Avena', 'Avena en hojuelas'], ratio: 0.6 },
            { category: 'fruta', searchTerms: ['Manzana', 'Manzana delicia'], ratio: 0.4 },
            { category: 'lacteo', searchTerms: ['Leche', 'Leche evaporada'], ratio: 0.4 },
            { category: 'miscelaneo', searchTerms: ['Canela', 'Miel'], ratio: 0.05 }
        ]
    },
    {
        id: 'des-pan-palta-huevo-pochado',
        name: 'Pan con Palta y Huevo Pochado',
        mealTypes: ['desayuno'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Pan integral', 'Pan'], ratio: 0.5 },
            { category: 'grasa', searchTerms: ['Palta', 'Aguacate'], ratio: 0.4 },
            { category: 'proteina', searchTerms: ['Huevo', 'Huevo de gallina'], ratio: 0.5 },
            { category: 'verdura', searchTerms: ['Tomate', 'Cebolla'], ratio: 0.1 }
        ]
    },
    {
        id: 'alm-quinua-atamalada',
        name: 'Quinua Atamalada con Pollo',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Quinua', 'Quinua blanca'], ratio: 0.7 },
            { category: 'proteina', searchTerms: ['Pollo, pechuga', 'Pollo'], ratio: 0.8 },
            { category: 'lacteo', searchTerms: ['Queso fresco', 'Queso'], ratio: 0.3 },
            { category: 'verdura', searchTerms: ['Ají amarillo', 'Cebolla'], ratio: 0.2 },
            { category: 'grasa', searchTerms: ['Aceite'], ratio: 0.1 }
        ]
    },
    {
        id: 'alm-pollo-plancha-ensalada-rusa',
        name: 'Pollo a la Plancha con Ensalada Rusa',
        mealTypes: ['almuerzo', 'cena'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Pollo, pechuga', 'Pollo'], ratio: 1.0 },
            { category: 'carbohidrato', searchTerms: ['Papa blanca', 'Papa'], ratio: 0.5 },
            { category: 'verdura', searchTerms: ['Zanahoria', 'Arveja', 'Vainita'], ratio: 0.4 },
            { category: 'grasa', searchTerms: ['Mayonesa', 'Aceite'], ratio: 0.15 }
        ]
    },
    {
        id: 'alm-causa-pollo',
        name: 'Causa Rellena de Pollo',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Papa amarilla', 'Papa'], ratio: 0.8 },
            { category: 'proteina', searchTerms: ['Pollo, pechuga', 'Pollo'], ratio: 0.6 },
            { category: 'grasa', searchTerms: ['Palta', 'Mayonesa'], ratio: 0.3 },
            { category: 'verdura', searchTerms: ['Ají amarillo', 'Limón'], ratio: 0.15 }
        ]
    },
    {
        id: 'alm-chaufa-vegetariano',
        name: 'Arroz Chaufa Vegetariano',
        mealTypes: ['almuerzo', 'cena'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco'], ratio: 0.8 },
            { category: 'proteina', searchTerms: ['Huevo', 'Tofu'], ratio: 0.5 },
            { category: 'verdura', searchTerms: ['Cebolla china', 'Pimiento', 'Zanahoria'], ratio: 0.4 },
            { category: 'grasa', searchTerms: ['Aceite de ajonjolí', 'Aceite'], ratio: 0.1 }
        ]
    },
    {
        id: 'cen-ensalada-atun-palta',
        name: 'Ensalada de Atún con Palta',
        mealTypes: ['cena'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Atún', 'Atún en conserva'], ratio: 0.8 },
            { category: 'grasa', searchTerms: ['Palta', 'Aguacate'], ratio: 0.5 },
            { category: 'verdura', searchTerms: ['Tomate', 'Lechuga', 'Cebolla'], ratio: 0.5 },
            { category: 'carbohidrato', searchTerms: ['Pan integral', 'Tostada'], ratio: 0.3 }
        ]
    },
    {
        id: 'cen-ceviche-champinones',
        name: 'Ceviche de Champiñones',
        mealTypes: ['cena'],
        ingredients: [
            { category: 'verdura', searchTerms: ['Champiñón', 'Hongos'], ratio: 0.8 },
            { category: 'carbohidrato', searchTerms: ['Camote', 'Choclo'], ratio: 0.5 },
            { category: 'verdura', searchTerms: ['Cebolla', 'Limón', 'Ají'], ratio: 0.4 },
            { category: 'grasa', searchTerms: ['Aceite de oliva'], ratio: 0.1 }
        ]
    },

    // ==================== ALMUERZOS INS LIMA 2024 (24 ALMUERZOS SALUDABLES) ====================
    // --- SEMANA 1: PESCADOS Y ENLATADOS ---
    {
        id: 'alm-ins-tortilla-verduras-atun',
        name: 'Tortilla de Verduras con Atún',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Atún', 'Atún en conserva', 'Conserva'], ratio: 0.35 },
            { category: 'proteina', searchTerms: ['Huevo', 'Huevo de gallina'], ratio: 0.25 },
            { category: 'verdura', searchTerms: ['Espinaca', 'Acelga'], ratio: 0.15 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco', 'Arroz integral'], ratio: 0.15 },
            { category: 'carbohidrato', searchTerms: ['Papa', 'Papa blanca', 'Yuca'], ratio: 0.1 }
        ]
    },
    {
        id: 'alm-ins-pescado-saltado-criollo',
        name: 'Pescado Saltado Criollo',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Pescado', 'Pescado bonito', 'Bonito', 'Jurel', 'Pescado jurel', 'Tilapia'], ratio: 0.4 },
            { category: 'verdura', searchTerms: ['Cebolla', 'Tomate'], ratio: 0.25 },
            { category: 'carbohidrato', searchTerms: ['Papa', 'Papa amarilla'], ratio: 0.2 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco', 'Arroz integral'], ratio: 0.15 }
        ]
    },
    {
        id: 'alm-ins-sudado-pescado-lentejas',
        name: 'Sudado de Pescado con Lentejas',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Pescado', 'Pescado filete', 'Filete', 'Bonito', 'Jurel', 'Tilapia'], ratio: 0.35 },
            { category: 'carbohidrato', searchTerms: ['Lenteja', 'Lenteja chica', 'Menestra'], ratio: 0.35 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco', 'Arroz integral'], ratio: 0.15 },
            { category: 'verdura', searchTerms: ['Cebolla', 'Tomate'], ratio: 0.15 }
        ]
    },
    {
        id: 'alm-ins-escabeche-pescado',
        name: 'Escabeche de Pescado',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Pescado', 'Pescado bonito', 'Bonito', 'Jurel', 'Tilapia'], ratio: 0.4 },
            { category: 'verdura', searchTerms: ['Cebolla', 'Ají amarillo'], ratio: 0.3 },
            { category: 'carbohidrato', searchTerms: ['Camote', 'Camote amarillo'], ratio: 0.2 },
            { category: 'proteina', searchTerms: ['Huevo', 'Huevo duro'], ratio: 0.1 }
        ]
    },
    // --- SEMANA 2: POLLO Y PAVITA ---
    {
        id: 'alm-ins-estofado-pollo',
        name: 'Estofado de Pollo',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Pollo', 'Pollo presa', 'Presa'], ratio: 0.35 },
            { category: 'verdura', searchTerms: ['Zanahoria', 'Arveja'], ratio: 0.25 },
            { category: 'carbohidrato', searchTerms: ['Papa', 'Papa blanca'], ratio: 0.2 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco', 'Arroz integral'], ratio: 0.2 }
        ]
    },
    {
        id: 'alm-ins-seco-pollo-frejoles',
        name: 'Seco de Pollo con Frejoles',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Pollo', 'Pollo pechuga', 'Pechuga'], ratio: 0.35 },
            { category: 'carbohidrato', searchTerms: ['Frejol', 'Frejol canario', 'Canario', 'Lenteja', 'Panamito'], ratio: 0.3 },
            { category: 'verdura', searchTerms: ['Culantro', 'Espinaca'], ratio: 0.15 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco', 'Arroz integral'], ratio: 0.2 }
        ]
    },
    {
        id: 'alm-ins-aji-gallina-saludable',
        name: 'Ají de Gallina Saludable',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Pollo', 'Pollo pechuga', 'Pechuga'], ratio: 0.4 },
            { category: 'lacteo', searchTerms: ['Leche', 'Leche descremada'], ratio: 0.1 },
            { category: 'carbohidrato', searchTerms: ['Pan', 'Galleta soda'], ratio: 0.1 },
            { category: 'carbohidrato', searchTerms: ['Papa', 'Papa amarilla'], ratio: 0.2 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco', 'Arroz integral'], ratio: 0.2 }
        ]
    },
    {
        id: 'alm-ins-arroz-pollo-fit',
        name: 'Arroz con Pollo (Versión Fit)',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Pollo', 'Pollo presa', 'Presa'], ratio: 0.4 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco', 'Arroz integral'], ratio: 0.3 },
            { category: 'verdura', searchTerms: ['Culantro', 'Zanahoria', 'Arveja'], ratio: 0.3 }
        ]
    },
    {
        id: 'alm-ins-caigua-rellena',
        name: 'Caigua Rellena',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Carne molida', 'Res carne molida', 'Pollo'], ratio: 0.3 },
            { category: 'verdura', searchTerms: ['Caigua', 'Caigua serrana'], ratio: 0.4 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco', 'Arroz integral'], ratio: 0.2 },
            { category: 'proteina', searchTerms: ['Huevo', 'Huevo duro'], ratio: 0.1 }
        ]
    },
    // --- SEMANA 3: VÍSCERAS Y SANGRECITA (HIERRO) ---
    {
        id: 'alm-ins-saltado-sangrecita',
        name: 'Saltado de Sangrecita',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Sangrecita', 'Pollo sangre cocida', 'Sangre'], ratio: 0.4 },
            { category: 'verdura', searchTerms: ['Cebolla china', 'Pimiento'], ratio: 0.3 },
            { category: 'carbohidrato', searchTerms: ['Papa', 'Papa blanca', 'Yuca'], ratio: 0.15 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco', 'Arroz integral'], ratio: 0.15 }
        ]
    },
    {
        id: 'alm-ins-higado-encebollado',
        name: 'Hígado Encebollado',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Hígado', 'Hígado de res', 'Hígado res'], ratio: 0.4 },
            { category: 'verdura', searchTerms: ['Cebolla', 'Tomate'], ratio: 0.3 },
            { category: 'carbohidrato', searchTerms: ['Papa', 'Papa sancochada'], ratio: 0.15 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco', 'Arroz integral'], ratio: 0.15 }
        ]
    },
    {
        id: 'alm-ins-chanfainita-ligera',
        name: 'Chanfainita (Versión Ligera)',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Bofe', 'Pulmón', 'Corazón'], ratio: 0.35 },
            { category: 'carbohidrato', searchTerms: ['Papa', 'Papa tumbay'], ratio: 0.35 },
            { category: 'carbohidrato', searchTerms: ['Mote', 'Maíz'], ratio: 0.2 },
            { category: 'verdura', searchTerms: ['Hierbabuena'], ratio: 0.1 }
        ]
    },
    {
        id: 'alm-ins-cau-cau-pollo',
        name: 'Cau Cau de Pollo',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Pollo', 'Pollo pechuga', 'Pechuga'], ratio: 0.35 },
            { category: 'carbohidrato', searchTerms: ['Papa', 'Papa cuadraditos'], ratio: 0.3 },
            { category: 'verdura', searchTerms: ['Zanahoria', 'Arveja'], ratio: 0.15 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco', 'Arroz integral'], ratio: 0.2 }
        ]
    },
    {
        id: 'alm-ins-mollejitas-saltadas',
        name: 'Mollejitas Saltadas',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Molleja'], ratio: 0.4 },
            { category: 'verdura', searchTerms: ['Cebolla', 'Tomate'], ratio: 0.3 },
            { category: 'carbohidrato', searchTerms: ['Papa', 'Papa frita'], ratio: 0.15 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco', 'Arroz integral'], ratio: 0.15 }
        ]
    },
    // --- SEMANA 4: CRIOLLOS Y MENESTRAS ---
    {
        id: 'alm-ins-carapulcra-baja-grasa',
        name: 'Carapulcra (Baja en Grasa)',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Chancho', 'Cerdo', 'Cerdo magro', 'Pollo'], ratio: 0.3 },
            { category: 'carbohidrato', searchTerms: ['Papa seca'], ratio: 0.3 },
            { category: 'carbohidrato', searchTerms: ['Yuca', 'Arroz', 'Arroz blanco', 'Arroz integral'], ratio: 0.2 },
            { category: 'grasa', searchTerms: ['Aní', 'Aní molido', 'Maní'], ratio: 0.2 }
        ]
    },
    {
        id: 'alm-ins-locro-zapallo-queso',
        name: 'Locro de Zapallo con Queso',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'verdura', searchTerms: ['Zapallo', 'Zapallo macre', 'Macre'], ratio: 0.45 },
            { category: 'carbohidrato', searchTerms: ['Papa', 'Papa amarilla'], ratio: 0.15 },
            { category: 'lacteo', searchTerms: ['Queso', 'Queso fresco'], ratio: 0.15 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco', 'Arroz integral'], ratio: 0.15 },
            { category: 'carbohidrato', searchTerms: ['Choclo', 'Maíz grano fresco'], ratio: 0.1 }
        ]
    },
    {
        id: 'alm-ins-olluquito-carne',
        name: 'Olluquito con Carne',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Olluco', 'Olluco picado'], ratio: 0.45 },
            { category: 'proteina', searchTerms: ['Carne', 'Res', 'Res carne picada', 'Carne picada'], ratio: 0.3 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco', 'Arroz integral'], ratio: 0.25 }
        ]
    },
    {
        id: 'alm-ins-tallarines-verdes-bistec',
        name: 'Tallarines Verdes con Bistec',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Res', 'Bistec', 'Res carne pulpa'], ratio: 0.35 },
            { category: 'carbohidrato', searchTerms: ['Fideo', 'Fideo tallarín', 'Tallarín', 'Espagueti'], ratio: 0.35 },
            { category: 'verdura', searchTerms: ['Espinaca', 'Albahaca'], ratio: 0.2 },
            { category: 'lacteo', searchTerms: ['Queso', 'Queso parmesano'], ratio: 0.1 }
        ]
    },
    {
        id: 'alm-ins-tallarines-rojos-pollo',
        name: 'Tallarines Rojos con Pollo',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Pollo', 'Pollo presa', 'Presa'], ratio: 0.35 },
            { category: 'carbohidrato', searchTerms: ['Fideo', 'Fideo tallarín', 'Tallarín', 'Espagueti'], ratio: 0.35 },
            { category: 'verdura', searchTerms: ['Tomate', 'Zanahoria'], ratio: 0.3 }
        ]
    },
    {
        id: 'alm-ins-quinua-atamalada-queso',
        name: 'Quinua Atamalada con Queso',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Quinua', 'Quinua blanca'], ratio: 0.4 },
            { category: 'lacteo', searchTerms: ['Queso', 'Queso fresco'], ratio: 0.2 },
            { category: 'carbohidrato', searchTerms: ['Papa', 'Papa amarilla'], ratio: 0.2 },
            { category: 'proteina', searchTerms: ['Huevo', 'Huevo de gallina'], ratio: 0.2 }
        ]
    },
    {
        id: 'alm-ins-pepian-choclo-pollo',
        name: 'Pepián de Choclo con Pollo',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Choclo', 'Maíz', 'Maíz grano fresco'], ratio: 0.4 },
            { category: 'proteina', searchTerms: ['Pollo', 'Pollo guiso'], ratio: 0.3 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco', 'Arroz integral'], ratio: 0.2 },
            { category: 'verdura', searchTerms: ['Culantro'], ratio: 0.1 }
        ]
    },
    {
        id: 'alm-ins-aguadito-pollo',
        name: 'Aguadito de Pollo',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Pollo', 'Pollo menudencia', 'Menudencia'], ratio: 0.3 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco', 'Arroz integral'], ratio: 0.3 },
            { category: 'carbohidrato', searchTerms: ['Papa', 'Papa amarilla'], ratio: 0.1 },
            { category: 'verdura', searchTerms: ['Culantro', 'Verduras'], ratio: 0.3 }
        ]
    },
    {
        id: 'alm-ins-adobo-pavita',
        name: 'Adobo de Pavita',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Pavita', 'Cerdo'], ratio: 0.4 },
            { category: 'carbohidrato', searchTerms: ['Camote', 'Camote amarillo'], ratio: 0.3 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco', 'Arroz integral'], ratio: 0.2 },
            { category: 'verdura', searchTerms: ['Cebolla', 'Ají panca'], ratio: 0.1 }
        ]
    },
    {
        id: 'alm-ins-lentejas-pescado-frito',
        name: 'Lentejas con Pescado Frito',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Lenteja', 'Lenteja chica'], ratio: 0.35 },
            { category: 'proteina', searchTerms: ['Pescado', 'Pescado filete', 'Filete', 'Bonito', 'Jurel', 'Tilapia'], ratio: 0.35 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco', 'Arroz integral'], ratio: 0.2 },
            { category: 'verdura', searchTerms: ['Ensalada', 'Cebolla'], ratio: 0.1 }
        ]
    },

    // ==================== ALMUERZOS SALUDABLES TUMBES 2024 ====================
    // --- PLATOS EMBLEMÁTICOS DE TUMBES ---
    {
        id: 'alm-tumbes-majarisco',
        name: 'Majarisco Tumbesino',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Plátano verde', 'Plátano', 'Plátano bellaco'], ratio: 0.35 },
            { category: 'proteina', searchTerms: ['Langostino', 'Camarón', 'Mariscos'], ratio: 0.25 },
            { category: 'proteina', searchTerms: ['Calamar', 'Pota'], ratio: 0.15 },
            { category: 'verdura', searchTerms: ['Cebolla', 'Tomate', 'Ají amarillo'], ratio: 0.25 }
        ]
    },
    {
        id: 'alm-tumbes-majado-pescado',
        name: 'Majado de Plátano con Pescado Frito',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Plátano verde', 'Plátano'], ratio: 0.45 },
            { category: 'proteina', searchTerms: ['Pescado', 'Pescado filete', 'Pescado frito'], ratio: 0.35 },
            { category: 'verdura', searchTerms: ['Cebolla', 'Tomate'], ratio: 0.15 },
            { category: 'grasa', searchTerms: ['Aceite'], ratio: 0.05 }
        ]
    },
    {
        id: 'alm-tumbes-seco-cabrito',
        name: 'Seco de Cabrito (o Res) con Frejoles',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Cabrito', 'Carnero', 'Res'], ratio: 0.35 },
            { category: 'carbohidrato', searchTerms: ['Frejol', 'Frejol canario', 'Canario'], ratio: 0.25 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco'], ratio: 0.2 },
            { category: 'verdura', searchTerms: ['Zapallo', 'Culantro'], ratio: 0.2 }
        ]
    },
    {
        id: 'alm-tumbes-bolas-platano',
        name: 'Bolas de Plátano a la Tumbesina',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Plátano verde', 'Plátano'], ratio: 0.4 },
            { category: 'proteina', searchTerms: ['Carne molida', 'Carne picada', 'Res carne molida'], ratio: 0.25 },
            { category: 'grasa', searchTerms: ['Maní', 'Cacahuete'], ratio: 0.1 },
            { category: 'proteina', searchTerms: ['Huevo', 'Huevo duro'], ratio: 0.1 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco'], ratio: 0.15 }
        ]
    },
    {
        id: 'alm-tumbes-sanguito-platano',
        name: 'Sanguito de Plátano con Pescado',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'carbohidrato', searchTerms: ['Plátano maduro', 'Plátano'], ratio: 0.4 },
            { category: 'proteina', searchTerms: ['Pescado', 'Pescado sudado', 'Pescado guiso'], ratio: 0.35 },
            { category: 'verdura', searchTerms: ['Cebolla', 'Tomate'], ratio: 0.25 }
        ]
    },
    // --- PLATOS CON POTA Y MARISCOS (ECONÓMICOS) ---
    {
        id: 'alm-tumbes-panamito-pota',
        name: 'Guiso de Panamito con Chicharrón de Pota',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Pota', 'Calamar'], ratio: 0.35 },
            { category: 'carbohidrato', searchTerms: ['Panamito', 'Frejol', 'Frejol panamito'], ratio: 0.3 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco'], ratio: 0.2 },
            { category: 'verdura', searchTerms: ['Ensalada', 'Cebolla', 'Tomate'], ratio: 0.15 }
        ]
    },
    {
        id: 'alm-tumbes-picante-mariscos',
        name: 'Picante de Mariscos',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Mariscos', 'Pota', 'Mix mariscos'], ratio: 0.4 },
            { category: 'carbohidrato', searchTerms: ['Papa amarilla', 'Papa'], ratio: 0.2 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco'], ratio: 0.2 },
            { category: 'lacteo', searchTerms: ['Ají panca', 'Crema de leche', 'Leche'], ratio: 0.2 }
        ]
    },
    {
        id: 'alm-tumbes-cau-cau-toyo',
        name: 'Cau Cau de Toyo (o Pescado)',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Toyo', 'Pescado', 'Tiburón'], ratio: 0.35 },
            { category: 'carbohidrato', searchTerms: ['Papa', 'Papa cuadraditos'], ratio: 0.3 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco'], ratio: 0.2 },
            { category: 'verdura', searchTerms: ['Hierbabuena', 'Palillo'], ratio: 0.15 }
        ]
    },
    {
        id: 'alm-tumbes-pota-italiana',
        name: 'Pota a la Italiana',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Pota', 'Calamar'], ratio: 0.4 },
            { category: 'verdura', searchTerms: ['Tomate', 'Pasta de tomate'], ratio: 0.2 },
            { category: 'verdura', searchTerms: ['Zanahoria', 'Hongo'], ratio: 0.1 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco'], ratio: 0.15 },
            { category: 'carbohidrato', searchTerms: ['Papa frita', 'Papa'], ratio: 0.15 }
        ]
    },
    // --- VÍSCERAS Y OTROS (Alto Hierro) ---
    {
        id: 'alm-tumbes-sangrecita-patacones',
        name: 'Picante de Sangrecita con Patacones',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Sangrecita', 'Pollo sangre cocida'], ratio: 0.4 },
            { category: 'carbohidrato', searchTerms: ['Plátano verde', 'Plátano'], ratio: 0.3 },
            { category: 'verdura', searchTerms: ['Cebolla china', 'Ají'], ratio: 0.2 },
            { category: 'carbohidrato', searchTerms: ['Yuca'], ratio: 0.1 }
        ]
    },
    {
        id: 'alm-tumbes-corazones-zarandaja',
        name: 'Corazones con Zarandaja',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Corazón', 'Anticucho', 'Corazón de res'], ratio: 0.35 },
            { category: 'carbohidrato', searchTerms: ['Zarandaja', 'Lenteja', 'Frejol'], ratio: 0.3 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco'], ratio: 0.2 },
            { category: 'verdura', searchTerms: ['Ensalada', 'Cebolla'], ratio: 0.15 }
        ]
    },
    {
        id: 'alm-tumbes-higado-pallares',
        name: 'Hígado Encebollado con Pallares',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Hígado', 'Hígado de res'], ratio: 0.35 },
            { category: 'carbohidrato', searchTerms: ['Pallares', 'Menestra', 'Frejol'], ratio: 0.3 },
            { category: 'verdura', searchTerms: ['Cebolla', 'Tomate'], ratio: 0.2 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco'], ratio: 0.15 }
        ]
    },
    // --- CLÁSICOS ADAPTADOS ---
    {
        id: 'alm-tumbes-enrollado-mero',
        name: 'Enrollado de Mero con Puré',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Mero', 'Pescado blanco', 'Pescado'], ratio: 0.4 },
            { category: 'carbohidrato', searchTerms: ['Camote amarillo', 'Camote'], ratio: 0.25 },
            { category: 'verdura', searchTerms: ['Espinaca', 'Relleno'], ratio: 0.15 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco'], ratio: 0.2 }
        ]
    },
    {
        id: 'alm-tumbes-albondigas-cangrejo',
        name: 'Albóndigas de Pulpa de Cangrejo',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Cangrejo', 'Pulpa de cangrejo', 'Pescado'], ratio: 0.35 },
            { category: 'carbohidrato', searchTerms: ['Pan', 'Harina'], ratio: 0.1 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco'], ratio: 0.25 },
            { category: 'verdura', searchTerms: ['Ensalada', 'Ensalada fresca', 'Lechuga'], ratio: 0.3 }
        ]
    },
    {
        id: 'alm-tumbes-sudado-yuca',
        name: 'Sudado de Pescado con Yuca',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Pescado', 'Cabría', 'Bonito'], ratio: 0.4 },
            { category: 'carbohidrato', searchTerms: ['Yuca', 'Yuca sancochada'], ratio: 0.3 },
            { category: 'verdura', searchTerms: ['Tomate', 'Cebolla', 'Chicha'], ratio: 0.2 },
            { category: 'carbohidrato', searchTerms: ['Arroz', 'Arroz blanco'], ratio: 0.1 }
        ]
    }
];

// ==================== FITNESS DESSERT RECIPES (SNACKS/COLACIONES) ====================
export const FITNESS_DESSERT_RECIPES: SnackRecipe[] = [
    // --- MUFFINS Y CUPCAKES ---
    {
        name: "Cupcakes de Chocolate y Manzana",
        type: "snack",
        ingredients: [
            { searchTerms: ["manzana"], ratio: 0.3, category: 'fruta' },
            { searchTerms: ["platano", "banana"], ratio: 0.2, category: 'fruta' },
            { searchTerms: ["avena", "harina avena", "hojuelas de avena"], ratio: 0.2, category: 'carbohidrato' },
            { searchTerms: ["huevo"], ratio: 0.1, category: 'proteina' },
            { searchTerms: ["proteina", "whey", "suero de leche"], ratio: 0.1, category: 'proteina' },
            { searchTerms: ["cacao", "polvo cacao"], ratio: 0.1, category: 'miscelaneo' }
        ]
    },
    {
        name: "Muffins Pizza Fit (Salado)",
        type: "snack",
        ingredients: [
            { searchTerms: ["avena", "harina"], ratio: 0.4, category: 'carbohidrato' },
            { searchTerms: ["clara", "huevo", "clara de huevo"], ratio: 0.3, category: 'proteina' },
            { searchTerms: ["pavo", "jamon", "jamón de pavo"], ratio: 0.2, category: 'proteina' },
            { searchTerms: ["queso", "bajo grasa", "queso fresco"], ratio: 0.1, category: 'lacteo' }
        ]
    },
    {
        name: "Maxi Muffin de Manzana",
        type: "snack",
        ingredients: [
            { searchTerms: ["avena", "harina"], ratio: 0.4, category: 'carbohidrato' },
            { searchTerms: ["clara", "huevo"], ratio: 0.3, category: 'proteina' },
            { searchTerms: ["manzana"], ratio: 0.2, category: 'fruta' },
            { searchTerms: ["queso batido", "yogur griego", "queso cottage", "yogur"], ratio: 0.1, category: 'lacteo' }
        ]
    },
    {
        name: "Magdalenas de Chocolate Pro",
        type: "snack",
        ingredients: [
            { searchTerms: ["avena", "salvado"], ratio: 0.4, category: 'carbohidrato' },
            { searchTerms: ["huevo"], ratio: 0.2, category: 'proteina' },
            { searchTerms: ["yogur", "natural"], ratio: 0.2, category: 'lacteo' },
            { searchTerms: ["cacao"], ratio: 0.1, category: 'miscelaneo' },
            { searchTerms: ["proteina", "whey"], ratio: 0.1, category: 'proteina' }
        ]
    },

    // --- BIZCOCHOS Y PASTELES ---
    {
        name: "Brownie con Crema de Vainilla",
        type: "snack",
        ingredients: [
            { searchTerms: ["avena", "harina"], ratio: 0.4, category: 'carbohidrato' },
            { searchTerms: ["clara", "huevo"], ratio: 0.4, category: 'proteina' },
            { searchTerms: ["aceite oliva", "aceite coco"], ratio: 0.1, category: 'grasa' },
            { searchTerms: ["queso batido", "yogur griego"], ratio: 0.1, category: 'lacteo' }
        ]
    },
    {
        name: "Pastel de Manzana Fitness",
        type: "snack",
        ingredients: [
            { searchTerms: ["manzana"], ratio: 0.4, category: 'fruta' },
            { searchTerms: ["clara", "huevo"], ratio: 0.3, category: 'proteina' },
            { searchTerms: ["avena"], ratio: 0.2, category: 'carbohidrato' },
            { searchTerms: ["queso fresco", "queso batido", "yogur"], ratio: 0.1, category: 'lacteo' }
        ]
    },
    {
        name: "Bizcocho Jugoso Plátano y Coco",
        type: "snack",
        ingredients: [
            { searchTerms: ["platano", "banana"], ratio: 0.3, category: 'fruta' },
            { searchTerms: ["avena", "harina integral"], ratio: 0.3, category: 'carbohidrato' },
            { searchTerms: ["leche", "leche de soja", "leche de almendra"], ratio: 0.2, category: 'lacteo' },
            { searchTerms: ["coco", "coco rallado"], ratio: 0.1, category: 'miscelaneo' },
            { searchTerms: ["miel", "edulcorante"], ratio: 0.1, category: 'miscelaneo' }
        ]
    },
    {
        name: "Carrot Cake Donut",
        type: "snack",
        ingredients: [
            { searchTerms: ["zanahoria"], ratio: 0.3, category: 'verdura' },
            { searchTerms: ["avena"], ratio: 0.3, category: 'carbohidrato' },
            { searchTerms: ["huevo"], ratio: 0.2, category: 'proteina' },
            { searchTerms: ["nueces", "nuez"], ratio: 0.1, category: 'grasa' },
            { searchTerms: ["queso quark", "queso batido", "yogur griego"], ratio: 0.1, category: 'lacteo' }
        ]
    },
    {
        name: "Bizcocho Húmedo Stracciatella",
        type: "snack",
        ingredients: [
            { searchTerms: ["yogur", "desnatado", "yogur natural"], ratio: 0.3, category: 'lacteo' },
            { searchTerms: ["avena"], ratio: 0.3, category: 'carbohidrato' },
            { searchTerms: ["clara", "huevo"], ratio: 0.3, category: 'proteina' },
            { searchTerms: ["cacao", "chocolate chips"], ratio: 0.1, category: 'miscelaneo' }
        ]
    },
    {
        name: "Pastel de Queso y Manzana",
        type: "snack",
        ingredients: [
            { searchTerms: ["queso batido", "quark", "yogur griego", "queso cottage"], ratio: 0.4, category: 'lacteo' },
            { searchTerms: ["avena"], ratio: 0.3, category: 'carbohidrato' },
            { searchTerms: ["clara"], ratio: 0.2, category: 'proteina' },
            { searchTerms: ["manzana"], ratio: 0.1, category: 'fruta' }
        ]
    },
    {
        name: "Brownie Express en Sartén",
        type: "snack",
        ingredients: [
            { searchTerms: ["avena"], ratio: 0.3, category: 'carbohidrato' },
            { searchTerms: ["huevo"], ratio: 0.3, category: 'proteina' },
            { searchTerms: ["cacao"], ratio: 0.2, category: 'miscelaneo' },
            { searchTerms: ["leche"], ratio: 0.1, category: 'lacteo' },
            { searchTerms: ["nueces", "nuez"], ratio: 0.1, category: 'grasa' }
        ]
    },
    {
        name: "Tronco de Navidad Fit",
        type: "snack",
        ingredients: [
            { searchTerms: ["huevo"], ratio: 0.3, category: 'proteina' },
            { searchTerms: ["avena"], ratio: 0.3, category: 'carbohidrato' },
            { searchTerms: ["queso batido", "yogur griego"], ratio: 0.2, category: 'lacteo' },
            { searchTerms: ["cacao"], ratio: 0.2, category: 'miscelaneo' }
        ]
    },

    // --- POSTRES DE CUCHARA Y CREMAS ---
    {
        name: "Cheesecake en Vaso",
        type: "snack",
        ingredients: [
            { searchTerms: ["queso batido", "yogur griego", "queso cottage"], ratio: 0.5, category: 'lacteo' },
            { searchTerms: ["proteina", "whey"], ratio: 0.2, category: 'proteina' },
            { searchTerms: ["avena"], ratio: 0.2, category: 'carbohidrato' },
            { searchTerms: ["mermelada", "fresa"], ratio: 0.1, category: 'fruta' }
        ]
    },
    {
        name: "Pudding Proteico 3 Pisos",
        type: "snack",
        ingredients: [
            { searchTerms: ["proteina", "whey"], ratio: 0.4, category: 'proteina' },
            { searchTerms: ["crema cacahuete", "mani", "mantequilla mani"], ratio: 0.2, category: 'grasa' },
            { searchTerms: ["almendra", "harina almendra"], ratio: 0.2, category: 'grasa' },
            { searchTerms: ["leche"], ratio: 0.2, category: 'lacteo' }
        ]
    },
    {
        name: "Tarta Petit Suisse Fit",
        type: "snack",
        ingredients: [
            { searchTerms: ["queso batido", "yogur griego"], ratio: 0.4, category: 'lacteo' },
            { searchTerms: ["proteina", "fresa"], ratio: 0.3, category: 'proteina' },
            { searchTerms: ["avena"], ratio: 0.15, category: 'carbohidrato' },
            { searchTerms: ["clara"], ratio: 0.15, category: 'proteina' }
        ]
    },
    {
        name: "Mousse de Chocolate y Aguacate",
        type: "snack",
        ingredients: [
            { searchTerms: ["aguacate", "palta"], ratio: 0.5, category: 'grasa' },
            { searchTerms: ["clara", "huevo"], ratio: 0.2, category: 'proteina' },
            { searchTerms: ["avena"], ratio: 0.15, category: 'carbohidrato' },
            { searchTerms: ["cacao", "chocolate"], ratio: 0.15, category: 'miscelaneo' }
        ]
    },
    {
        name: "Flan de Huevo Saludable",
        type: "snack",
        ingredients: [
            { searchTerms: ["leche"], ratio: 0.6, category: 'lacteo' },
            { searchTerms: ["huevo", "yema"], ratio: 0.2, category: 'proteina' },
            { searchTerms: ["proteina", "whey"], ratio: 0.2, category: 'proteina' }
        ]
    },
    {
        name: "Flan Proteico de Chocolate",
        type: "snack",
        ingredients: [
            { searchTerms: ["queso fresco", "queso batido", "yogur griego"], ratio: 0.5, category: 'lacteo' },
            { searchTerms: ["leche"], ratio: 0.2, category: 'lacteo' },
            { searchTerms: ["proteina"], ratio: 0.2, category: 'proteina' },
            { searchTerms: ["cacao"], ratio: 0.1, category: 'miscelaneo' }
        ]
    },

    // --- HELADOS Y FRESCOS ---
    {
        name: "Stracciacookies Heladas",
        type: "snack",
        ingredients: [
            { searchTerms: ["queso batido", "yogur griego"], ratio: 0.3, category: 'lacteo' },
            { searchTerms: ["avena"], ratio: 0.3, category: 'carbohidrato' },
            { searchTerms: ["clara"], ratio: 0.2, category: 'proteina' },
            { searchTerms: ["chocolate", "negro"], ratio: 0.1, category: 'miscelaneo' },
            { searchTerms: ["proteina"], ratio: 0.1, category: 'proteina' }
        ]
    },
    {
        name: "Flan de Plátano y Fresa",
        type: "snack",
        ingredients: [
            { searchTerms: ["queso batido", "yogur griego"], ratio: 0.5, category: 'lacteo' },
            { searchTerms: ["platano", "banana"], ratio: 0.3, category: 'fruta' },
            { searchTerms: ["chocolate", "cacao"], ratio: 0.2, category: 'miscelaneo' }
        ]
    },
    {
        name: "Helado Proteico Vainilla/Choco",
        type: "snack",
        ingredients: [
            { searchTerms: ["queso batido", "yogur griego", "queso cottage"], ratio: 0.6, category: 'lacteo' },
            { searchTerms: ["yogur", "griego"], ratio: 0.2, category: 'lacteo' },
            { searchTerms: ["proteina"], ratio: 0.1, category: 'proteina' },
            { searchTerms: ["cacao"], ratio: 0.1, category: 'miscelaneo' }
        ]
    },
    {
        name: "Bombones Helados Proteicos",
        type: "snack",
        ingredients: [
            { searchTerms: ["queso batido", "yogur griego"], ratio: 0.4, category: 'lacteo' },
            { searchTerms: ["proteina"], ratio: 0.4, category: 'proteina' },
            { searchTerms: ["almendra", "nueces"], ratio: 0.2, category: 'grasa' }
        ]
    },
    {
        name: "Helado Plátano y Cacahuete",
        type: "snack",
        ingredients: [
            { searchTerms: ["yogur", "natural"], ratio: 0.4, category: 'lacteo' },
            { searchTerms: ["platano", "banana"], ratio: 0.4, category: 'fruta' },
            { searchTerms: ["crema cacahuete", "mani", "mantequilla mani"], ratio: 0.2, category: 'grasa' }
        ]
    },

    // --- GALLETAS, DONUTS Y BOCADITOS ---
    {
        name: "Enrollados Chocolateados",
        type: "snack",
        ingredients: [
            { searchTerms: ["avena"], ratio: 0.4, category: 'carbohidrato' },
            { searchTerms: ["clara", "huevo"], ratio: 0.3, category: 'proteina' },
            { searchTerms: ["queso batido", "yogur"], ratio: 0.2, category: 'lacteo' },
            { searchTerms: ["proteina"], ratio: 0.1, category: 'proteina' }
        ]
    },
    {
        name: "Tarta Choco-Cacahuete",
        type: "snack",
        ingredients: [
            { searchTerms: ["queso batido", "yogur griego"], ratio: 0.4, category: 'lacteo' },
            { searchTerms: ["avena"], ratio: 0.3, category: 'carbohidrato' },
            { searchTerms: ["crema cacahuete", "mantequilla mani"], ratio: 0.2, category: 'grasa' },
            { searchTerms: ["cacao"], ratio: 0.1, category: 'miscelaneo' }
        ]
    },
    {
        name: "Bocaditos de Plátano y Cacao",
        type: "snack",
        ingredients: [
            { searchTerms: ["platano", "banana"], ratio: 0.7, category: 'fruta' },
            { searchTerms: ["cacao", "chocolate"], ratio: 0.2, category: 'miscelaneo' },
            { searchTerms: ["aceite coco", "aceite oliva"], ratio: 0.1, category: 'grasa' }
        ]
    },
    {
        name: "Bizcochitos Rellenos",
        type: "snack",
        ingredients: [
            { searchTerms: ["avena"], ratio: 0.3, category: 'carbohidrato' },
            { searchTerms: ["clara", "huevo"], ratio: 0.3, category: 'proteina' },
            { searchTerms: ["leche"], ratio: 0.2, category: 'lacteo' },
            { searchTerms: ["queso batido", "yogur"], ratio: 0.1, category: 'lacteo' },
            { searchTerms: ["chocolate", "cacao"], ratio: 0.1, category: 'miscelaneo' }
        ]
    },
    {
        name: "Donuts Bombón Fit",
        type: "snack",
        ingredients: [
            { searchTerms: ["avena"], ratio: 0.3, category: 'carbohidrato' },
            { searchTerms: ["clara", "huevo"], ratio: 0.3, category: 'proteina' },
            { searchTerms: ["almendra", "harina almendra"], ratio: 0.2, category: 'grasa' },
            { searchTerms: ["chocolate"], ratio: 0.2, category: 'miscelaneo' }
        ]
    },
    {
        name: "Galletas Fitness",
        type: "snack",
        ingredients: [
            { searchTerms: ["leche"], ratio: 0.3, category: 'lacteo' },
            { searchTerms: ["avena", "integral"], ratio: 0.3, category: 'carbohidrato' },
            { searchTerms: ["clara", "huevo"], ratio: 0.2, category: 'proteina' },
            { searchTerms: ["proteina"], ratio: 0.2, category: 'proteina' }
        ]
    },
    {
        name: "Tartitas Arroz con Leche y Choco",
        type: "snack",
        ingredients: [
            { searchTerms: ["arroz", "integral"], ratio: 0.4, category: 'carbohidrato' },
            { searchTerms: ["leche"], ratio: 0.4, category: 'lacteo' },
            { searchTerms: ["huevo", "yema"], ratio: 0.1, category: 'proteina' },
            { searchTerms: ["cacao"], ratio: 0.1, category: 'miscelaneo' }
        ]
    },
    {
        name: "Crepes de Chocolate Fitness",
        type: "snack",
        ingredients: [
            { searchTerms: ["clara"], ratio: 0.5, category: 'proteina' },
            { searchTerms: ["avena"], ratio: 0.3, category: 'carbohidrato' },
            { searchTerms: ["cacao"], ratio: 0.1, category: 'miscelaneo' },
            { searchTerms: ["fresa", "fruta"], ratio: 0.1, category: 'fruta' }
        ]
    },
    {
        name: "Conchas Rellenas de Nutella Fit",
        type: "snack",
        ingredients: [
            { searchTerms: ["avena"], ratio: 0.5, category: 'carbohidrato' },
            { searchTerms: ["leche"], ratio: 0.2, category: 'lacteo' },
            { searchTerms: ["huevo"], ratio: 0.15, category: 'proteina' },
            { searchTerms: ["crema avellana", "cacao", "avellana"], ratio: 0.15, category: 'grasa' }
        ]
    },
    {
        name: "Gofres de Plátano",
        type: "snack",
        ingredients: [
            { searchTerms: ["avena"], ratio: 0.3, category: 'carbohidrato' },
            { searchTerms: ["platano", "banana"], ratio: 0.3, category: 'fruta' },
            { searchTerms: ["huevo", "clara"], ratio: 0.2, category: 'proteina' },
            { searchTerms: ["leche"], ratio: 0.2, category: 'lacteo' }
        ]
    },
    {
        name: "Mil Hojas de Avena y Fresa",
        type: "snack",
        ingredients: [
            { searchTerms: ["avena"], ratio: 0.4, category: 'carbohidrato' },
            { searchTerms: ["clara"], ratio: 0.3, category: 'proteina' },
            { searchTerms: ["queso batido", "yogur"], ratio: 0.2, category: 'lacteo' },
            { searchTerms: ["fresa", "frambuesa"], ratio: 0.1, category: 'fruta' }
        ]
    },
    {
        name: "Bizcocho Choco-Coco-Zanahoria",
        type: "snack",
        ingredients: [
            { searchTerms: ["avena"], ratio: 0.3, category: 'carbohidrato' },
            { searchTerms: ["zanahoria"], ratio: 0.2, category: 'verdura' },
            { searchTerms: ["coco", "coco rallado"], ratio: 0.15, category: 'miscelaneo' },
            { searchTerms: ["huevo", "clara"], ratio: 0.2, category: 'proteina' },
            { searchTerms: ["proteina", "cacao"], ratio: 0.15, category: 'miscelaneo' }
        ]
    },
    {
        name: "Bombones de Proteína y Cacahuete",
        type: "snack",
        ingredients: [
            { searchTerms: ["crema cacahuete", "mani", "mantequilla mani"], ratio: 0.4, category: 'grasa' },
            { searchTerms: ["proteina"], ratio: 0.4, category: 'proteina' },
            { searchTerms: ["cacao"], ratio: 0.1, category: 'miscelaneo' },
            { searchTerms: ["cacahuete", "mani"], ratio: 0.1, category: 'grasa' }
        ]
    },
    {
        name: "Turrón de Avellanas Fit",
        type: "snack",
        ingredients: [
            { searchTerms: ["cacao", "chocolate puro"], ratio: 0.5, category: 'miscelaneo' },
            { searchTerms: ["avellana"], ratio: 0.3, category: 'grasa' },
            { searchTerms: ["leche"], ratio: 0.2, category: 'lacteo' }
        ]
    },
    {
        name: "Rosquillas Naranja y Cacao",
        type: "snack",
        ingredients: [
            { searchTerms: ["avena"], ratio: 0.4, category: 'carbohidrato' },
            { searchTerms: ["yogur"], ratio: 0.2, category: 'lacteo' },
            { searchTerms: ["huevo"], ratio: 0.1, category: 'proteina' },
            { searchTerms: ["naranja", "zumo naranja", "jugo naranja"], ratio: 0.1, category: 'fruta' },
            { searchTerms: ["cacao"], ratio: 0.1, category: 'miscelaneo' },
            { searchTerms: ["aceite coco"], ratio: 0.1, category: 'grasa' }
        ]
    },
    {
        name: "Donettes Fitness Glaseados",
        type: "snack",
        ingredients: [
            { searchTerms: ["clara"], ratio: 0.4, category: 'proteina' },
            { searchTerms: ["avena"], ratio: 0.3, category: 'carbohidrato' },
            { searchTerms: ["yogur"], ratio: 0.1, category: 'lacteo' },
            { searchTerms: ["huevo"], ratio: 0.1, category: 'proteina' },
            { searchTerms: ["cacao"], ratio: 0.1, category: 'miscelaneo' }
        ]
    }
];

// Helper: Get a random snack recipe
export function getRandomSnackRecipe(): SnackRecipe {
    return FITNESS_DESSERT_RECIPES[Math.floor(Math.random() * FITNESS_DESSERT_RECIPES.length)];
}
