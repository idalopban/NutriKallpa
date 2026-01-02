// ============================================================================
// BRANDED TYPES FOR NUTRITIONAL UNITS
// Prevents accidental unit confusion (50g protein ≠ 50mg)
// These are compile-time only - no runtime overhead
// ============================================================================

/** Represents a value in grams */
export type Grams = number & { readonly __brand: 'grams' };

/** Represents a value in kilocalories */
export type Kcal = number & { readonly __brand: 'kcal' };

/** Represents a value in milligrams */
export type Milligrams = number & { readonly __brand: 'mg' };

/** Represents a value in micrograms */
export type Micrograms = number & { readonly __brand: 'µg' };

// Helper functions to create branded values (zero runtime cost after compilation)
export const grams = (value: number): Grams => value as Grams;
export const kcal = (value: number): Kcal => value as Kcal;
export const mg = (value: number): Milligrams => value as Milligrams;
export const mcg = (value: number): Micrograms => value as Micrograms;

// ============================================================================
// NUTRITIONAL ROUNDING UTILITIES
// Prevents floating-point accumulation errors in macro calculations
// ============================================================================

/**
 * Rounds a nutritional value to the specified decimals.
 * Use at the END of calculations, not in intermediate steps.
 * 
 * @param value - The value to round
 * @param decimals - Number of decimal places (default: 1)
 * @returns Rounded value
 */
export function roundNutritional(value: number, decimals: number = 1): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

/**
 * Rounds calories to whole number (no decimals needed for kcal)
 */
export function roundCalories(value: number): number {
    return Math.round(value);
}

/**
 * Rounds macros to 1 decimal (standard nutritional precision)
 */
export function roundMacro(value: number): number {
    return roundNutritional(value, 1);
}

/**
 * Rounds micros to 2 decimals (for vitamins/minerals)
 */
export function roundMicro(value: number): number {
    return roundNutritional(value, 2);
}

// ============================================================================
// ALIMENTO INTERFACE (Food Data Structure)
// ============================================================================

export interface Alimento {
    codigo: string;
    nombre: string;
    energia: number; // kcal (Branded: Kcal)
    agua: number; // g (Branded: Grams)
    proteinas: number; // g (Branded: Grams)
    grasa: number; // g (Branded: Grams)
    carbohidratos: number; // g (Branded: Grams)
    fibra: number; // g (Branded: Grams)
    cenizas: number; // g (Branded: Grams)
    calcio: number; // mg (Branded: Milligrams)
    fosforo: number; // mg (Branded: Milligrams)
    zinc: number; // mg (Branded: Milligrams)
    hierro: number; // mg (Branded: Milligrams)
    betaCaroteno: number; // µg (Branded: Micrograms)
    vitaminaA: number; // µg (Branded: Micrograms)
    tiamina: number; // mg (B1) (Branded: Milligrams)
    riboflavina: number; // mg (B2) (Branded: Milligrams)
    niacina: number; // mg (B3) (Branded: Milligrams)
    vitaminaC: number; // mg (Branded: Milligrams)
    acidoFolico: number; // µg (Branded: Micrograms)
    sodio: number; // mg (Branded: Milligrams)
    potasio: number; // mg (Branded: Milligrams)
    factorDesecho: number; // Factor for gross weight (e.g. 1.2 for 20% waste)
}

export async function parseAlimentosCSV(): Promise<Alimento[]> {
    try {
        const response = await fetch('/alimentos.csv');
        const text = await response.text();

        const lines = text.split('\n');
        const alimentos: Alimento[] = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(';');

            // Basic validation: needs enough columns and first col should not be empty
            // CSV includes indices up to 23 (24 columns). Require at least 24 columns.
            if (parts.length < 24 || !parts[0]) continue;

            // Helper to clean string (remove quotes)
            const clean = (s: string) => s?.replace(/^"|"$/g, '').trim() || '';
            const parseNum = (s: string) => {
                if (!s || s === '-' || s === '') return 0;
                const cleaned = clean(s).replace(',', '.'); // Handle decimal comma
                return parseFloat(cleaned) || 0;
            };

            // Skip lines that don't look like data (e.g. units row)
            // Data rows start with a code like A1, B1, etc.
            if (!/^[A-Z][0-9]+/.test(clean(parts[0]))) continue;

            // Mapping based on CSV structure:
            // 0: CÓDIGO
            // 1: NOMBRE
            // 2: Energía (kcal)
            // 3: Energía (kJ)
            // 4: Agua
            // 5: Proteínas
            // 6: Grasa total
            // 7: Carbohidratos totales
            // 8: Carbohidratos disponibles
            // 9: Fibra dietaria
            // 10: Cenizas
            // 11: Calcio
            // 12: Fósforo
            // 13: Zinc
            // 14: Hierro
            // 15: Beta caroteno
            // 16: Vitamina A
            // 17: Tiamina (B1)
            // 18: Riboflavina (B2)
            // 19: Niacina (B3)
            // 20: Vitamina C
            // 21: Ácido fólico
            // 22: Sodio
            // 23: Potasio

            const alimento: Alimento = {
                codigo: clean(parts[0]),
                nombre: clean(parts[1]),
                energia: parseNum(parts[2]),
                agua: parseNum(parts[4]),
                proteinas: parseNum(parts[5]),
                grasa: parseNum(parts[6]),
                carbohidratos: parseNum(parts[7]), // Using Total Carbs
                fibra: parseNum(parts[9]),
                cenizas: parseNum(parts[10]),
                calcio: parseNum(parts[11]),
                fosforo: parseNum(parts[12]),
                zinc: parseNum(parts[13]),
                hierro: parseNum(parts[14]),
                betaCaroteno: parseNum(parts[15]),
                vitaminaA: parseNum(parts[16]),
                tiamina: parseNum(parts[17]),
                riboflavina: parseNum(parts[18]),
                niacina: parseNum(parts[19]),
                vitaminaC: parseNum(parts[20]),
                acidoFolico: parseNum(parts[21]),
                sodio: parseNum(parts[22]),
                potasio: parseNum(parts[23]),
                factorDesecho: parseNum(parts[24]) || 1.0 // Optional 25th column or default
            };

            alimentos.push(alimento);
        }

        return alimentos;
    } catch (error) {
        console.error("Error parsing CSV:", error);
        return [];
    }
}
