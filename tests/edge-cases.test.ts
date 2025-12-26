/**
 * Edge Case Tests - ISAK Validation
 * Tests for biologically impossible values and edge cases
 */
import { describe, it, expect } from 'vitest';
import { validateFiveComponentInput, ISAK_RANGES } from '@/lib/fiveComponentMath';

describe('Edge Cases - ISAK Validation', () => {

    describe('🔴 Skinfold Range Validation', () => {
        it('should reject skinfold > ISAK maximum (triceps > 45mm)', () => {
            const result = validateFiveComponentInput({
                weight: 70, height: 170, age: 30, gender: 'male',
                triceps: 150,  // ⚠️ IMPOSSIBLE: max is 45mm
                subscapular: 15, suprailiac: 20, abdominal: 25,
                thigh: 18, calf: 10,
                armRelaxedGirth: 30, thighGirth: 50, calfGirth: 35,
                humerusBreadth: 7, femurBreadth: 10
            });

            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.field === 'Pliegue Tríceps' && e.issue === 'above_max')).toBe(true);
        });

        it('should reject negative skinfold values', () => {
            const result = validateFiveComponentInput({
                weight: 70, height: 170, age: 30, gender: 'male',
                triceps: -5,  // ⚠️ NEGATIVE
                subscapular: 15, suprailiac: 20, abdominal: 25,
                thigh: 18, calf: 10,
                armRelaxedGirth: 30, thighGirth: 50, calfGirth: 35,
                humerusBreadth: 7, femurBreadth: 10
            });

            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.field === 'Pliegue Tríceps' && e.issue === 'below_min')).toBe(true);
        });

        it('should warn when skinfold is unusually high', () => {
            const result = validateFiveComponentInput({
                weight: 70, height: 170, age: 30, gender: 'male',
                triceps: 38,  // High but valid (warn threshold is 35)
                subscapular: 15, suprailiac: 20, abdominal: 25,
                thigh: 18, calf: 10,
                armRelaxedGirth: 30, thighGirth: 50, calfGirth: 35,
                humerusBreadth: 7, femurBreadth: 10
            });

            expect(result.warnings.some(w => w.field === 'Pliegue Tríceps' && w.issue === 'warning')).toBe(true);
        });
    });

    describe('🔴 Anatomical Relationship Validation', () => {
        it('should reject waist < arm (anatomically impossible)', () => {
            const result = validateFiveComponentInput({
                weight: 70, height: 170, age: 30, gender: 'male',
                triceps: 12, subscapular: 15, suprailiac: 20, abdominal: 25,
                thigh: 18, calf: 10,
                waistGirth: 25,       // ⚠️ 25cm waist
                armFlexedGirth: 40,   // ⚠️ 40cm arm → IMPOSSIBLE
                armRelaxedGirth: 30, thighGirth: 50, calfGirth: 35,
                humerusBreadth: 7, femurBreadth: 10
            });

            expect(result.isValid).toBe(false);
            expect(result.errors.some(e => e.issue === 'anatomically_impossible')).toBe(true);
        });

        it('should reject thigh < calf (anatomically impossible)', () => {
            const result = validateFiveComponentInput({
                weight: 70, height: 170, age: 30, gender: 'male',
                triceps: 12, subscapular: 15, suprailiac: 20, abdominal: 25,
                thigh: 18, calf: 10,
                armRelaxedGirth: 30,
                thighGirth: 30,   // ⚠️ 30cm thigh
                calfGirth: 45,    // ⚠️ 45cm calf → IMPOSSIBLE
                humerusBreadth: 7, femurBreadth: 10
            });

            expect(result.isValid).toBe(false);
            expect(result.errors.some(e =>
                e.field === 'Perímetro Muslo' && e.issue === 'anatomically_impossible'
            )).toBe(true);
        });

        it('should reject femur < humerus (anatomically impossible)', () => {
            const result = validateFiveComponentInput({
                weight: 70, height: 170, age: 30, gender: 'male',
                triceps: 12, subscapular: 15, suprailiac: 20, abdominal: 25,
                thigh: 18, calf: 10,
                armRelaxedGirth: 30, thighGirth: 50, calfGirth: 35,
                humerusBreadth: 9,   // ⚠️ 9cm humerus
                femurBreadth: 7      // ⚠️ 7cm femur → IMPOSSIBLE
            });

            expect(result.isValid).toBe(false);
            expect(result.errors.some(e =>
                e.field === 'Diámetro Fémur' && e.issue === 'anatomically_impossible'
            )).toBe(true);
        });
    });

    describe('🟡 Total Skinfold Sum Warning', () => {
        it('should warn when total skinfolds > 250mm', () => {
            const result = validateFiveComponentInput({
                weight: 70, height: 170, age: 30, gender: 'male',
                triceps: 40, subscapular: 45, biceps: 20,
                suprailiac: 50, abdominal: 60, thigh: 40, calf: 30, // Sum: 285mm
                armRelaxedGirth: 30, thighGirth: 50, calfGirth: 35,
                humerusBreadth: 7, femurBreadth: 10
            });

            expect(result.warnings.some(w => w.field === 'Suma Pliegues')).toBe(true);
        });
    });

    describe('🔴 Basic Data Validation', () => {
        it('should reject weight outside biological range', () => {
            const result = validateFiveComponentInput({
                weight: 500, // ⚠️ 500kg impossible
                height: 170, age: 30, gender: 'male',
                triceps: 12, subscapular: 15, suprailiac: 20, abdominal: 25,
                thigh: 18, calf: 10,
                armRelaxedGirth: 30, thighGirth: 50, calfGirth: 35,
                humerusBreadth: 7, femurBreadth: 10
            });

            expect(result.errors.some(e => e.field === 'Peso' && e.issue === 'above_max')).toBe(true);
        });

        it('should handle height = 0 gracefully', () => {
            const result = validateFiveComponentInput({
                weight: 70, height: 0, age: 30, gender: 'male',
                triceps: 12, subscapular: 15, suprailiac: 20, abdominal: 25,
                thigh: 18, calf: 10,
                armRelaxedGirth: 30, thighGirth: 50, calfGirth: 35,
                humerusBreadth: 7, femurBreadth: 10
            });

            expect(result.isValid).toBe(false);
            expect(result.missing.includes('Talla')).toBe(true);
        });
    });

    describe('✅ Valid Data', () => {
        it('should accept valid anthropometric data', () => {
            const result = validateFiveComponentInput({
                weight: 70, height: 170, age: 30, gender: 'male',
                triceps: 12, subscapular: 15, biceps: 5,
                suprailiac: 18, abdominal: 20, thigh: 15, calf: 8,
                armRelaxedGirth: 30, thighGirth: 55, calfGirth: 38,
                waistGirth: 80, armFlexedGirth: 35,
                humerusBreadth: 7, femurBreadth: 10
            });

            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
            expect(result.missing.length).toBe(0);
        });
    });
});

describe('ISAK_RANGES Constants', () => {
    it('should have valid ranges for all skinfolds', () => {
        const skinfoldKeys = Object.keys(ISAK_RANGES.skinfolds);
        expect(skinfoldKeys.length).toBeGreaterThanOrEqual(6);

        for (const key of skinfoldKeys) {
            const range = ISAK_RANGES.skinfolds[key as keyof typeof ISAK_RANGES.skinfolds];
            expect(range.min).toBeGreaterThan(0);
            expect(range.max).toBeGreaterThan(range.min);
            expect(range.warn).toBeLessThanOrEqual(range.max);
        }
    });
});
