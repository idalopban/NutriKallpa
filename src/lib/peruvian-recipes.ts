export type MealType = 'desayuno' | 'almuerzo' | 'cena';
export type Category = 'proteina' | 'carbohidrato' | 'grasa' | 'verdura' | 'fruta' | 'lacteo' | 'miscelaneo';

export interface RecipeComponent {
    category: Category;
    searchTerms: string[]; // El sistema buscará en el CSV en este orden hasta encontrar match
    ratio: number; // Peso relativo del ingrediente en el plato (0.0 - 1.0)
}

export interface PeruvianRecipe {
    id: string;
    name: string;
    mealTypes: MealType[];
    ingredients: RecipeComponent[];
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
        ]
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
        ]
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
        ]
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
        ]
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
        id: 'alm-caigua-rellena',
        name: 'Caigua Rellena',
        mealTypes: ['almuerzo', 'cena'],
        ingredients: [
            { category: 'verdura', searchTerms: ['Caigua', 'Caigua serrana'], ratio: 1.0 },
            { category: 'proteina', searchTerms: ['Res, carne molida', 'Res', 'Pollo'], ratio: 0.8 },
            { category: 'carbohidrato', searchTerms: ['Arroz blanco'], ratio: 0.4 },
            { category: 'verdura', searchTerms: ['Cebolla', 'Pasas'], ratio: 0.2 },
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
        id: 'alm-tallarin-verde',
        name: 'Tallarines Verdes con Bistec',
        mealTypes: ['almuerzo'],
        ingredients: [
            { category: 'proteina', searchTerms: ['Res, carne pulpa', 'Bisteck', 'Hígado'], ratio: 1.0 },
            { category: 'carbohidrato', searchTerms: ['Fideo tallarín', 'Espagueti'], ratio: 1.0 },
            { category: 'verdura', searchTerms: ['Espinaca', 'Albahaca'], ratio: 0.4 },
            { category: 'lacteo', searchTerms: ['Leche evaporada', 'Queso fresco'], ratio: 0.2 },
            { category: 'grasa', searchTerms: ['Aceite'], ratio: 0.1 }
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
    }
];
