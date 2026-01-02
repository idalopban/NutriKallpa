/**
 * TEM (Technical Error of Measurement) Calculations - Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
    calculateTEM,
    calculateSiteTEM,
    calculateOverallReliability,
    needsThirdMeasurement,
    getFinalValue,
    ISAK_TEM_THRESHOLDS,
    MeasurementReplication,
} from '../lib/tem-calculations';

// ===========================================
// REFERENCE TEST CASES
// ===========================================

describe('TEM Calculations - Dahlberg Formula', () => {
    describe('calculateTEM', () => {
        it('should calculate TEM correctly for duplicate measurements', () => {
            // Known case: differences of [0.5, 0.3, 0.4, 0.2]
            // TEM = √(Σd²/2n) = √((0.25 + 0.09 + 0.16 + 0.04)/8) = √(0.0675) ≈ 0.26
            const measurements = [
                [10.0, 10.5],
                [12.0, 12.3],
                [8.5, 8.9],
                [11.0, 11.2],
            ];
            const tem = calculateTEM(measurements);
            expect(tem).toBeCloseTo(0.26, 1);
        });

        it('should return 0 for empty measurements', () => {
            expect(calculateTEM([])).toBe(0);
        });

        it('should handle identical measurements (perfect reliability)', () => {
            const measurements = [
                [10.0, 10.0],
                [12.0, 12.0],
            ];
            const tem = calculateTEM(measurements);
            expect(tem).toBe(0);
        });
    });

    describe('calculateSiteTEM', () => {
        it('should classify excellent reliability for low TEM', () => {
            const replication: MeasurementReplication = {
                values: [10.0, 10.1, 10.0],
                site: 'triceps',
                unit: 'mm',
            };
            const result = calculateSiteTEM(replication);
            expect(result.reliability).toBe('excellent');
            expect(result.isReliable).toBe(true);
            expect(result.temPercent).toBeLessThan(2.5);
        });

        it('should classify acceptable or excellent reliability for moderate TEM', () => {
            // Values with moderate variance - should be either excellent or acceptable
            const replication: MeasurementReplication = {
                values: [10.0, 10.2, 10.1],
                site: 'triceps',
                unit: 'mm',
            };
            const result = calculateSiteTEM(replication);
            // Should be reliable (either excellent or acceptable)
            expect(result.isReliable).toBe(true);
            expect(['excellent', 'acceptable']).toContain(result.reliability);
        });

        it('should flag poor reliability for high TEM', () => {
            const replication: MeasurementReplication = {
                values: [10.0, 12.0], // 20% difference
                site: 'triceps',
                unit: 'mm',
            };
            const result = calculateSiteTEM(replication);
            expect(result.reliability).toBe('poor');
            expect(result.isReliable).toBe(false);
        });

        it('should require at least 2 measurements', () => {
            const replication: MeasurementReplication = {
                values: [10.0],
                site: 'triceps',
                unit: 'mm',
            };
            const result = calculateSiteTEM(replication);
            expect(result.reliability).toBe('poor');
            expect(result.isReliable).toBe(false);
        });
    });

    describe('calculateOverallReliability', () => {
        it('should aggregate multiple site TEMs', () => {
            const replications: MeasurementReplication[] = [
                { values: [10.0, 10.1], site: 'triceps', unit: 'mm' },
                { values: [8.0, 8.1], site: 'subscapular', unit: 'mm' },
                { values: [12.0, 12.2], site: 'abdominal', unit: 'mm' },
            ];
            const result = calculateOverallReliability(replications);
            expect(result.qualityByMeasurement).toHaveLength(3);
            expect(result.meetsISAKStandard).toBe(true);
            expect(result.overallRating).toBe('excellent');
        });

        it('should flag overall as poor if any site is poor', () => {
            const replications: MeasurementReplication[] = [
                { values: [10.0, 10.1], site: 'triceps', unit: 'mm' },
                { values: [8.0, 12.0], site: 'subscapular', unit: 'mm' }, // Poor
            ];
            const result = calculateOverallReliability(replications);
            expect(result.overallRating).toBe('poor');
            expect(result.meetsISAKStandard).toBe(false);
        });
    });

    describe('needsThirdMeasurement', () => {
        it('should request third measurement for high difference', () => {
            expect(needsThirdMeasurement(10.0, 11.0, 'triceps')).toBe(true);
        });

        it('should not request third for small difference', () => {
            expect(needsThirdMeasurement(10.0, 10.1, 'triceps')).toBe(false);
        });
    });

    describe('getFinalValue', () => {
        it('should return mean for 2 values', () => {
            expect(getFinalValue([10.0, 12.0])).toBe(11.0);
        });

        it('should return median for 3 values', () => {
            expect(getFinalValue([10.0, 15.0, 12.0])).toBe(12.0);
        });

        it('should return the value itself for single value', () => {
            expect(getFinalValue([10.0])).toBe(10.0);
        });

        it('should return 0 for empty array', () => {
            expect(getFinalValue([])).toBe(0);
        });
    });
});

describe('ISAK TEM Thresholds', () => {
    it('should have correct thresholds for skinfolds', () => {
        expect(ISAK_TEM_THRESHOLDS.skinfolds.intraAcceptable).toBe(5.0);
        expect(ISAK_TEM_THRESHOLDS.skinfolds.interAcceptable).toBe(7.5);
    });

    it('should have stricter thresholds for girths', () => {
        expect(ISAK_TEM_THRESHOLDS.girths.intraAcceptable).toBe(1.0);
    });
});
