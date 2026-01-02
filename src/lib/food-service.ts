'use server';

/**
 * food-service.ts
 * 
 * Server-side food data service with caching.
 * Moves CSV parsing from client to server for better performance.
 */

import { cache } from 'react';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Re-export the Alimento type
export interface Alimento {
    codigo: string;
    nombre: string;
    energia: number; // kcal
    agua: number; // g
    proteinas: number; // g
    grasa: number; // g
    carbohidratos: number; // g
    fibra: number; // g
    cenizas: number; // g
    calcio: number; // mg
    fosforo: number; // mg
    zinc: number; // mg
    hierro: number; // mg
    betaCaroteno: number; // µg
    vitaminaA: number; // µg
    tiamina: number; // mg (B1)
    riboflavina: number; // mg (B2)
    niacina: number; // mg (B3)
    vitaminaC: number; // mg
    acidoFolico: number; // µg
    sodio: number; // mg
    potasio: number; // mg
    factorDesecho: number; // Factor to calculate net weight (Crudo / Neto)
}

/**
 * Parse CSV content into Alimento array
 * Pure function - can be used both server and client side
 */
function parseCSVContent(text: string): Alimento[] {
    const lines = text.split('\n');
    const alimentos: Alimento[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(';');

        // Needs at least 24 columns
        if (parts.length < 24 || !parts[0]) continue;

        const clean = (s: string) => s?.replace(/^"|"$/g, '').trim() || '';
        const parseNum = (s: string) => {
            if (!s || s === '-' || s === '') return 0;
            const cleaned = clean(s).replace(',', '.');
            return parseFloat(cleaned) || 0;
        };

        // Skip non-data rows (units header, etc.)
        if (!/^[A-Z][0-9]+/.test(clean(parts[0]))) continue;

        const alimento: Alimento = {
            codigo: clean(parts[0]),
            nombre: clean(parts[1]),
            energia: parseNum(parts[2]),
            agua: parseNum(parts[4]),
            proteinas: parseNum(parts[5]),
            grasa: parseNum(parts[6]),
            carbohidratos: parseNum(parts[7]),
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
            factorDesecho: parts[24] ? parseNum(parts[24]) : 1.0 // Assume Col 25 is factorDesecho or default to 1
        };

        alimentos.push(alimento);
    }

    return alimentos;
}

// In-memory cache for server-side
let cachedFoods: Alimento[] | null = null;

/**
 * Get all foods from CSV - SERVER SIDE with caching
 * Uses React cache() for request deduplication + in-memory cache for persistence
 */
export const getFoodsServer = cache(async (): Promise<Alimento[]> => {
    // Return cached if available
    if (cachedFoods && cachedFoods.length > 0) {
        return cachedFoods;
    }

    try {
        // Read from filesystem (server-side only)
        const filePath = join(process.cwd(), 'public', 'alimentos.csv');

        if (!existsSync(filePath)) {
            console.error('[FOOD_SERVICE] CSV file not found at:', filePath);
            return [];
        }

        const text = readFileSync(filePath, 'utf-8');
        cachedFoods = parseCSVContent(text);

        console.log(`[FOOD_SERVICE] Loaded ${cachedFoods.length} foods from CSV (server-side)`);
        return cachedFoods;
    } catch (error) {
        console.error('[FOOD_SERVICE] Error loading foods:', error);
        return [];
    }
});

/**
 * Server Action: Get all foods (can be called from Client Components)
 */
export async function getAllFoods(): Promise<Alimento[]> {
    return getFoodsServer();
}

/**
 * Server Action: Search foods by name
 */
export async function searchFoods(query: string): Promise<Alimento[]> {
    const foods = await getFoodsServer();
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) return foods.slice(0, 50); // Return first 50 if no query

    return foods.filter(f =>
        f.nombre.toLowerCase().includes(normalizedQuery)
    ).slice(0, 100); // Limit results
}

/**
 * Server Action: Get food by code
 */
export async function getFoodByCode(code: string): Promise<Alimento | null> {
    const foods = await getFoodsServer();
    return foods.find(f => f.codigo === code) || null;
}

/**
 * Clear the food cache (useful for development/testing)
 */
export async function clearFoodCache(): Promise<void> {
    cachedFoods = null;
}
