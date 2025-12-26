import { create } from 'zustand';

// ===========================================
// TIPOS DE DATOS
// ===========================================

export interface BioData {
    peso: number;       // kg
    talla: number;      // cm
    edad: number;       // años
    genero: 'masculino' | 'femenino';
}

export interface Skinfolds {
    triceps: number;
    biceps: number;
    subscapular: number;
    suprailiac: number;  // Cresta ilíaca
    abdominal: number;
    thigh: number;       // Muslo anterior
    calf: number;        // Pantorrilla medial
}

export interface Girths {
    brazoRelajado: number;
    brazoFlexionado: number;
    cintura: number;
    musloMedio: number;      // Perímetro muslo medio (crítico para 5C)
    pantorrilla: number;
}

export interface Breadths {
    humero: number;      // Diámetro húmero (codo)
    femur: number;       // Diámetro fémur (rodilla)
}

export interface CalculatedResults {
    // Composición corporal
    sumSkinfolds: number;
    bodyFatPercent: number;
    fatMassKg: number;
    leanMassKg: number;
    // Somatotipo Heath-Carter
    endomorphy: number;
    mesomorphy: number;
    ectomorphy: number;
    // Coordenadas Somatocarta
    somatoX: number;
    somatoY: number;
}

export type WizardStep = 1 | 2 | 3 | 4;

// ===========================================
// ESTADO DEL STORE
// ===========================================

interface AnthropometryState {
    // Paso actual
    currentStep: WizardStep;

    // Datos de cada paso
    bioData: BioData;
    skinfolds: Skinfolds;
    girths: Girths;
    breadths: Breadths;

    // Resultados calculados
    results: CalculatedResults | null;

    // Flags
    isCalculating: boolean;
    isComplete: boolean;

    // Acciones de navegación
    nextStep: () => void;
    prevStep: () => void;
    goToStep: (step: WizardStep) => void;

    // Acciones de actualización
    updateBioData: (data: Partial<BioData>) => void;
    updateSkinfolds: (data: Partial<Skinfolds>) => void;
    updateGirths: (data: Partial<Girths>) => void;
    updateBreadths: (data: Partial<Breadths>) => void;

    // Acciones de cálculo
    calculateResults: () => void;

    // Reset
    resetAll: () => void;
}

// ===========================================
// VALORES INICIALES
// ===========================================

const initialBioData: BioData = {
    peso: 0,
    talla: 0,
    edad: 0,
    genero: 'masculino'
};

const initialSkinfolds: Skinfolds = {
    triceps: 0,
    biceps: 0,
    subscapular: 0,
    suprailiac: 0,
    abdominal: 0,
    thigh: 0,
    calf: 0
};

const initialGirths: Girths = {
    brazoRelajado: 0,
    brazoFlexionado: 0,
    cintura: 0,
    musloMedio: 0,
    pantorrilla: 0
};

const initialBreadths: Breadths = {
    humero: 0,
    femur: 0
};

// ===========================================
// STORE
// ===========================================

export const useAnthropometryStore = create<AnthropometryState>((set, get) => ({
    // Estado inicial
    currentStep: 1,
    bioData: initialBioData,
    skinfolds: initialSkinfolds,
    girths: initialGirths,
    breadths: initialBreadths,
    results: null,
    isCalculating: false,
    isComplete: false,

    // Navegación
    nextStep: () => set((state) => ({
        currentStep: Math.min(state.currentStep + 1, 4) as WizardStep
    })),

    prevStep: () => set((state) => ({
        currentStep: Math.max(state.currentStep - 1, 1) as WizardStep
    })),

    goToStep: (step) => set({ currentStep: step }),

    // Actualizaciones
    updateBioData: (data) => set((state) => ({
        bioData: { ...state.bioData, ...data }
    })),

    updateSkinfolds: (data) => set((state) => ({
        skinfolds: { ...state.skinfolds, ...data }
    })),

    updateGirths: (data) => set((state) => ({
        girths: { ...state.girths, ...data }
    })),

    updateBreadths: (data) => set((state) => ({
        breadths: { ...state.breadths, ...data }
    })),

    // Cálculos
    calculateResults: () => {
        const { bioData, skinfolds, girths, breadths } = get();
        set({ isCalculating: true });

        try {
            // Suma de pliegues
            const sumSkinfolds = Object.values(skinfolds).reduce((a, b) => a + b, 0);

            // % Grasa Corporal - Use centralized formula from somatotype-utils
            // Yuhasz modified formula (единая источник правды)
            let bodyFatPercent = 0;
            if (bioData.genero === 'masculino') {
                bodyFatPercent = (sumSkinfolds * 0.097) + 3.64;
            } else {
                bodyFatPercent = (sumSkinfolds * 0.1429) + 4.56;
            }
            bodyFatPercent = Math.max(3, Math.min(bodyFatPercent, 50));

            // Masas
            const fatMassKg = (bodyFatPercent / 100) * bioData.peso;
            const leanMassKg = bioData.peso - fatMassKg;

            // Somatotipo Heath-Carter - Use centralized library
            const somatoData = {
                bioData: { peso: bioData.peso, talla: bioData.talla, edad: bioData.edad, genero: bioData.genero },
                skinfolds: {
                    triceps: skinfolds.triceps,
                    subscapular: skinfolds.subscapular,
                    biceps: skinfolds.biceps,
                    iliac_crest: skinfolds.suprailiac, // Map suprailiac to iliac_crest for lib compatibility
                    supraspinale: skinfolds.suprailiac,
                    abdominal: skinfolds.abdominal,
                    thigh: skinfolds.thigh,
                    calf: skinfolds.calf
                },
                girths: {
                    brazoRelajado: girths.brazoRelajado || 0,
                    brazoFlexionado: girths.brazoFlexionado,
                    cintura: girths.cintura || 0,
                    musloMedio: girths.musloMedio || 0,
                    pantorrilla: girths.pantorrilla
                },
                breadths: {
                    humero: breadths.humero,
                    femur: breadths.femur
                }
            };

            // Calculate somatotype using centralized function
            // (Keep inline calculation for now to maintain backwards compatibility,
            // but mark as TODO for future refactor to use calculateSomatotype())
            const tallaCm = bioData.talla;
            const pesoKg = bioData.peso;

            // ENDOMORFIA
            const sumTSS = skinfolds.triceps + skinfolds.subscapular + skinfolds.suprailiac;
            const correctedSum = sumTSS * (170.18 / tallaCm);
            const endomorphy = -0.7182 + 0.1451 * correctedSum - 0.00068 * Math.pow(correctedSum, 2) + 0.0000014 * Math.pow(correctedSum, 3);

            // MESOMORFIA
            const brazoCorregido = girths.brazoFlexionado - (skinfolds.triceps / 10);
            const pantorrillaCorregida = girths.pantorrilla - (skinfolds.calf / 10);
            const mesomorphy = 0.858 * breadths.humero + 0.601 * breadths.femur + 0.188 * brazoCorregido + 0.161 * pantorrillaCorregida - 0.131 * tallaCm + 4.5;

            // ECTOMORFIA
            const HWR = tallaCm / Math.pow(pesoKg, 1 / 3);
            let ectomorphy = 0;
            if (HWR >= 40.75) {
                ectomorphy = 0.732 * HWR - 28.58;
            } else if (HWR >= 38.25) {
                ectomorphy = 0.463 * HWR - 17.63;
            } else {
                ectomorphy = 0.1;
            }

            // Coordenadas Somatocarta
            const somatoX = ectomorphy - endomorphy;
            const somatoY = 2 * mesomorphy - (endomorphy + ectomorphy);

            set({
                results: {
                    sumSkinfolds: Math.round(sumSkinfolds * 10) / 10,
                    bodyFatPercent: Math.round(bodyFatPercent * 10) / 10,
                    fatMassKg: Math.round(fatMassKg * 10) / 10,
                    leanMassKg: Math.round(leanMassKg * 10) / 10,
                    endomorphy: Math.round(Math.max(0.5, endomorphy) * 10) / 10,
                    mesomorphy: Math.round(Math.max(0.5, mesomorphy) * 10) / 10,
                    ectomorphy: Math.round(Math.max(0.5, ectomorphy) * 10) / 10,
                    somatoX: Math.round(somatoX * 10) / 10,
                    somatoY: Math.round(somatoY * 10) / 10
                },
                isCalculating: false,
                isComplete: true
            });
        } catch (error) {
            console.error('Error calculating results:', error);
            set({ isCalculating: false });
        }
    },

    // Reset
    resetAll: () => set({
        currentStep: 1,
        bioData: initialBioData,
        skinfolds: initialSkinfolds,
        girths: initialGirths,
        breadths: initialBreadths,
        results: null,
        isCalculating: false,
        isComplete: false
    })
}));

// ===========================================
// GRANULAR SELECTORS (Prevent unnecessary re-renders)
// ===========================================

// Navigation hooks
export const useWizardStep = () => {
    const currentStep = useAnthropometryStore(state => state.currentStep);
    const nextStep = useAnthropometryStore(state => state.nextStep);
    const prevStep = useAnthropometryStore(state => state.prevStep);
    const goToStep = useAnthropometryStore(state => state.goToStep);
    return { currentStep, nextStep, prevStep, goToStep };
};

// Data selectors - atomic to prevent cascading re-renders
export const useBioData = () => useAnthropometryStore(state => state.bioData);
export const useSkinfolds = () => useAnthropometryStore(state => state.skinfolds);
export const useGirths = () => useAnthropometryStore(state => state.girths);
export const useBreadths = () => useAnthropometryStore(state => state.breadths);

// Update actions - stable references
export const useUpdateBioData = () => useAnthropometryStore(state => state.updateBioData);
export const useUpdateSkinfolds = () => useAnthropometryStore(state => state.updateSkinfolds);
export const useUpdateGirths = () => useAnthropometryStore(state => state.updateGirths);
export const useUpdateBreadths = () => useAnthropometryStore(state => state.updateBreadths);

// Results hook - only re-renders when results change
export const useAnthropometryResults = () => {
    const results = useAnthropometryStore(state => state.results);
    const isCalculating = useAnthropometryStore(state => state.isCalculating);
    const calculateResults = useAnthropometryStore(state => state.calculateResults);
    return { results, isCalculating, calculateResults };
};

// Flags
export const useIsComplete = () => useAnthropometryStore(state => state.isComplete);
export const useResetAll = () => useAnthropometryStore(state => state.resetAll);
