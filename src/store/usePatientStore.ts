/**
 * Patient Store
 * 
 * Global state management for the active patient.
 * Centralizes patient data so all pages share the same state.
 */

import { create } from 'zustand';
import type {
    Paciente,
    MedidasAntropometricas,
    ConfiguracionNutricional,
    PregnancyInfo,
    CerebralPalsyInfo,
    CardiometabolicRisk
} from '@/types';
import { CALORIE_GOAL_PRESETS } from '@/types';
import {
    calculateCardiometabolicRisk,
    estimateHeightStevenson,
    isNutritionalRiskPC
} from '@/utils/clinical-formulas';
import {
    getPacienteById,
    getPacienteByIdAsync,
    getMedidasByPaciente,
    getMedidasByPacienteAsync,
    savePaciente as saveToStorage,
    saveMedidas as saveMedidasToStorage
} from '@/lib/storage';
import * as supabaseStorage from '@/lib/supabase-storage';

// ============================================================================
// TYPES
// ============================================================================

interface PatientState {
    // Patient data
    patient: Paciente | null;
    medidas: MedidasAntropometricas[];
    latestMedidas: MedidasAntropometricas | null;

    // Computed values from latest medidas
    calculatedCalories: number | null;

    // State flags
    isLoading: boolean;
    error: string | null;
    patientId: string | null;

    // Actions
    loadPatient: (id: string) => Promise<void>;
    updatePatient: (updates: Partial<Paciente>) => Promise<void>;
    updateDatosPersonales: (datos: Partial<Paciente['datosPersonales']>) => Promise<void>;
    updateHistoriaClinica: (historia: Partial<Paciente['historiaClinica']>) => Promise<void>;
    updateConfiguracionNutricional: (config: Partial<ConfiguracionNutricional>) => Promise<void>;
    refreshMedidas: () => void;
    addMedidas: (medidas: MedidasAntropometricas) => void;
    clearPatient: () => void;
    initServerData: (patient: Paciente, medidas: MedidasAntropometricas[]) => void;

    // Special populations actions
    updatePregnancyInfo: (info: Partial<PregnancyInfo>) => void;
    updateCerebralPalsyInfo: (info: Partial<CerebralPalsyInfo>) => void;

    // Getters
    getFullName: () => string;
    getAge: () => number | null;
    getConfiguracion: () => ConfiguracionNutricional;
    getCardiometabolicRisk: () => CardiometabolicRisk | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateAge(fechaNacimiento: string | Date | undefined): number | null {
    if (!fechaNacimiento) return null;
    const birthDate = new Date(fechaNacimiento);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function calculateBaseCalories(medidas: MedidasAntropometricas | null, patient: Paciente | null): number | null {
    if (!patient) return null;

    // Use measurements if available, otherwise fallback to profile data
    const peso = medidas?.peso || patient.datosPersonales.peso;
    const talla = medidas?.talla || patient.datosPersonales.talla;
    const edad = medidas?.edad || calculateAge(patient.datosPersonales.fechaNacimiento);
    const sexo = medidas?.sexo || patient.datosPersonales.sexo;

    // 🛡️ PEDIATRIC BYPASS (Ages 3-18)
    const isPediatric = edad !== null && edad >= 3 && edad <= 18;

    if (!peso || !talla || !edad || !sexo) return null;

    if (isPediatric) {
        const { calculatePediatricEER } = require('@/lib/calculos-nutricionales');
        const formula = patient.configuracionNutricional?.formulaGET || 'iom';

        // Use 'moderate' as a safe default for BMR/EER baseline if not specified
        const activityLevel = patient.configuracionNutricional?.nivelActividad || 'moderate';
        const pedMethod = (formula === 'fao' || formula === 'henry') ? formula : 'iom';

        const results = calculatePediatricEER(edad, peso, talla, sexo, activityLevel as any, pedMethod as any);

        // If IOM, results.eer IS the total target (GET). 
        // For children using IOM, we store this as the baseline.
        return results.eer;
    }

    let formula = patient.configuracionNutricional?.formulaGET || 'mifflin';

    // Katch-McArdle relies on Lean Body Mass (LBM)
    if (formula === 'katch') {
        const { calculateAnthropometry } = require('@/lib/calculos-nutricionales');

        let fatPct = 0;
        if (medidas) {
            // Try to calculate actual fat % from available skinfolds
            const results = calculateAnthropometry(medidas, 'general');
            fatPct = results.porcentajeGrasa;
        }

        // Only use Katch if we have a valid fat percentage (> 0)
        if (fatPct && fatPct > 0) {
            const ffm = peso * (1 - fatPct / 100);
            return Math.round(370 + (21.6 * ffm));
        }

        // Fallback to Mifflin-St Jeor
        formula = 'mifflin';
    }

    const { calculateMifflinStJeor, calculateHarrisBenedict, calculateFAOWHO, calculateHenry } = require('@/lib/calculos-nutricionales');

    switch (formula) {
        case 'harris':
            return Math.round(calculateHarrisBenedict(peso, talla, edad, sexo));
        case 'fao':
            return Math.round(calculateFAOWHO(peso, edad, sexo));
        case 'henry':
            return Math.round(calculateHenry(peso, edad, sexo));
        case 'mifflin':
        default:
            return Math.round(calculateMifflinStJeor(peso, talla, edad, sexo));
    }
}

// ============================================================================
// STORE
// ============================================================================

export const usePatientStore = create<PatientState>((set, get) => ({
    // Initial state
    patient: null,
    medidas: [],
    latestMedidas: null,
    calculatedCalories: null,
    isLoading: false,
    error: null,
    patientId: null,

    // Load patient by ID (Database-First Rehydration)
    loadPatient: async (id: string) => {
        set({ isLoading: true, error: null, patientId: id });

        try {
            // 1. Try Local Storage first for speed
            let patient = getPacienteById(id);
            let medidas = getMedidasByPaciente(id);

            // 2. If data is missing or incomplete, go to Supabase via Secure Server Actions
            if (!patient || medidas.length === 0) {
                console.log(`[PatientStore] Cache miss for patient ${id}. Fetching from Supabase via Server Actions...`);
                const [remotePatient, remoteMedidas] = await Promise.all([
                    getPacienteByIdAsync(id),
                    getMedidasByPacienteAsync(id)
                ]);

                if (remotePatient) {
                    patient = remotePatient;
                    // Save to local cache for next time
                    // note: saveToStorage is now async, but we don't need to block here
                }

                if (remoteMedidas && remoteMedidas.length > 0) {
                    medidas = remoteMedidas;
                }
            }

            if (!patient) {
                set({
                    patient: null,
                    medidas: [],
                    latestMedidas: null,
                    calculatedCalories: null,
                    isLoading: false,
                    error: 'Paciente no encontrado'
                });
                return;
            }

            const sortedMedidas = [...medidas].sort((a, b) =>
                new Date(b.fecha || b.createdAt || 0).getTime() -
                new Date(a.fecha || a.createdAt || 0).getTime()
            );
            const latestMedidas = sortedMedidas[0] || null;
            const calculatedCalories = calculateBaseCalories(latestMedidas, patient);

            set({
                patient,
                medidas: sortedMedidas,
                latestMedidas,
                calculatedCalories,
                isLoading: false,
                error: null
            });
        } catch (error) {
            console.error('Error loading patient:', error);
            set({
                patient: null,
                medidas: [],
                latestMedidas: null,
                calculatedCalories: null,
                isLoading: false,
                error: 'Error al cargar paciente'
            });
        }
    },

    // Update patient data
    updatePatient: async (updates: Partial<Paciente>) => {
        const { patient } = get();
        if (!patient) return;

        const previousPatient = { ...patient };
        const updatedPatient = {
            ...patient,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        // 1. Optimistic Update
        set({ patient: updatedPatient });

        // 2. Atomic Save (Syncs to Supabase via Server Action)
        try {
            const success = await saveToStorage(updatedPatient);
            if (!success) throw new Error("Server storage failed");
        } catch (error) {
            console.error('Failed to save patient, rolling back:', error);
            // 3. Rollback on failure
            set({ patient: previousPatient });
            throw error; // Re-throw to inform UI (e.g., Toast)
        }
    },

    // Update datos personales specifically
    updateDatosPersonales: async (datos: Partial<Paciente['datosPersonales']>) => {
        const { patient } = get();
        if (!patient) return;

        const updatedPatient = {
            ...patient,
            datosPersonales: { ...patient.datosPersonales, ...datos },
            updatedAt: new Date().toISOString()
        };

        await saveToStorage(updatedPatient);
        set({ patient: updatedPatient });
    },

    // Update historia clinica
    updateHistoriaClinica: async (historia: Partial<Paciente['historiaClinica']>) => {
        const { patient } = get();
        if (!patient) return;

        const updatedPatient = {
            ...patient,
            historiaClinica: { ...patient.historiaClinica, ...historia },
            updatedAt: new Date().toISOString()
        };

        await saveToStorage(updatedPatient);
        set({ patient: updatedPatient });
    },

    // Refresh medidas from storage
    refreshMedidas: () => {
        const { patientId, patient } = get();
        if (!patientId) return;

        const medidas = getMedidasByPaciente(patientId);
        const sortedMedidas = [...medidas].sort((a, b) =>
            new Date(b.fecha || b.createdAt || 0).getTime() -
            new Date(a.fecha || a.createdAt || 0).getTime()
        );
        const latestMedidas = sortedMedidas[0] || null;
        const calculatedCalories = calculateBaseCalories(latestMedidas, patient);

        set({ medidas: sortedMedidas, latestMedidas, calculatedCalories });
    },

    // Add new medidas
    addMedidas: (medidas: MedidasAntropometricas) => {
        const { patient } = get();

        // Save to storage
        saveMedidasToStorage(medidas);

        // Refresh local state
        get().refreshMedidas();

        // Recalculate calories
        const calculatedCalories = calculateBaseCalories(medidas, patient);
        set({ calculatedCalories });
    },

    // Clear patient state
    clearPatient: () => set({
        patient: null,
        medidas: [],
        latestMedidas: null,
        calculatedCalories: null,
        patientId: null,
        error: null
    }),

    initServerData: (patient, medidas) => {
        const sortedMedidas = [...medidas].sort((a, b) =>
            new Date(b.fecha || b.createdAt || 0).getTime() -
            new Date(a.fecha || a.createdAt || 0).getTime()
        );
        const latestMedidas = sortedMedidas[0] || null;
        const calculatedCalories = calculateBaseCalories(latestMedidas, patient);

        set({
            patient,
            medidas: sortedMedidas,
            latestMedidas,
            calculatedCalories,
            patientId: patient.id,
            isLoading: false,
            error: null
        });
    },

    // Get full name
    getFullName: () => {
        const { patient } = get();
        if (!patient) return '';
        const { nombre, apellido } = patient.datosPersonales;
        return `${nombre} ${apellido}`.trim();
    },

    // Get age
    getAge: () => {
        const { patient } = get();
        if (!patient) return null;
        return calculateAge(patient.datosPersonales.fechaNacimiento);
    },

    // Update nutritional configuration
    updateConfiguracionNutricional: async (config: Partial<ConfiguracionNutricional>) => {
        const { patient } = get();
        if (!patient) return;

        const updatedPatient = {
            ...patient,
            configuracionNutricional: {
                ...patient.configuracionNutricional,
                ...config
            },
            updatedAt: new Date().toISOString()
        };

        await saveToStorage(updatedPatient);

        // Recalculate base calories if formula changed or general update
        const sortedMedidas = get().medidas;
        const latestMedidas = sortedMedidas[0] || null;
        const calculatedCalories = calculateBaseCalories(latestMedidas, updatedPatient);

        set({ patient: updatedPatient, calculatedCalories });
    },

    // Get nutritional configuration with defaults
    getConfiguracion: (): ConfiguracionNutricional => {
        const { patient } = get();
        return {
            nivelActividad: patient?.configuracionNutricional?.nivelActividad || 'moderada',
            objetivoPeso: patient?.configuracionNutricional?.objetivoPeso || 'mantenimiento',
            formulaGET: patient?.configuracionNutricional?.formulaGET || 'mifflin',
            proteinaRatio: patient?.configuracionNutricional?.proteinaRatio || 1.6,
            kcalAjuste: patient?.configuracionNutricional?.kcalAjuste || 0,
            // Distribución de macros (default: 25% prot, 50% carbs, 25% grasa)
            macroProteina: patient?.configuracionNutricional?.macroProteina ?? 25,
            macroCarbohidratos: patient?.configuracionNutricional?.macroCarbohidratos ?? 50,
            macroGrasa: patient?.configuracionNutricional?.macroGrasa ?? 25,
            // Clinical Audit additions
            proteinBasis: patient?.configuracionNutricional?.proteinBasis || 'total',
            caloriePreset: patient?.configuracionNutricional?.caloriePreset,
            // Dynamic Meal Management
            mealMoments: patient?.configuracionNutricional?.mealMoments || [
                { id: 'm1', name: 'Desayuno', type: 'desayuno', ratio: 0.25, enabled: true },
                { id: 'm2', name: 'Almuerzo', type: 'almuerzo', ratio: 0.35, enabled: true },
                { id: 'm3', name: 'Cena', type: 'cena', ratio: 0.25, enabled: true },
                { id: 'm4', name: 'Colación', type: 'snack', ratio: 0.15, enabled: true }
            ]
        };
    },

    // Update pregnancy info (for Atalah and IOM goals)
    updatePregnancyInfo: (info: Partial<PregnancyInfo>) => {
        const { patient } = get();
        if (!patient) return;

        const updatedPatient = {
            ...patient,
            pregnancyInfo: {
                isPregnant: false, // default
                ...patient.pregnancyInfo,
                ...info
            },
            updatedAt: new Date().toISOString()
        };

        saveToStorage(updatedPatient);
        set({ patient: updatedPatient });
    },

    // Update cerebral palsy info (Stevenson height, GMFCS risk)
    updateCerebralPalsyInfo: (info: Partial<CerebralPalsyInfo>) => {
        const { patient } = get();
        if (!patient) return;

        // Auto-calculate estimated height if tibia length is provided
        let estimatedHeight = info.estimatedHeight;
        if (info.tibiaLength && !estimatedHeight) {
            estimatedHeight = estimateHeightStevenson(info.tibiaLength);
        }

        // Auto-calculate nutritional risk if GMFCS level is provided
        // Note: This requires weightForAgePercentile from external source
        // For now, we just store the info and let the UI calculate risk

        const updatedPatient = {
            ...patient,
            cerebralPalsyInfo: {
                ...patient.cerebralPalsyInfo,
                ...info,
                estimatedHeight
            },
            updatedAt: new Date().toISOString()
        };

        saveToStorage(updatedPatient);
        set({ patient: updatedPatient });
    },

    // Get cardiometabolic risk indicators from latest medidas
    getCardiometabolicRisk: (): CardiometabolicRisk | null => {
        const { latestMedidas, patient } = get();
        if (!latestMedidas || !patient) return null;

        const waist = latestMedidas.perimetros?.cintura;
        const hip = latestMedidas.perimetros?.cadera;
        const height = latestMedidas.talla;
        const sexo = latestMedidas.sexo || patient.datosPersonales.sexo;
        const age = latestMedidas.edad || calculateAge(patient.datosPersonales.fechaNacimiento);

        // Need waist and height at minimum for ICT
        if (!waist || !height) return null;

        // Get numeric values from potential ISAKValue
        const waistNum = typeof waist === 'number' ? waist : waist.final;
        const hipNum = hip ? (typeof hip === 'number' ? hip : hip.final) : waistNum * 1.1; // Estimate if missing

        if (!sexo || sexo === 'otro' || !age) return null;

        const result = calculateCardiometabolicRisk(
            waistNum,
            hipNum,
            height,
            age,
            sexo as 'masculino' | 'femenino'
        );

        return {
            waistToHeightRatio: result.waistToHeight.ratio,
            waistToHeightRisk: result.waistToHeight.risk,
            hasAbdominalObesity: result.abdominalObesity,
            waistHipRatio: result.waistHipRatio.ratio,
            waistHipRisk: result.waistHipRatio.risk
        };
    }
}));

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

// Hook for basic patient info
export const usePatientInfo = () => {
    const { patient, isLoading, error, loadPatient } = usePatientStore();
    return { patient, isLoading, error, loadPatient };
};

// Hook for patient medidas
export const usePatientMedidas = () => {
    const { medidas, latestMedidas, refreshMedidas, addMedidas } = usePatientStore();
    return { medidas, latestMedidas, refreshMedidas, addMedidas };
};

// Hook for calculated values
export const usePatientCalculations = () => {
    const { calculatedCalories, latestMedidas, patient } = usePatientStore();
    const getAge = usePatientStore(state => state.getAge);
    const getFullName = usePatientStore(state => state.getFullName);

    return {
        calculatedCalories,
        latestMedidas,
        patient,
        age: getAge(),
        fullName: getFullName()
    };
};

// Hook for nutritional configuration
export const usePatientNutrition = () => {
    const { patient, latestMedidas, calculatedCalories, updateConfiguracionNutricional } = usePatientStore();
    const getConfiguracion = usePatientStore(state => state.getConfiguracion);
    const getAge = usePatientStore(state => state.getAge);
    const config = getConfiguracion();

    // Get patient data from latest medidas or datos personales
    const peso = latestMedidas?.peso || patient?.datosPersonales?.peso || 70;
    const talla = latestMedidas?.talla || patient?.datosPersonales?.talla || 170;
    const sexo = latestMedidas?.sexo || patient?.datosPersonales?.sexo || 'masculino';

    // Calculate BMI for warnings
    const { calcularIMC } = require('@/lib/calculos-nutricionales');
    const { calculateHydration } = require('@/lib/hydration-calculator');
    const patientAge = getAge() ?? 25; // Default to adult if unknown
    const imcResult = calcularIMC(peso, talla, patientAge);
    const bmi = imcResult.valor;
    const bmiDiagnostico = imcResult.diagnostico;
    const isObese = bmi >= 30;

    // Hydration targets - now includes activity level adjustment
    const hydrationResult = calculateHydration({
        weightKg: peso,
        activityLevel: config.nivelActividad || 'moderada',
        age: patientAge
    });
    // Convert to legacy format for compatibility
    const hydration = {
        ml: hydrationResult.totalDailyML,
        metodo: patientAge < 19 ? 'Holiday-Segar + Actividad' :
            patientAge >= 60 ? 'Geriátrico + Actividad' : 'Adulto (35ml/kg) + Actividad'
    };
    const isPediatric = patientAge > 0 && patientAge < 18;
    const isGeriatric = patientAge >= 60;

    // Get lean mass from latest composition if available (for 'lean' protein basis)
    const leanMass = latestMedidas?.peso && latestMedidas?.imc ?
        (peso * (1 - (latestMedidas.imc || 20) / 100)) : // Rough estimate
        undefined;

    const { calculateTDEE } = require('@/lib/calculos-nutricionales');
    const tdeeResult = calculateTDEE({
        weight: peso,
        height: talla,
        age: patientAge,
        sex: sexo, // Corrected key from 'sexo' to 'sex'
        activityLevel: config.nivelActividad || 'moderate',
        formula: config.formulaGET || (isPediatric ? 'iom' : 'mifflin'),
        fatPercentage: leanMass ? (1 - (leanMass / peso)) * 100 : undefined,
        includeTEF: !isPediatric // Pediatric formulas (IOM/FAO) often include TEF
    });

    const activityFactor = tdeeResult.activityFactor;
    const baseCalories = tdeeResult.bmr;
    const totalCaloriesFromLib = tdeeResult.tdee;

    // Apply calorie preset if set, otherwise use manual adjustment
    let kcalAdjustment = config.kcalAjuste || 0;
    let presetInfo: { label: string; percentage: number } | null = null;

    if (config.caloriePreset && CALORIE_GOAL_PRESETS[config.caloriePreset]) {
        const preset = CALORIE_GOAL_PRESETS[config.caloriePreset];

        // 🛡️ PEDIATRIC SAFETY: Block deficit presets for minors
        const isDeficitPreset = ['aggressive_deficit', 'moderate_deficit', 'mild_deficit'].includes(config.caloriePreset);

        if (isPediatric && isDeficitPreset) {
            // Force maintenance for pediatric patients
            presetInfo = { label: '⛔ Bloqueado - Mantenimiento', percentage: 0 };
            kcalAdjustment = 0;
        } else {
            // Use totalCaloriesFromLib (which includes TEF for adults) as base for adjustment
            kcalAdjustment = Math.round(totalCaloriesFromLib * (preset.percentage / 100));
            presetInfo = { label: preset.label, percentage: preset.percentage };
        }
    }

    // Warning for pediatric deficit attempt
    const pediatricDeficitBlocked = isPediatric && config.caloriePreset &&
        ['aggressive_deficit', 'moderate_deficit', 'mild_deficit'].includes(config.caloriePreset);

    // Final total calories including adjustments
    const rawTotalCalories = Math.round(totalCaloriesFromLib + kcalAdjustment);

    // 🛡️ ENFORCE MINIMUM CALORIE FLOOR (BMR safety net)
    const isFemale = sexo.toLowerCase().includes('fem') || sexo.toLowerCase() === 'female';
    const adultMinCalories = isFemale ? 1200 : 1500;

    // Safety net for adults only. Minors are allowed lower targets as per calculation.
    const minCalories = isPediatric ? 400 : adultMinCalories;

    const calorieFloorApplied = rawTotalCalories < minCalories;
    const totalCalories = Math.max(rawTotalCalories, minCalories);

    const objetivoLabel = config.caloriePreset ?
        CALORIE_GOAL_PRESETS[config.caloriePreset]?.label :
        (['perder', 'perdida'].includes(config.objetivoPeso || '') ? 'Pérdida de Peso' :
            ['mantenimiento'].includes(config.objetivoPeso || '') ? 'Mantenimiento' :
                ['ganar', 'ganancia'].includes(config.objetivoPeso || '') ? 'Ganancia Muscular' : 'Mantenimiento');

    // 🛡️ FIX 1: SAFETY - Auto-switch to adjusted weight for obese patients if not explicitly set
    let proteinBasis = config.proteinBasis || 'total';
    let autoAdjustedForObesity = false;

    if (!config.proteinBasis && isObese) {
        proteinBasis = 'adjusted';
        autoAdjustedForObesity = true;
    }

    let proteinTargetWeight = peso;
    let proteinBasisLabel = 'Peso Total';
    let proteinWarning: string | undefined;

    // Import getProteinTargetWeight lazily to avoid circular deps
    const { getProteinTargetWeight } = require('@/lib/calculos-nutricionales');
    const isAthlete = latestMedidas?.tipoPaciente === 'atleta';
    const proteinResult = getProteinTargetWeight(peso, talla, sexo, proteinBasis, leanMass, isAthlete);
    proteinTargetWeight = proteinResult.weight;
    proteinBasisLabel = proteinResult.label;
    proteinWarning = proteinResult.warning;

    // Add auto-adjustment note to warning
    if (autoAdjustedForObesity) {
        proteinWarning = `🛡️ PROTECCIÓN AUTOMÁTICA: IMC ${bmi.toFixed(1)} ≥ 30 detectado. Se usó Peso Ajustado (${proteinTargetWeight}kg) en lugar de Peso Total (${peso}kg) para cálculo seguro de proteínas.`;
    }

    // Auto-calculate protein grams using target weight
    let proteinaGramos = (config.proteinaRatio || 1.6) * proteinTargetWeight;

    // 🛡️ GERIATRIC SAFETY: Enforce Protein Floor for sarcopenia
    const { calculateSarcopeniaSafeProtein } = require('@/lib/calculos-nutricionales');
    const sarcopeniaSafe = calculateSarcopeniaSafeProtein(peso, patientAge, config.nivelActividad);

    if (isGeriatric && proteinaGramos < sarcopeniaSafe.min) {
        proteinaGramos = sarcopeniaSafe.min;
        proteinWarning = `🛡️ PROTECCIÓN GERIÁTRICA: Se aumentó la proteína al mínimo de seguridad (${sarcopeniaSafe.min}g = 1.2g/kg) para prevenir sarcopenia.`;
    }

    const proteinaKcal = proteinaGramos * 4;
    const calculatedProteinaPercent = Math.round((proteinaKcal / (totalCalories || 2000)) * 100);
    // Clamp protein % between 10% and 45% (extended for athletes), fallback to 25% if NaN
    const macroProteina = !isNaN(calculatedProteinaPercent) ? Math.min(45, Math.max(10, calculatedProteinaPercent)) : 25;

    // Carbs % is set by nutritionist (from config), default 50%
    const macroCarbohidratos = config.macroCarbohidratos ?? 50;

    // Fat % is auto-calculated to make total = 100%
    const calculatedGrasa = 100 - macroProteina - macroCarbohidratos;
    // Clamp fat between 15% and 40%, adjust carbs if needed, fallback to 25% if NaN
    const macroGrasa = !isNaN(calculatedGrasa) ? Math.min(40, Math.max(15, calculatedGrasa)) : 25;

    // Calculate grams for Carbs and Fat
    const carbsGramos = Math.round((totalCalories * (macroCarbohidratos / 100)) / 4);
    const grasasGramos = Math.round((totalCalories * (macroGrasa / 100)) / 9);

    return {
        patient,
        config,
        updateConfig: updateConfiguracionNutricional,
        // Convenience getters
        nivelActividad: config.nivelActividad,
        objetivoPeso: config.objetivoPeso,
        formulaGET: config.formulaGET,
        proteinaRatio: config.proteinaRatio,
        kcalAjuste: config.kcalAjuste,
        // Calculated macros distribution (always sums to 100%)
        macroProteina,
        macroCarbohidratos,
        macroGrasa,
        // Extra info for display
        proteinaGramos: Math.round(proteinaGramos),
        carbsGramos,
        grasasGramos,
        totalCalories,
        tdee: tdeeResult.tdee,
        objetivoLabel,
        // NEW: Clinical Audit additions
        proteinBasis,
        proteinTargetWeight,
        proteinBasisLabel,
        proteinWarning,
        bmi: Math.round(bmi * 10) / 10,
        isObese,
        // Calorie preset info
        caloriePreset: config.caloriePreset,
        presetInfo,
        kcalAdjustment,
        // Patient measurements for hydration
        peso,
        talla,
        sexo,
        // 🛡️ SAFETY indicators for UI
        calorieFloorApplied,
        minCalories,
        autoAdjustedForObesity,
        // 🛡️ Population indicators
        patientAge,
        isPediatric,
        isGeriatric,
        pediatricDeficitBlocked,
        effectiveFormulaName: tdeeResult.formula,
        bmiDiagnostico,
        hydration
    };
};

