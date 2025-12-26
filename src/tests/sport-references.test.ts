/**
 * Sport References - Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
    findBestReference,
    calculateSAD,
    compareSomatotype,
    getAvailableSports,
    getPositionsForSport,
    SOMATOTYPE_REFERENCES,
    SomatotypeReference,
} from '../lib/sport-references';

// ===========================================
// DATABASE STRUCTURE TESTS
// ===========================================

describe('Sport References Database', () => {
    describe('SOMATOTYPE_REFERENCES structure', () => {
        it('should have multiple sports represented', () => {
            const sports = getAvailableSports();
            expect(sports.length).toBeGreaterThanOrEqual(5);
            expect(sports).toContain('Fútbol');
            expect(sports).toContain('Voleibol');
            expect(sports).toContain('Natación');
        });

        it('should have valid somatotype ranges', () => {
            SOMATOTYPE_REFERENCES.forEach(ref => {
                // All components should be between 0.5 and 9
                expect(ref.endomorphy.mean).toBeGreaterThanOrEqual(0.5);
                expect(ref.endomorphy.mean).toBeLessThanOrEqual(9);
                expect(ref.mesomorphy.mean).toBeGreaterThanOrEqual(0.5);
                expect(ref.mesomorphy.mean).toBeLessThanOrEqual(9);
                expect(ref.ectomorphy.mean).toBeGreaterThanOrEqual(0.5);
                expect(ref.ectomorphy.mean).toBeLessThanOrEqual(9);

                // Ranges should be valid (min < max)
                expect(ref.endomorphy.range[0]).toBeLessThan(ref.endomorphy.range[1]);
            });
        });

        it('should include standard deviations', () => {
            SOMATOTYPE_REFERENCES.forEach(ref => {
                expect(ref.endomorphy.sd).toBeGreaterThan(0);
                expect(ref.mesomorphy.sd).toBeGreaterThan(0);
                expect(ref.ectomorphy.sd).toBeGreaterThan(0);
            });
        });
    });

    describe('getPositionsForSport', () => {
        it('should return positions for football', () => {
            const positions = getPositionsForSport('Fútbol');
            expect(positions).toContain('Arquero');
            expect(positions).toContain('Mediocampista');
            expect(positions).toContain('Delantero');
        });

        it('should return empty array for unknown sport', () => {
            const positions = getPositionsForSport('Unknown Sport');
            expect(positions).toHaveLength(0);
        });
    });
});

// ===========================================
// SAD CALCULATION TESTS
// ===========================================

describe('Somatotype Attitudinal Distance (SAD)', () => {
    describe('calculateSAD', () => {
        it('should return 0 for identical somatotypes', () => {
            const sad = calculateSAD(2.5, 5.0, 2.5, 2.5, 5.0, 2.5);
            expect(sad).toBe(0);
        });

        it('should calculate correct distance', () => {
            // SAD = √[(2-1)² + (5-4)² + (3-2)²] = √[1 + 1 + 1] = √3 ≈ 1.73
            const sad = calculateSAD(2, 5, 3, 1, 4, 2);
            expect(sad).toBeCloseTo(1.73, 1);
        });

        it('should be symmetric', () => {
            const sad1 = calculateSAD(2, 5, 3, 1, 4, 2);
            const sad2 = calculateSAD(1, 4, 2, 2, 5, 3);
            expect(sad1).toEqual(sad2);
        });
    });
});

// ===========================================
// COMPARISON TESTS
// ===========================================

describe('Somatotype Comparison', () => {
    describe('findBestReference', () => {
        it('should find exact match for sport and position', () => {
            const ref = findBestReference('Fútbol', 'Mediocampista', 'male', 'elite');
            expect(ref).not.toBeNull();
            expect(ref?.sport).toBe('Fútbol');
            expect(ref?.position).toBe('Mediocampista');
        });

        it('should fallback to any position if specific not found', () => {
            const ref = findBestReference('Fútbol', 'Unknown Position', 'male');
            expect(ref).not.toBeNull();
            expect(ref?.sport).toBe('Fútbol');
        });

        it('should return null for unknown sport', () => {
            const ref = findBestReference('Unknown Sport', undefined, 'male');
            expect(ref).toBeNull();
        });
    });

    describe('compareSomatotype', () => {
        it('should classify excellent when within range', () => {
            const ref = findBestReference('Fútbol', 'Mediocampista', 'male');
            if (!ref) throw new Error('Reference not found');

            const comparison = compareSomatotype(
                ref.endomorphy.mean,
                ref.mesomorphy.mean,
                ref.ectomorphy.mean,
                ref
            );

            expect(comparison.deviation.total).toBeLessThan(0.5);
            expect(comparison.interpretation).toContain('Excelente');
            expect(comparison.withinRange.overall).toBe(true);
        });

        it('should provide recommendations for deviation', () => {
            const ref = findBestReference('Fútbol', 'Mediocampista', 'male');
            if (!ref) throw new Error('Reference not found');

            // Athlete with too much endomorphy
            const comparison = compareSomatotype(
                ref.endomorphy.mean + 2,
                ref.mesomorphy.mean,
                ref.ectomorphy.mean,
                ref
            );

            expect(comparison.recommendations.some(r =>
                r.includes('grasa') || r.includes('Reducir')
            )).toBe(true);
        });

        it('should flag when outside acceptable range', () => {
            const ref = findBestReference('Fútbol', 'Mediocampista', 'male');
            if (!ref) throw new Error('Reference not found');

            // Very different somatotype
            const comparison = compareSomatotype(5, 2, 5, ref);

            expect(comparison.withinRange.overall).toBe(false);
            expect(comparison.deviation.total).toBeGreaterThan(2);
        });
    });
});

// ===========================================
// INTEGRATION TESTS
// ===========================================

describe('Sport References Integration', () => {
    it('should have consistent data for full workflow', () => {
        // 1. Get available sports
        const sports = getAvailableSports();
        expect(sports.length).toBeGreaterThan(0);

        // 2. Get positions for first sport
        const positions = getPositionsForSport(sports[0]);

        // 3. Find reference
        const ref = findBestReference(sports[0], positions[0], 'male');
        expect(ref).not.toBeNull();

        // 4. Compare athlete
        if (ref) {
            const comparison = compareSomatotype(2.0, 5.0, 2.5, ref);
            expect(comparison.recommendations.length).toBeGreaterThan(0);
        }
    });
});
