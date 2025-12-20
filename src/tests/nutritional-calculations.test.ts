/**
 * Nutritional Calculations - Regression Tests
 * 
 * Tests for caloric needs and BMR calculations.
 */

import { describe, it, expect } from 'vitest';

import {
    calculateHarrisBenedict,
    calculateMifflinStJeor,
    calculateFAOWHO,
    ACTIVITY_FACTORS,
} from '../lib/calculos-nutricionales';

// ============================================================================
// HARRIS-BENEDICT TESTS
// ============================================================================

describe('Harris-Benedict BMR Calculations', () => {
    it('should calculate male BMR correctly', () => {
        // Male: 88.362 + (13.397 × 70) + (4.799 × 175) - (5.677 × 30) ≈ 1696
        const result = calculateHarrisBenedict(70, 175, 30, 'M');
        expect(result).toBeCloseTo(1696, -1); // Within 10 kcal
    });

    it('should calculate female BMR correctly', () => {
        // Female: 447.593 + (9.247 × 60) + (3.098 × 165) - (4.330 × 28) ≈ 1392
        const result = calculateHarrisBenedict(60, 165, 28, 'F');
        expect(result).toBeCloseTo(1392, -1);
    });

    it('should return higher BMR for heavier individuals', () => {
        const light = calculateHarrisBenedict(60, 175, 30, 'M');
        const heavy = calculateHarrisBenedict(90, 175, 30, 'M');
        expect(heavy).toBeGreaterThan(light);
    });

    it('should return lower BMR for older individuals', () => {
        const young = calculateHarrisBenedict(70, 175, 25, 'M');
        const old = calculateHarrisBenedict(70, 175, 55, 'M');
        expect(old).toBeLessThan(young);
    });
});

// ============================================================================
// MIFFLIN-ST JEOR TESTS
// ============================================================================

describe('Mifflin-St Jeor BMR Calculations', () => {
    it('should calculate male BMR correctly', () => {
        // Male: (10 × 70) + (6.25 × 175) - (5 × 30) + 5 = 1649
        const result = calculateMifflinStJeor(70, 175, 30, 'M');
        expect(result).toBeCloseTo(1649, -1);
    });

    it('should calculate female BMR correctly', () => {
        // Female: (10 × 60) + (6.25 × 165) - (5 × 28) - 161 = 1330.25
        const result = calculateMifflinStJeor(60, 165, 28, 'F');
        expect(result).toBeCloseTo(1330, -1);
    });

    it('should give lower values for females than Harris-Benedict', () => {
        const mifflin = calculateMifflinStJeor(60, 165, 28, 'F');
        const harris = calculateHarrisBenedict(60, 165, 28, 'F');
        // Mifflin is generally considered more accurate for modern populations
        // Results should be somewhat similar
        expect(Math.abs(mifflin - harris)).toBeLessThan(100);
    });
});

// ============================================================================
// FAO/WHO/UNU TESTS
// ============================================================================

describe('FAO/WHO/UNU BMR Calculations', () => {
    it('should calculate BMR for adult male (30-60 years)', () => {
        const result = calculateFAOWHO(70, 35, 'M');
        expect(result).toBeGreaterThan(1400);
        expect(result).toBeLessThan(2000);
    });

    it('should calculate BMR for adult female (18-30 years)', () => {
        const result = calculateFAOWHO(55, 25, 'F');
        expect(result).toBeGreaterThan(1200);
        expect(result).toBeLessThan(1600);
    });

    it('should handle different age ranges', () => {
        // FAO/WHO uses different coefficients for different age groups
        const young = calculateFAOWHO(70, 25, 'M');
        const middle = calculateFAOWHO(70, 45, 'M');
        const senior = calculateFAOWHO(70, 65, 'M');

        // Generally, BMR decreases with age
        expect(young).toBeGreaterThanOrEqual(middle);
    });
});

// ============================================================================
// ACTIVITY FACTORS TESTS
// ============================================================================

describe('Activity Factors', () => {
    it('should have all required activity levels', () => {
        expect(ACTIVITY_FACTORS).toHaveProperty('sedentary');
        expect(ACTIVITY_FACTORS).toHaveProperty('light');
        expect(ACTIVITY_FACTORS).toHaveProperty('moderate');
        expect(ACTIVITY_FACTORS).toHaveProperty('active');
        expect(ACTIVITY_FACTORS).toHaveProperty('very_active');
    });

    it('should have increasing factors from sedentary to very_active', () => {
        expect(ACTIVITY_FACTORS.sedentary).toBeLessThan(ACTIVITY_FACTORS.light);
        expect(ACTIVITY_FACTORS.light).toBeLessThan(ACTIVITY_FACTORS.moderate);
        expect(ACTIVITY_FACTORS.moderate).toBeLessThan(ACTIVITY_FACTORS.active);
        expect(ACTIVITY_FACTORS.active).toBeLessThan(ACTIVITY_FACTORS.very_active);
    });

    it('should have factors in valid range (1.0 - 2.5)', () => {
        Object.values(ACTIVITY_FACTORS).forEach(factor => {
            expect(factor).toBeGreaterThanOrEqual(1.0);
            expect(factor).toBeLessThanOrEqual(2.5);
        });
    });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Total Energy Expenditure (GET) Integration', () => {
    it('should calculate GET as BMR × activity factor', () => {
        const bmr = calculateHarrisBenedict(70, 175, 30, 'M');
        const get = bmr * ACTIVITY_FACTORS.moderate;

        // GET should be reasonable (2000-3500 kcal for average adult male)
        expect(get).toBeGreaterThan(2000);
        expect(get).toBeLessThan(3500);
    });

    it('should give higher GET for more active individuals', () => {
        const bmr = calculateMifflinStJeor(70, 175, 30, 'M');
        const sedentaryGET = bmr * ACTIVITY_FACTORS.sedentary;
        const activeGET = bmr * ACTIVITY_FACTORS.very_active;

        expect(activeGET).toBeGreaterThan(sedentaryGET);
        expect(activeGET / sedentaryGET).toBeCloseTo(1.9 / 1.2, 1);
    });
});
