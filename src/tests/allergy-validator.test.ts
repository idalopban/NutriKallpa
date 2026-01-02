import { describe, it, expect } from "vitest";
import {
    validateFoodAgainstAllergies,
    validateFoodList,
    getSafeAlternatives,
    filterSafeFoods,
    ALLERGEN_MAP,
    SAFE_ALTERNATIVES,
} from "../lib/allergy-validator";

describe("Allergy Validator - Single Food Validation", () => {
    describe("validateFoodAgainstAllergies", () => {
        it("marks gluten-containing food as unsafe for celiac patient", () => {
            const result = validateFoodAgainstAllergies("Pan integral", ["gluten"]);
            expect(result.isSafe).toBe(false);
            expect(result.allergenFound).toBe("gluten");
            expect(result.alternatives).toBeDefined();
        });

        it("marks dairy as unsafe for lactose intolerant patient", () => {
            const result = validateFoodAgainstAllergies("Queso fresco", ["lactosa"]);
            expect(result.isSafe).toBe(false);
            expect(result.allergenFound).toBe("lactosa");
        });

        it("marks seafood as unsafe for allergic patient", () => {
            const result = validateFoodAgainstAllergies("Ceviche de camarón", [
                "mariscos",
            ]);
            expect(result.isSafe).toBe(false);
            expect(result.severity).toBe("high"); // Mariscos = high severity
        });

        it("marks peanut as unsafe with high severity", () => {
            const result = validateFoodAgainstAllergies("Mantequilla de maní", [
                "mani",
            ]);
            expect(result.isSafe).toBe(false);
            expect(result.severity).toBe("high");
        });

        it("marks food as safe when no allergens present", () => {
            const result = validateFoodAgainstAllergies("Arroz con pollo", [
                "lactosa",
            ]);
            expect(result.isSafe).toBe(true);
            expect(result.allergenFound).toBeUndefined();
        });

        it("handles empty allergies list", () => {
            const result = validateFoodAgainstAllergies("Pan con queso", []);
            expect(result.isSafe).toBe(true);
        });

        it("handles case insensitivity and accents", () => {
            const result = validateFoodAgainstAllergies("LECHE DE VACA", ["Lácteos"]);
            expect(result.isSafe).toBe(false);
        });

        it("provides alternatives for unsafe foods", () => {
            const result = validateFoodAgainstAllergies("Pasta con salsa", ["gluten"]);
            expect(result.isSafe).toBe(false);
            expect(result.alternatives).toContain("arroz");
        });
    });
});

describe("Allergy Validator - Batch Validation", () => {
    describe("validateFoodList", () => {
        it("validates multiple foods and counts safe/unsafe", () => {
            const foods = ["Arroz", "Pan", "Leche", "Pollo", "Queso"];
            const result = validateFoodList(foods, ["gluten", "lactosa"]);

            expect(result.unsafeCount).toBe(3); // Pan, Leche, Queso
            expect(result.safeCount).toBe(2); // Arroz, Pollo
            expect(result.unsafeFoods).toContain("Pan");
            expect(result.unsafeFoods).toContain("Leche");
        });

        it("returns all safe for empty allergies", () => {
            const foods = ["Pan", "Leche", "Queso"];
            const result = validateFoodList(foods, []);
            expect(result.safeCount).toBe(3);
            expect(result.unsafeCount).toBe(0);
        });

        it("handles empty food list", () => {
            const result = validateFoodList([], ["gluten"]);
            expect(result.safeCount).toBe(0);
            expect(result.unsafeCount).toBe(0);
        });
    });
});

describe("Allergy Validator - Safe Alternatives", () => {
    describe("getSafeAlternatives", () => {
        it("returns alternatives for gluten allergy", () => {
            const alternatives = getSafeAlternatives("gluten");
            expect(alternatives).toContain("arroz");
            expect(alternatives).toContain("quinua");
        });

        it("returns alternatives for lactose intolerance", () => {
            const alternatives = getSafeAlternatives("lactosa");
            expect(alternatives).toContain("leche de almendras");
            expect(alternatives).toContain("leche de soya");
        });

        it("returns alternatives for seafood allergy", () => {
            const alternatives = getSafeAlternatives("mariscos");
            expect(alternatives).toContain("pollo");
            expect(alternatives).toContain("tofu");
        });

        it("returns empty array for unknown allergy", () => {
            const alternatives = getSafeAlternatives("unknown_allergy");
            expect(alternatives).toEqual([]);
        });
    });
});

describe("Allergy Validator - Filter Safe Foods", () => {
    describe("filterSafeFoods", () => {
        it("filters out unsafe foods", () => {
            const foods = ["Arroz", "Pan", "Pollo", "Pasta", "Quinua"];
            const safeFoods = filterSafeFoods(foods, ["gluten"]);

            expect(safeFoods).toContain("Arroz");
            expect(safeFoods).toContain("Pollo");
            expect(safeFoods).toContain("Quinua");
            expect(safeFoods).not.toContain("Pan");
            expect(safeFoods).not.toContain("Pasta");
        });

        it("returns all foods when no allergies", () => {
            const foods = ["Pan", "Leche", "Queso"];
            const safeFoods = filterSafeFoods(foods, []);
            expect(safeFoods).toEqual(foods);
        });
    });
});

describe("Allergy Validator - Peruvian Foods Context", () => {
    it("correctly identifies ceviche as unsafe for fish allergy", () => {
        const result = validateFoodAgainstAllergies("Ceviche de pescado", ["pescado"]);
        expect(result.isSafe).toBe(false);
    });

    it("correctly identifies arroz con mariscos", () => {
        const result = validateFoodAgainstAllergies("Arroz con mariscos", [
            "mariscos",
        ]);
        expect(result.isSafe).toBe(false);
    });

    it("correctly identifies quinua as gluten-free", () => {
        const result = validateFoodAgainstAllergies("Quinua con verduras", [
            "gluten",
        ]);
        expect(result.isSafe).toBe(true);
    });

    it("correctly identifies manjar blanco as dairy", () => {
        const result = validateFoodAgainstAllergies("Manjar blanco", ["lactosa"]);
        expect(result.isSafe).toBe(false);
    });

    it("correctly handles tofu for soy allergy", () => {
        const result = validateFoodAgainstAllergies("Tofu salteado", ["soya"]);
        expect(result.isSafe).toBe(false);
    });
});

describe("Allergy Validator - Database Coverage", () => {
    it("has all 14 major allergen categories", () => {
        const expectedCategories = [
            "gluten",
            "lactosa",
            "huevo",
            "pescado",
            "mariscos",
            "frutos_secos",
            "mani",
            "soya",
            "apio",
            "mostaza",
            "sesamo",
            "sulfitos",
            "moluscos",
            "altramuz",
        ];

        for (const category of expectedCategories) {
            expect(ALLERGEN_MAP).toHaveProperty(category);
            expect(ALLERGEN_MAP[category as keyof typeof ALLERGEN_MAP].length).toBeGreaterThan(0);
        }
    });

    it("has alternatives for all allergen categories", () => {
        const allergenKeys = Object.keys(ALLERGEN_MAP);
        for (const key of allergenKeys) {
            expect(SAFE_ALTERNATIVES).toHaveProperty(key);
        }
    });
});
