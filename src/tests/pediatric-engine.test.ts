import { describe, it, expect } from 'vitest';
import { calculatePediatricEER, calculateTDEE } from '@/lib/calculos-nutricionales';

describe('Pediatric Calorie Engine', () => {

    describe('IOM 2005 (Default Method)', () => {
        it('should calculate EER for a 10-year-old boy (Moderado PA: 1.26)', () => {
            // Data: 10y, 35kg, 140cm (1.4m), Male, Moderate
            // Formula: 88.5 - (61.9 * 10) + 1.26 * ((26.7 * 35) + (903 * 1.4)) + 20
            // = 88.5 - 619 + 1.26 * (934.5 + 1264.2) + 20
            // = -530.5 + 1.26 * 2198.7 + 20
            // = -530.5 + 2770.36 + 20 = 2259.86 -> 2260
            const result = calculatePediatricEER(10, 35, 140, 'male', 'moderate', 'iom');
            expect(result.eer).toBe(2260);
            expect(result.pa).toBe(1.26);
        });

        it('should calculate EER for a 10-year-old girl (Moderado PA: 1.31)', () => {
            // Data: 10y, 35kg, 140cm (1.4m), Female, Moderate
            // Formula: 135.3 - (30.8 * 10) + 1.31 * ((10.0 * 35) + (934 * 1.4)) + 20
            // = 135.3 - 308 + 1.31 * (350 + 1307.6) + 20
            // = -172.7 + 1.31 * 1657.6 + 20
            // = -172.7 + 2171.45 + 20 = 2018.75 -> 2019
            const result = calculatePediatricEER(10, 35, 140, 'female', 'moderate', 'iom');
            expect(result.eer).toBe(2019);
            expect(result.pa).toBe(1.31);
        });
    });

    describe('Henry (2005) BMR', () => {
        it('should calculate Henry BMR for a 15-year-old boy', () => {
            // Age 10-18: (18.4 * weight) + 581
            // 55kg -> (18.4 * 55) + 581 = 1012 + 581 = 1593
            const result = calculatePediatricEER(15, 55, 170, 'male', 'sedentary', 'henry');
            expect(result.bmr).toBe(1593);
            expect(result.eer).toBe(Math.round(1593 * 1.2));
        });
    });

    describe('Automatic Logic Switch', () => {
        it('should bypass Mifflin-St Jeor and use IOM for a 12-year-old by default', () => {
            const result = calculateTDEE({
                weight: 40,
                height: 150,
                age: 12,
                sex: 'male',
                activityLevel: 'moderate',
                formula: 'mifflin' // User suggests mifflin, but system should switch
            });
            expect(result.formula).toBe('IOM 2005');
        });

        it('should allow override to FAO/OMS for a child', () => {
            const result = calculateTDEE({
                weight: 40,
                height: 150,
                age: 12,
                sex: 'male',
                activityLevel: 'moderate',
                formula: 'fao'
            });
            expect(result.formula).toBe('FAO/OMS (Schofield)');
        });
    });
});
