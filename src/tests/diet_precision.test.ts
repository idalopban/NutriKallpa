import { describe, it, expect } from 'vitest'
import { generateSmartDailyPlan } from '../lib/diet-generator'
import { Alimento } from '../lib/csv-parser'

const mockFoods: Alimento[] = [
    // Proteins
    { codigo: 'A1', nombre: 'Huevo', energia: 155, proteinas: 13, grasa: 11, carbohidratos: 1.1, agua: 75, fibra: 0, cenizas: 1, calcio: 50, fosforo: 100, zinc: 1, hierro: 1, betaCaroteno: 0, vitaminaA: 100, tiamina: 0.1, riboflavina: 0.5, niacina: 0.1, vitaminaC: 0, acidoFolico: 40, sodio: 120, potasio: 130, factorDesecho: 1.1 },
    { codigo: 'A4', nombre: 'Pollo pechuga', energia: 120, proteinas: 23, grasa: 2.5, carbohidratos: 0, agua: 74, fibra: 0, cenizas: 1, calcio: 10, fosforo: 200, zinc: 1, hierro: 1, betaCaroteno: 0, vitaminaA: 10, tiamina: 0.1, riboflavina: 0.1, niacina: 10, vitaminaC: 0, acidoFolico: 5, sodio: 65, potasio: 300, factorDesecho: 1.25 },
    // Carbs
    { codigo: 'B1', nombre: 'Arroz blanco cocido', energia: 130, proteinas: 2.7, grasa: 0.3, carbohidratos: 28, agua: 68, fibra: 0.4, cenizas: 0.5, calcio: 10, fosforo: 40, zinc: 0.5, hierro: 0.2, betaCaroteno: 0, vitaminaA: 0, tiamina: 0.02, riboflavina: 0.01, niacina: 0.4, vitaminaC: 0, acidoFolico: 3, sodio: 1, potasio: 35, factorDesecho: 1 },
    { codigo: 'B2', nombre: 'Papa blanca sancochada', energia: 77, proteinas: 2, grasa: 0.1, carbohidratos: 17, agua: 79, fibra: 2.2, cenizas: 1, calcio: 12, fosforo: 57, zinc: 0.3, hierro: 0.8, betaCaroteno: 0, vitaminaA: 0, tiamina: 0.08, riboflavina: 0.03, niacina: 1.1, vitaminaC: 20, acidoFolico: 16, sodio: 6, potasio: 421, factorDesecho: 1.15 },
    // Vegetables
    { codigo: 'V1', nombre: 'Zapallo macre', energia: 26, proteinas: 1, grasa: 0.1, carbohidratos: 6, agua: 92, fibra: 0.5, cenizas: 0.8, calcio: 21, fosforo: 44, zinc: 0.3, hierro: 0.8, betaCaroteno: 1000, vitaminaA: 80, tiamina: 0.05, riboflavina: 0.11, niacina: 0.6, vitaminaC: 9, acidoFolico: 16, sodio: 1, potasio: 340, factorDesecho: 1.2 },
    // Fats
    { codigo: 'G1', nombre: 'Aceite vegetal', energia: 884, proteinas: 0, grasa: 100, carbohidratos: 0, agua: 0, fibra: 0, cenizas: 0, calcio: 0, fosforo: 0, zinc: 0, hierro: 0, betaCaroteno: 0, vitaminaA: 0, tiamina: 0, riboflavina: 0, niacina: 0, vitaminaC: 0, acidoFolico: 0, sodio: 0, potasio: 0, factorDesecho: 1 },
    // Fruits
    { codigo: 'FR1', nombre: 'Manzana', energia: 52, proteinas: 0.3, grasa: 0.2, carbohidratos: 14, agua: 86, fibra: 2.4, cenizas: 0.2, calcio: 6, fosforo: 11, zinc: 0, hierro: 0.1, betaCaroteno: 27, vitaminaA: 3, tiamina: 0.02, riboflavina: 0.03, niacina: 0.1, vitaminaC: 5, acidoFolico: 3, sodio: 1, potasio: 107, factorDesecho: 1.1 }
]

describe('Diet Caloric Precision (±5%)', () => {
    it('achieves ±5% accuracy for a 1090 kcal target', () => {
        const targetCalories = 1090
        const goals = {
            calories: targetCalories,
            macros: { protein: 25, carbs: 50, fat: 25 },
            micros: {}
        }

        const plan = generateSmartDailyPlan(goals, mockFoods, 'Lunes')
        const actualCalories = plan.stats.calories
        const minAllowed = targetCalories * 0.95
        const maxAllowed = targetCalories * 1.05

        console.log(`--- Individual Day Results (Target: ${targetCalories}) ---`)
        plan.meals.forEach(meal => {
            const mealCals = meal.items.reduce((sum, item) => sum + (item.food.energia * item.quantity / 100), 0)
            console.log(`Meal: ${meal.name} -> ${mealCals.toFixed(1)} kcal`)
            meal.items.forEach(item => {
                console.log(`  - ${item.food.nombre}: ${item.quantity}g (${(item.food.energia * item.quantity / 100).toFixed(1)} kcal)`)
            })
        })

        console.log(`Target: ${targetCalories} kcal`)
        console.log(`Actual (Rounded): ${actualCalories} kcal`)
        console.log(`Deviation: ${(((actualCalories - targetCalories) / targetCalories) * 100).toFixed(2)}%`)

        expect(actualCalories).toBeGreaterThanOrEqual(minAllowed)
        expect(actualCalories).toBeLessThanOrEqual(maxAllowed)
    })

    it('accross multiple targets remains within ±5%', () => {
        const targets = [1090, 1500, 2000, 2500]
        targets.forEach(target => {
            const goals = {
                calories: target,
                macros: { protein: 25, carbs: 50, fat: 25 },
                micros: {}
            }
            const plan = generateSmartDailyPlan(goals, mockFoods, 'Test')
            const actualCalories = plan.stats.calories
            const deviation = Math.abs((actualCalories - target) / target)

            console.log(`Target: ${target}, Actual: ${actualCalories}, Dev: ${(deviation * 100).toFixed(2)}%`)
            expect(deviation).toBeLessThanOrEqual(0.05)
        })
    })
})
