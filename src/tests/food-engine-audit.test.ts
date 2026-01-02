import { describe, it, expect } from 'vitest';
import { calculateCookedQuantity, calculateGrossQuantity, calculateMealStats, MealItem } from '../lib/diet-generator';
import { Alimento } from '../lib/food-service';

describe('Auditoría Bromatológica - Motor de Alimentos', () => {

    const mockAlimento: Alimento = {
        codigo: 'A1',
        nombre: 'Alimento Base',
        energia: 100,
        agua: 0,
        proteinas: 20,
        grasa: 5,
        carbohidratos: 50,
        fibra: 2,
        cenizas: 0,
        calcio: 0,
        fosforo: 0,
        zinc: 0,
        hierro: 0,
        betaCaroteno: 0,
        vitaminaA: 0,
        tiamina: 0,
        riboflavina: 0,
        niacina: 0,
        vitaminaC: 0,
        acidoFolico: 0,
        sodio: 0,
        potasio: 0,
        factorDesecho: 1.25
    };

    // Caso 1: Expansión de Carbohidratos (Arroz vs Papa)
    it('debe calcular expansión diferenciada (Grasas vs Tubérculos)', () => {
        const rawQty = 100;

        // 1. Arroz (Grano) -> Factor 2.8
        const riceQty = calculateCookedQuantity(rawQty, 'carbohidrato', 'Arroz Blanco', 'boiled');
        expect(riceQty).toBe(280);

        // 2. Papa (Tubérculo) -> Factor 1.05
        const papaQty = calculateCookedQuantity(rawQty, 'carbohidrato', 'Papa Blanca', 'boiled');
        expect(papaQty).toBe(105);
    });

    // Caso 2: Contracción de Proteínas y Conservación de Macros
    it('debe mantener los macros de la carne cruda a pesar de la pérdida por cocción', () => {
        const rawQty = 150;
        const mealItem: MealItem = {
            id: '1',
            food: { ...mockAlimento, proteinas: 20 },
            quantity: rawQty,
            category: 'proteina'
        };

        // 1. Verificar contracción (Grilled 0.75)
        const cookedQty = calculateCookedQuantity(rawQty, 'proteina', 'Pollo', 'grilled');
        expect(cookedQty).toBe(Math.round(150 * 0.75)); // 113

        // 2. Verificar que los macros se calculan sobre el peso CRUDO
        const stats = calculateMealStats([mealItem]);
        expect(stats.macros.protein).toBeCloseTo(30, 1);
    });

    // Caso 3: Factor de Desecho
    it('debe calcular el Peso Bruto de compra correctamente', () => {
        expect(calculateGrossQuantity(100, 1.2)).toBe(120);
        expect(calculateGrossQuantity(100, 1.5)).toBe(150);
    });
});
