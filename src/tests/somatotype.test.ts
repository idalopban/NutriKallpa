import { describe, it, expect } from 'vitest';
import {
    getSomatotypeClassification,
    getComponentLevel,
    getEndomorphyInterpretation,
    getMesomorphyInterpretation,
    getEctomorphyInterpretation,
} from '../lib/somatotype-utils';

// ============================================================================
// TESTS - Focus on pure functions that don't depend on FullMeasurementData
// ============================================================================

describe('Somatotype Classification', () => {
    describe('getSomatotypeClassification', () => {
        it('classifies Central when all components are balanced', () => {
            const result = getSomatotypeClassification(4, 4, 4);
            expect(result).toBe('Central');
        });

        it('classifies Mesomorfo Balanceado when mesomorphy dominates', () => {
            const result = getSomatotypeClassification(2, 6, 2);
            expect(result).toBe('Mesomorfo Balanceado');
        });

        it('classifies Endo-Mesomórfico correctly', () => {
            const result = getSomatotypeClassification(6, 4, 1);
            expect(result).toBe('Endo-Mesomórfico');
        });

        it('classifies Ecto-Mesomórfico correctly', () => {
            const result = getSomatotypeClassification(1, 3, 5);
            expect(result).toBe('Ecto-Mesomórfico');
        });

        it('classifies Endomorfo Balanceado correctly', () => {
            const result = getSomatotypeClassification(6, 3, 3);
            expect(result).toBe('Endomorfo Balanceado');
        });

        it('classifies Ectomorfo Balanceado correctly', () => {
            const result = getSomatotypeClassification(2, 2, 6);
            expect(result).toBe('Ectomorfo Balanceado');
        });
    });

    describe('getComponentLevel', () => {
        it('returns Bajo for values < 3', () => {
            expect(getComponentLevel(2)).toBe('Bajo');
            expect(getComponentLevel(0.5)).toBe('Bajo');
        });

        it('returns Moderado for values 3-5.5', () => {
            expect(getComponentLevel(3)).toBe('Moderado');
            expect(getComponentLevel(5)).toBe('Moderado');
        });

        it('returns Alto for values 5.5-7.5', () => {
            expect(getComponentLevel(6)).toBe('Alto');
            expect(getComponentLevel(7)).toBe('Alto');
        });

        it('returns Muy Alto for values > 7.5', () => {
            expect(getComponentLevel(8)).toBe('Muy Alto');
            expect(getComponentLevel(10)).toBe('Muy Alto');
        });
    });

    describe('Component Interpretations', () => {
        it('getEndomorphyInterpretation returns correct structure', () => {
            const result = getEndomorphyInterpretation(5);

            expect(result).toHaveProperty('value', 5);
            expect(result).toHaveProperty('level');
            expect(result).toHaveProperty('description');
            expect(result).toHaveProperty('color', 'rose');
        });

        it('getMesomorphyInterpretation returns correct structure', () => {
            const result = getMesomorphyInterpretation(6);

            expect(result).toHaveProperty('value', 6);
            expect(result).toHaveProperty('level');
            expect(result).toHaveProperty('description');
            expect(result).toHaveProperty('color', 'blue');
        });

        it('getEctomorphyInterpretation returns correct structure', () => {
            const result = getEctomorphyInterpretation(4);

            expect(result).toHaveProperty('value', 4);
            expect(result).toHaveProperty('level');
            expect(result).toHaveProperty('description');
            expect(result).toHaveProperty('color', 'emerald');
        });

        it('returns different descriptions for different levels', () => {
            const lowEndo = getEndomorphyInterpretation(2);
            const highEndo = getEndomorphyInterpretation(8);

            expect(lowEndo.level).toBe('Bajo');
            expect(highEndo.level).toBe('Muy Alto');
            expect(lowEndo.description).not.toBe(highEndo.description);
        });
    });
});
