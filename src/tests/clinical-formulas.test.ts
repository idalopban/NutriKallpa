/**
 * Clinical Formulas Tests
 * 
 * Unit tests for the Advanced Clinical Evaluation Module:
 * - Pregnancy (Atalah, IOM)
 * - Cerebral Palsy (Stevenson)
 * - Cardiometabolic Risk (ICT, WHR)
 * - Smart Body Fat (Slaughter vs Durnin)
 */

import { describe, it, expect } from 'vitest';
import {
    classifyAtalah,
    getIOMWeightGainGoals,
    evaluatePregnancyWeightGain,
    estimateHeightStevenson,
    isNutritionalRiskPC,
    calculateWaistToHeightRatio,
    hasAbdominalObesity,
    calculateWaistHipRatio,
    calculateCardiometabolicRisk,
    calculateBodyFatSlaughter,
    calculateBodyFatSmart,
    densityToFatPercentSiri,
} from '@/utils/clinical-formulas';

// ============================================================================
// 1. PREGNANCY MODULE TESTS
// ============================================================================

describe('Pregnancy Module - Atalah Classification', () => {
    it('classifies "Bajo Peso" when IMC is below threshold', () => {
        expect(classifyAtalah(19.0, 10)).toBe('Bajo Peso');
        expect(classifyAtalah(22.0, 20)).toBe('Bajo Peso');
        expect(classifyAtalah(24.0, 30)).toBe('Bajo Peso');
    });

    it('classifies "Normal" when IMC is within normal range', () => {
        expect(classifyAtalah(21.0, 10)).toBe('Normal');
        expect(classifyAtalah(25.0, 20)).toBe('Normal');
        expect(classifyAtalah(28.0, 30)).toBe('Normal');
    });

    it('classifies "Sobrepeso" when IMC exceeds normal', () => {
        expect(classifyAtalah(26.0, 10)).toBe('Sobrepeso');
        expect(classifyAtalah(29.0, 20)).toBe('Sobrepeso');
        expect(classifyAtalah(32.0, 30)).toBe('Sobrepeso');
    });

    it('classifies "Obesidad" when IMC is very high', () => {
        expect(classifyAtalah(31.0, 10)).toBe('Obesidad');
        expect(classifyAtalah(33.0, 20)).toBe('Obesidad');
        expect(classifyAtalah(36.0, 30)).toBe('Obesidad');
    });

    it('handles edge weeks (6 and 42)', () => {
        expect(classifyAtalah(21.0, 6)).toBe('Normal');
        // At week 42, IMC 30 is within Normal range (threshold is 32.5 for Sobrepeso)
        expect(classifyAtalah(30.0, 42)).toBe('Normal');
        // IMC 33 at week 42 would be Sobrepeso
        expect(classifyAtalah(33.0, 42)).toBe('Sobrepeso');
    });
});

describe('Pregnancy Module - IOM Weight Gain Goals', () => {
    it('returns correct ranges for underweight singleton', () => {
        const goals = getIOMWeightGainGoals(17.5, false);
        expect(goals.minGain).toBe(12.5);
        expect(goals.maxGain).toBe(18.0);
    });

    it('returns correct ranges for normal weight singleton', () => {
        const goals = getIOMWeightGainGoals(22.0, false);
        expect(goals.minGain).toBe(11.5);
        expect(goals.maxGain).toBe(16.0);
    });

    it('returns correct ranges for overweight twin pregnancy', () => {
        const goals = getIOMWeightGainGoals(27.0, true);
        expect(goals.minGain).toBe(14.0);
        expect(goals.maxGain).toBe(22.6);
    });

    it('returns correct ranges for obese singleton', () => {
        const goals = getIOMWeightGainGoals(32.0, false);
        expect(goals.minGain).toBe(5.0);
        expect(goals.maxGain).toBe(9.0);
    });
});

describe('Pregnancy Module - Weight Gain Evaluation', () => {
    it('evaluates weight gain as "adecuado" for normal progress', () => {
        const result = evaluatePregnancyWeightGain(65, 60, 20, 22.0, false);
        expect(result.gain).toBe(5);
        expect(result.status).toBe('adecuado');
    });

    it('evaluates weight gain as "bajo" for insufficient gain', () => {
        const result = evaluatePregnancyWeightGain(61, 60, 30, 22.0, false);
        expect(result.gain).toBe(1);
        expect(result.status).toBe('bajo');
    });

    it('evaluates weight gain as "excesivo" for too much gain', () => {
        const result = evaluatePregnancyWeightGain(80, 60, 20, 22.0, false);
        expect(result.gain).toBe(20);
        expect(result.status).toBe('excesivo');
    });
});

// ============================================================================
// 2. CEREBRAL PALSY MODULE TESTS
// ============================================================================

describe('Cerebral Palsy - Stevenson Height Estimation', () => {
    it('correctly estimates height from tibia length', () => {
        // Formula: (3.26 * tibia) + 30.8
        const height = estimateHeightStevenson(30);
        expect(height).toBeCloseTo(128.6, 1);
    });

    it('handles various tibia lengths', () => {
        expect(estimateHeightStevenson(25)).toBeCloseTo(112.3, 1);
        expect(estimateHeightStevenson(35)).toBeCloseTo(144.9, 1);
        expect(estimateHeightStevenson(40)).toBeCloseTo(161.2, 1);
    });
});

describe('Cerebral Palsy - GMFCS Nutritional Risk', () => {
    it('flags risk for GMFCS I-II when percentile < 5', () => {
        expect(isNutritionalRiskPC('I', 4)).toBe(true);
        expect(isNutritionalRiskPC('II', 3)).toBe(true);
    });

    it('does not flag risk for GMFCS I-II when percentile >= 5', () => {
        expect(isNutritionalRiskPC('I', 5)).toBe(false);
        expect(isNutritionalRiskPC('II', 10)).toBe(false);
    });

    it('flags risk for GMFCS III-V when percentile < 20', () => {
        expect(isNutritionalRiskPC('III', 15)).toBe(true);
        expect(isNutritionalRiskPC('IV', 10)).toBe(true);
        expect(isNutritionalRiskPC('V', 19)).toBe(true);
    });

    it('does not flag risk for GMFCS III-V when percentile >= 20', () => {
        expect(isNutritionalRiskPC('III', 20)).toBe(false);
        expect(isNutritionalRiskPC('IV', 50)).toBe(false);
        expect(isNutritionalRiskPC('V', 25)).toBe(false);
    });
});

// ============================================================================
// 3. CARDIOMETABOLIC RISK TESTS
// ============================================================================

describe('Cardiometabolic Risk - Waist to Height Ratio', () => {
    it('classifies "minimo" risk when ICT < 0.5', () => {
        const result = calculateWaistToHeightRatio(80, 170);
        expect(result.ratio).toBeCloseTo(0.47, 2);
        expect(result.risk).toBe('minimo');
    });

    it('classifies "alto" risk when ICT >= 0.55', () => {
        const result = calculateWaistToHeightRatio(100, 170);
        expect(result.ratio).toBeCloseTo(0.59, 2);
        expect(result.risk).toBe('moderado');
    });

    it('classifies "alto" risk when ICT >= 0.60', () => {
        const result = calculateWaistToHeightRatio(110, 170);
        expect(result.ratio).toBeCloseTo(0.65, 2);
        expect(result.risk).toBe('alto');
    });
});

describe('Cardiometabolic Risk - Abdominal Obesity', () => {
    it('detects abdominal obesity in men when waist >= 90cm', () => {
        expect(hasAbdominalObesity(90, 'masculino')).toBe(true);
        expect(hasAbdominalObesity(89, 'masculino')).toBe(false);
    });

    it('detects abdominal obesity in women when waist >= 80cm', () => {
        expect(hasAbdominalObesity(80, 'femenino')).toBe(true);
        expect(hasAbdominalObesity(79, 'femenino')).toBe(false);
    });
});

describe('Cardiometabolic Risk - Waist Hip Ratio', () => {
    it('classifies WHR risk correctly for adult male', () => {
        const result = calculateWaistHipRatio(95, 100, 35, 'masculino');
        expect(result.ratio).toBeCloseTo(0.95, 2);
        expect(result.risk).toBe('alto');
    });

    it('classifies WHR risk correctly for adult female', () => {
        // WHR 0.74 for 30-39 female: threshold bajo=0.72, so 0.74 is 'moderado'
        const result = calculateWaistHipRatio(70, 95, 30, 'femenino');
        expect(result.ratio).toBeCloseTo(0.74, 2);
        expect(result.risk).toBe('moderado');
    });
});

describe('Cardiometabolic Risk - Combined Assessment', () => {
    it('returns overall risk as the highest individual risk', () => {
        const result = calculateCardiometabolicRisk(95, 100, 170, 40, 'masculino');
        expect(result.overallRisk).toBe('alto');
        expect(result.abdominalObesity).toBe(true);
    });
});

// ============================================================================
// 4. SMART BODY FAT SELECTOR TESTS
// ============================================================================

describe('Smart Body Fat - Slaughter Equations', () => {
    it('calculates body fat for pre-puber male', () => {
        const result = calculateBodyFatSlaughter(10, 8, 'pre-puber', 'masculino');
        // %G = 1.21 * 18 - 0.008 * 18² - 1.7 = 21.78 - 2.592 - 1.7 = 17.49
        expect(result).toBeCloseTo(17.49, 0);
    });

    it('calculates body fat for puber female', () => {
        const result = calculateBodyFatSlaughter(15, 12, 'puber', 'femenino');
        expect(result).toBeGreaterThan(10);
        expect(result).toBeLessThan(40);
    });
});

describe('Smart Body Fat - Siri Conversion', () => {
    it('converts density to fat percentage correctly', () => {
        // Siri: %G = (495 / DC) - 450
        expect(densityToFatPercentSiri(1.07)).toBeCloseTo(12.66, 1);
        expect(densityToFatPercentSiri(1.05)).toBeCloseTo(21.43, 1);
    });
});

describe('Smart Body Fat - Smart Selector', () => {
    it('uses Slaughter for ages 8-18', () => {
        const result = calculateBodyFatSmart(
            15,
            'puber',
            { triceps: 12, subscapular: 10 },
            'masculino'
        );
        expect(result.method).toBe('slaughter');
        expect(result.percentage).toBeGreaterThan(5);
        expect(result.percentage).toBeLessThan(40);
    });

    it('uses Durnin for ages > 18', () => {
        const result = calculateBodyFatSmart(
            30,
            null,
            { triceps: 15, subscapular: 18, biceps: 8, suprailiac: 20 },
            'masculino'
        );
        expect(result.method).toBe('durnin_siri');
        expect(result.percentage).toBeGreaterThan(5);
        expect(result.percentage).toBeLessThan(40);
    });

    it('estimates missing skinfolds for Durnin when needed', () => {
        const result = calculateBodyFatSmart(
            25,
            null,
            { triceps: 12, subscapular: 14 }, // Missing biceps and suprailiac
            'femenino'
        );
        expect(result.method).toBe('durnin_siri');
        expect(result.percentage).toBeGreaterThan(10);
    });
});
