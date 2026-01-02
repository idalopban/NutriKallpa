import { describe, it, expect } from 'vitest';
import { calculateFiveComponentFractionation, ISAK_RANGES } from '../lib/fiveComponentMath';
import { calculateZScore } from '../lib/growth-standards';
import { calcularEdad, calcularMesesExactos } from '../lib/calculos-nutricionales';

describe('Auditoría Clínica NutriKallpa - ISAK & OMS', () => {

    // Caso 1: Integridad de Masa Residual con datos faltantes (Kerr)
    it('debe manejar la ausencia de diámetros de tronco usando fallback de Z-scores', () => {
        const inputConFaltantes: any = {
            weight: 70, height: 175, age: 25, gender: 'male' as const,
            triceps: 10, subscapular: 12, biceps: 5, suprailiac: 8, abdominal: 15, thigh: 20, calf: 12,
            armRelaxedGirth: 30, thighGirth: 50, calfGirth: 35,
            humerusBreadth: 6.5, femurBreadth: 9.5,
            // Biacromial y Biiliocristal faltantes
        };
        const result = calculateFiveComponentFractionation(inputConFaltantes);
        expect(result.residual.kg).toBeGreaterThan(0);
        expect(result.residualIsEstimated).toBe(true);
    });

    // Caso 2: Conservación de Masa Total (Kerr Scaling)
    it('la suma de los 5 componentes debe ser exactamente igual al peso real', () => {
        const pesoReal = 85.5;
        const input: any = {
            weight: pesoReal, height: 180, age: 30, gender: 'male' as const,
            triceps: 15, subscapular: 18, biceps: 8, suprailiac: 12, abdominal: 25, thigh: 30, calf: 15,
            armRelaxedGirth: 32, thighGirth: 55, calfGirth: 38,
            humerusBreadth: 6.8, femurBreadth: 9.8
        };
        const result = calculateFiveComponentFractionation(input);
        const sumaTotal = result.skin.kg + result.adipose.kg + result.muscle.kg + result.bone.kg + result.residual.kg;
        // Permitimos un margen de error mínimo por redondeo
        expect(sumaTotal).toBeCloseTo(pesoReal, 1);
    });

    // Caso 3: Precisión Pediátrica y Cálculo de Edad
    it('debe calcular la edad en meses exactos evitando la aproximación lineal', () => {
        // Simulamos un paciente nacido hace exactamente 2 años (bisiesto intermedio no incluido para simplicidad)
        const hoy = new Date();
        const nacimiento = new Date();
        nacimiento.setFullYear(hoy.getFullYear() - 2);

        const meses = calcularMesesExactos(nacimiento);
        expect(meses).toBeCloseTo(24.0, 1);

        const edadAnos = calcularEdad(nacimiento);
        expect(edadAnos).toBe(2);
    });

    // Caso 4: Protección contra Resultados Fisiológicamente Imposibles
    it('debe marcar como inválido un diámetro de Húmero mayor al de Fémur', () => {
        const inputErroneo: any = {
            weight: 70, height: 170, age: 20, gender: 'male' as const,
            triceps: 10, subscapular: 10, biceps: 5, suprailiac: 8, abdominal: 10, thigh: 10, calf: 10,
            armRelaxedGirth: 30, thighGirth: 50, calfGirth: 35,
            humerusBreadth: 10, // IMPOSIBLE: Húmero 10cm, Fémur 9cm
            femurBreadth: 9
        };
        const result = calculateFiveComponentFractionation(inputErroneo);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.issue === 'anatomically_impossible')).toBe(true);
    });

    // Caso 5: Estabilidad de Punto Flotante vs Redondeo
    it('la masa de la piel debe redondearse a 1 decimal sin derivas de punto flotante', () => {
        const result = calculateFiveComponentFractionation({
            weight: 75.25, height: 178.5, age: 25, gender: 'male' as const,
            triceps: 12.1, subscapular: 14.3, biceps: 6.2, suprailiac: 10.5, abdominal: 20.1, thigh: 25.4, calf: 13.2,
            armRelaxedGirth: 31.2, thighGirth: 52.4, calfGirth: 36.5,
            humerusBreadth: 6.6, femurBreadth: 9.6
        });

        // Verificamos que kg y percent tengan solo 1 decimal
        expect(result.skin.kg.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(1);
        expect(result.skin.percent.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(1);
    });
});
