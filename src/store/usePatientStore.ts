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
import {
    calculateCardiometabolicRisk,
    estimateHeightStevenson,
    isNutritionalRiskPC
} from '@/utils/clinical-formulas';
import {
    getPacienteById,
    getMedidasByPaciente,
    savePaciente as saveToStorage,
    saveMedidas as saveMedidasToStorage
} from '@/lib/storage';

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
    loadPatient: (id: string) => void;
    updatePatient: (updates: Partial<Paciente>) => void;
    updateDatosPersonales: (datos: Partial<Paciente['datosPersonales']>) => void;
    updateHistoriaClinica: (historia: Partial<Paciente['historiaClinica']>) => void;
    updateConfiguracionNutricional: (config: Partial<ConfiguracionNutricional>) => void;
    refreshMedidas: () => void;
    addMedidas: (medidas: MedidasAntropometricas) => void;
    clearPatient: () => void;

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
    if (!medidas || !patient) return null;

    const peso = medidas.peso || patient.datosPersonales.peso;
    const talla = medidas.talla || patient.datosPersonales.talla;
    const edad = medidas.edad || calculateAge(patient.datosPersonales.fechaNacimiento);
    const sexo = medidas.sexo || patient.datosPersonales.sexo;

    if (!peso || !talla || !edad) return null;

    // Mifflin-St Jeor equation
    if (sexo === 'masculino') {
        return Math.round((10 * peso) + (6.25 * talla) - (5 * edad) + 5);
    } else {
        return Math.round((10 * peso) + (6.25 * talla) - (5 * edad) - 161);
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

    // Load patient by ID
    loadPatient: (id: string) => {
        // Don't reload if same patient
        if (get().patientId === id && get().patient) {
            return;
        }

        set({ isLoading: true, error: null, patientId: id });

        try {
            const patient = getPacienteById(id);

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

            const medidas = getMedidasByPaciente(id);
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
    updatePatient: (updates: Partial<Paciente>) => {
        const { patient } = get();
        if (!patient) return;

        const updatedPatient = {
            ...patient,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        // Save to storage (syncs to Supabase in background)
        saveToStorage(updatedPatient);

        // Update local state
        set({ patient: updatedPatient });
    },

    // Update datos personales specifically
    updateDatosPersonales: (datos: Partial<Paciente['datosPersonales']>) => {
        const { patient } = get();
        if (!patient) return;

        const updatedPatient = {
            ...patient,
            datosPersonales: { ...patient.datosPersonales, ...datos },
            updatedAt: new Date().toISOString()
        };

        saveToStorage(updatedPatient);
        set({ patient: updatedPatient });
    },

    // Update historia clinica
    updateHistoriaClinica: (historia: Partial<Paciente['historiaClinica']>) => {
        const { patient } = get();
        if (!patient) return;

        const updatedPatient = {
            ...patient,
            historiaClinica: { ...patient.historiaClinica, ...historia },
            updatedAt: new Date().toISOString()
        };

        saveToStorage(updatedPatient);
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
    clearPatient: () => {
        set({
            patient: null,
            medidas: [],
            latestMedidas: null,
            calculatedCalories: null,
            isLoading: false,
            error: null,
            patientId: null
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
    updateConfiguracionNutricional: (config: Partial<ConfiguracionNutricional>) => {
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

        saveToStorage(updatedPatient);
        set({ patient: updatedPatient });
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
            macroGrasa: patient?.configuracionNutricional?.macroGrasa ?? 25
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
    const { patient, updateConfiguracionNutricional } = usePatientStore();
    const getConfiguracion = usePatientStore(state => state.getConfiguracion);
    const config = getConfiguracion();

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
        // Macros distribution
        macroProteina: config.macroProteina,
        macroCarbohidratos: config.macroCarbohidratos,
        macroGrasa: config.macroGrasa
    };
};
