/**
 * Sports Periodization - Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
    calculatePeriodizedMacros,
    getPeriodizationRecommendations,
    getAthleteTemplate,
    listAthleteTemplates,
    CARB_RECOMMENDATIONS,
    ATHLETE_TEMPLATES,
    TrainingIntensity,
} from '../lib/sports-periodization';

// ===========================================
// PERIODIZED MACROS TESTS
// ===========================================

describe('Sports Periodization', () => {
    describe('calculatePeriodizedMacros', () => {
        it('should increase carbs on match day vs rest day', () => {
            const bodyWeight = 70; // kg

            const matchDay = calculatePeriodizedMacros(bodyWeight, { intensity: 'match_day' });
            const restDay = calculatePeriodizedMacros(bodyWeight, { intensity: 'rest' });

            expect(matchDay.carbs).toBeGreaterThan(restDay.carbs);
        });

        it('should maintain protein across different intensities', () => {
            const bodyWeight = 70;

            const intense = calculatePeriodizedMacros(bodyWeight, { intensity: 'intense' });
            const moderate = calculatePeriodizedMacros(bodyWeight, { intensity: 'moderate' });

            // Protein should be relatively stable (within 0.5 g/kg)
            expect(Math.abs(intense.protein - moderate.protein)).toBeLessThan(0.5);
        });

        it('should adjust for sport category', () => {
            const bodyWeight = 70;
            const day = { intensity: 'moderate' as TrainingIntensity };

            const endurance = calculatePeriodizedMacros(bodyWeight, day, 'endurance');
            const strength = calculatePeriodizedMacros(bodyWeight, day, 'strength');

            // Endurance should have more carbs
            expect(endurance.carbs).toBeGreaterThan(strength.carbs);
            // Strength should have more protein
            expect(strength.protein).toBeGreaterThan(endurance.protein);
        });

        it('should calculate reasonable total calories', () => {
            const bodyWeight = 70;
            const result = calculatePeriodizedMacros(bodyWeight, { intensity: 'moderate' });

            // For a 70kg person, expect 2000-3500 kcal on moderate day
            expect(result.calories).toBeGreaterThan(2000);
            expect(result.calories).toBeLessThan(3500);
        });
    });

    describe('getPeriodizationRecommendations', () => {
        it('should provide meal timing for match day', () => {
            const result = getPeriodizationRecommendations(70, { intensity: 'match_day' });

            expect(result.mealTiming.length).toBeGreaterThan(0);
            expect(result.recommendations.some(r => r.includes('competencia'))).toBe(true);
        });

        it('should recommend lower carbs on rest days', () => {
            const result = getPeriodizationRecommendations(70, { intensity: 'rest' });

            expect(result.recommendations.some(r =>
                r.toLowerCase().includes('descanso') || r.toLowerCase().includes('reducir')
            )).toBe(true);
        });

        it('should include hydration recommendations', () => {
            const result = getPeriodizationRecommendations(70, { intensity: 'intense' });

            expect(result.hydration.baselineML).toBeGreaterThan(2000);
            expect(result.hydration.electrolytes).toBe(true);
        });
    });
});

// ===========================================
// ATHLETE TEMPLATES TESTS
// ===========================================

describe('Athlete Templates', () => {
    describe('getAthleteTemplate', () => {
        it('should return correct template for soccer midfielder', () => {
            const template = getAthleteTemplate('futbol_mediocampista');

            expect(template).toBeDefined();
            expect(template.sport).toBe('team_sport');
            expect(template.matchDayCarbs).toBeGreaterThan(template.restDayCarbs);
        });

        it('should have target somatotype for all templates', () => {
            const template = getAthleteTemplate('natacion_velocidad');

            expect(template.targetSomatotype).toHaveLength(3);
            // Somatotype should be valid ranges (0.5-9)
            template.targetSomatotype.forEach(component => {
                expect(component).toBeGreaterThanOrEqual(0.5);
                expect(component).toBeLessThanOrEqual(9);
            });
        });
    });

    describe('listAthleteTemplates', () => {
        it('should list all available templates', () => {
            const templates = listAthleteTemplates();

            expect(templates.length).toBeGreaterThan(10);
            expect(templates.some(t => t.key === 'futbol_mediocampista')).toBe(true);
            expect(templates.some(t => t.key === 'crossfit')).toBe(true);
        });
    });

    describe('CARB_RECOMMENDATIONS', () => {
        it('should have increasing carbs from rest to match day', () => {
            // Check that the mean recommendation increases from rest to match day
            const restMean = (CARB_RECOMMENDATIONS.rest.min + CARB_RECOMMENDATIONS.rest.max) / 2;
            const moderateMean = (CARB_RECOMMENDATIONS.moderate.min + CARB_RECOMMENDATIONS.moderate.max) / 2;
            const matchDayMean = (CARB_RECOMMENDATIONS.match_day.min + CARB_RECOMMENDATIONS.match_day.max) / 2;

            expect(restMean).toBeLessThan(moderateMean);
            expect(moderateMean).toBeLessThan(matchDayMean);
        });

        it('should have valid min/max ranges', () => {
            Object.values(CARB_RECOMMENDATIONS).forEach(rec => {
                expect(rec.min).toBeLessThan(rec.max);
                expect(rec.min).toBeGreaterThan(0);
            });
        });
    });
});

// ===========================================
// INTEGRATION TESTS
// ===========================================

describe('Periodization Integration', () => {
    it('should produce different diets for footballer match day vs rest', () => {
        const template = getAthleteTemplate('futbol_mediocampista');
        const bodyWeight = 75;

        const matchDay = calculatePeriodizedMacros(
            bodyWeight,
            { intensity: 'match_day' },
            template.sport
        );

        const restDay = calculatePeriodizedMacros(
            bodyWeight,
            { intensity: 'rest' },
            template.sport
        );

        // Match day should have significantly more carbs
        const matchCarbs = matchDay.carbs * bodyWeight;
        const restCarbs = restDay.carbs * bodyWeight;

        expect(matchCarbs).toBeGreaterThan(restCarbs + 100); // At least 100g more
    });
});
