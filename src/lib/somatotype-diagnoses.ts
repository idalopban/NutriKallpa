/**
 * Somatotype Diagnosis Data
 * General diagnosis information for each somatotype classification
 */

import { getSomatotypeClassification } from "./somatotype-utils";

// ============================================================================
// TYPES
// ============================================================================

export interface GeneralDiagnosis {
    title: string;
    summary: string;
    characteristics: string[];
    metabolism: string;
    recommendedSports: string[];
    nutritionalConsiderations: string;
    icon: "endomorph" | "mesomorph" | "ectomorph" | "balanced";
}

// ============================================================================
// DIAGNOSIS DATA
// ============================================================================

const diagnoses: Record<string, GeneralDiagnosis> = {
    "Central": {
        title: "Somatotipo Central (Balanceado)",
        summary: "Presenta un equilibrio entre los tres componentes del somatotipo. Este perfil es poco común y flexible, permitiendo adaptaciones hacia diferentes direcciones según el entrenamiento y la alimentación.",
        characteristics: [
            "Proporciones corporales equilibradas",
            "Versatilidad para diferentes actividades físicas",
            "Capacidad de adaptación a diversos estímulos de entrenamiento"
        ],
        metabolism: "Metabolismo moderado con buena capacidad de respuesta tanto al aumento de masa muscular como a la pérdida de grasa.",
        recommendedSports: ["Actividades mixtas", "Triatlón", "Crossfit", "Natación", "Atletismo general"],
        nutritionalConsiderations: "Dieta balanceada con flexibilidad. Ajustar macronutrientes según el objetivo específico (hipertrofia o definición).",
        icon: "balanced"
    },
    "Endomorfo Balanceado": {
        title: "Endomorfo Balanceado",
        summary: "Predomina la adiposidad relativa con desarrollo medio-bajo de los otros componentes. Tendencia natural a acumular grasa corporal con facilidad.",
        characteristics: [
            "Mayor acumulación de grasa subcutánea",
            "Formas redondeadas, especialmente en tronco",
            "Articulaciones de tamaño medio",
            "Contornos musculares menos definidos"
        ],
        metabolism: "Metabolismo lento con alta eficiencia energética. Facilidad para almacenar reservas de grasa y dificultad para perderlas.",
        recommendedSports: ["Levantamiento de pesas", "Sumo", "Waterpolo", "Rugby (posiciones de fuerza)", "Lanzamientos"],
        nutritionalConsiderations: "Priorizar déficit calórico moderado. Reducir carbohidratos refinados, aumentar fibra y proteína. Control estricto de porciones.",
        icon: "endomorph"
    },
    "Endo-Mesomórfico": {
        title: "Endo-Mesomórfico",
        summary: "Combina adiposidad con buen desarrollo muscular. Cuerpo robusto con capacidad de fuerza pero con tendencia a acumular grasa.",
        characteristics: [
            "Estructura corporal robusta y fuerte",
            "Buen desarrollo muscular con capa adiposa",
            "Capacidad de generar potencia",
            "Apariencia sólida y compacta"
        ],
        metabolism: "Metabolismo con tendencia al anabolismo. Facilidad para ganar masa (muscular y grasa). Responde bien al entrenamiento de fuerza.",
        recommendedSports: ["Halterofilia", "Rugby", "Fútbol americano", "Lucha", "Powerlifting", "Strongman"],
        nutritionalConsiderations: "Proteína alta para preservar músculo. Carbohidratos moderados alrededor del entrenamiento. Evitar excesos calóricos.",
        icon: "endomorph"
    },
    "Endo-Ectomórfico": {
        title: "Endo-Ectomórfico",
        summary: "Combinación poco común de adiposidad con linealidad. Puede indicar sedentarismo o pérdida de masa muscular con conservación de grasa.",
        characteristics: [
            "Extremidades largas con acumulación de grasa central",
            "Bajo desarrollo muscular",
            "Tendencia a grasa visceral",
            "Postura potencialmente comprometida"
        ],
        metabolism: "Metabolismo irregular. Necesita intervención nutricional y de ejercicio para optimizar composición corporal.",
        recommendedSports: ["Caminata", "Ciclismo recreativo", "Yoga", "Pilates", "Natación suave"],
        nutritionalConsiderations: "Priorizar proteína para desarrollo muscular. Déficit calórico moderado. Incluir entrenamiento de fuerza obligatorio.",
        icon: "endomorph"
    },
    "Mesomorfo Balanceado": {
        title: "Mesomorfo Balanceado",
        summary: "Predomina el desarrollo músculo-esquelético con equilibrio entre adiposidad y linealidad. Perfil atlético ideal.",
        characteristics: [
            "Desarrollo muscular prominente",
            "Hombros anchos, cintura estrecha",
            "Huesos y articulaciones robustos",
            "Definición muscular visible"
        ],
        metabolism: "Metabolismo eficiente con excelente respuesta al ejercicio. Facilidad para ganar músculo y controlar grasa corporal.",
        recommendedSports: ["Culturismo", "Gimnasia", "Atletismo (velocidad/saltos)", "Artes marciales", "Natación competitiva"],
        nutritionalConsiderations: "Dieta hiperproteica para optimizar desarrollo muscular. Carbohidratos según volumen de entrenamiento. Flexibilidad en el plan.",
        icon: "mesomorph"
    },
    "Meso-Endomórfico": {
        title: "Meso-Endomórfico",
        summary: "Buen desarrollo muscular con tendencia a la adiposidad. Cuerpo fuerte y potente con reservas energéticas.",
        characteristics: [
            "Músculos bien desarrollados",
            "Capa de grasa moderada sobre la musculatura",
            "Gran capacidad de fuerza",
            "Estructura ósea robusta"
        ],
        metabolism: "Metabolismo anabólico. Buena síntesis proteica pero también facilidad para acumular grasa si hay exceso calórico.",
        recommendedSports: ["Lucha", "Judo", "Rugby", "Lanzamientos", "Halterofilia", "CrossFit"],
        nutritionalConsiderations: "Proteína alta, carbohidratos periodizados. En fase de definición, reducir calorías gradualmente sin perder masa muscular.",
        icon: "mesomorph"
    },
    "Meso-Ectomórfico": {
        title: "Meso-Ectomórfico",
        summary: "Combinación de desarrollo muscular con linealidad. Perfil atlético estético con buena definición natural.",
        characteristics: [
            "Musculatura definida y visible",
            "Proporciones estéticas",
            "Bajo porcentaje graso natural",
            "Extremidades proporcionadas con buen tono muscular"
        ],
        metabolism: "Metabolismo rápido con buena eficiencia muscular. Puede requerir alto aporte calórico para mantener masa muscular.",
        recommendedSports: ["Baloncesto", "Voleibol", "Atletismo (medio fondo, saltos)", "Natación", "Gimnasia"],
        nutritionalConsiderations: "Ingesta calórica suficiente para sostener actividad. Proteína moderada-alta. No descuidar carbohidratos para rendimiento.",
        icon: "mesomorph"
    },
    "Ectomorfo Balanceado": {
        title: "Ectomorfo Balanceado",
        summary: "Predomina la linealidad corporal con bajo desarrollo de los otros componentes. Cuerpo delgado y estilizado.",
        characteristics: [
            "Extremidades largas y delgadas",
            "Poco desarrollo muscular",
            "Baja grasa corporal",
            "Hombros estrechos, pecho plano"
        ],
        metabolism: "Metabolismo muy rápido (hardgainer). Dificultad significativa para ganar peso y masa muscular.",
        recommendedSports: ["Maratón", "Ciclismo de ruta", "Triatlón", "Escalada", "Salto de altura"],
        nutritionalConsiderations: "Superávit calórico necesario para ganar masa. Alta frecuencia de comidas. Carbohidratos abundantes. Proteína moderada-alta.",
        icon: "ectomorph"
    },
    "Ecto-Mesomórfico": {
        title: "Ecto-Mesomórfico",
        summary: "Linealidad con desarrollo muscular moderado. Cuerpo esbelto pero con capacidad atlética.",
        characteristics: [
            "Estructura esbelta con tono muscular",
            "Bajo porcentaje graso",
            "Buena relación potencia/peso",
            "Apariencia atlética y estilizada"
        ],
        metabolism: "Metabolismo rápido con buena respuesta al entrenamiento de fuerza. Necesita nutrición adecuada para progresar.",
        recommendedSports: ["Ciclismo", "Remo", "Natación", "Atletismo (velocidad, saltos)", "Escalada deportiva"],
        nutritionalConsiderations: "Calorías suficientes para sostener entrenamiento. Proteína alta. Carbohidratos según volumen de actividad.",
        icon: "ectomorph"
    },
    "Ecto-Endomórfico": {
        title: "Ecto-Endomórfico",
        summary: "Combinación de linealidad con adiposidad. Puede indicar bajo desarrollo muscular con acumulación de grasa (skinny fat).",
        characteristics: [
            "Extremidades delgadas con grasa central",
            "Bajo tono muscular",
            "Distribución de grasa desfavorable",
            "Puede aparentar delgadez vestido pero con grasa subyacente"
        ],
        metabolism: "Metabolismo irregular. Necesita recomposición corporal: ganar músculo mientras se reduce grasa.",
        recommendedSports: ["Entrenamiento con pesas", "HIIT", "Calistenia", "Natación", "Deportes de equipo recreativos"],
        nutritionalConsiderations: "Priorizar proteína para síntesis muscular. Calorías en mantenimiento o ligero superávit. Entrenamiento de fuerza esencial.",
        icon: "ectomorph"
    },
    "Mesomorfo-Endomorfo": {
        title: "Mesomorfo-Endomorfo",
        summary: "Desarrollo muscular y adiposidad similares, ambos superiores a la linealidad. Cuerpo robusto y potente.",
        characteristics: [
            "Estructura corporal sólida",
            "Músculos grandes cubiertos por grasa",
            "Gran capacidad de fuerza",
            "Articulaciones robustas"
        ],
        metabolism: "Metabolismo anabólico con tendencia a ganar peso fácilmente. Responde muy bien al entrenamiento de fuerza.",
        recommendedSports: ["Powerlifting", "Strongman", "Rugby", "Fútbol americano", "Lucha"],
        nutritionalConsiderations: "Control calórico para definición. Proteína muy alta. Carbohidratos moderados enfocados al entrenamiento.",
        icon: "mesomorph"
    },
    "Mesomorfo-Ectomorfo": {
        title: "Mesomorfo-Ectomorfo",
        summary: "Desarrollo muscular y linealidad similares con baja adiposidad. Perfil atlético con excelente estética.",
        characteristics: [
            "Músculos definidos sobre estructura esbelta",
            "Excelente relación músculo/grasa",
            "Proporciones armónicas",
            "Alta visibilidad de definición muscular"
        ],
        metabolism: "Metabolismo eficiente y balanceado. Buena capacidad de mantener composición corporal óptima.",
        recommendedSports: ["Culturismo estético", "Fitness", "Gimnasia", "Atletismo", "Deportes de combate"],
        nutritionalConsiderations: "Dieta flexible enfocada en el objetivo. Proteína adecuada. Ajustar según fase de entrenamiento.",
        icon: "mesomorph"
    },
    "Endomorfo-Ectomorfo": {
        title: "Endomorfo-Ectomorfo",
        summary: "Adiposidad y linealidad similares con bajo desarrollo muscular. Perfil que requiere intervención prioritaria en desarrollo muscular.",
        characteristics: [
            "Grasa acumulada con estructura lineal",
            "Muy bajo desarrollo muscular",
            "Posible pérdida de masa muscular previa",
            "Composición corporal subóptima"
        ],
        metabolism: "Metabolismo que necesita reactivación mediante entrenamiento de fuerza y nutrición adecuada.",
        recommendedSports: ["Entrenamiento de fuerza guiado", "Pilates", "Yoga con fuerza", "Caminata progresiva"],
        nutritionalConsiderations: "Priorizar absolutamente la proteína. Recomposición corporal. Entrenamiento de resistencia obligatorio.",
        icon: "balanced"
    }
};

// Fallbacks for simple classifications
const fallbackDiagnoses: Record<string, GeneralDiagnosis> = {
    "Endomorfo": diagnoses["Endomorfo Balanceado"],
    "Mesomorfo": diagnoses["Mesomorfo Balanceado"],
    "Ectomorfo": diagnoses["Ectomorfo Balanceado"]
};

// ============================================================================
// EXPORTED FUNCTION
// ============================================================================

/**
 * Get comprehensive diagnosis for a somatotype
 */
export function getGeneralDiagnosis(endo: number, meso: number, ecto: number): GeneralDiagnosis {
    const classification = getSomatotypeClassification(endo, meso, ecto);
    return diagnoses[classification] || fallbackDiagnoses[classification] || diagnoses["Central"];
}
