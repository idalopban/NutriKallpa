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
        biceps: { p: 8.0, s: 2.0 },
        supraspinal: { p: 15.4, s: 4.47 },   // Supraespinal/Suprailiac
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
        chestAP: { p: 17.50, s: 1.38 }        // Tórax antero-posterior
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
// TYPES
// ===========================================

export interface FiveComponentInput {
    // Basic data
    weight: number;          // kg
    height: number;          // cm
    age: number;
    gender: 'male' | 'female';

    // Skinfolds (mm)
    triceps: number;
    subscapular: number;
    biceps: number;
    suprailiac: number;      // Supraespinal / Cresta Iliaca
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
    fatPercent: number;
    zScores: {
        adipose: number;
        muscle: number;
        bone: number;
        residual: number;
    };
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Calculate Z-score for Phantom adjustment
 * Z = (V × (170.18/h)^d - p) / s
 * where d = 1 for lengths, girths, skinfolds, diameters
 */
function calculateZScore(value: number, height: number, phantomP: number, phantomS: number): number | null {
    if (!value || value <= 0 || !height || height <= 0) return null;

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

// ===========================================
// VALIDATION
// ===========================================

export function validateFiveComponentInput(data: Partial<FiveComponentInput>): { isValid: boolean; missing: string[] } {
    const missing: string[] = [];

    // Required basic data
    if (!data.weight || data.weight <= 0) missing.push('Peso');
    if (!data.height || data.height <= 0) missing.push('Talla');
    if (!data.age || data.age <= 0) missing.push('Edad');

    // Skinfolds (need at least 4 for adipose calculation)
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

    // Girths for muscle (need at least 2)
    const girthCount = [
        data.armRelaxedGirth, data.thighGirth, data.calfGirth
    ].filter(v => v && v > 0).length;

    if (girthCount < 2) {
        if (!data.armRelaxedGirth || data.armRelaxedGirth <= 0) missing.push('Perímetro Brazo');
        if (!data.thighGirth || data.thighGirth <= 0) missing.push('Perímetro Muslo');
        if (!data.calfGirth || data.calfGirth <= 0) missing.push('Perímetro Pantorrilla');
    }

    // Bone breadths (need at least 2)
    if (!data.humerusBreadth || data.humerusBreadth <= 0) missing.push('Diámetro Húmero');
    if (!data.femurBreadth || data.femurBreadth <= 0) missing.push('Diámetro Fémur');

    return { isValid: missing.length === 0, missing };
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
 * Uses: Humerus, Femur, Wrist, Ankle breadths
 */
function calculateBoneMass(data: FiveComponentInput): { mass: number; zScore: number } {
    const h = data.height;
    const b = PHANTOM.breadths;

    // Calculate Z-scores for bone breadths
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
): { mass: number; zScore: number } {
    const h = data.height;
    const b = PHANTOM.breadths;

    // Try to calculate from trunk measurements if available
    const trunkZScores: (number | null)[] = [];

    if (data.biacromialBreadth && data.biacromialBreadth > 0) {
        trunkZScores.push(calculateZScore(data.biacromialBreadth, h, b.biacromial.p, b.biacromial.s));
    }
    if (data.biiliocristalBreadth && data.biiliocristalBreadth > 0) {
        trunkZScores.push(calculateZScore(data.biiliocristalBreadth, h, b.biiliocristal.p, b.biiliocristal.s));
    }

    let meanZ: number;

    if (trunkZScores.filter(z => z !== null).length >= 2) {
        // Use trunk measurements
        meanZ = getMeanZScore(trunkZScores);
    } else {
        // Fallback: use average of other components' Z-scores
        meanZ = (zAdipose + zMuscle + zBone) / 3;
    }

    const mass = calculatePhantomMass(meanZ, PHANTOM.masses.residual.p, PHANTOM.masses.residual.s, h);

    return { mass, zScore: meanZ };
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
            fatPercent: 0,
            zScores: { adipose: 0, muscle: 0, bone: 0, residual: 0 }
        };
    }

    // Calculate each component
    const skinKg = calculateSkinMass(data.weight, data.height);
    const { mass: adiposeKg, zScore: zAdipose } = calculateAdiposeMass(data);
    const { mass: muscleKg, zScore: zMuscle } = calculateMuscleMass(data);
    const { mass: boneKg, zScore: zBone } = calculateBoneMass(data);
    const { mass: residualKg, zScore: zResidual } = calculateResidualMass(data, zAdipose, zMuscle, zBone);

    // Calculate total and adjust to match actual weight
    const totalCalculated = skinKg + adiposeKg + muscleKg + boneKg + residualKg;

    // Scaling factor to ensure sum equals body weight
    const scaleFactor = totalCalculated > 0 ? data.weight / totalCalculated : 1;

    // Adjusted masses
    const adjustedSkin = skinKg * scaleFactor;
    const adjustedAdipose = adiposeKg * scaleFactor;
    const adjustedMuscle = muscleKg * scaleFactor;
    const adjustedBone = boneKg * scaleFactor;
    const adjustedResidual = residualKg * scaleFactor;

    // Calculate percentages
    const toPercent = (kg: number) => Math.round((kg / data.weight) * 1000) / 10;

    // Estimate body density and fat percent from adipose component
    // Fat % ≈ (Adipose Mass / Weight) × 100
    const fatPercent = toPercent(adjustedAdipose);
    // Approximate body density using Siri inverse: DC = 495 / (%GC + 450)
    const bodyDensity = fatPercent > 0 ? Math.round((495 / (fatPercent + 450)) * 10000) / 10000 : 1.0;

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
        fatPercent: Math.round(fatPercent * 10) / 10,
        zScores: {
            adipose: Math.round(zAdipose * 100) / 100,
            muscle: Math.round(zMuscle * 100) / 100,
            bone: Math.round(zBone * 100) / 100,
            residual: Math.round(zResidual * 100) / 100
        }
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
