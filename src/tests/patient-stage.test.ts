import { describe, it, expect } from "vitest";
import {
    getPatientStage,
    isPediatric,
    isAdult,
    isGeriatric,
    selectCalculationMethod,
    PEDIATRIC_AGE_THRESHOLD,
    GERIATRIC_AGE_THRESHOLD,
} from "../lib/patient-stage";

describe("Patient Stage Categorization", () => {
    describe("getPatientStage", () => {
        it("classifies 0-year-old (infant) as PEDIATRIC", () => {
            const birth = new Date();
            birth.setMonth(birth.getMonth() - 6); // 6 months old
            expect(getPatientStage(birth)).toBe("PEDIATRIC");
        });

        it("classifies 17-year-old as PEDIATRIC", () => {
            const birth = new Date();
            birth.setFullYear(birth.getFullYear() - 17);
            expect(getPatientStage(birth)).toBe("PEDIATRIC");
        });

        it("classifies 18-year-old as ADULT (not PEDIATRIC)", () => {
            const birth = new Date();
            birth.setFullYear(birth.getFullYear() - 18);
            expect(getPatientStage(birth)).toBe("ADULT");
        });

        it("classifies 59-year-old as ADULT", () => {
            const birth = new Date();
            birth.setFullYear(birth.getFullYear() - 59);
            expect(getPatientStage(birth)).toBe("ADULT");
        });

        it("classifies 60-year-old as GERIATRIC", () => {
            const birth = new Date();
            birth.setFullYear(birth.getFullYear() - 60);
            expect(getPatientStage(birth)).toBe("GERIATRIC");
        });

        it("classifies 85-year-old as GERIATRIC", () => {
            const birth = new Date();
            birth.setFullYear(birth.getFullYear() - 85);
            expect(getPatientStage(birth)).toBe("GERIATRIC");
        });

        it("handles string date input", () => {
            const birthStr = new Date();
            birthStr.setFullYear(birthStr.getFullYear() - 25);
            expect(getPatientStage(birthStr.toISOString())).toBe("ADULT");
        });
    });

    describe("isPediatric", () => {
        it("returns true for age < 18", () => {
            expect(isPediatric(0)).toBe(true);
            expect(isPediatric(5)).toBe(true);
            expect(isPediatric(17)).toBe(true);
            expect(isPediatric(17.9)).toBe(true);
        });

        it("returns false for age >= 18", () => {
            expect(isPediatric(18)).toBe(false);
            expect(isPediatric(25)).toBe(false);
            expect(isPediatric(60)).toBe(false);
        });
    });

    describe("isAdult", () => {
        it("returns true for 18 <= age < 60", () => {
            expect(isAdult(18)).toBe(true);
            expect(isAdult(30)).toBe(true);
            expect(isAdult(59)).toBe(true);
        });

        it("returns false for age < 18 or age >= 60", () => {
            expect(isAdult(17)).toBe(false);
            expect(isAdult(60)).toBe(false);
            expect(isAdult(70)).toBe(false);
        });
    });

    describe("isGeriatric", () => {
        it("returns true for age >= 60", () => {
            expect(isGeriatric(60)).toBe(true);
            expect(isGeriatric(75)).toBe(true);
            expect(isGeriatric(90)).toBe(true);
        });

        it("returns false for age < 60", () => {
            expect(isGeriatric(59)).toBe(false);
            expect(isGeriatric(18)).toBe(false);
            expect(isGeriatric(5)).toBe(false);
        });
    });

    describe("selectCalculationMethod", () => {
        it("allows Z-Scores only for pediatric patients", () => {
            const pediatric = selectCalculationMethod(10, "masculino");
            expect(pediatric.allowZScores).toBe(true);
            expect(pediatric.bmiType).toBe("percentile");

            const adult = selectCalculationMethod(25, "masculino");
            expect(adult.allowZScores).toBe(false);
            expect(adult.bmiType).toBe("standard");
        });

        it("uses geriatric BMI type for patients 60+", () => {
            const geriatric = selectCalculationMethod(65, "femenino");
            expect(geriatric.bmiType).toBe("geriatric");
            expect(geriatric.suggestedFormula).toBe("chumlea");
        });

        it("suggests Jackson for adult males, Durnin for females", () => {
            const male = selectCalculationMethod(30, "masculino");
            expect(male.suggestedFormula).toBe("jackson");

            const female = selectCalculationMethod(30, "femenino");
            expect(female.suggestedFormula).toBe("durnin");
        });

        it("blocks body composition for pediatric patients", () => {
            const child = selectCalculationMethod(10, "masculino");
            expect(child.allowBodyComposition).toBe(false);

            const adult = selectCalculationMethod(25, "masculino");
            expect(adult.allowBodyComposition).toBe(true);
        });
    });

    describe("threshold constants", () => {
        it("has correct pediatric threshold of 18", () => {
            expect(PEDIATRIC_AGE_THRESHOLD).toBe(18);
        });

        it("has correct geriatric threshold of 60", () => {
            expect(GERIATRIC_AGE_THRESHOLD).toBe(60);
        });
    });
});
