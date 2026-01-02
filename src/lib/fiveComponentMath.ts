/**
 * Five-Component Body Fractionation Model
 * Deborah Kerr (1988) - ISAK Level 3 Methodology
 * 
 * Uses Phantom stratagem (Ross & Wilson 1974) for Z-score calculations
 * 
 * Components:
 * 1. Skin Mass (Du Bois Surface Area)
 * 2. Adipose Mass (Phantom Z-scores from skinfolds)
 * 3. Muscle Mass (Phantom Z-scores from corrected girths)
 * 4. Bone Mass (Phantom Z-scores from bone breadths)
 * 5. Residual Mass (Phantom Z-scores from trunk measurements)
 */
import { ClinicalSafetyFlag } from "@/types";

// ===========================================
// PHANTOM CONSTANTS (Ross & Wilson 1974)
// Reference subject: Height = 170.18 cm, Weight = 64.58 kg
// ===========================================

const PHANTOM = {
    // Reference values
    height: 170.18,  // cm
    weight: 64.58,   // kg

    // Skinfolds (mm) - p = mean, s = standard deviation
    skinfolds: {
        triceps: { p: 15.4, s: 4.47 },
        subscapular: { p: 17.2, s: 5.07 },
        /**
         * SUPRAESPINAL (Supraspinale) - ISAK Standard Site
         * Ubicación: Intersección de la línea desde el borde axilar anterior al
         * borde superior de la cresta ilíaca con la horizontal del punto ilioespinal.
         * 
         * NOTA: Diferente de "Cresta Ilíaca" (Iliac Crest) usado en Durnin-Womersley.
         * - Supraespinal: Modelo Kerr 5C y Somatotipo Heath-Carter
         * - Cresta Ilíaca: Fórmulas de densidad (D-W 1974, J-P 1978)
         */
        supraspinal: { p: 15.4, s: 4.47 },
        abdominal: { p: 25.4, s: 7.78 },
        thigh: { p: 27.0, s: 8.33 },          // Muslo frontal
        calf: { p: 16.0, s: 4.67 }            // Pantorrilla medial
    },

    // Girths/Perimeters (cm)
    girths: {
        armRelaxed: { p: 26.89, s: 2.33 },    // Brazo relajado
        armFlexed: { p: 29.41, s: 2.37 },     // Brazo flexionado
        forearm: { p: 25.13, s: 1.41 },       // Antebrazo
        chest: { p: 87.86, s: 5.18 },         // Tórax
        waist: { p: 71.91, s: 4.45 },         // Cintura
        thigh: { p: 55.82, s: 4.23 },         // Muslo medio
        calf: { p: 35.25, s: 2.30 }           // Pantorrilla máxima
    },

    // Bone Breadths/Diameters (cm)
    breadths: {
        humerus: { p: 6.48, s: 0.35 },        // Bi-epicondilar húmero
        femur: { p: 9.52, s: 0.48 },          // Bi-epicondilar fémur
        wrist: { p: 5.21, s: 0.28 },          // Biestiloideo (muñeca)
        ankle: { p: 6.68, s: 0.36 },          // Bimaleolar (tobillo)
        biacromial: { p: 38.04, s: 1.92 },    // Biacromial
        biiliocristal: { p: 28.84, s: 1.75 }, // Biiliocrestídeo
        chestTransverse: { p: 27.92, s: 1.74 }, // Tórax transverso
        chestAP: { p: 17.50, s: 1.38 },       // Tórax antero-posterior
        headCircumference: { p: 57.20, s: 1.52 } // Perímetro cefálico (adultos)
    },

    // Fractional Masses (kg) - Kerr reference values
    masses: {
        skin: { p: 2.07, s: 0.28 },
        adipose: { p: 12.13, s: 3.25 },
        muscle: { p: 25.55, s: 2.99 },
        bone: { p: 6.68, s: 0.85 },
        residual: { p: 6.35, s: 1.24 }
    }
};

// Skin thickness constant (mm) - average dermis thickness
const SKIN_THICKNESS = 2.07;  // mm
const SKIN_DENSITY = 1.05;    // g/cm³

// ===========================================
// ISAK BIOLOGICAL RANGE VALIDATION (CRITICAL)
// ===========================================

/**
 * ISAK Level 3 physiologically possible ranges
 * Values outside these ranges indicate measurement error
 */
export const ISAK_RANGES = {
    // Skinfolds (mm) - validated against ISAK Level 3 standards
    skinfolds: {
        triceps: { min: 3, max: 45, warn: 35 },
        subscapular: { min: 4, max: 50, warn: 40 },
        biceps: { min: 2, max: 25, warn: 20 },
        suprailiac: { min: 3, max: 55, warn: 45 },
        abdominal: { min: 4, max: 70, warn: 55 },
        thigh: { min: 4, max: 60, warn: 50 },
        calf: { min: 2, max: 35, warn: 28 },
    },
    // Girths/Perimeters (cm)
    girths: {
        armRelaxed: { min: 18, max: 55, warn: 45 },
        armFlexed: { min: 20, max: 60, warn: 50 },
        forearm: { min: 18, max: 40, warn: 35 },
        waist: { min: 50, max: 180, warn: 130 },
        thigh: { min: 35, max: 90, warn: 75 },
        calf: { min: 25, max: 55, warn: 48 },
    },
    // Bone Breadths (cm) - Strict ranges for adults (Kerr model)
    breadths: {
        humerus: { min: 5.5, max: 12, warn: 9 },           // Húmero bi-epicondilar (adulto normal 6-7cm)
        femur: { min: 8.0, max: 16, warn: 13 },            // Fémur bi-epicondilar (adulto normal 9-10cm)
        wrist: { min: 4.5, max: 7.5, warn: 6.5 },
        ankle: { min: 6.0, max: 10, warn: 8.5 },
        biacromial: { min: 30, max: 60, warn: 45 },      // Diámetro biacromial
        biiliocristal: { min: 22, max: 50, warn: 38 },   // Diámetro biiliocristal
    },
    // Basic measurements
    basic: {
        weight: { min: 30, max: 250, warn: 180 },      // kg (adults)
        height: { min: 120, max: 230, warn: 210 },     // cm (adults)
        age: { min: 14, max: 110, warn: 100 },         // Focus on adult range for Kerr
    }
} as const;

export type ValidationError = {
    field: string;
    value: number;
    issue: 'below_min' | 'above_max' | 'warning' | 'anatomically_impossible';
    message: string;
};

// ===========================================
// TYPES
// ===========================================

export interface FiveComponentInput {
    // Basic data
    weight: number;          // kg
    height: number;          // cm
    age: number;
    gender: 'male' | 'female';

    /** 
     * Sitting Height (Talla Sentado) - cm
     * Used to calculate Cormic Index = (sittingHeight / height) × 100
     * Important for detecting skeletal proportions in athletes
     */
    sittingHeight?: number;

    /** 
     * Head Circumference (Perímetro Cefálico) - cm
     * Used for Residual Mass calculation in Kerr 5-Component model
     * Provides more accurate estimation of bone + viscera mass
     * Normal adult range: 52-60 cm (males), 51-58 cm (females)
     */
    headCircumference?: number;

    // Skinfolds (mm)
    triceps: number;
    subscapular: number;
    biceps: number;
    /**
     * NOTA IMPORTANTE - Nomenclatura de pliegues:
     * Este campo se usa para el pliegue SUPRAESPINAL (supraspinale) en el modelo Kerr.
     * 
     * - Supraespinal: Línea axilar media-anterior, 5-7cm sobre cresta ilíaca
     *   → Usado para Fraccionamiento 5C y Somatotipo Heath-Carter
     * 
     * - Cresta Ilíaca: Línea axilar anterior, justo sobre cresta
     *   → Usado en algunas fórmulas de %GC (Jackson-Pollock 7 pliegues)
     * 
     * Para la mayoría de aplicaciones ISAK, usar el sitio SUPRAESPINAL.
     */
    suprailiac: number;      // Supraespinal para Kerr/Heath-Carter
    abdominal: number;
    thigh: number;           // Muslo Frontal
    calf: number;            // Pantorrilla Medial

    // Girths (cm)
    armRelaxedGirth: number;   // Brazo Relajado
    armFlexedGirth?: number;   // Brazo Flexionado (optional)
    forearmGirth?: number;     // Antebrazo (optional)
    chestGirth?: number;       // Tórax (optional)
    waistGirth?: number;       // Cintura (optional)
    thighGirth: number;        // Muslo Medio
    calfGirth: number;         // Pantorrilla Máxima

    // Bone Breadths (cm)
    humerusBreadth: number;    // Húmero (codo)
    femurBreadth: number;      // Fémur (rodilla)
    wristBreadth?: number;     // Muñeca (optional)
    ankleBreadth?: number;     // Tobillo (optional)
    biacromialBreadth?: number;  // Biacromial (optional)
    biiliocristalBreadth?: number; // Biiliocrestídeo (optional)

    /**
     * Measurement replications for TEM calculation
     * Each skinfold site should have 2-3 measurements
     * TEM is calculated using Dahlberg formula
     */
    measurementReplications?: {
        triceps?: number[];
        subscapular?: number[];
        biceps?: number[];
        suprailiac?: number[];
        abdominal?: number[];
        thigh?: number[];
        calf?: number[];
    };
}

export interface MassResult {
    kg: number;
    percent: number;
}

export interface FiveComponentResult {
    skin: MassResult;
    bone: MassResult;
    muscle: MassResult;
    adipose: MassResult;
    residual: MassResult;
    isValid: boolean;
    missingData: string[];
    bodyDensity: number;
    /** Percentage of Adipose Tissue (Includes water/connective tissue) */
    adiposePercent: number;
    /** Estimated Lipid Fat Percentage (Correction factor applied to Adipose Mass) */
    lipidFatPercent: number;
    zScores: {
        adipose: number;
        muscle: number;
        bone: number;
        residual: number;
    };
    /** Indicates if residual mass was estimated (fallback) vs calculated from trunk measurements */
    residualIsEstimated?: boolean;
    /** Cormic Index = (sittingHeight / height) * 100 */
    cormicIndex?: number;
    /** Interpretation of skeletal proportions */
    cormicInterpretation?: string;
    /** Obesity warning when skinfold sum is too high for reliable measurement */
    obesityWarning?: {
        skinfoldSum: number;
        message: string;
        alternativeFormulas: string[];
    };
    flags?: ClinicalSafetyFlag[];
    errors: ValidationError[];
    warnings: ValidationError[];
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Calculate Z-score for Phantom adjustment
 * Z = (V × (170.18/h)^d - p) / s
 * where d = 1 for lengths, girths, skinfolds, diameters
 * 
 * CRITICAL: Protected against division by zero
 */
function calculateZScore(value: number, height: number, phantomP: number, phantomS: number): number | null {
    // Guard against invalid inputs and division by zero
    if (!value || value <= 0 || !height || height <= 0 || phantomS === 0) return null;

    const adjustedValue = value * (PHANTOM.height / height);
    return (adjustedValue - phantomP) / phantomS;
}

/**
 * Calculate mean Z-score from multiple measurements
 */
function getMeanZScore(zScores: (number | null)[]): number {
    const validZ = zScores.filter((z): z is number => z !== null && !isNaN(z));
    if (validZ.length === 0) return 0;
    return validZ.reduce((sum, z) => sum + z, 0) / validZ.length;
}

/**
 * Calculate fractional mass using Phantom formula
 * Mass = (Z × s + p) × (h/170.18)³
 */
function calculatePhantomMass(zScore: number, phantomP: number, phantomS: number, height: number): number {
    const heightRatio = Math.pow(height / PHANTOM.height, 3);
    return Math.max(0, (zScore * phantomS + phantomP) * heightRatio);
}

/**
 * Calculate Body Surface Area using Du Bois formula
 * SA (cm²) = Weight^0.425 × Height^0.725 × 71.84
 * Note: Original formula gives m², we multiply by 10000 for cm²
 */
function calculateDuBoisSA(weight: number, height: number): number {
    return Math.pow(weight, 0.425) * Math.pow(height, 0.725) * 71.84;
}

export interface ValidationResult {
    isValid: boolean;
    missing: string[];
    errors: ValidationError[];
    warnings: ValidationError[];
}

/**
 * Comprehensive validation
 * Performs full ISAK range and anatomical consistency checks
 */
export function validateFiveComponentInput(data: FiveComponentInput) {
    const missing: string[] = [];
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Helper to validate a range
    const validateRange = (
        value: number | undefined,
        field: string,
        range: { min: number; max: number; warn: number }
    ) => {
        if (value === undefined || value === 0) return;

        if (value < 0) {
            errors.push({
                field,
                value,
                issue: 'below_min',
                message: `${field} no puede ser negativo(${value})`
            });
        } else if (value < range.min) {
            errors.push({
                field,
                value,
                issue: 'below_min',
                message: `${field} (${value}) está por debajo del mínimo ISAK(${range.min})`
            });
        } else if (value > range.max) {
            errors.push({
                field,
                value,
                issue: 'above_max',
                message: `${field} (${value}) excede el máximo ISAK(${range.max})`
            });
        } else if (value > range.warn) {
            warnings.push({
                field,
                value,
                issue: 'warning',
                message: `${field} (${value}) es inusualmente alto - verificar medición`
            });
        }
    };

    // ===== REQUIRED BASIC DATA =====
    if (!data.weight || data.weight <= 0) {
        missing.push('Peso');
    } else {
        validateRange(data.weight, 'Peso', ISAK_RANGES.basic.weight);
    }

    if (!data.height || data.height <= 0) {
        missing.push('Talla');
    } else {
        validateRange(data.height, 'Talla', ISAK_RANGES.basic.height);
    }

    if (!data.age || data.age <= 0) {
        missing.push('Edad');
    } else {
        validateRange(data.age, 'Edad', ISAK_RANGES.basic.age);
    }

    // ===== SKINFOLDS VALIDATION =====
    validateRange(data.triceps, 'Pliegue Tríceps', ISAK_RANGES.skinfolds.triceps);
    validateRange(data.subscapular, 'Pliegue Subescapular', ISAK_RANGES.skinfolds.subscapular);
    validateRange(data.biceps, 'Pliegue Bíceps', ISAK_RANGES.skinfolds.biceps);
    validateRange(data.suprailiac, 'Pliegue Supraespinal', ISAK_RANGES.skinfolds.suprailiac);
    validateRange(data.abdominal, 'Pliegue Abdominal', ISAK_RANGES.skinfolds.abdominal);
    validateRange(data.thigh, 'Pliegue Muslo', ISAK_RANGES.skinfolds.thigh);
    validateRange(data.calf, 'Pliegue Pantorrilla', ISAK_RANGES.skinfolds.calf);

    // Check skinfold count
    const skinfoldCount = [
        data.triceps, data.subscapular, data.suprailiac,
        data.abdominal, data.thigh, data.calf
    ].filter(v => v && v > 0).length;

    if (skinfoldCount < 4) {
        if (!data.triceps || data.triceps <= 0) missing.push('Pliegue Tríceps');
        if (!data.subscapular || data.subscapular <= 0) missing.push('Pliegue Subescapular');
        if (!data.suprailiac || data.suprailiac <= 0) missing.push('Pliegue Supraespinal');
        if (!data.abdominal || data.abdominal <= 0) missing.push('Pliegue Abdominal');
    }

    // ===== GIRTHS VALIDATION =====
    validateRange(data.armRelaxedGirth, 'Perímetro Brazo Relajado', ISAK_RANGES.girths.armRelaxed);
    validateRange(data.armFlexedGirth, 'Perímetro Brazo Flexionado', ISAK_RANGES.girths.armFlexed);
    validateRange(data.thighGirth, 'Perímetro Muslo', ISAK_RANGES.girths.thigh);
    validateRange(data.calfGirth, 'Perímetro Pantorrilla', ISAK_RANGES.girths.calf);
    validateRange(data.waistGirth, 'Perímetro Cintura', ISAK_RANGES.girths.waist);

    // Check girth count
    const girthCount = [
        data.armRelaxedGirth, data.thighGirth, data.calfGirth
    ].filter(v => v && v > 0).length;

    if (girthCount < 2) {
        if (!data.armRelaxedGirth || data.armRelaxedGirth <= 0) missing.push('Perímetro Brazo');
        if (!data.thighGirth || data.thighGirth <= 0) missing.push('Perímetro Muslo');
        if (!data.calfGirth || data.calfGirth <= 0) missing.push('Perímetro Pantorrilla');
    }

    // ===== BREADTHS VALIDATION =====
    validateRange(data.humerusBreadth, 'Diámetro Húmero', ISAK_RANGES.breadths.humerus);
    validateRange(data.femurBreadth, 'Diámetro Fémur', ISAK_RANGES.breadths.femur);
    validateRange(data.wristBreadth, 'Diámetro Muñeca', ISAK_RANGES.breadths.wrist);
    validateRange(data.ankleBreadth, 'Diámetro Tobillo', ISAK_RANGES.breadths.ankle);

    if (!data.humerusBreadth || data.humerusBreadth <= 0) missing.push('Diámetro Húmero');
    if (!data.femurBreadth || data.femurBreadth <= 0) missing.push('Diámetro Fémur');

    // ===== ANATOMICAL RELATIONSHIP VALIDATION =====

    // Waist must be greater than arm
    if (data.waistGirth && data.armFlexedGirth && data.waistGirth < data.armFlexedGirth) {
        errors.push({
            field: 'Perímetro Cintura',
            value: data.waistGirth,
            issue: 'anatomically_impossible',
            message: `Cintura(${data.waistGirth}cm) no puede ser menor que brazo flexionado(${data.armFlexedGirth}cm)`
        });
    }

    // Thigh must be greater than calf
    if (data.thighGirth && data.calfGirth && data.thighGirth < data.calfGirth) {
        errors.push({
            field: 'Perímetro Muslo',
            value: data.thighGirth,
            issue: 'anatomically_impossible',
            message: `Muslo(${data.thighGirth}cm) no puede ser menor que pantorrilla(${data.calfGirth}cm)`
        });
    }

    // Femur breadth must be greater than humerus
    if (data.femurBreadth && data.humerusBreadth && data.femurBreadth < data.humerusBreadth) {
        errors.push({
            field: 'Diámetro Fémur',
            value: data.femurBreadth,
            issue: 'anatomically_impossible',
            message: `Consistencia Anatómica: Diámetro de Fémur(${data.femurBreadth}cm) no puede ser menor que Húmero(${data.humerusBreadth}cm). Verifique mediciones.`
        });
    }

    // Total skinfold sum check (>250mm is highly unusual)
    const totalSkinfolds = (data.triceps || 0) + (data.subscapular || 0) +
        (data.biceps || 0) + (data.suprailiac || 0) +
        (data.abdominal || 0) + (data.thigh || 0) + (data.calf || 0);
    if (totalSkinfolds > 250) {
        warnings.push({
            field: 'Suma Pliegues',
            value: totalSkinfolds,
            issue: 'warning',
            message: `Suma de pliegues(${totalSkinfolds}mm) es muy alta - verificar mediciones`
        });
    }

    return {
        isValid: missing.length === 0 && errors.length === 0,
        missing,
        errors,
        warnings
    };
}

// ===========================================
// MASS CALCULATIONS
// ===========================================

/**
 * 1. SKIN MASS (Du Bois Surface Area method)
 * Masa Piel = SA × Grosor Piel × Densidad / 10000
 */
function calculateSkinMass(weight: number, height: number): number {
    const sa = calculateDuBoisSA(weight, height);  // cm²
    // Convert: SA(cm²) × thickness(mm→cm) × density(g/cm³) → kg
    const skinMass = (sa * (SKIN_THICKNESS / 10) * SKIN_DENSITY) / 1000;
    return Math.max(0, skinMass);
}

/**
 * 2. ADIPOSE MASS (Phantom Z-scores from skinfolds)
 * Uses 6 skinfolds: Triceps, Subscapular, Supraspinal, Abdominal, Thigh, Calf
 */
function calculateAdiposeMass(data: FiveComponentInput): { mass: number; zScore: number } {
    const h = data.height;
    const sk = PHANTOM.skinfolds;

    // Calculate Z-scores for each skinfold
    const zScores = [
        calculateZScore(data.triceps, h, sk.triceps.p, sk.triceps.s),
        calculateZScore(data.subscapular, h, sk.subscapular.p, sk.subscapular.s),
        calculateZScore(data.suprailiac, h, sk.supraspinal.p, sk.supraspinal.s),
        calculateZScore(data.abdominal, h, sk.abdominal.p, sk.abdominal.s),
        calculateZScore(data.thigh, h, sk.thigh.p, sk.thigh.s),
        calculateZScore(data.calf, h, sk.calf.p, sk.calf.s)
    ];

    const meanZ = getMeanZScore(zScores);
    const mass = calculatePhantomMass(meanZ, PHANTOM.masses.adipose.p, PHANTOM.masses.adipose.s, h);

    return { mass, zScore: meanZ };
}

/**
 * 3. MUSCLE MASS (Phantom Z-scores from corrected girths)
 * Corrected girth = Girth - (π × Skinfold in cm)
 * Uses: Arm relaxed, Thigh, Calf (corrected)
 */
function calculateMuscleMass(data: FiveComponentInput): { mass: number; zScore: number } {
    const h = data.height;
    const g = PHANTOM.girths;

    // Correct girths by subtracting skinfold contribution
    // Skinfold in mm → divide by 10 for cm
    const armCorrected = data.armRelaxedGirth - (Math.PI * (data.triceps / 10));
    const thighCorrected = data.thighGirth - (Math.PI * (data.thigh / 10));
    const calfCorrected = data.calfGirth - (Math.PI * (data.calf / 10));

    // Calculate Z-scores for corrected girths
    const zScores = [
        calculateZScore(armCorrected, h, g.armRelaxed.p, g.armRelaxed.s),
        calculateZScore(thighCorrected, h, g.thigh.p, g.thigh.s),
        calculateZScore(calfCorrected, h, g.calf.p, g.calf.s)
    ];

    // Add forearm if available (not corrected)
    if (data.forearmGirth && data.forearmGirth > 0) {
        zScores.push(calculateZScore(data.forearmGirth, h, g.forearm.p, g.forearm.s));
    }

    const meanZ = getMeanZScore(zScores);
    const mass = calculatePhantomMass(meanZ, PHANTOM.masses.muscle.p, PHANTOM.masses.muscle.s, h);

    return { mass, zScore: meanZ };
}

/**
 * 4. BONE MASS (Phantom Z-scores from bone breadths)
 * Uses: Humerus, Femur, Wrist, Ankle, Biacromial, Biiliocristal breadths
 * 
 * Kerr (1988) modified formula with trunk diameters for improved accuracy:
 * When biacromial and biiliocristal are available, they contribute to a more
 * accurate estimation of skeletal frame size.
 */
function calculateBoneMass(data: FiveComponentInput): { mass: number; zScore: number } {
    const h = data.height;
    const b = PHANTOM.breadths;

    // Calculate Z-scores for bone breadths (required)
    const zScores = [
        calculateZScore(data.humerusBreadth, h, b.humerus.p, b.humerus.s),
        calculateZScore(data.femurBreadth, h, b.femur.p, b.femur.s)
    ];

    // Add optional breadths if available
    if (data.wristBreadth && data.wristBreadth > 0) {
        zScores.push(calculateZScore(data.wristBreadth, h, b.wrist.p, b.wrist.s));
    }
    if (data.ankleBreadth && data.ankleBreadth > 0) {
        zScores.push(calculateZScore(data.ankleBreadth, h, b.ankle.p, b.ankle.s));
    }

    // Add trunk diameters for improved precision (Kerr enhanced model)
    if (data.biacromialBreadth && data.biacromialBreadth > 0) {
        zScores.push(calculateZScore(data.biacromialBreadth, h, b.biacromial.p, b.biacromial.s));
    }
    if (data.biiliocristalBreadth && data.biiliocristalBreadth > 0) {
        zScores.push(calculateZScore(data.biiliocristalBreadth, h, b.biiliocristal.p, b.biiliocristal.s));
    }

    const meanZ = getMeanZScore(zScores);
    const mass = calculatePhantomMass(meanZ, PHANTOM.masses.bone.p, PHANTOM.masses.bone.s, h);

    return { mass, zScore: meanZ };
}

/**
 * 5. RESIDUAL MASS (Phantom Z-scores from trunk measurements)
 * For simplified version: uses average of other Z-scores
 * Full version would use: Biacromial, Biiliocristal, Chest diameters
 */
function calculateResidualMass(
    data: FiveComponentInput,
    zAdipose: number,
    zMuscle: number,
    zBone: number
): { mass: number; zScore: number; isEstimated: boolean } {
    const h = data.height;
    const b = PHANTOM.breadths;

    // Try to calculate from trunk measurements if available
    const trunkZScores: (number | null)[] = [];

    // PRIORITY 1: Head Circumference (most accurate for residual mass - bone + viscera)
    if (data.headCircumference && data.headCircumference > 0) {
        trunkZScores.push(calculateZScore(data.headCircumference, h, b.headCircumference.p, b.headCircumference.s));
    }

    // PRIORITY 2: Biacromial and Bi-iliocristal breadths
    if (data.biacromialBreadth && data.biacromialBreadth > 0) {
        trunkZScores.push(calculateZScore(data.biacromialBreadth, h, b.biacromial.p, b.biacromial.s));
    }
    if (data.biiliocristalBreadth && data.biiliocristalBreadth > 0) {
        trunkZScores.push(calculateZScore(data.biiliocristalBreadth, h, b.biiliocristal.p, b.biiliocristal.s));
    }

    let meanZ: number;
    let isEstimated: boolean;

    if (trunkZScores.filter(z => z !== null).length >= 1) {
        // Use trunk measurements - precise calculation (head circ alone is sufficient)
        meanZ = getMeanZScore(trunkZScores);
        isEstimated = false;
    } else {
        // Fallback: use average of other components' Z-scores - estimation
        meanZ = (zAdipose + zMuscle + zBone) / 3;
        isEstimated = true;
    }

    const mass = calculatePhantomMass(meanZ, PHANTOM.masses.residual.p, PHANTOM.masses.residual.s, h);

    return { mass, zScore: meanZ, isEstimated };
}

// ===========================================
// MAIN CALCULATION FUNCTION
// ===========================================

export function calculateFiveComponentFractionation(data: FiveComponentInput): FiveComponentResult {
    // Validate input
    const validation = validateFiveComponentInput(data);

    if (!validation.isValid) {
        return {
            skin: { kg: 0, percent: 0 },
            bone: { kg: 0, percent: 0 },
            muscle: { kg: 0, percent: 0 },
            adipose: { kg: 0, percent: 0 },
            residual: { kg: 0, percent: 0 },
            isValid: false,
            missingData: validation.missing,
            bodyDensity: 0,
            adiposePercent: 0,
            lipidFatPercent: 0,
            zScores: { adipose: 0, muscle: 0, bone: 0, residual: 0 },
            errors: validation.errors,
            warnings: validation.warnings
        };
    }

    // Calculate Cormic Index if sittingHeight is available
    let cormicIndex: number | undefined;
    let cormicInterpretation: string | undefined;

    if (data.sittingHeight && data.sittingHeight > 0) {
        cormicIndex = (data.sittingHeight / data.height) * 100;

        // ISAK Interpretation (Ross & Marfell-Jones)
        // Brazonest/Macro-skelic ranges often used:
        if (cormicIndex < 51) cormicInterpretation = "Braquicórmico (Piernas largas/Tronco corto)";
        else if (cormicIndex <= 53) cormicInterpretation = "Metriocórmico (Proporcional)";
        else cormicInterpretation = "Macrocórmico (Piernas cortas/Tronco largo)";
    }

    // Calculate each component
    const skinKg = calculateSkinMass(data.weight, data.height);
    const { mass: adiposeKg, zScore: zAdipose } = calculateAdiposeMass(data);
    const { mass: muscleKg, zScore: zMuscle } = calculateMuscleMass(data);
    const { mass: boneKg, zScore: zBone } = calculateBoneMass(data);
    const { mass: residualKg, zScore: zResidual, isEstimated: residualIsEstimated } = calculateResidualMass(data, zAdipose, zMuscle, zBone);

    // Calculate total and adjust to match actual weight
    const totalCalculated = skinKg + adiposeKg + muscleKg + boneKg + residualKg;

    // Scaling factor to ensure sum equals body weight
    const scaleFactor = totalCalculated > 0 ? data.weight / totalCalculated : 1;
    const deviation = Math.abs(1 - scaleFactor) * 100;

    const flags: ClinicalSafetyFlag[] = [];
    if (deviation > 5) {
        flags.push({
            level: 'warning',
            code: 'KERR_DEVIATION_HIGH',
            message: `Aviso: Desviación del modelo de Kerr elevada(${deviation.toFixed(1)} %).La suma de componentes difiere significativamente del peso total.`
        });
    }

    // Adjusted masses
    const adjustedSkin = skinKg * scaleFactor;
    const adjustedAdipose = adiposeKg * scaleFactor;
    const adjustedMuscle = muscleKg * scaleFactor;
    const adjustedBone = boneKg * scaleFactor;
    const adjustedResidual = residualKg * scaleFactor;

    // Calculate percentages
    const toPercent = (kg: number) => Math.round((kg / data.weight) * 1000) / 10;

    // Estimate body density and fat percent from adipose component
    // Adipose % ≈ (Adipose Mass / Weight) × 100
    const adiposePercent = toPercent(adjustedAdipose);

    // Lipid Fat % (Estimation): Adipose Tissue is ~80% lipids in adults
    const lipidFatPercent = Math.round(adiposePercent * 0.8 * 10) / 10;

    // Approximate body density using Siri inverse: DC = 495 / (%LipidFat + 450)
    const bodyDensity = lipidFatPercent > 0 ? Math.round((495 / (lipidFatPercent + 450)) * 10000) / 10000 : 1.0;

    // Check for obesity (skinfold sum > 150mm is highly unusual)
    const skinfoldSum = (data.triceps || 0) + (data.subscapular || 0) +
        (data.biceps || 0) + (data.suprailiac || 0) +
        (data.abdominal || 0) + (data.thigh || 0) + (data.calf || 0);

    let obesityWarning: FiveComponentResult['obesityWarning'] = undefined;

    if (skinfoldSum > 150) {
        obesityWarning = {
            skinfoldSum,
            message: `Suma de pliegues alta (${skinfoldSum}mm). En pacientes con alta adiposidad, la compresibilidad del panículo puede afectar la precisión.`,
            alternativeFormulas: [
                'Weltman (1988) - Ecuación específica para obesidad usando circunferencia abdominal',
                'Peterson (2008) - 4 componentes con correlación con DXA para obesidad',
                'Bioimpedancia (BIA) - Considerar método alternativo para validación'
            ]
        };
    } else if (skinfoldSum > 120) {
        obesityWarning = {
            skinfoldSum,
            message: `ℹ️ Suma de pliegues moderadamente alta (${skinfoldSum}mm). Verificar técnica de medición.`,
            alternativeFormulas: []
        };
    }

    return {
        skin: {
            kg: Math.round(adjustedSkin * 10) / 10,
            percent: toPercent(adjustedSkin)
        },
        bone: {
            kg: Math.round(adjustedBone * 10) / 10,
            percent: toPercent(adjustedBone)
        },
        muscle: {
            kg: Math.round(adjustedMuscle * 10) / 10,
            percent: toPercent(adjustedMuscle)
        },
        adipose: {
            kg: Math.round(adjustedAdipose * 10) / 10,
            percent: toPercent(adjustedAdipose)
        },
        residual: {
            kg: Math.round(adjustedResidual * 10) / 10,
            percent: toPercent(adjustedResidual)
        },
        isValid: true,
        missingData: [],
        bodyDensity,
        adiposePercent: Math.round(adiposePercent * 10) / 10,
        lipidFatPercent,
        zScores: {
            adipose: Math.round(zAdipose * 100) / 100,
            muscle: Math.round(zMuscle * 100) / 100,
            bone: Math.round(zBone * 100) / 100,
            residual: Math.round(zResidual * 100) / 100
        },
        residualIsEstimated,
        cormicIndex: cormicIndex ? Math.round(cormicIndex * 100) / 100 : undefined,
        cormicInterpretation,
        obesityWarning,
        flags: flags.length > 0 ? flags : undefined,
        errors: validation.errors,
        warnings: validation.warnings
    };
}

// ===========================================
// UI UTILITIES
// ===========================================

export const COMPONENT_COLORS = {
    adipose: { bg: 'bg-red-500', text: 'text-red-500', light: 'bg-red-100 dark:bg-red-900/30' },
    muscle: { bg: 'bg-orange-500', text: 'text-orange-500', light: 'bg-orange-100 dark:bg-orange-900/30' },
    bone: { bg: 'bg-yellow-500', text: 'text-yellow-500', light: 'bg-yellow-100 dark:bg-yellow-900/30' },
    skin: { bg: 'bg-green-500', text: 'text-green-500', light: 'bg-green-100 dark:bg-green-900/30' },
    residual: { bg: 'bg-blue-500', text: 'text-blue-500', light: 'bg-blue-100 dark:bg-blue-900/30' }
};

export const COMPONENT_LABELS = {
    adipose: { name: 'Masa Adiposa', icon: '🟥', description: 'Tejido graso subcutáneo' },
    muscle: { name: 'Masa Muscular', icon: '🟧', description: 'Tejido muscular esquelético' },
    bone: { name: 'Masa Ósea', icon: '🟨', description: 'Sistema esquelético' },
    skin: { name: 'Masa de Piel', icon: '🟩', description: 'Tejido dérmico (epidermis + dermis)' },
    residual: { name: 'Masa Residual', icon: '🟦', description: 'Vísceras, órganos y fluidos' }
};
