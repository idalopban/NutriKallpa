/**
 * Body Composition Calculations - Regression Tests
 * 
 * Tests for IMC and somatotype calculations.
 * Uses reference data to prevent silent regressions.
 */

import { describe, it, expect } from 'vitest';

// Import the actual exported functions
import {
    calcularIMC,
    calculateBodyFat,
    calculateSomatotype,
    calculateHarrisBenedict,
    calculateMifflinStJeor,
    ACTIVITY_FACTORS,
} from '../lib/calculos-nutricionales';

// ============================================================================
// TEST DATA - Reference cases
// ============================================================================

const REFERENCE_IMC_CASES = [
    { peso: 70, tallaCm: 175, expectedIMC: 22.86, classification: 'Normal' },
    { peso: 50, tallaCm: 160, expectedIMC: 19.53, classification: 'Normal' },
    { peso: 90, tallaCm: 170, expectedIMC: 31.14, classification: 'Obesidad I' },
    { peso: 45, tallaCm: 165, expectedIMC: 16.53, classification: 'Bajo peso' },
    { peso: 100, tallaCm: 180, expectedIMC: 30.86, classification: 'Obesidad I' },
];

const HARRIS_BENEDICT_REFERENCE = [
    // Male: BMR = 88.362 + (13.397 × weight) + (4.799 × height) - (5.677 × age)
    { weight: 70, height: 175, age: 30, gender: 'M', expectedBMR: 1696 },
    { weight: 80, height: 180, age: 25, gender: 'M', expectedBMR: 1882 },
    // Female: BMR = 447.593 + (9.247 × weight) + (3.098 × height) - (4.330 × age)
    { weight: 60, height: 165, age: 28, gender: 'F', expectedBMR: 1392 },
    { weight: 55, height: 160, age: 35, gender: 'F', expectedBMR: 1300 },
];

// ============================================================================
// IMC TESTS
// ============================================================================

describe('IMC (Body Mass Index) Calculations', () => {
    describe('calcularIMC', () => {
        it.each(REFERENCE_IMC_CASES)(
            'should calculate IMC of ~$expectedIMC for $peso kg at $tallaCm cm',
            ({ peso, tallaCm, expectedIMC }) => {
                const result = calcularIMC(peso, tallaCm);
                expect(result.valor).toBeCloseTo(expectedIMC, 1);
            }
        );

        it('should handle edge case of zero weight', () => {
            const result = calcularIMC(0, 170);
            expect(result.valor).toBe(0);
        });

        it('should handle edge case of zero height', () => {
            const result = calcularIMC(70, 0);
            expect(result.valor).toBe(0);
        });

        it('should classify underweight correctly', () => {
            const result = calcularIMC(45, 175);
            expect(result.diagnostico.toLowerCase()).toContain('bajo');
        });

        it('should classify normal weight correctly', () => {
            const result = calcularIMC(70, 175);
            expect(result.diagnostico.toLowerCase()).toMatch(/normal|normopeso/);
        });

        it('should classify overweight correctly', () => {
            const result = calcularIMC(85, 175);
            expect(result.diagnostico.toLowerCase()).toMatch(/sobrepeso|pre/);
        });

        it('should classify obesity correctly', () => {
            const result = calcularIMC(110, 175);
            expect(result.diagnostico.toLowerCase()).toContain('obesidad');
        });
    });
});

// ============================================================================
// BODY FAT PERCENTAGE TESTS
// ============================================================================

describe('Body Fat Percentage Calculations', () => {
    describe('calculateBodyFat (Siri equation)', () => {
        it('should calculate correct fat percentage from density', () => {
            // Siri equation: (495/density) - 450
            const result = calculateBodyFat(1.055);
            expect(result).toBeCloseTo(19.43, 0);
        });

        it('should return valid fat percentage range (3-50%)', () => {
            const result = calculateBodyFat(1.05);
            expect(result).toBeGreaterThanOrEqual(3);
            expect(result).toBeLessThanOrEqual(50);
        });
    });
});

// ============================================================================
// BMR TESTS
// ============================================================================

describe('Basal Metabolic Rate (BMR) Calculations', () => {
    describe('Harris-Benedict equation', () => {
        it.each(HARRIS_BENEDICT_REFERENCE)(
            'should calculate ~$expectedBMR kcal for $gender ($weight kg, $height cm, $age years)',
            ({ weight, height, age, gender, expectedBMR }) => {
                const result = calculateHarrisBenedict(weight, height, age, gender);
                expect(result).toBeCloseTo(expectedBMR, -1); // Within 10 kcal
            }
        );
    });

    describe('Mifflin-St Jeor equation', () => {
        it('should calculate male BMR correctly', () => {
            // Male: (10 × 70) + (6.25 × 175) - (5 × 30) + 5 = 1649
            const result = calculateMifflinStJeor(70, 175, 30, 'M');
            expect(result).toBeCloseTo(1649, -1);
        });

        it('should calculate female BMR correctly', () => {
            // Female: (10 × 60) + (6.25 × 165) - (5 × 28) - 161 = 1330.25 (actual implementation)
            const result = calculateMifflinStJeor(60, 165, 28, 'F');
            expect(result).toBeCloseTo(1330, -1);
        });
    });
});

// ============================================================================
// ACTIVITY FACTORS TESTS
// ============================================================================

describe('Activity Factors', () => {
    it('should have correct sedentary factor', () => {
        expect(ACTIVITY_FACTORS.sedentary).toBe(1.2);
    });

    it('should have correct moderate factor', () => {
        expect(ACTIVITY_FACTORS.moderate).toBe(1.55);
    });

    it('should have correct very_active factor', () => {
        expect(ACTIVITY_FACTORS.very_active).toBe(1.9);
    });
});

// ============================================================================
// REGRESSION SNAPSHOTS
// ============================================================================

describe('Regression Snapshots', () => {
    it('IMC calculation should match snapshot', () => {
        const result = calcularIMC(70, 175);
        expect(result).toMatchSnapshot();
    });
});
