import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AmputationType, GMFCSLevel } from '@/lib/clinical-calculations';
import type { PatientContext, ClinicalContext } from '@/hooks/useAnthropometryConfig';

// ============================================================================
// TYPES
// ============================================================================

export interface AnthropometryMeasures {
    // Basic
    peso?: number;
    talla?: number;
    longitud?: number; // Para lactantes
    // Geriatric
    alturaRodilla?: number;
    circunferenciaPantorrilla?: number;
    // Pregnancy
    semanasGestacion?: number;
    pesoPregestacional?: number;
    // Neurological
    longitudTibia?: number;
    longitudBrazo?: number;
    // Infant
    perimetroCefalico?: number;
    // Standard ISAK
    pliegues?: {
        triceps?: number;
        subscapular?: number;
        biceps?: number;
        iliac_crest?: number;
        supraspinale?: number;
        abdominal?: number;
        thigh?: number;
        calf?: number;
    };
    perimetros?: {
        brazoFlex?: number;
        musloMedio?: number;
        pantorrilla?: number;
        cintura?: number;
        cadera?: number;
    };
    diametros?: {
        humero?: number;
        femur?: number;
        biacromial?: number;
        biiliocristal?: number;
    };
}

export interface AssessmentState {
    // Patient context
    patientId: string | null;
    context: PatientContext;
    clinicalContext: ClinicalContext;

    // Measurements
    measures: AnthropometryMeasures;

    // Calculated results (computed after save)
    results: {
        bmi?: number;
        bmiClassification?: string;
        bodyFat?: number;
        bodyFatMethod?: string;
        correctedWeight?: number;
        estimatedHeight?: number;
    };

    // UI State
    isLoading: boolean;
    isDirty: boolean;
    errors: Record<string, string>;

    // Actions
    setPatient: (patientId: string, context: PatientContext) => void;
    setContext: (partial: Partial<PatientContext>) => void;
    setMeasure: <K extends keyof AnthropometryMeasures>(field: K, value: AnthropometryMeasures[K]) => void;
    setNestedMeasure: (category: 'pliegues' | 'perimetros' | 'diametros', field: string, value: number) => void;
    setResults: (results: AssessmentState['results']) => void;
    setError: (field: string, message: string | null) => void;
    clearErrors: () => void;
    reset: () => void;
    markClean: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialContext: PatientContext = {
    fechaNacimiento: new Date(),
    sexo: 'masculino',
    isPregnant: false,
    hasAmputations: false,
    isNeurological: false,
    canStand: true,
};

const initialMeasures: AnthropometryMeasures = {
    peso: undefined,
    talla: undefined,
    pliegues: {},
    perimetros: {},
    diametros: {},
};

// ============================================================================
// STORE
// ============================================================================

export const useAssessmentStore = create<AssessmentState>()(
    persist(
        (set, get) => ({
            patientId: null,
            context: initialContext,
            clinicalContext: 'general',
            measures: initialMeasures,
            results: {},
            isLoading: false,
            isDirty: false,
            errors: {},

            setPatient: (patientId, context) => {
                set({
                    patientId,
                    context,
                    measures: initialMeasures,
                    results: {},
                    isDirty: false,
                    errors: {},
                });
            },

            setContext: (partial) => {
                set((state) => ({
                    context: { ...state.context, ...partial },
                    isDirty: true,
                }));
            },

            setMeasure: (field, value) => {
                set((state) => ({
                    measures: { ...state.measures, [field]: value },
                    isDirty: true,
                }));
            },

            setNestedMeasure: (category, field, value) => {
                set((state) => ({
                    measures: {
                        ...state.measures,
                        [category]: {
                            ...(state.measures[category] as Record<string, number> || {}),
                            [field]: value,
                        },
                    },
                    isDirty: true,
                }));
            },

            setResults: (results) => {
                set({ results });
            },

            setError: (field, message) => {
                set((state) => ({
                    errors: message
                        ? { ...state.errors, [field]: message }
                        : Object.fromEntries(
                            Object.entries(state.errors).filter(([k]) => k !== field)
                        ),
                }));
            },

            clearErrors: () => {
                set({ errors: {} });
            },

            reset: () => {
                set({
                    measures: initialMeasures,
                    results: {},
                    isDirty: false,
                    errors: {},
                });
            },

            markClean: () => {
                set({ isDirty: false });
            },
        }),
        {
            name: 'nutrikallpa-assessment-store',
            partialize: (state) => ({
                // Only persist essential data, not UI state
                patientId: state.patientId,
                context: state.context,
                measures: state.measures,
            }),
        }
    )
);

// ============================================================================
// SELECTORS (Performance optimized)
// ============================================================================

export const usePatientContext = () => useAssessmentStore((s) => s.context);
export const useMeasures = () => useAssessmentStore((s) => s.measures);
export const useResults = () => useAssessmentStore((s) => s.results);
export const useIsDirty = () => useAssessmentStore((s) => s.isDirty);
export const useErrors = () => useAssessmentStore((s) => s.errors);
