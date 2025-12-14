// ===========================================
// MAPA DE COORDENADAS ANATÓMICAS ISAK
// ===========================================
// Este mapa define las posiciones 3D de// Mapeo de pliegues cutáneos (ISAK Level 2 Standard)
export interface SkinfoldSite {
    name: string;
    position: [number, number, number];
    type: string;
    description: string;
}

// COORDENADAS PARA MODELO MASCULINO
export const SKINFOLD_MAP = {
    triceps: {
        name: "Tríceps",
        position: [-0.400, 0.800, -0.230] as [number, number, number],
        type: "Vertical",
        description: "Cara posterior del brazo, línea media acromio-radial."
    },
    subscapular: {
        name: "Subescapular",
        position: [-0.140, 0.690, -0.260] as [number, number, number],
        type: "Oblicuo (45º)",
        description: "Abajo y afuera del ángulo inferior de la escápula."
    },
    biceps: {
        name: "Bíceps",
        position: [-0.380, 0.760, 0.025] as [number, number, number],
        type: "Vertical",
        description: "Cara anterior del brazo, mitad del vientre del bíceps."
    },
    iliac_crest: {
        name: "Cresta Ilíaca",
        position: [-0.220, 0.390, 0.01] as [number, number, number], // Más lateral
        type: "Casi Horizontal",
        description: "Encima de la cresta ilíaca, siguiendo líneas de la piel."
    },
    supraspinale: {
        name: "Supraespinal",
        position: [-0.140, 0.310, 0.09] as [number, number, number], // Más frontal y bajo
        type: "Oblicuo",
        description: "Intersección línea espina ilíaca al borde axilar anterior."
    },
    abdominal: {
        name: "Abdominal",
        position: [-0.050, 0.350, 0.16] as [number, number, number],
        type: "Vertical",
        description: "5 cm a la derecha del ombligo."
    },
    thigh: {
        name: "Muslo Frontal",
        position: [-0.20, -0.270, 0.18] as [number, number, number],
        type: "Vertical",
        description: "Punto medio del muslo, pierna extendida y relajada."
    },
    calf: {
        name: "Pantorrilla Medial",
        position: [-0.29, -0.900, -0.275] as [number, number, number],
        type: "Vertical",
        description: "Cara medial, pierna relajada a 90º sobre cajón."
    }
} as const;

// COORDENADAS PARA MODELO FEMENINO (independientes, ajustar según el modelo)
export const SKINFOLD_MAP_FEMALE = {
    triceps: {
        name: "Tríceps",
        position: [-0.327, 0.640, -0.209] as [number, number, number], // Izquierda 10%
        type: "Vertical",
        description: "Cara posterior del brazo, línea media acromio-radial."
    },
    subscapular: {
        name: "Subescapular",
        position: [-0.084, 0.706, -0.260] as [number, number, number], // Derecha 15%
        type: "Oblicuo (45º)",
        description: "Abajo y afuera del ángulo inferior de la escápula."
    },
    biceps: {
        name: "Bíceps",
        position: [-0.329, 0.626, -0.055] as [number, number, number], // Atrás 12%
        type: "Vertical",
        description: "Cara anterior del brazo, mitad del vientre del bíceps."
    },
    iliac_crest: {
        name: "Cresta Ilíaca",
        position: [-0.198, 0.390, -0.043] as [number, number, number], // Atrás 20%
        type: "Casi Horizontal",
        description: "Encima de la cresta ilíaca, siguiendo líneas de la piel."
    },
    supraspinale: {
        name: "Supraespinal",
        position: [-0.140, 0.310, 0.067] as [number, number, number], // Atrás 25%
        type: "Oblicuo",
        description: "Intersección línea espina ilíaca al borde axilar anterior."
    },
    abdominal: {
        name: "Abdominal",
        position: [-0.050, 0.350, 0.12] as [number, number, number], // Atrás 20%
        type: "Vertical",
        description: "5 cm a la derecha del ombligo."
    },
    thigh: {
        name: "Muslo Frontal",
        position: [-0.155, -0.216, 0.065] as [number, number, number], // Derecha 10%
        type: "Vertical",
        description: "Punto medio del muslo, pierna extendida y relajada."
    },
    calf: {
        name: "Pantorrilla Medial",
        position: [-0.096, -0.720, -0.261] as [number, number, number], // Adelante 5%
        type: "Vertical",
        description: "Cara medial, pierna relajada a 90º sobre cajón."
    }
} as const;

// Tipos
export type SkinfoldSiteKey = keyof typeof SKINFOLD_MAP;
export type SkinfoldType = "Vertical" | "Diagonal" | "Oblicuo" | "Oblicuo (45º)" | "Casi Horizontal";
export type Gender = 'masculino' | 'femenino';

export interface SkinfoldMeasurement {
    id: string;
    siteKey: SkinfoldSiteKey;
    value: number;  // en mm
    date: string;   // ISO string
}

export interface SkinfoldSiteInfo {
    name: string;
    position: [number, number, number];
    type: SkinfoldType;
    description: string;
}

// Helpers
export const getSkinfoldSite = (key: SkinfoldSiteKey, gender: Gender = 'masculino'): SkinfoldSiteInfo => {
    const map = gender === 'femenino' ? SKINFOLD_MAP_FEMALE : SKINFOLD_MAP;
    return map[key];
};
export const getAllSiteKeys = (): SkinfoldSiteKey[] => Object.keys(SKINFOLD_MAP) as SkinfoldSiteKey[];
export const getAllSites = (gender: Gender = 'masculino') => {
    const map = gender === 'femenino' ? SKINFOLD_MAP_FEMALE : SKINFOLD_MAP;
    return Object.entries(map) as [SkinfoldSiteKey, SkinfoldSiteInfo][];
};
