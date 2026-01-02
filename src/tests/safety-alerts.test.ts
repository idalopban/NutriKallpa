import { describe, it, expect } from "vitest";
import {
    checkCriticalWeightLoss,
    checkDangerousBMI,
    checkPathologyObesityRisk,
    generateSafetyAlerts,
    WEIGHT_LOSS_THRESHOLDS,
    BMI_THRESHOLDS,
} from "../lib/safety-alerts";

describe("Safety Alerts - Weight Loss Detection", () => {
    describe("checkCriticalWeightLoss", () => {
        it("detects >5% weight loss in 1 month as critical", () => {
            const result = checkCriticalWeightLoss(70, 75, 25); // 6.67% in 25 days
            expect(result.isCritical).toBe(true);
            expect(result.percentLoss).toBeGreaterThan(5);
            expect(result.alert?.severity).toBe("critical");
            expect(result.alert?.type).toBe("weight_loss");
        });

        it("detects >10% weight loss in 6 months as emergency", () => {
            const result = checkCriticalWeightLoss(63, 70, 150); // 10% in 150 days
            expect(result.isCritical).toBe(true);
            expect(result.percentLoss).toBe(10);
            expect(result.alert?.severity).toBe("emergency");
        });

        it("detects >2% weight loss in 1 week as warning", () => {
            const result = checkCriticalWeightLoss(68, 70, 5); // 2.86% in 5 days
            expect(result.isCritical).toBe(false);
            expect(result.alert?.severity).toBe("warning");
        });

        it("returns no alert for normal weight change", () => {
            const result = checkCriticalWeightLoss(69.5, 70, 30); // 0.7% in 30 days
            expect(result.isCritical).toBe(false);
            expect(result.alert).toBeUndefined();
        });

        it("returns no alert for weight gain", () => {
            const result = checkCriticalWeightLoss(75, 70, 30);
            expect(result.isCritical).toBe(false);
            expect(result.percentLoss).toBe(0);
        });

        it("handles invalid inputs gracefully", () => {
            expect(checkCriticalWeightLoss(0, 70, 30).isCritical).toBe(false);
            expect(checkCriticalWeightLoss(70, 0, 30).isCritical).toBe(false);
            expect(checkCriticalWeightLoss(-10, 70, 30).isCritical).toBe(false);
        });
    });
});

describe("Safety Alerts - BMI Checks", () => {
    describe("checkDangerousBMI", () => {
        it("detects IMC < 12 as incompatible with life", () => {
            const result = checkDangerousBMI(30, 170); // BMI = 10.4
            expect(result.isCritical).toBe(true);
            expect(result.category).toBe("incompatible");
            expect(result.alert?.severity).toBe("emergency");
        });

        it("detects IMC > 60 as incompatible", () => {
            const result = checkDangerousBMI(250, 170); // BMI = 86.5
            expect(result.isCritical).toBe(true);
            expect(result.category).toBe("incompatible");
        });

        it("detects IMC < 16 as severe underweight", () => {
            const result = checkDangerousBMI(43, 170); // BMI = 14.9
            expect(result.isCritical).toBe(true);
            expect(result.category).toBe("severe_underweight");
            expect(result.alert?.severity).toBe("critical");
        });

        it("detects IMC >= 40 as morbid obesity", () => {
            const result = checkDangerousBMI(120, 170); // BMI = 41.5
            expect(result.isCritical).toBe(false);
            expect(result.category).toBe("severe_obesity");
            expect(result.alert?.severity).toBe("warning");
        });

        it("returns normal for healthy BMI", () => {
            const result = checkDangerousBMI(70, 175); // BMI = 22.9
            expect(result.isCritical).toBe(false);
            expect(result.category).toBe("normal");
            expect(result.alert).toBeUndefined();
        });

        it("handles invalid inputs", () => {
            expect(checkDangerousBMI(0, 170).bmi).toBe(0);
            expect(checkDangerousBMI(70, 0).bmi).toBe(0);
        });
    });
});

describe("Safety Alerts - Pathology + Obesity Risk", () => {
    describe("checkPathologyObesityRisk", () => {
        it("alerts when BMI >= 30 with hypertension", () => {
            const result = checkPathologyObesityRisk(32, ["Hipertensión arterial"]);
            expect(result).not.toBeNull();
            expect(result?.type).toBe("pathology_risk");
            expect(result?.severity).toBe("warning");
        });

        it("alerts critical when BMI >= 35 with diabetes", () => {
            const result = checkPathologyObesityRisk(37, ["Diabetes Mellitus tipo 2"]);
            expect(result).not.toBeNull();
            expect(result?.severity).toBe("critical");
        });

        it("returns null for BMI < 30 even with pathology", () => {
            const result = checkPathologyObesityRisk(28, ["Hipertensión"]);
            expect(result).toBeNull();
        });

        it("returns null for high BMI without high-risk pathology", () => {
            const result = checkPathologyObesityRisk(35, ["Gastritis", "Migraña"]);
            expect(result).toBeNull();
        });

        it("returns null for empty pathology list", () => {
            const result = checkPathologyObesityRisk(40, []);
            expect(result).toBeNull();
        });
    });
});

describe("Safety Alerts - Orchestrator", () => {
    describe("generateSafetyAlerts", () => {
        it("generates multiple alerts when conditions overlap", () => {
            const alerts = generateSafetyAlerts({
                currentWeight: 42,
                previousWeight: 50,
                daysElapsed: 25,
                height: 170,
                patologias: ["Diabetes"],
            });

            // Should have weight loss alert + severe underweight BMI
            expect(alerts.length).toBeGreaterThanOrEqual(2);
        });

        it("orders alerts by severity (emergency first)", () => {
            const alerts = generateSafetyAlerts({
                currentWeight: 30, // BMI < 12 = emergency
                height: 170,
            });

            if (alerts.length > 0) {
                expect(alerts[0].severity).toBe("emergency");
            }
        });

        it("returns empty array for healthy patient", () => {
            const alerts = generateSafetyAlerts({
                currentWeight: 70,
                height: 175,
            });
            expect(alerts.length).toBe(0);
        });
    });
});

describe("Safety Alerts - Constants", () => {
    it("has correct weight loss thresholds", () => {
        expect(WEIGHT_LOSS_THRESHOLDS.ONE_MONTH_MODERATE.percent).toBe(5);
        expect(WEIGHT_LOSS_THRESHOLDS.SIX_MONTHS_SEVERE.percent).toBe(10);
    });

    it("has correct BMI thresholds", () => {
        expect(BMI_THRESHOLDS.INCOMPATIBLE_LOW).toBe(12);
        expect(BMI_THRESHOLDS.INCOMPATIBLE_HIGH).toBe(60);
        expect(BMI_THRESHOLDS.SEVERE_UNDERWEIGHT).toBe(16);
        expect(BMI_THRESHOLDS.MORBID_OBESITY).toBe(40);
    });
});
