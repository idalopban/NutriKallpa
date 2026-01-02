/**
 * pediatric-nutrition-guidelines.ts
 *
 * Sistema de recomendaciones nutricionales para menores de 2 años.
 * Basado en: "Guías Alimentarias para Niñas y Niños menores de 2 años de edad"
 * Fuente: MINSA / Instituto Nacional de Salud (INS) - Perú
 *
 * Referencia: https://www.ins.gob.pe/
 */

// ============================================================================
// TYPES
// ============================================================================

export type LactationType = "materna" | "formula" | "mixta";

export interface PediatricPatient {
    ageInMonths: number;
    lactationType: LactationType;
    weightKg?: number;
    hasIronSupplementation?: boolean;
}

export interface MealTexture {
    description: string;
    examples: string[];
}

export interface PediatricNutritionPlan {
    ageInMonths: number;
    lactationType: LactationType;

    // Lactancia
    breastfeedingRecommendation: string;
    breastfeedingFrequency: string;

    // Alimentación complementaria (si aplica)
    texture?: MealTexture;
    mealFrequency?: string;
    portionSize?: string;

    // Alimentos prioritarios
    ironRichFoods: string[];

    // Suplementación
    ironSupplementationNote?: string;

    // Prohibidos
    forbiddenFoods: string[];
    forbiddenReasons: string[];

    // Alertas adicionales
    alerts: string[];

    // Ejemplo de plato (si aplica)
    exampleMeal?: ExampleMeal;
}

/**
 * Estructura de un ejemplo de plato ideal según guías INS/MINSA
 */
export interface ExampleMeal {
    name: string;
    ageRange: string;

    // Componentes del plato
    base: {
        ingredient: string;
        preparation: string;
    };
    protein: {
        ingredient: string;
        quantity: string;
        preparation: string;
    };
    vegetable: {
        ingredient: string;
        preparation: string;
    };
    fat: {
        ingredient: string;
        quantity: string;
    };

    // Resumen
    texture: string;
    totalQuantity: string;
    accompaniment: string;
}

// ============================================================================
// CONSTANTS - GUÍAS INS/MINSA PERÚ
// ============================================================================

/**
 * Alimentos ricos en hierro recomendados por el INS Perú
 * Prioridad: Vísceras y sangrecita (mayor biodisponibilidad)
 */
const IRON_RICH_FOODS_PERU = [
    "Sangrecita de pollo (cocida)",
    "Hígado de pollo o res",
    "Bazo",
    "Bofe (pulmón)",
    "Pescado (partes oscuras)",
    "Corazón de res",
    "Huevo (yema desde 6 meses)",
    "Carne de res molida",
    "Pollo deshilachado",
    "Lentejas (bien cocidas y aplastadas)",
];

/**
 * Alimentos estrictamente prohibidos en menores de 1 año
 */
const FORBIDDEN_FOODS_UNDER_1_YEAR = [
    "Sal añadida",
    "Azúcar añadida",
    "Miel de abeja (riesgo de botulismo infantil)",
    "Leche de vaca entera (fresca, evaporada, en polvo)",
    "Caldos o sopas líquidas/aguadas",
    "Jugos envasados o en caja",
    "Galletas, snacks y ultraprocesados",
    "Embutidos (hot dog, jamón, salchicha)",
    "Gaseosas y bebidas azucaradas",
    "Frutos secos enteros (riesgo de atragantamiento)",
];

const FORBIDDEN_REASONS = [
    "La sal daña los riñones inmaduros del bebé",
    "El azúcar crea preferencia por sabores dulces y caries",
    "La miel puede contener esporas de Clostridium botulinum",
    "La leche de vaca no tiene el perfil nutricional adecuado y puede causar anemia",
    "Las sopas líquidas no aportan suficiente densidad energética",
    "Los ultraprocesados contienen aditivos y exceso de sodio",
];

/**
 * Texturas según edad (INS/MINSA)
 */
const TEXTURES_BY_AGE: Record<number, MealTexture> = {
    6: {
        description: "Papillas, purés y mazamorras ESPESAS (no líquidas)",
        examples: ["Puré de papa con hígado", "Mazamorra de camote con yema", "Puré de zapallo con pollo"],
    },
    7: {
        description: "Triturados (que pueda deshacer con encías)",
        examples: ["Puré grumoso de lentejas", "Plátano aplastado con tenedor", "Pollo deshilachado fino"],
    },
    8: {
        description: "Triturados más gruesos (transición a picados)",
        examples: ["Arroz bien cocido con hígado picado fino", "Zapallo en trocitos muy pequeños"],
    },
    9: {
        description: "Picados pequeños + alimentos que pueda coger con la mano",
        examples: ["Trocitos de pollo suave", "Fideos cortados", "Camote en bastones blandos (BLW)"],
    },
    10: {
        description: "Picados y alimentos de la olla familiar (sin sal/azúcar)",
        examples: ["Arroz con menestra aplastada", "Guiso de pollo picado", "Frutas en trozos suaves"],
    },
    11: {
        description: "Misma textura que 10 meses, aumentar variedad",
        examples: ["Segundos de la olla familiar adaptados", "Huevo revuelto", "Pescado desmenuzado"],
    },
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Genera un plan nutricional personalizado para un bebé menor de 2 años
 * según las guías del INS/MINSA Perú.
 *
 * @param patient - Datos del paciente pediátrico
 * @returns Plan nutricional completo
 */
export function generatePediatricNutritionPlan(patient: PediatricPatient): PediatricNutritionPlan {
    const { ageInMonths, lactationType } = patient;
    const alerts: string[] = [];

    // =========================================================================
    // CASO 1: MENOR DE 6 MESES - LACTANCIA MATERNA EXCLUSIVA
    // =========================================================================
    if (ageInMonths < 6) {
        const plan: PediatricNutritionPlan = {
            ageInMonths,
            lactationType,
            breastfeedingRecommendation:
                lactationType === "materna"
                    ? "✅ Continuar con LACTANCIA MATERNA EXCLUSIVA a libre demanda."
                    : lactationType === "mixta"
                        ? "⚠️ Lactancia mixta actual. Ideal: aumentar tomas de pecho para fortalecer producción."
                        : "💊 Fórmula infantil: Seguir indicaciones del pediatra. Preparar con agua hervida fría.",
            breastfeedingFrequency:
                ageInMonths < 1
                    ? "8-12 veces en 24 horas (cada 2-3 horas), incluyendo noche."
                    : ageInMonths < 3
                        ? "7-9 veces en 24 horas. El bebé regula su demanda."
                        : "6-8 veces en 24 horas. Mantener tomas nocturnas.",
            ironRichFoods: [], // No aplica < 6 meses
            ironSupplementationNote: undefined,
            forbiddenFoods: [
                "Agua simple (la leche materna ya contiene el agua necesaria)",
                "Infusiones (anís, manzanilla, hierba luisa)",
                "Jugos de fruta",
                "Cualquier alimento sólido o semisólido",
                ...FORBIDDEN_FOODS_UNDER_1_YEAR,
            ],
            forbiddenReasons: ["Antes de los 6 meses, el bebé NO necesita nada más que leche materna o fórmula."],
            alerts,
        };

        // Alertas específicas
        if (lactationType === "formula") {
            alerts.push("📋 Verificar que la fórmula sea de inicio (0-6 meses) y NO de continuación.");
        }
        if (ageInMonths >= 4 && !patient.hasIronSupplementation) {
            alerts.push("🚨 Recordar al cuidador: Iniciar gotas de hierro a partir de los 4 meses cumplidos.");
        }

        return plan;
    }

    // =========================================================================
    // CASO 2: 6-11 MESES - ALIMENTACIÓN COMPLEMENTARIA
    // =========================================================================
    if (ageInMonths >= 6 && ageInMonths < 12) {
        // Determinar textura según edad
        const textureKey = Math.min(ageInMonths, 11) as keyof typeof TEXTURES_BY_AGE;
        const texture = TEXTURES_BY_AGE[textureKey] || TEXTURES_BY_AGE[6];

        // Frecuencia de comidas según edad
        let mealFrequency: string;
        let portionSize: string;

        if (ageInMonths === 6) {
            mealFrequency = "2 comidas al día (además de la leche)";
            portionSize = "3-5 cucharadas por comida (≈ medio plato mediano)";
        } else if (ageInMonths <= 8) {
            mealFrequency = "3 comidas al día (desayuno, almuerzo, cena)";
            portionSize = "3-5 cucharadas por comida (≈ medio plato mediano)";
        } else {
            mealFrequency = "3 comidas principales + 1 refrigerio (media mañana o media tarde)";
            portionSize = "5-7 cucharadas por comida (≈ 3/4 de plato mediano)";
        }

        const plan: PediatricNutritionPlan = {
            ageInMonths,
            lactationType,
            breastfeedingRecommendation:
                lactationType === "materna" || lactationType === "mixta"
                    ? "✅ MANTENER lactancia materna + alimentos sólidos. La leche sigue siendo importante."
                    : "💊 Continuar fórmula de seguimiento (6-12 meses) según indicación pediátrica.",
            breastfeedingFrequency: "Antes de cada comida sólida + a libre demanda.",
            texture,
            mealFrequency,
            portionSize,
            ironRichFoods: IRON_RICH_FOODS_PERU,
            ironSupplementationNote: undefined,
            forbiddenFoods: FORBIDDEN_FOODS_UNDER_1_YEAR,
            forbiddenReasons: FORBIDDEN_REASONS,
            alerts,
        };

        // Alertas específicas por edad
        alerts.push("🥄 Prioridad: Incluir DIARIAMENTE 2 cucharadas de alimentos ricos en hierro (sangrecita, hígado, bazo).");

        if (ageInMonths === 6) {
            alerts.push("👶 Primer mes de alimentación complementaria: Paciencia con texturas nuevas. Iniciar con 1-2 cucharaditas.");
        }

        if (ageInMonths >= 9) {
            alerts.push("🤲 Puede empezar a comer con las manos: Ofrecer trozos blandos que pueda agarrar (BLW combinado).");
        }

        alerts.push("🥚 El huevo y pescado se pueden dar desde los 6 meses. No retrasar por miedo a alergias.");
        alerts.push("🧀 Permitido: Yogur natural sin azúcar y queso pasteurizado sin sal en pequeñas cantidades.");

        return plan;
    }

    // =========================================================================
    // CASO 3: 12+ MESES (fuera del scope principal, pero manejado)
    // =========================================================================
    return {
        ageInMonths,
        lactationType,
        breastfeedingRecommendation: "Continuar lactancia materna si es posible, complementada con alimentación familiar.",
        breastfeedingFrequency: "A demanda del niño.",
        mealFrequency: "3 comidas principales + 2 refrigerios",
        portionSize: "Plato completo adaptado a su edad",
        ironRichFoods: IRON_RICH_FOODS_PERU,
        ironSupplementationNote: undefined,
        forbiddenFoods: ["Azúcar añadida (limitar)", "Ultraprocesados", "Embutidos", "Gaseosas"],
        forbiddenReasons: ["Formar hábitos saludables desde temprana edad."],
        alerts: ["A partir de 1 año puede consumir leche de vaca entera (máximo 500ml/día)."],
    };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Genera el plan como texto formateado para mostrar en UI o exportar
 */
export function formatPediatricPlanAsText(plan: PediatricNutritionPlan): string {
    const lines: string[] = [];

    lines.push(`### 🍼 Plan Nutricional: ${plan.ageInMonths} Meses\n`);

    // 1. La Leche
    lines.push("**1. La Leche:**");
    lines.push(plan.breastfeedingRecommendation);
    lines.push(`- Frecuencia: ${plan.breastfeedingFrequency}`);
    lines.push("");

    // 2. Qué comer (si aplica alimentación complementaria)
    if (plan.texture) {
        lines.push("**2. ¿Qué comer hoy? (Consistencia y Frecuencia):**");
        lines.push(`- **Textura:** ${plan.texture.description}`);
        lines.push(`- **Ejemplos:** ${plan.texture.examples.join(", ")}`);
        lines.push(`- **Frecuencia:** ${plan.mealFrequency}`);
        lines.push(`- **Cantidad sugerida:** ${plan.portionSize}`);
        lines.push("");
    }

    // 3. Alimentos Estrella
    if (plan.ironRichFoods.length > 0) {
        lines.push("**3. Alimentos Estrella (Prioridad Hierro):**");
        plan.ironRichFoods.slice(0, 5).forEach((food) => {
            lines.push(`- ${food}`);
        });
        lines.push("");
    }

    // 4. Prohibidos
    lines.push("**4. ⚠️ Lista de Prohibidos (Por seguridad del bebé):**");
    plan.forbiddenFoods.slice(0, 6).forEach((food) => {
        lines.push(`- ❌ ${food}`);
    });
    lines.push("");


    // Alertas
    if (plan.alerts.length > 0) {
        lines.push("---");
        lines.push("**💡 Notas Importantes:**");
        plan.alerts.forEach((alert) => {
            lines.push(`- ${alert}`);
        });
    }

    return lines.join("\n");
}

/**
 * Valida si un alimento es seguro para la edad del bebé
 */
export function isFoodSafeForAge(foodName: string, ageInMonths: number): { safe: boolean; reason?: string } {
    const normalizedFood = foodName.toLowerCase();

    // Antes de 6 meses: NADA excepto leche
    if (ageInMonths < 6) {
        return {
            safe: false,
            reason: "Antes de los 6 meses solo se permite leche materna o fórmula.",
        };
    }

    // Verificar alimentos prohibidos < 1 año
    if (ageInMonths < 12) {
        if (normalizedFood.includes("miel")) {
            return { safe: false, reason: "Miel prohibida en menores de 1 año (riesgo de botulismo)." };
        }
        if (normalizedFood.includes("sal") || normalizedFood.includes("azucar") || normalizedFood.includes("azúcar")) {
            return { safe: false, reason: "No añadir sal ni azúcar en menores de 1 año." };
        }
        if (normalizedFood.includes("leche de vaca") || normalizedFood.includes("leche entera")) {
            return { safe: false, reason: "Leche de vaca no recomendada como bebida antes del año." };
        }
        if (normalizedFood.includes("hot dog") || normalizedFood.includes("salchicha") || normalizedFood.includes("embutido")) {
            return { safe: false, reason: "Embutidos prohibidos en menores de 1 año." };
        }
        if (normalizedFood.includes("nuez") || normalizedFood.includes("mani") || normalizedFood.includes("maní") || normalizedFood.includes("almendra")) {
            return { safe: false, reason: "Frutos secos enteros: riesgo de atragantamiento. Dar en forma de mantequilla diluida." };
        }
    }

    return { safe: true };
}

// ============================================================================
// EXAMPLE MEALS DATABASE - GUÍAS INS/MINSA
// ============================================================================

/**
 * Base de datos de platos ejemplo según grupo de edad
 * Siguiendo estrictamente las guías INS/MINSA Perú
 */
const EXAMPLE_MEALS_6_TO_8_MONTHS: ExampleMeal[] = [
    {
        name: "Puré de Papa con Hígado",
        ageRange: "6-8 meses",
        base: {
            ingredient: "Papa amarilla",
            preparation: "Aplastada con tenedor hasta formar puré suave"
        },
        protein: {
            ingredient: "Hígado de pollo",
            quantity: "2 cucharadas obligatorias",
            preparation: "Cocido y aplastado finamente"
        },
        vegetable: {
            ingredient: "Zapallo",
            preparation: "Cocido al vapor y hecho puré"
        },
        fat: {
            ingredient: "Aceite vegetal (soya o girasol)",
            quantity: "1 cucharadita añadida al final"
        },
        texture: "Aplastado, papilla, puré o mazamorra espesa",
        totalQuantity: "3-5 cucharadas (½ plato mediano)",
        accompaniment: "Agua segura hervida (sin azúcar)"
    },
    {
        name: "Mazamorra de Camote con Sangrecita",
        ageRange: "6-8 meses",
        base: {
            ingredient: "Camote morado o amarillo",
            preparation: "Cocido y convertido en mazamorra espesa"
        },
        protein: {
            ingredient: "Sangrecita de pollo",
            quantity: "2 cucharadas obligatorias",
            preparation: "Cocida y mezclada finamente"
        },
        vegetable: {
            ingredient: "Zanahoria",
            preparation: "Cocida al vapor y aplastada"
        },
        fat: {
            ingredient: "Aceite de oliva",
            quantity: "1 cucharadita añadida al final"
        },
        texture: "Mazamorra espesa (NO líquida)",
        totalQuantity: "3-5 cucharadas (½ plato mediano)",
        accompaniment: "Agua segura hervida (sin azúcar)"
    },
    {
        name: "Puré de Zapallo con Pescado",
        ageRange: "6-8 meses",
        base: {
            ingredient: "Zapallo macre",
            preparation: "Cocido al vapor y hecho puré"
        },
        protein: {
            ingredient: "Pescado bonito (sin espinas)",
            quantity: "2 cucharadas obligatorias",
            preparation: "Cocido y desmenuzado finamente"
        },
        vegetable: {
            ingredient: "Espinaca tierna",
            preparation: "Cocida y picada muy fina, mezclada en el puré"
        },
        fat: {
            ingredient: "Mantequilla sin sal",
            quantity: "1 cucharadita añadida al final"
        },
        texture: "Puré suave sin grumos",
        totalQuantity: "3-5 cucharadas (½ plato mediano)",
        accompaniment: "Agua segura hervida (sin azúcar)"
    }
];

const EXAMPLE_MEALS_9_TO_11_MONTHS: ExampleMeal[] = [
    {
        name: "Arroz Graneado con Hígado Picado",
        ageRange: "9-11 meses",
        base: {
            ingredient: "Arroz blanco",
            preparation: "Bien cocido, granos separados y blandos"
        },
        protein: {
            ingredient: "Hígado de res",
            quantity: "2 cucharadas obligatorias",
            preparation: "Picado en trocitos muy pequeños"
        },
        vegetable: {
            ingredient: "Arvejas y zanahoria",
            preparation: "Cocidas y picadas en trozos pequeños"
        },
        fat: {
            ingredient: "Aceite vegetal",
            quantity: "1 cucharadita añadida al final"
        },
        texture: "Triturado o picado pequeño (que pueda coger con la mano)",
        totalQuantity: "5-7 cucharadas (¾ plato mediano)",
        accompaniment: "Agua segura hervida (sin azúcar)"
    },
    {
        name: "Guiso de Pollo con Fideos",
        ageRange: "9-11 meses",
        base: {
            ingredient: "Fideos cabello de ángel",
            preparation: "Cortados en trozos pequeños, bien cocidos"
        },
        protein: {
            ingredient: "Pechuga de pollo",
            quantity: "2 cucharadas obligatorias",
            preparation: "Deshilachada en tiras pequeñas"
        },
        vegetable: {
            ingredient: "Zapallo y brócoli",
            preparation: "En trocitos suaves que pueda agarrar"
        },
        fat: {
            ingredient: "Aceite de oliva",
            quantity: "1 cucharadita añadida al final"
        },
        texture: "Picado pequeño, algunos trozos para BLW",
        totalQuantity: "5-7 cucharadas (¾ plato mediano)",
        accompaniment: "Agua segura hervida (sin azúcar)"
    },
    {
        name: "Menestra con Huevo",
        ageRange: "9-11 meses",
        base: {
            ingredient: "Lentejas",
            preparation: "Bien cocidas y ligeramente aplastadas"
        },
        protein: {
            ingredient: "Huevo entero",
            quantity: "1 huevo (equivale a 2 cucharadas de proteína)",
            preparation: "Revuelto o en trozos pequeños"
        },
        vegetable: {
            ingredient: "Tomate y cebolla",
            preparation: "Cocidos y picados muy fino"
        },
        fat: {
            ingredient: "Aceite vegetal",
            quantity: "1 cucharadita para saltear"
        },
        texture: "Menestra espesa con trozos reconocibles",
        totalQuantity: "5-7 cucharadas (¾ plato mediano)",
        accompaniment: "Agua segura hervida (sin azúcar)"
    },
    {
        name: "Segunda de Pescado con Papa",
        ageRange: "9-11 meses",
        base: {
            ingredient: "Papa blanca",
            preparation: "En cubitos pequeños y blandos"
        },
        protein: {
            ingredient: "Pescado jurel o caballa",
            quantity: "2 cucharadas obligatorias",
            preparation: "Desmenuzado, sin espinas"
        },
        vegetable: {
            ingredient: "Vainitas y zanahoria",
            preparation: "Picadas en bastones pequeños"
        },
        fat: {
            ingredient: "Aceite vegetal",
            quantity: "1 cucharadita añadida al final"
        },
        texture: "Trozos pequeños que pueda coger con la mano",
        totalQuantity: "5-7 cucharadas (¾ plato mediano)",
        accompaniment: "Agua segura hervida (sin azúcar)"
    }
];

/**
 * Genera un ejemplo de comida según la edad del bebé.
 * Sigue estrictamente las guías INS/MINSA Perú.
 *
 * @param ageInMonths - Edad del bebé en meses
 * @returns Ejemplo de plato ideal o null si < 6 meses
 */
export function generateExampleMeal(ageInMonths: number): ExampleMeal | null {
    // Menores de 6 meses: solo lactancia
    if (ageInMonths < 6) {
        return null;
    }

    // 6-8 meses: selección aleatoria de platos para ese grupo
    if (ageInMonths <= 8) {
        const randomIndex = Math.floor(Math.random() * EXAMPLE_MEALS_6_TO_8_MONTHS.length);
        return EXAMPLE_MEALS_6_TO_8_MONTHS[randomIndex];
    }

    // 9-11 meses: selección aleatoria de platos para ese grupo
    if (ageInMonths <= 11) {
        const randomIndex = Math.floor(Math.random() * EXAMPLE_MEALS_9_TO_11_MONTHS.length);
        return EXAMPLE_MEALS_9_TO_11_MONTHS[randomIndex];
    }

    // 12+ meses: retornar un plato de 9-11 (ya puede comer similar)
    const randomIndex = Math.floor(Math.random() * EXAMPLE_MEALS_9_TO_11_MONTHS.length);
    return EXAMPLE_MEALS_9_TO_11_MONTHS[randomIndex];
}

/**
 * Formatea un ejemplo de comida para mostrar en UI
 */
export function formatExampleMealAsText(meal: ExampleMeal): string {
    return `
🍽️ **Ejemplo de Comida: ${meal.name}**
*Apto para: ${meal.ageRange}*

1. **La Base (Energía):** ${meal.base.ingredient}
   * *Preparación:* ${meal.base.preparation}

2. **El Constructor (Hierro y Proteína):** ${meal.protein.ingredient}
   * *Cantidad:* ${meal.protein.quantity}
   * *Preparación:* ${meal.protein.preparation}

3. **El Protector (Vitaminas):** ${meal.vegetable.ingredient}
   * *Preparación:* ${meal.vegetable.preparation}

4. **Grasa Saludable:** ${meal.fat.ingredient}
   * *Cantidad:* ${meal.fat.quantity}

---
**📊 Resumen Visual:**
- **Consistencia:** ${meal.texture}
- **Cantidad Total:** ${meal.totalQuantity}
- **Acompañamiento:** ${meal.accompaniment}
`.trim();
}
