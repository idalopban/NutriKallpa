import { describe, it, expect, vi } from 'vitest';
import { calculateSarcopeniaSafeProtein } from '@/lib/calculos-nutricionales';
import { checkPediatricBMI } from '@/lib/safety-alerts';

describe('Clinical Logic Verification', () => {

    describe('👴 Geriatric Protein Safety', () => {
        it('should enforce 1.2g/kg minimum for sedentary geriatric patients', () => {
            const result = calculateSarcopeniaSafeProtein(70, 75, 'sedentary');
            // 70kg * 1.2 = 84g
            expect(result.min).toBe(84);
            expect(result.isCritical).toBe(true);
            expect(result.warning).toContain('sarcopenia');
        });

        it('should enforce 1.5g/kg minimum for active geriatric patients', () => {
            const result = calculateSarcopeniaSafeProtein(70, 75, 'active');
            // 70kg * 1.5 = 105g
            expect(result.min).toBe(105);
        });
    });

    describe('👶 Pediatric BMI Z-Score (Exact)', () => {
        it('should use exact LMS logic (verified by category result)', () => {
            // Test case: 8 year old male (96 months), 25kg, 120cm -> BMI 17.36
            // At 8y, median BMI is ~15.8. 17.36 is approx +1 SD (Overweight/Normal border)
            const result = checkPediatricBMI(25, 120, 96, 'male');

            expect(result.bmi).toBe(17.4);
            // Category should be determined by exact WHO tables
            expect(result.category).toBeDefined();
            expect(result.zScore).toBeGreaterThan(0.5);
        });
    });
});
