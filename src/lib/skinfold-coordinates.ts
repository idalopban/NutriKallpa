// Diccionario de Coordenadas de Pliegues Cutáneos ISAK
// Estas coordenadas fueron calibradas manualmente para el modelo 3D

export type SkinfoldType =
    | 'triceps'
    | 'biceps'
    | 'subscapular'
    | 'suprailiac'
    | 'abdominal'
    | 'thigh'
    | 'calf';

export interface SkinfoldInfo {
    id: SkinfoldType;
    name: string;
    description: string;
    foldType: 'Vertical' | 'Diagonal' | 'Oblicuo';
    position: [number, number, number];
}

export interface Measurement {
    id: string;
    type: SkinfoldType;
    value: number; // en mm
    date: string;  // ISO date string
}

// Diccionario con las coordenadas calibradas
export const SKINFOLD_COORDINATES: Record<SkinfoldType, SkinfoldInfo> = {
    triceps: {
        id: 'triceps',
        name: '1. Tríceps',
        description: 'Parte posterior del brazo, entre acromion y olécranon.',
        foldType: 'Vertical',
        position: [-0.430, 0.790, -0.210]
    },
    biceps: {
        id: 'biceps',
        name: '2. Bíceps',
        description: 'Parte frontal del brazo, mismo nivel del tríceps.',
        foldType: 'Vertical',
        position: [-0.380, 0.750, 0.030]
    },
    subscapular: {
        id: 'subscapular',
        name: '3. Subescapular',
        description: 'Debajo del ángulo inferior de la escápula.',
        foldType: 'Diagonal',
        position: [-0.020, 0.720, -0.120]
    },
    suprailiac: {
        id: 'suprailiac',
        name: '4. Suprailíaco',
        description: 'Encima de la cresta ilíaca, línea axilar media.',
        foldType: 'Oblicuo',
        position: [-0.110, 0.320, 0.130]
    },
    abdominal: {
        id: 'abdominal',
        name: '5. Abdominal',
        description: 'A 2 cm lateral del ombligo.',
        foldType: 'Vertical',
        position: [0.020, 0.280, 0.130]
    },
    thigh: {
        id: 'thigh',
        name: '6. Muslo Medial',
        description: 'Punto medio del muslo.',
        foldType: 'Vertical',
        position: [-0.220, -0.280, 0.160]
    },
    calf: {
        id: 'calf',
        name: '7. Pantorrilla Medial',
        description: 'Cara interna de la pantorrilla (diámetro máximo).',
        foldType: 'Vertical',
        position: [-0.250, -0.500, -0.160]
    }
};

// Lista ordenada para dropdowns
export const SKINFOLD_OPTIONS = Object.values(SKINFOLD_COORDINATES);

// Helper para obtener coordenadas por tipo
export function getSkinfoldPosition(type: SkinfoldType): [number, number, number] {
    return SKINFOLD_COORDINATES[type].position;
}

// Helper para obtener info completa
export function getSkinfoldInfo(type: SkinfoldType): SkinfoldInfo {
    return SKINFOLD_COORDINATES[type];
}
