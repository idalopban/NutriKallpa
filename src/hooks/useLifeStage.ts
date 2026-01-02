import { useMemo } from 'react';
import { calculateExactAgeInDays } from '@/lib/clinical-calculations';

export type LifeStage = 'infant' | 'preschool' | 'school' | 'adult' | 'elderly';

interface LifeStageInfo {
    stage: LifeStage;
    ageInYears: number;
    ageInMonths: number;
    isTeenager: boolean; // For the optional ISAK toggle (>15 years)
}

export function useLifeStage(birthDate?: string | Date): LifeStageInfo {
    const info = useMemo(() => {
        if (!birthDate) {
            return {
                stage: 'adult' as LifeStage,
                ageInYears: 30,
                ageInMonths: 360,
                isTeenager: false
            };
        }

        const today = new Date();
        const birth = new Date(birthDate);

        // Calculate precise age
        const ageInDays = calculateExactAgeInDays(birth, today);
        const ageInMonths = ageInDays / 30.4375;
        const ageInYears = ageInMonths / 12;

        let stage: LifeStage = 'adult';

        if (ageInYears < 2) {
            stage = 'infant';
        } else if (ageInYears >= 2 && ageInYears < 5) {
            stage = 'preschool'; // Pediatric I
        } else if (ageInYears >= 5 && ageInYears < 18) {
            stage = 'school'; // Pediatric II
        } else if (ageInYears >= 18 && ageInYears < 65) {
            stage = 'adult';
        } else {
            stage = 'elderly';
        }

        return {
            stage,
            ageInYears,
            ageInMonths,
            isTeenager: ageInYears >= 15 && ageInYears < 18
        };
    }, [birthDate]);

    return info;
}
