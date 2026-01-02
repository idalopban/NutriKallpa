/**
 * Z-Score Pediatric Leap Year Tests
 * 
 * Tests for correct handling of leap years in pediatric Z-Score calculations.
 * 
 * WHY THIS TEST IS IMPORTANT:
 * The WHO defines age in months with day-level precision.
 * A common error is using 30 days/month, which introduces cumulative error.
 * 
 * Correct formula: months = days_since_birth / 30.4375
 * Where 30.4375 = 365.25 / 12 (accounts for leap years)
 */

import { describe, it, expect } from 'vitest';
import {
    calculateZScore,
    calculateGrowthAssessment,
    calculateExactAgeInMonths
} from '@/lib/growth-standards';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// calculateExactAgeInMonths is now imported from @/lib/growth-standards

/**
 * Check if a year is a leap year
 */
function isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('Z-Score Pediatric - Leap Year Handling', () => {

    describe('Age Calculation Precision', () => {

        it('should calculate correct age for baby born on February 29 of leap year', () => {
            // Case: Baby born on February 29, 2024 (leap year)
            // Evaluation: March 1, 2025 (exactly 1 year and 1 day later)

            const birthDate = new Date('2024-02-29');
            const evaluationDate = new Date('2025-03-01');

            const ageInMonths = calculateExactAgeInMonths(birthDate, evaluationDate);

            // Expected: ~12.07 months (366 days / 30.4375)
            expect(ageInMonths).toBeGreaterThan(12);
            expect(ageInMonths).toBeLessThan(12.5);

            // Verify Z-Score function doesn't fail with this age
            const result = calculateZScore(9.5, ageInMonths, 'male', 'wfa');

            expect(result).not.toBeNull();
            expect(result?.zScore).toBeDefined();
            expect(typeof result?.zScore).toBe('number');
            expect(isFinite(result?.zScore || 0)).toBe(true);
        });

        it('should interpolate correctly for 12.5 months (between 12m and 15m data points)', () => {
            // The LMS dataset has points at 12, 15, 18 months
            // An age of 12.5 months must interpolate correctly

            const birthDate = new Date('2024-01-15');
            const evaluationDate = new Date('2025-02-01'); // ~12.5 months

            const ageInMonths = calculateExactAgeInMonths(birthDate, evaluationDate);

            // Use median weight for ~12.5 month old males based on LMS data
            // The M value at 12m is ~9.6kg, at 15m is ~10.3kg, so interpolated is ~9.9kg
            const result = calculateZScore(9.9, ageInMonths, 'male', 'wfa');

            expect(result).not.toBeNull();
            // Z-Score should be within normal range (-2 to +2)
            expect(result?.zScore).toBeGreaterThan(-2);
            expect(result?.zScore).toBeLessThan(2);
            expect(result?.diagnosis).toBe('Normal');
        });

        it('should handle February transition in non-leap year correctly', () => {
            // Case: Baby born on February 28, 2023 (NOT a leap year)
            // Evaluation: February 28, 2024 (exactly 1 year)

            const birthDate = new Date('2023-02-28');
            const evaluationDate = new Date('2024-02-28'); // Exactly 1 year

            const ageInMonths = calculateExactAgeInMonths(birthDate, evaluationDate);

            // For 365 days: 365 / 30.4375 = 11.99 months
            // For 366 days: 366 / 30.4375 = 12.02 months
            expect(ageInMonths).toBeGreaterThanOrEqual(11.99);
            expect(ageInMonths).toBeLessThanOrEqual(12.1);
        });

    });

    describe('Growth Assessment Across Leap Year Boundaries', () => {

        it('should generate complete assessment for different leap year ages', () => {
            const testCases = [
                { birth: '2024-02-29', eval: '2024-08-29', expectedMonths: 6 },    // 6 months exactly
                { birth: '2024-02-29', eval: '2025-02-28', expectedMonths: 12 },   // ~12 months
                { birth: '2024-02-29', eval: '2025-08-29', expectedMonths: 18 },   // ~18 months
                { birth: '2024-02-29', eval: '2026-02-28', expectedMonths: 24 },   // ~24 months
            ];

            testCases.forEach(({ birth, eval: evalDate, expectedMonths }) => {
                const birthDate = new Date(birth);
                const evaluationDate = new Date(evalDate);
                const ageInMonths = calculateExactAgeInMonths(birthDate, evaluationDate);

                // Tolerance of 0.5 months for edge cases
                expect(ageInMonths).toBeCloseTo(expectedMonths, 0);

                // Verify complete assessment doesn't fail
                const assessment = calculateGrowthAssessment(
                    10, // Average weight
                    75, // Average height
                    undefined, // No head circumference
                    ageInMonths,
                    'male'
                );

                expect(assessment.wfa).toBeDefined();
                expect(assessment.lhfa).toBeDefined();
                expect(assessment.nutritionalStatus).toBeDefined();
            });
        });

        it('should handle female infants across leap year boundaries', () => {
            // Female baby born in leap year
            const birthDate = new Date('2024-03-15');

            // Test at various ages
            const evaluations = [
                new Date('2024-06-15'), // 3 months
                new Date('2024-12-15'), // 9 months
                new Date('2025-03-15'), // 12 months
                new Date('2025-09-15'), // 18 months
            ];

            evaluations.forEach(evalDate => {
                const ageInMonths = calculateExactAgeInMonths(birthDate, evalDate);

                const assessment = calculateGrowthAssessment(
                    9.0, // Slightly lower weight for female
                    72,
                    undefined,
                    ageInMonths,
                    'female'
                );

                expect(assessment.wfa).toBeDefined();
                expect(assessment.wfa?.zScore).toBeDefined();
                expect(assessment.lhfa).toBeDefined();
            });
        });

    });

    describe('Edge Cases', () => {

        it('EDGE CASE: baby born January 31, evaluated February 28/29', () => {
            // This is the most complicated case: how many months is a baby
            // born on January 31 when evaluated on February 28?

            const birthDate = new Date('2024-01-31');

            // Case 1: Leap year (February has 29 days)
            const evalLeapYear = new Date('2024-02-29');
            const ageLeap = calculateExactAgeInMonths(birthDate, evalLeapYear);
            // 29 days / 30.4375 = 0.95 months
            expect(ageLeap).toBeCloseTo(0.95, 0.1);

            // Case 2: Non-leap year (February has 28 days) - next year
            const evalNonLeap = new Date('2025-02-28');
            const ageNonLeap = calculateExactAgeInMonths(birthDate, evalNonLeap);
            // ~393 days / 30.4375 = ~12.9 months
            expect(ageNonLeap).toBeCloseTo(12.9, 0.2);
        });

        it('EDGE CASE: premature baby with corrected age across leap year', () => {
            // Premature baby born Feb 1, 2024 (leap year)
            // Gestational age: 32 weeks (8 weeks early = ~2 months correction)

            const birthDate = new Date('2024-02-01');
            const evaluationDate = new Date('2024-08-01'); // 6 months chronological

            const chronologicalAge = calculateExactAgeInMonths(birthDate, evaluationDate);
            const correctedAge = chronologicalAge - 2; // Subtract 2 months for prematurity

            expect(chronologicalAge).toBeCloseTo(6, 0.2);
            expect(correctedAge).toBeCloseTo(4, 0.2);

            // Z-Score should use corrected age for premature infants
            const resultWithCorrectedAge = calculateZScore(6.5, correctedAge, 'male', 'wfa');
            const resultWithChronologicalAge = calculateZScore(6.5, chronologicalAge, 'male', 'wfa');

            // With corrected age (4 months), 6.5kg should be closer to normal
            // With chronological age (6 months), 6.5kg would show as underweight
            expect(resultWithCorrectedAge).not.toBeNull();
            expect(resultWithChronologicalAge).not.toBeNull();

            // Verify the Z-scores are different
            expect(resultWithCorrectedAge?.zScore).not.toEqual(resultWithChronologicalAge?.zScore);

            // Corrected age Z-score should be higher (closer to normal)
            expect(resultWithCorrectedAge!.zScore).toBeGreaterThan(resultWithChronologicalAge!.zScore);
        });

        it('EDGE CASE: December 31 to January 1 transition', () => {
            // Baby born Dec 31, 2023, evaluated Jan 1, 2025
            // This crosses a year boundary and involves leap year 2024

            const birthDate = new Date('2023-12-31');
            const evaluationDate = new Date('2025-01-01');

            const ageInMonths = calculateExactAgeInMonths(birthDate, evaluationDate);

            // 366 + 1 = 367 days / 30.4375 = 12.06 months
            expect(ageInMonths).toBeCloseTo(12.06, 0.1);

            const result = calculateZScore(10.0, ageInMonths, 'male', 'wfa');
            expect(result).not.toBeNull();
            expect(result?.diagnosis).toBe('Normal');
        });

    });

    describe('Z-Score Consistency', () => {

        it('should return consistent Z-scores for the same data regardless of date format', () => {
            // Same age calculated two different ways should give same result

            const birthDate1 = new Date('2024-01-15T00:00:00Z');
            const birthDate2 = new Date('2024-01-15T12:00:00Z'); // Different time
            const evalDate = new Date('2025-01-15T06:00:00Z');

            const age1 = calculateExactAgeInMonths(birthDate1, evalDate);
            const age2 = calculateExactAgeInMonths(birthDate2, evalDate);

            // Ages should be very close (within 0.02 months = ~0.5 days)
            expect(Math.abs(age1 - age2)).toBeLessThan(0.02);

            const result1 = calculateZScore(10.5, age1, 'male', 'wfa');
            const result2 = calculateZScore(10.5, age2, 'male', 'wfa');

            // Z-scores should be essentially identical
            expect(result1?.zScore).toBeCloseTo(result2?.zScore || 0, 0.01);
        });

        it('should handle year 2000 (century leap year)', () => {
            // 2000 was a leap year (divisible by 400)
            expect(isLeapYear(2000)).toBe(true);

            // Baby born Feb 29, 2000, evaluated Feb 28, 2005
            const birthDate = new Date('2000-02-29');
            const evaluationDate = new Date('2005-02-28');

            const ageInMonths = calculateExactAgeInMonths(birthDate, evaluationDate);

            // ~60 months (5 years)
            expect(ageInMonths).toBeCloseTo(60, 0.5);

            // This is at the edge of the 0-60 month dataset
            const result = calculateZScore(18.0, ageInMonths, 'male', 'wfa');
            expect(result).not.toBeNull();
        });

        it('should handle year 1900 (non-leap century year)', () => {
            // 1900 was NOT a leap year (divisible by 100 but not 400)
            expect(isLeapYear(1900)).toBe(false);
            expect(isLeapYear(2100)).toBe(false);
            expect(isLeapYear(2000)).toBe(true); // But 2000 was
        });

    });

});

describe('Z-Score Age Input Validation', () => {

    it('should handle negative age gracefully', () => {
        // Negative age (evaluation before birth) should return null or handle gracefully
        const result = calculateZScore(3.5, -1, 'male', 'wfa');

        // The function should either return null or use age 0
        if (result !== null) {
            expect(result.zScore).toBeDefined();
        }
    });

    it('should handle very large age (beyond dataset)', () => {
        // 70 months is beyond the 0-60 month core dataset
        const result = calculateZScore(20.0, 70, 'male', 'wfa');

        // Function should extrapolate or use the closest available data
        if (result !== null) {
            expect(result.zScore).toBeDefined();
            expect(isFinite(result.zScore)).toBe(true);
        }
    });

    it('should handle fractional months correctly', () => {
        // Test with very precise fractional ages
        const ages = [0.5, 1.25, 2.75, 6.33, 11.99, 12.01, 23.5];

        ages.forEach(age => {
            const result = calculateZScore(8.0, age, 'female', 'wfa');
            expect(result).not.toBeNull();
            expect(result?.zScore).toBeDefined();
            expect(isFinite(result?.zScore || 0)).toBe(true);
        });
    });

});

// ============================================================================
// ISAK L3 AUDIT: Critical Edge Cases
// ============================================================================

describe('Pediatric Edge Cases (ISAK L3 Audit)', () => {

    /**
     * CASO 1: Niño que cumple EXACTAMENTE 24 meses hoy
     * 
     * Este es un caso crítico porque marca la transición de:
     * - Tabla "Infants" (longitud recostada) → Tabla "Children" (estatura de pie)
     * 
     * El sistema debe usar la tabla correcta sin errores.
     */
    it('EDGE CASE: child turning exactly 24 months today (table transition)', () => {
        // Crear fecha de nacimiento exactamente 24 meses atrás
        const today = new Date();
        const birthDate = new Date(today);
        birthDate.setMonth(birthDate.getMonth() - 24);

        const ageInMonths = calculateExactAgeInMonths(birthDate, today);

        // Debe ser muy cercano a 24.0 meses (±0.1 por variación en días del mes)
        expect(ageInMonths).toBeGreaterThanOrEqual(23.5);
        expect(ageInMonths).toBeLessThanOrEqual(24.5);

        // La tabla "Children" (24+) debe usarse, no "Infants"
        // Weight-for-Age a ~24 meses para niño de 12kg (peso promedio)
        const result = calculateZScore(12, ageInMonths, 'male', 'wfa');

        expect(result).not.toBeNull();
        expect(result?.diagnosis).toBeDefined();
        expect(result?.zScore).toBeDefined();
        expect(isFinite(result?.zScore!)).toBe(true);

        // Un niño de 12kg a 24 meses debe estar en rango normal (~0 SD)
        expect(result?.zScore).toBeGreaterThan(-2);
        expect(result?.zScore).toBeLessThan(2);
    });

    /**
     * CASO 2: Fecha de evaluación ANTERIOR al nacimiento (ERROR)
     * 
     * Este es un error de entrada de datos que debe detectarse.
     * El sistema debe lanzar un error descriptivo, no calcular silenciosamente.
     */
    it('ERROR CASE: evaluation date before birth date should throw', () => {
        const birthDate = new Date('2024-06-15');
        const evaluationDate = new Date('2024-06-01'); // 14 días ANTES del nacimiento

        // Debe lanzar error con mensaje descriptivo
        expect(() => {
            calculateExactAgeInMonths(birthDate, evaluationDate);
        }).toThrow('INVALID_DATE');
    });

    /**
     * CASO 3: Z-Score extremo > +5 SD
     * 
     * Un Z-Score > +5 indica:
     * - Posible error de medición (peso mal registrado)
     * - Condición patológica (gigantismo, tumor hipofisiario)
     * 
     * El sistema debe calcular pero marcar con severidad alta.
     */
    it('EXTREME CASE: Z-Score > +3 SD (possible measurement error or pathology)', () => {
        // Niño de 24 meses con 20kg (muy por encima del percentil 99.9)
        // El peso mediano a 24 meses es ~11.8kg para niños
        const ageInMonths = 24;
        const weight = 20; // ~70% por encima de la mediana

        const result = calculateZScore(weight, ageInMonths, 'male', 'wfa');

        expect(result).not.toBeNull();

        // El Z-Score debe ser alto (> +3)
        expect(result!.zScore).toBeGreaterThanOrEqual(3);

        // El sistema debe marcar como positivo (severo o moderado)
        expect(['severe_positive', 'moderate_positive']).toContain(result!.severityLevel);

        // El diagnóstico para WFA Z > 2 es "Peso alto" según clasificación OMS
        expect(
            result!.diagnosis.toLowerCase().includes('peso') ||
            result!.diagnosis.toLowerCase().includes('obesidad') ||
            result!.diagnosis.toLowerCase().includes('sobrepeso')
        ).toBe(true);
    });

    /**
     * CASO 4: Niño prematuro con edad corregida
     * 
     * Para prematuros, la edad debe corregirse restando semanas de prematuridad.
     * Esto ya está probado en otros tests, pero verificamos el límite.
     */
    it('should calculate corrected age for premature infant', () => {
        // Bebé prematuro: nacido a 32 semanas (8 semanas = ~2 meses temprano)
        const birthDate = new Date('2024-01-15');
        const evaluationDate = new Date('2024-07-15'); // 6 meses cronológicos

        const chronologicalAge = calculateExactAgeInMonths(birthDate, evaluationDate);
        const correctionMonths = 2; // 8 semanas ≈ 2 meses
        const correctedAge = chronologicalAge - correctionMonths;

        // Edad cronológica: ~6 meses
        expect(chronologicalAge).toBeCloseTo(6, 0);

        // Edad corregida: ~4 meses
        expect(correctedAge).toBeCloseTo(4, 0);

        // Verificar que ambos Z-scores son diferentes
        const resultChrono = calculateZScore(6.5, chronologicalAge, 'male', 'wfa');
        const resultCorrected = calculateZScore(6.5, correctedAge, 'male', 'wfa');

        expect(resultChrono).not.toBeNull();
        expect(resultCorrected).not.toBeNull();

        // Con edad corregida, el Z-score debe ser más alto (más cercano a normal)
        expect(resultCorrected!.zScore).toBeGreaterThan(resultChrono!.zScore);
    });

});
