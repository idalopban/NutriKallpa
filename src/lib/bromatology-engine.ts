/**
 * Bromatology Engine
 * 
 * Provides conversion functions for:
 * - Raw → Cooked weights using cooking factors
 * - Grams → Household measures (cups, tablespoons, portions)
 * - Generation of patient-friendly descriptions
 * 
 * Based on TPCA (Tabla Peruana de Composición de Alimentos) and
 * TAFERA (Tabla de Factores de Conversión y Medidas Caseras)
 */

import { createBrowserClient } from '@/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export type CookingMethod = 'boiled' | 'grilled' | 'fried' | 'steamed' | 'baked' | 'roasted' | 'raw' | 'microwave';
export type FoodState = 'crudo' | 'cocido' | 'preparado' | 'listo';

/**
 * Result of the bromatological conversion
 */
export interface BromatologyConversion {
    // Weights in grams
    pesoCrudo: number;        // Input: what the system calculated (raw grams)
    pesoCocido: number;       // After cooking factor applied
    pesoBruto: number;        // For shopping list (includes waste factor)

    // Household measure for patient PDF
    medidaCasera: string;     // "Aprox. 2 tazas"
    descripcion: string;      // "2 tazas de arroz cocido, colmadas"

    // Metadata
    factorCoccion: number;
    factorDesecho: number;
    metodoCoccion: CookingMethod;
    tipoConversion: 'expansion' | 'contraction' | 'none';
}

/**
 * Cooking factor from database
 */
interface CookingFactor {
    factor_peso: number;
    tipo: 'cooking_expansion' | 'cooking_contraction';
    notas: string | null;
}

/**
 * Household measure from database
 */
interface HouseholdMeasure {
    medida_nombre: string;
    gramos_equivalentes: number;
    descripcion: string | null;
    estado: FoodState;
}

// ============================================================================
// LOCAL FALLBACK DATA
// When database is unavailable, use these common factors
// ============================================================================

const LOCAL_COOKING_FACTORS: Record<string, Record<CookingMethod, number>> = {
    // Cereals (expansion)
    'arroz': { boiled: 2.8, grilled: 1.0, fried: 1.2, steamed: 2.5, baked: 1.0, roasted: 1.0, raw: 1.0, microwave: 2.6 },
    'quinua': { boiled: 2.7, grilled: 1.0, fried: 1.0, steamed: 2.5, baked: 1.0, roasted: 1.0, raw: 1.0, microwave: 2.5 },
    'avena': { boiled: 4.0, grilled: 1.0, fried: 1.0, steamed: 3.0, baked: 1.0, roasted: 1.0, raw: 1.0, microwave: 3.5 },
    'fideo': { boiled: 2.25, grilled: 1.0, fried: 1.0, steamed: 2.0, baked: 1.0, roasted: 1.0, raw: 1.0, microwave: 2.0 },
    'tallarin': { boiled: 2.2, grilled: 1.0, fried: 1.0, steamed: 2.0, baked: 1.0, roasted: 1.0, raw: 1.0, microwave: 2.0 },

    // Legumes (expansion)
    'lenteja': { boiled: 2.5, grilled: 1.0, fried: 1.0, steamed: 2.3, baked: 1.0, roasted: 1.0, raw: 1.0, microwave: 2.3 },
    'frejol': { boiled: 2.3, grilled: 1.0, fried: 1.0, steamed: 2.0, baked: 1.0, roasted: 1.0, raw: 1.0, microwave: 2.0 },
    'garbanzo': { boiled: 2.2, grilled: 1.0, fried: 1.0, steamed: 2.0, baked: 1.0, roasted: 1.0, raw: 1.0, microwave: 2.0 },

    // Tubers (minimal change)
    'papa': { boiled: 1.05, grilled: 0.95, fried: 0.85, steamed: 1.02, baked: 0.92, roasted: 0.90, raw: 1.0, microwave: 0.98 },
    'camote': { boiled: 1.08, grilled: 0.95, fried: 0.85, steamed: 1.05, baked: 0.90, roasted: 0.90, raw: 1.0, microwave: 0.98 },
    'yuca': { boiled: 1.10, grilled: 0.95, fried: 0.80, steamed: 1.05, baked: 0.90, roasted: 0.88, raw: 1.0, microwave: 1.0 },

    // Proteins (contraction)
    'pollo': { boiled: 0.85, grilled: 0.75, fried: 0.80, steamed: 0.88, baked: 0.78, roasted: 0.75, raw: 1.0, microwave: 0.82 },
    'pechuga': { boiled: 0.85, grilled: 0.75, fried: 0.80, steamed: 0.88, baked: 0.78, roasted: 0.75, raw: 1.0, microwave: 0.82 },
    'carne': { boiled: 0.80, grilled: 0.70, fried: 0.75, steamed: 0.85, baked: 0.72, roasted: 0.72, raw: 1.0, microwave: 0.78 },
    'res': { boiled: 0.80, grilled: 0.70, fried: 0.75, steamed: 0.85, baked: 0.72, roasted: 0.72, raw: 1.0, microwave: 0.78 },
    'pescado': { boiled: 0.85, grilled: 0.80, fried: 0.78, steamed: 0.88, baked: 0.82, roasted: 0.80, raw: 1.0, microwave: 0.85 },

    // Eggs (minimal)
    'huevo': { boiled: 0.98, grilled: 0.95, fried: 0.90, steamed: 0.98, baked: 0.95, roasted: 0.95, raw: 1.0, microwave: 0.95 },
};

const LOCAL_HOUSEHOLD_MEASURES: Record<string, { medida: string; gramos: number; estado: FoodState }[]> = {
    'arroz': [
        { medida: 'taza', gramos: 140, estado: 'cocido' },
        { medida: 'cucharada', gramos: 15, estado: 'cocido' },
        { medida: 'porcion', gramos: 180, estado: 'cocido' },
    ],
    'papa': [
        { medida: 'unidad', gramos: 150, estado: 'cocido' },
        { medida: 'porcion', gramos: 200, estado: 'cocido' },
    ],
    'pollo': [
        { medida: 'filete', gramos: 150, estado: 'cocido' },
        { medida: 'porcion', gramos: 100, estado: 'cocido' },
    ],
    'pechuga': [
        { medida: 'filete', gramos: 150, estado: 'cocido' },
        { medida: 'porcion', gramos: 100, estado: 'cocido' },
    ],
    'huevo': [
        { medida: 'unidad', gramos: 50, estado: 'cocido' },
    ],
    'lenteja': [
        { medida: 'taza', gramos: 180, estado: 'cocido' },
        { medida: 'porcion', gramos: 150, estado: 'cocido' },
    ],
    'frejol': [
        { medida: 'taza', gramos: 170, estado: 'cocido' },
    ],
    'quinua': [
        { medida: 'taza', gramos: 130, estado: 'cocido' },
        { medida: 'porcion', gramos: 150, estado: 'cocido' },
    ],
    'avena': [
        { medida: 'taza', gramos: 200, estado: 'cocido' },
        { medida: 'cucharada', gramos: 10, estado: 'crudo' },
    ],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format a decimal number as a user-friendly fraction
 * Examples: 1.25 → "1¼", 2.5 → "2½", 0.75 → "¾"
 */
function formatFraction(num: number): string {
    const integer = Math.floor(num);
    const decimal = num - integer;

    const fractionMap: Record<number, string> = {
        0: '',
        0.25: '¼',
        0.5: '½',
        0.75: '¾',
    };

    // Round to nearest quarter
    const roundedDecimal = Math.round(decimal * 4) / 4;
    const fraction = fractionMap[roundedDecimal] || '';

    if (integer === 0) return fraction || '0';
    return fraction ? `${integer}${fraction}` : `${integer}`;
}

/**
 * Get cooking factor from local cache
 */
function getLocalCookingFactor(foodName: string, method: CookingMethod): number {
    const name = foodName.toLowerCase();

    for (const [key, factors] of Object.entries(LOCAL_COOKING_FACTORS)) {
        if (name.includes(key)) {
            return factors[method] || 1.0;
        }
    }

    return 1.0; // Default: no change
}

/**
 * Get household measures from local cache
 */
function getLocalHouseholdMeasures(foodName: string, estado: FoodState): { medida: string; gramos: number }[] {
    const name = foodName.toLowerCase();

    for (const [key, measures] of Object.entries(LOCAL_HOUSEHOLD_MEASURES)) {
        if (name.includes(key)) {
            return measures
                .filter(m => m.estado === estado)
                .map(m => ({ medida: m.medida, gramos: m.gramos }));
        }
    }

    return [];
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Convert raw grams to cooked weight and household measure
 * 
 * Example:
 * Input: 100g of raw rice, method "boiled"
 * Output: {
 *   pesoCrudo: 100,
 *   pesoCocido: 280,          // 100 × 2.8
 *   medidaCasera: "2 tazas",  // 280g ÷ 140g/cup
 *   descripcion: "Aprox. 2 tazas de arroz cocido"
 * }
 */
export async function convertirParaPaciente(
    codigoTpca: string | null,
    alimentoNombre: string,
    gramosCrudos: number,
    metodoCoccion: CookingMethod = 'boiled',
    factorDesecho: number = 1.0
): Promise<BromatologyConversion> {
    const supabase = createBrowserClient();

    let factorCoccion = 1.0;
    let tipoConversion: 'expansion' | 'contraction' | 'none' = 'none';

    // 1. Try to get cooking factor from database
    if (codigoTpca) {
        const { data: factorData } = await supabase
            .from('factores_conversion')
            .select('factor_peso, tipo, notas')
            .eq('codigo_tpca', codigoTpca)
            .eq('metodo_coccion', metodoCoccion)
            .single();

        if (factorData) {
            factorCoccion = factorData.factor_peso;
            tipoConversion = factorData.tipo === 'cooking_expansion' ? 'expansion' : 'contraction';
        }
    }

    // 2. Fallback to local cache if no DB result
    if (factorCoccion === 1.0 && tipoConversion === 'none') {
        factorCoccion = getLocalCookingFactor(alimentoNombre, metodoCoccion);
        tipoConversion = factorCoccion > 1.0 ? 'expansion' : factorCoccion < 1.0 ? 'contraction' : 'none';
    }

    // 3. Calculate weights
    const pesoCocido = Math.round(gramosCrudos * factorCoccion);
    const pesoBruto = Math.round(gramosCrudos * factorDesecho);

    // 4. Get best household measure
    let medidaCasera = `${pesoCocido}g`;
    let descripcion = `${pesoCocido}g de ${alimentoNombre} cocido`;

    // Try database first
    if (codigoTpca) {
        const { data: medidasData } = await supabase
            .from('medidas_caseras_tafera')
            .select('medida_nombre, gramos_equivalentes, descripcion')
            .eq('codigo_tpca', codigoTpca)
            .eq('estado', 'cocido')
            .order('gramos_equivalentes', { ascending: false });

        if (medidasData && medidasData.length > 0) {
            const bestMeasure = findBestMeasure(pesoCocido, medidasData);
            if (bestMeasure) {
                medidaCasera = bestMeasure.formatted;
                descripcion = bestMeasure.descripcion;
            }
        }
    }

    // Fallback to local cache
    if (medidaCasera === `${pesoCocido}g`) {
        const localMeasures = getLocalHouseholdMeasures(alimentoNombre, 'cocido');
        if (localMeasures.length > 0) {
            const bestMeasure = findBestMeasure(
                pesoCocido,
                localMeasures.map(m => ({
                    medida_nombre: m.medida,
                    gramos_equivalentes: m.gramos,
                    descripcion: null
                }))
            );
            if (bestMeasure) {
                medidaCasera = bestMeasure.formatted;
                descripcion = `Aprox. ${bestMeasure.formatted} de ${alimentoNombre} cocido`;
            }
        }
    }

    return {
        pesoCrudo: gramosCrudos,
        pesoCocido,
        pesoBruto,
        medidaCasera,
        descripcion,
        factorCoccion,
        factorDesecho,
        metodoCoccion,
        tipoConversion
    };
}

/**
 * Find the best matching household measure for a given weight
 */
function findBestMeasure(
    grams: number,
    measures: { medida_nombre: string; gramos_equivalentes: number; descripcion: string | null }[]
): { formatted: string; descripcion: string } | null {
    if (measures.length === 0) return null;

    // Sort by how close to 1-2 units the result would be
    const sorted = [...measures].sort((a, b) => {
        const unitsA = grams / a.gramos_equivalentes;
        const unitsB = grams / b.gramos_equivalentes;
        // Prefer values close to 1.5 (between 1 and 2 units)
        return Math.abs(unitsA - 1.5) - Math.abs(unitsB - 1.5);
    });

    const best = sorted[0];
    const units = grams / best.gramos_equivalentes;

    // Only use if result is between 0.25 and 10 units
    if (units < 0.25 || units > 10) return null;

    // Round to nearest quarter
    const roundedUnits = Math.round(units * 4) / 4;
    const formattedUnits = formatFraction(roundedUnits);

    // Pluralize if needed
    const measurePlural = roundedUnits > 1 && !best.medida_nombre.endsWith('s')
        ? best.medida_nombre + 's'
        : best.medida_nombre;

    return {
        formatted: `${formattedUnits} ${measurePlural}`,
        descripcion: best.descripcion || `Aprox. ${formattedUnits} ${measurePlural}`
    };
}

/**
 * Convert a list of meal items for patient-facing PDF
 * Adds household measures to each item
 */
export async function convertMealItemsForPatient(
    items: Array<{
        food: { nombre: string; codigo?: string; factorDesecho?: number };
        quantity: number;
        category: string;
    }>,
    defaultMethod: CookingMethod = 'boiled'
): Promise<Array<{
    original: typeof items[0];
    conversion: BromatologyConversion;
}>> {
    const results = await Promise.all(
        items.map(async (item) => {
            // Determine cooking method by category
            let method = defaultMethod;
            if (item.category === 'proteina') {
                method = 'grilled';
            } else if (item.category === 'fruta' || item.category === 'verdura') {
                method = 'raw';
            }

            const conversion = await convertirParaPaciente(
                item.food.codigo || null,
                item.food.nombre,
                item.quantity,
                method,
                item.food.factorDesecho || 1.0
            );

            return { original: item, conversion };
        })
    );

    return results;
}

/**
 * Synchronous version using only local cache (for SSR/fast rendering)
 */
export function convertirParaPacienteSync(
    alimentoNombre: string,
    gramosCrudos: number,
    metodoCoccion: CookingMethod = 'boiled',
    factorDesecho: number = 1.0
): BromatologyConversion {
    const factorCoccion = getLocalCookingFactor(alimentoNombre, metodoCoccion);
    const tipoConversion: 'expansion' | 'contraction' | 'none' =
        factorCoccion > 1.0 ? 'expansion' : factorCoccion < 1.0 ? 'contraction' : 'none';

    const pesoCocido = Math.round(gramosCrudos * factorCoccion);
    const pesoBruto = Math.round(gramosCrudos * factorDesecho);

    let medidaCasera = `${pesoCocido}g`;
    let descripcion = `${pesoCocido}g de ${alimentoNombre} cocido`;

    const localMeasures = getLocalHouseholdMeasures(alimentoNombre, 'cocido');
    if (localMeasures.length > 0) {
        const bestMeasure = findBestMeasure(
            pesoCocido,
            localMeasures.map(m => ({
                medida_nombre: m.medida,
                gramos_equivalentes: m.gramos,
                descripcion: null
            }))
        );
        if (bestMeasure) {
            medidaCasera = bestMeasure.formatted;
            descripcion = `Aprox. ${bestMeasure.formatted} de ${alimentoNombre} cocido`;
        }
    }

    return {
        pesoCrudo: gramosCrudos,
        pesoCocido,
        pesoBruto,
        medidaCasera,
        descripcion,
        factorCoccion,
        factorDesecho,
        metodoCoccion,
        tipoConversion
    };
}
