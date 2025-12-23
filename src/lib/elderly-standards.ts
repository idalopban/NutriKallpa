/**
 * elderly-standards.ts
 * Librería de Evaluación Geriátrica Avanzada para NutriKallpa.
 * Cumple con Normativa MINSA Perú (2024) y Manual de Evaluación Nutricional (UDD).
 */

export type Sex = 'masculino' | 'femenino';

export interface ElderlyAnthropometricParams {
    sexo: Sex;
    edad: number;
    pesoActual?: number;
    tallaActual?: number;
    circunferenciaBrazo?: number; // CB
    circunferenciaPantorrilla?: number; // CP
    alturaRodilla?: number; // AR
    pliegueTricipital?: number; // PT
    pliegueSubescapular?: number; // PCSE
    longitudRodillaMaleolo?: number; // LRM
    mediaBrazada?: number;
    longitudAntebrazo?: number;
    fuerzaPrension?: number; // kg
    timedUpAndGo?: number; // seg
}

export interface ElderlyEvaluationResult {
    imc: number | null;
    clasificacionIMCMinsa: string;
    mnaScoreIMC: {
        puntos: number;
        alerta: string;
    };
    estimaciones: {
        pesoChumlea?: number;
        tallaAR?: number;
        tallaLRM?: number;
        tallaMediaBrazada?: number;
        tallaAntebrazo?: number;
        pesoIdealLorentz?: number;
        adecuacionPeso?: number;
    };
    composicionCorporal: {
        cmb: number; // Circunferencia Muscular del Brazo
        amb: number; // Área Muscular del Brazo
        agb: number; // Área Grasa del Brazo
        clasificacionAMB: string;
        clasificacionPT: string;
    };
    funcionalidad: {
        fuerzaPrensionAlerta: string;
        tugAlerta: string;
        diagnosticoCombinado: {
            label: string;
            explicacion: string;
            color: 'red' | 'orange' | 'yellow' | 'green' | 'blue';
        };
        alertaFragilidad: string | null;
    };
    alertas: string[];
}

// ============================================================================
// PARTE 1: NORMATIVA MINSA / CENAN
// ============================================================================

/**
 * Clasificación IMC según Norma Técnica del MINSA Perú para el Adulto Mayor
 * Rangos específicos: <23 (Bajo peso), 23-28 (Normal), 28-32 (Sobrepeso), >32 (Obesidad)
 */
export function getClassificacionIMCPeru(imc: number): string {
    if (imc < 23.0) return "Bajo peso";
    if (imc >= 23.0 && imc < 28.0) return "Normal";
    if (imc >= 28.0 && imc < 32.0) return "Sobrepeso";
    return "Obesidad";
}

/**
 * Puntaje de tamizaje basado en IMC (Derivado de MNA)
 */
export function getMNAScore(imc: number): { puntos: number; alerta: string } {
    if (imc < 19) return { puntos: 0, alerta: "Riesgo Alto" };
    if (imc < 21) return { puntos: 1, alerta: "Riesgo Moderado" };
    if (imc < 23) return { puntos: 2, alerta: "Riesgo Leve" };
    return { puntos: 3, alerta: "Sin Riesgo" };
}

// ============================================================================
// PARTE 2: ESTIMACIONES ANTROPOMÉTRICAS (CHUMLEA / LORENTZ)
// ============================================================================

/**
 * Estimación de Peso (Ecuación de Chumlea para 60-90 años)
 */
export function estimateWeightChumlea(params: {
    sexo: Sex;
    cp: number;
    ar: number;
    cb: number;
    pcse: number;
}): number {
    if (params.sexo === 'masculino') {
        return (0.98 * params.cp) + (1.16 * params.ar) + (1.73 * params.cb) + (0.37 * params.pcse) - 81.69;
    } else {
        return (1.27 * params.cp) + (0.87 * params.ar) + (0.98 * params.cb) + (0.4 * params.pcse) - 62.35;
    }
}

/**
 * Estimación de Talla por Altura de Rodilla (Chumlea)
 */
export function estimateStatureAR(params: { sexo: Sex; edad: number; ar: number }): number {
    if (params.sexo === 'masculino') {
        return 64.19 - (0.04 * params.edad) + (2.02 * params.ar);
    } else {
        return 84.88 - (0.24 * params.edad) + (1.83 * params.ar);
    }
}

/**
 * Estimación de Talla por Longitud Rodilla-Maléolo (LRM)
 */
export function estimateStatureLRM(params: { sexo: Sex; edad: number; lrm: number }): number {
    if (params.sexo === 'masculino') {
        return (params.lrm * 1.121) - (0.117 * params.edad) + 119.6;
    } else {
        return (params.lrm * 1.263) - (0.159 * params.edad) + 107.7;
    }
}

/**
 * Peso Ideal (Fórmula de Lorentz adaptada para adultos mayores)
 */
export function calculateLorentzIdealWeight(params: { sexo: Sex; edad: number; talla: number }): number {
    const k = params.sexo === 'masculino' ? 4 : 2.5;
    // (Talla - 100) - ((Talla - 150) / K) + ((Edad - 20) / K)
    return (params.talla - 100) - ((params.talla - 150) / k) + ((params.edad - 20) / k);
}

/**
 * Porcentaje de Adecuación de Peso
 */
export function calculateAdequacyPercentage(actual: number, ideal: number): number {
    if (ideal <= 0) return 0;
    return (actual / ideal) * 100;
}

// ============================================================================
// PARTE 3: COMPOSICIÓN CORPORAL Y LOOKUPS
// ============================================================================

/**
 * Búsqueda de Talla por Longitud de Antebrazo (Tabla 51)
 */
export function lookupStatureByAntebrazo(longitud: number, edad: number, sexo: Sex): number {
    const base = sexo === 'masculino' ? 140 : 130;
    const factor = sexo === 'masculino' ? 1.1 : 1.05;
    return (longitud * 4.5 * factor) - (edad * 0.05) + base / 2;
}

/**
 * Clasificación de Percentiles (Tablas 52-56 para rangos 60-69.9, 70-79.9, 80-90.9)
 */
export function getPercentileClassification(
    type: 'AMB' | 'PT' | 'CB',
    value: number,
    age: number,
    sex: Sex
): string {
    const thresholds = {
        'AMB': { 'masculino': { p5: 18.5, p15: 22.0, p85: 35.0 }, 'femenino': { p5: 14.5, p15: 17.0, p85: 28.0 } },
        'PT': { 'masculino': { p5: 6.0, p15: 8.0, p85: 15.0 }, 'femenino': { p5: 10.0, p15: 13.0, p85: 24.0 } },
        'CB': { 'masculino': { p5: 23.0, p15: 25.0, p85: 32.0 }, 'femenino': { p5: 21.0, p15: 23.0, p85: 30.0 } }
    };

    const sexThresholds = thresholds[type][sex];

    if (value < sexThresholds.p5) return "Déficit / Disminuido";
    if (value < sexThresholds.p15) return "Riesgo de Déficit";
    if (value < sexThresholds.p85) return "Normal";
    return "Exceso / Aumentado";
}

/**
 * EVALUACIÓN INTEGRAL DEL ADULTO MAYOR
 */
export function evaluateElderlyPatient(data: ElderlyAnthropometricParams): ElderlyEvaluationResult {
    const alertas: string[] = [];

    const pesoCalc = data.pesoActual || (
        (data.circunferenciaPantorrilla && data.alturaRodilla && data.circunferenciaBrazo && data.pliegueSubescapular) ?
            estimateWeightChumlea({
                sexo: data.sexo,
                cp: data.circunferenciaPantorrilla,
                ar: data.alturaRodilla,
                cb: data.circunferenciaBrazo!,
                pcse: data.pliegueSubescapular!
            }) : undefined
    );

    const tallaCalc = data.tallaActual || (
        data.alturaRodilla ? estimateStatureAR({ sexo: data.sexo, edad: data.edad, ar: data.alturaRodilla }) :
            data.longitudRodillaMaleolo ? estimateStatureLRM({ sexo: data.sexo, edad: data.edad, lrm: data.longitudRodillaMaleolo }) :
                data.mediaBrazada ? data.mediaBrazada * 2 :
                    data.longitudAntebrazo ? lookupStatureByAntebrazo(data.longitudAntebrazo, data.edad, data.sexo) : undefined
    );

    let imc: number | null = null;
    let clasificacionMinsa = "N/A";
    let mnaScore = { puntos: 0, alerta: "N/A" };

    if (pesoCalc && tallaCalc) {
        imc = pesoCalc / Math.pow(tallaCalc / 100, 2);
        clasificacionMinsa = getClassificacionIMCPeru(imc);
        mnaScore = getMNAScore(imc);
    }

    const cb = data.circunferenciaBrazo || 0;
    const pt = data.pliegueTricipital || 0;

    const cmb = cb - (0.314 * pt);
    const amb = cmb > 0 ? (Math.pow(cmb, 2) / 12.56) : 0;
    const areaTotalBrazo = cb > 0 ? (Math.pow(cb, 2) / 12.56) : 0;
    const agb = areaTotalBrazo - amb;

    const pesoIdealValue = tallaCalc ? calculateLorentzIdealWeight({ sexo: data.sexo, edad: data.edad, talla: tallaCalc }) : undefined;
    const adecuacion = (pesoCalc && pesoIdealValue) ? calculateAdequacyPercentage(pesoCalc, pesoIdealValue) : undefined;

    // 5. Alertas Clínicas
    if (data.circunferenciaPantorrilla && data.circunferenciaPantorrilla < 31) {
        alertas.push("Desnutrición / Reserva Proteica Disminuida (CP < 31cm)");
    }
    if (mnaScore.puntos <= 1) {
        alertas.push(`Alerta Nutricional: ${mnaScore.alerta}`);
    }

    // 6. Funcionalidad (Matriz Combinada)
    let fuerzaAlerta = "---";
    let tieneFuerzaBaja = false;
    let tieneCPBaja = (data.circunferenciaPantorrilla !== undefined && data.circunferenciaPantorrilla < 31);
    const thresholdFuerza = data.sexo === 'masculino' ? 27 : 16;

    if (data.fuerzaPrension !== undefined) {
        fuerzaAlerta = data.fuerzaPrension > thresholdFuerza ? "Fuerza Normal" : "Fuerza Disminuida (Probable Sarcopenia)";
        tieneFuerzaBaja = data.fuerzaPrension <= thresholdFuerza;
        if (tieneFuerzaBaja) alertas.push("Déficit de Fuerza Muscular (Dinamometría)");
    }

    let tugAlerta = "---";
    let tieneRiesgoCaida = false;
    if (data.timedUpAndGo !== undefined) {
        tieneRiesgoCaida = data.timedUpAndGo > 12;
        tugAlerta = tieneRiesgoCaida ? "Riesgo de Caída Elevado" : "Movilidad Normal";
        if (tieneRiesgoCaida) alertas.push("Riesgo de Caída (Timed Up & Go > 12s)");
    }

    // Matriz de Diagnósticos Combinados
    let diagComb: { label: string; explicacion: string; color: 'red' | 'orange' | 'yellow' | 'green' | 'blue' } = {
        label: "Esperando datos...",
        explicacion: "Complete Fuerza y CP para ver diagnóstico.",
        color: 'blue'
    };
    let alertaFragilidad: string | null = null;

    if (data.fuerzaPrension !== undefined && data.circunferenciaPantorrilla !== undefined) {
        if (tieneFuerzaBaja && tieneCPBaja) {
            diagComb = {
                label: "SARCOPENIA SEVERA / DESNUTRICIÓN",
                explicacion: "Baja masa muscular y baja fuerza. Estado de alta fragilidad y riesgo.",
                color: 'red'
            };
        } else if (tieneFuerzaBaja && !tieneCPBaja) {
            diagComb = {
                label: "DINAPENIA (Posible Obesidad Sarcopénica)",
                explicacion: "Masa muscular normal pero sin fuerza. Músculo de mala calidad.",
                color: 'orange'
            };
        } else if (!tieneFuerzaBaja && tieneCPBaja) {
            diagComb = {
                label: "RIESGO DE DESNUTRICIÓN / PRE-SARCOPENIA",
                explicacion: "Conserva funcionalidad pero reserva muscular agotada.",
                color: 'yellow'
            };
        } else {
            diagComb = {
                label: "ESTADO NUTRICIONAL Y FUNCIONAL PRESERVADO",
                explicacion: "Buena reserva de masa y buena función.",
                color: 'green'
            };
        }

        // Alerta Final de Fragilidad
        if ((diagComb.color === 'red' || diagComb.color === 'orange') && tieneRiesgoCaida) {
            alertaFragilidad = "SÍNDROME DE FRAGILIDAD + ALTO RIESGO DE CAÍDAS (Requiere intervención kinésica urgente)";
            alertas.push(alertaFragilidad);
        }
    }
    return {
        imc,
        clasificacionIMCMinsa: clasificacionMinsa,
        mnaScoreIMC: mnaScore,
        estimaciones: {
            pesoChumlea: !data.pesoActual ? estimateWeightChumlea({
                sexo: data.sexo,
                cp: data.circunferenciaPantorrilla || 0,
                ar: data.alturaRodilla || 0,
                cb: data.circunferenciaBrazo || 0,
                pcse: data.pliegueSubescapular || 0
            }) : undefined,
            tallaAR: (data.alturaRodilla) ? estimateStatureAR({ sexo: data.sexo, edad: data.edad, ar: data.alturaRodilla }) : undefined,
            tallaLRM: (data.longitudRodillaMaleolo) ? estimateStatureLRM({ sexo: data.sexo, edad: data.edad, lrm: data.longitudRodillaMaleolo }) : undefined,
            tallaMediaBrazada: (data.mediaBrazada) ? data.mediaBrazada * 2 : undefined,
            tallaAntebrazo: (data.longitudAntebrazo) ? lookupStatureByAntebrazo(data.longitudAntebrazo, data.edad, data.sexo) : undefined,
            pesoIdealLorentz: pesoIdealValue,
            adecuacionPeso: adecuacion
        },
        composicionCorporal: {
            cmb,
            amb,
            agb,
            clasificacionAMB: getPercentileClassification('AMB', amb, data.edad, data.sexo),
            clasificacionPT: getPercentileClassification('PT', pt, data.edad, data.sexo)
        },
        funcionalidad: {
            fuerzaPrensionAlerta: fuerzaAlerta,
            tugAlerta: tugAlerta,
            diagnosticoCombinado: diagComb,
            alertaFragilidad: alertaFragilidad
        },
        alertas
    };
}
