/**
 * ISAK MEASUREMENTS CONFIGURATION
 * Fuente: Manual Oficial ISAK (International Society for the Advancement of Kinanthropometry)
 * Nivel: 3 (Instructor)
 */

export interface MeasurementTooltip {
    id: string;
    label: string;
    category: string;
    position: string;   // Posición del sujeto
    definition: string; // Definición técnica breve
    technique: string[]; // Pasos del Método
    safetyNote?: string; // Advertencias críticas
}

export const ISAK_MEASUREMENTS: MeasurementTooltip[] = [
    // --- BASIC MEASUREMENTS ---
    {
        id: 'weight',
        label: 'Peso Corporal®',
        category: 'Básico',
        position: 'Sujeto de pie en el centro del platillo, sin sostenerse.',
        definition: 'Masa corporal total del sujeto.',
        technique: [
            'El sujeto debe estar desnudo o con mínima ropa.',
            'Distribuir el peso por igual sobre ambos apoyos.',
            'El sujeto no debe sostenerse de nada.'
        ]
    },
    {
        id: 'height',
        label: 'Estatura® (Técnica Estirada)',
        category: 'Básico',
        position: 'Pies juntos, talones, nalgas y parte superior de la espalda apoyados. Cabeza en plano Frankfort.',
        definition: 'Distancia perpendicular desde el piso al vertex del cráneo.',
        technique: [
            'Aplicar suave presión hacia arriba sobre el hueso mastoideo (tracción).',
            'Tomar la medición al final de una profunda expiración.'
        ]
    },
    {
        id: 'sitting_height',
        label: 'Talla Sentado®',
        category: 'Básico',
        position: 'Sentado en caja antropométrica, pies colgando libremente. Cabeza en plano Frankfort.',
        definition: 'Distancia desde el vertex hasta la superficie del asiento.',
        technique: [
            'Espalda e hips apoyados contra la pared/estadímetro.',
            'Aplicar tracción mastoidea igual que en estatura.'
        ]
    },

    // --- SKINFOLDS ---
    {
        id: 'skinfold_triceps',
        label: 'Pliegue del Tríceps®',
        category: 'Pliegue Cutáneo',
        position: 'Brazo izquierdo relajado al costado. Brazo derecho relajado, hombro con leve rotación externa.',
        definition: 'Parte posterior del Tríceps, en la línea media a nivel de la marca Media Acromiale-Radiale.',
        technique: [
            'Tomar el pliegue paralelo al eje largo del brazo.'
        ]
    },
    {
        id: 'skinfold_subscapular',
        label: 'Pliegue Subescapular®',
        category: 'Pliegue Cutáneo',
        position: 'Sujeto relajado con brazos a los lados.',
        definition: 'A 2 cm del punto Subescapulare, en línea oblicua hacia abajo (45º) y lateralmente.',
        technique: [
            'Seguir la línea natural de la piel para determinar el eje del pliegue.'
        ]
    },
    {
        id: 'skinfold_biceps',
        label: 'Pliegue del Bíceps®',
        category: 'Pliegue Cutáneo',
        position: 'Brazo relajado, hombro en leve rotación externa.',
        definition: 'Parte anterior del Bíceps, mirando de costado, a nivel de la marca Media-Acromiale-Radiale.',
        technique: [
            'El pliegue corre paralelo al eje largo del brazo.'
        ]
    },
    {
        id: 'skinfold_iliac_crest',
        label: 'Pliegue de la Cresta Ilíaca®',
        category: 'Pliegue Cutáneo',
        position: 'Brazo derecho abducido o cruzando el tronco.',
        definition: 'Sitio sobre la línea central del pliegue inmediatamente por encima de la marca Iliocristale.',
        technique: [
            'El pliegue corre levemente inclinado hacia abajo y anteriormente.',
            'Seguir el pliegue natural de la piel.'
        ]
    },
    {
        id: 'skinfold_supraspinale',
        label: 'Pliegue Supraespinal®',
        category: 'Pliegue Cutáneo',
        position: 'Brazos colgando.',
        definition: 'Intersección de la línea del Ilioespinale al borde axilar anterior y la línea horizontal del nivel Iliocristal.',
        technique: [
            'El pliegue corre medialmente hacia abajo en un ángulo de 45º.'
        ]
    },
    {
        id: 'skinfold_abdominal',
        label: 'Pliegue Abdominal®',
        category: 'Pliegue Cutáneo',
        position: 'Relajado.',
        definition: '5 cm a la derecha del punto medio del ombligo.',
        technique: [
            'Pliegue vertical tomado en la línea vertical de la cruz marcada.'
        ],
        safetyNote: 'Crítico: No ubique los dedos o el calibre dentro del ombligo. Asegurar agarre firme si hay poco desarrollo muscular.'
    },
    {
        id: 'skinfold_thigh',
        label: 'Pliegue del Muslo Frontal®',
        category: 'Pliegue Cutáneo',
        position: 'Sentado con torso erecto, rodilla derecha en ángulo recto.',
        definition: 'Punto medio entre el pliegue inguinal y el margen superior de la rótula.',
        technique: [
            'El pliegue es paralelo al eje longitudinal del muslo.',
            'Si es difícil, usar Método B (sujeto ayuda levantando el muslo inferior).'
        ]
    },
    {
        id: 'skinfold_calf',
        label: 'Pliegue de la Pantorrilla Medial®',
        category: 'Pliegue Cutáneo',
        position: 'Pie derecho sobre la caja (rodilla a 90º) y pantorrilla relajada.',
        definition: 'Cara medial de la pantorrilla a nivel de la máxima circunferencia.',
        technique: [
            'El pliegue es paralelo al eje largo de la pierna.'
        ]
    },

    // --- GIRTHS ---
    {
        id: 'girth_arm_relaxed',
        label: 'Brazo Relajado®',
        category: 'Perímetro',
        position: 'Brazos colgando, brazo derecho levemente abducido.',
        definition: 'Perímetro a nivel de la marca Media Acromiale-Radiale.',
        technique: [
            'Mantener la cinta perpendicular al eje del brazo.'
        ]
    },
    {
        id: 'girth_arm_flexed',
        label: 'Brazo Flexionado y en Tensión®',
        category: 'Perímetro',
        position: 'Brazo levantado a la horizontal, antebrazo supinado y flexionado 45-90º.',
        definition: 'Máxima circunferencia del bíceps contraído.',
        technique: [
            'Pedir al sujeto la máxima tensión posible antes de medir.'
        ]
    },
    {
        id: 'girth_waist',
        label: 'Cintura (Mínima)®',
        category: 'Perímetro',
        position: 'Brazos cruzados sobre el tórax.',
        definition: 'Región más estrecha entre el último arco costal (10ª costilla) y la cresta ilíaca.',
        technique: [
            'Tomar la medición al final de una expiración normal.'
        ]
    },
    {
        id: 'girth_hip',
        label: 'Glúteo (Cadera)®',
        category: 'Perímetro',
        position: 'Pies juntos, glúteos relajados.',
        definition: 'Nivel de la máxima protuberancia posterior de las nalgas (aprox. nivel sínfisis pubiana).',
        technique: [
            'Mantener la cinta rigurosamente en plano horizontal.'
        ]
    },
    {
        id: 'girth_calf',
        label: 'Pantorrilla (Máxima)®',
        category: 'Perímetro',
        position: 'Pie sobre banco elevado, peso distribuido.',
        definition: 'Nivel de la máxima circunferencia de la pantorrilla.',
        technique: [
            'Cinta perpendicular al eje de la pierna.'
        ]
    },
    {
        id: 'girth_thigh_mid',
        label: 'Perímetro de Muslo Medio®',
        category: 'Perímetro',
        definition: 'Perímetro del muslo medio derecho sobre la marca Media-Trocanterion-Tibial Lateral.',
        position: 'Sujeto de pie con los brazos cruzados alrededor del tórax. Pies separados y peso distribuido uniformemente.',
        technique: [
            'Es útil que el sujeto se pare sobre la caja antropométrica para facilitar la medición.',
            'Pasar la cinta por detrás en la región inferior del muslo y deslizarla hacia arriba hasta la marca.',
            'Ubicar la cinta en un plano perpendicular al eje longitudinal del muslo.',
            'Asegurarse de no comprimir la piel excesivamente, solo la tensión justa.'
        ]
    },

    // --- BREADTHS ---
    {
        id: 'breadth_humerus',
        label: 'Húmero (Biepicondilar)®',
        category: 'Diámetro Óseo',
        position: 'Brazo horizontal, antebrazo flexionado a 90º.',
        definition: 'Distancia entre epicóndilos medial y lateral del húmero.',
        technique: [
            'Aplicar fuerte presión con los dedos índices para comprimir el tejido blando.'
        ]
    },
    {
        id: 'breadth_femur',
        label: 'Fémur (Biepicondilar)®',
        category: 'Diámetro Óseo',
        position: 'Sentado, rodilla a 90º.',
        definition: 'Distancia entre epicóndilos medial y lateral del fémur.',
        technique: [
            'Aplicar fuerte presión con los dedos índices.'
        ]
    },
    {
        id: 'breadth_biacromial',
        label: 'Anchura Biacromial®',
        category: 'Diámetro Óseo',
        definition: 'Distancia entre los puntos más laterales sobre los procesos acromiales.',
        position: 'El sujeto asume una posición relajada, de parado, con los brazos colgando a los lados.',
        technique: [
            'El medidor se para detrás del sujeto.',
            'Apoyar las ramas del calibre deslizante grande sobre los procesos acromiales.',
            'Las ramas del calibre deben mantenerse a un ángulo aproximado de 30° hacia abajo.',
            'Aplicar presión para comprimir los tejidos que recubren el sitio, pero sin mover los hombros.'
        ],
        safetyNote: 'El ángulo de 30° hacia abajo es crítico.'
    },
    {
        id: 'breadth_biiliocristal',
        label: 'Anchura Bi-iliocristal®',
        category: 'Diámetro Óseo',
        definition: 'Distancia entre los puntos más laterales sobre la cresta ilíaca (Iliocristal®).',
        position: 'El sujeto está parado y relajado con los brazos cruzados sobre el pecho.',
        technique: [
            'El medidor se para de frente al sujeto.',
            'Las ramas del calibre deslizante grande son mantenidas a un ángulo de aproximadamente 45° hacia abajo.',
            'Aplicar una firme presión para reducir los efectos del tejido blando (grasa subcutánea).'
        ],
        safetyNote: 'Aplicar presión muy firme para asegurar contacto óseo real.'
    },
    {
        id: 'breadth_wrist_bistyloid',
        label: 'Diámetro de Muñeca (Biestiloideo)',
        category: 'Diámetro Óseo',
        definition: 'Distancia biepicondilar entre los puntos óseos más prominentes del radio y el cúbito a nivel de la muñeca.',
        position: 'Sujeto sentado o de pie, con el antebrazo pronado (palma hacia abajo) y la mano relajada colgando libremente para relajar los extensores.',
        technique: [
            'Palpar y localizar ambas apófisis estiloides.',
            'Colocar el calibrador perpendicularmente al eje longitudinal del antebrazo.',
        ],
    }
];

// Helper para buscar por ID
export function getIsakTooltip(id: string): MeasurementTooltip | undefined {
    return ISAK_MEASUREMENTS.find(m => m.id === id);
}
