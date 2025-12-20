import type {
  MedidasAntropometricas,
  Somatotipo,
  ResultadosComposicion,
  ResultadoGrasa,
  ImcResultado,
  ResultadoFormula
} from "@/types";
import { getAnthroNumber } from "@/types";

/* -------------------------------------------------------------------------- */
/* CONSTANTES & PHANTOM (Ross & Wilson 1974)                                  */
/* -------------------------------------------------------------------------- */

const PHANTOM = {
  // Lengths/Breadths (cm)
  humero: { p: 6.48, s: 0.35 },
  femur: { p: 9.52, s: 0.48 },
  biacromial: { p: 38.04, s: 1.92 },
  biiliocristal: { p: 28.84, s: 1.75 },
  // Girths (cm)
  brazo: { p: 26.89, s: 2.33 },
  muslo: { p: 55.82, s: 4.23 },
  pantorrilla: { p: 35.25, s: 2.30 },
  // Skinfolds (mm) - Transformed scale usually, but for direct Z:
  triceps: { p: 15.4, s: 4.47 },
  subscapular: { p: 17.2, s: 5.07 },
  supraspinale: { p: 15.4, s: 4.47 }, // Approx
  abdominal: { p: 25.4, s: 7.36 }, // Approx
  thigh: { p: 27.0, s: 7.83 }, // Approx
  calf: { p: 23.1, s: 6.70 }, // Approx
  // Masses (kg)
  masaOsea: { p: 10.50, s: 1.36 },
  masaMuscular: { p: 24.50, s: 5.40 },
  masaResidual: { p: 6.10, s: 1.41 },
  masaGrasa: { p: 25.60, s: 5.85 }, // Adipose
};

/* -------------------------------------------------------------------------- */
/* UTILIDADES                                                                 */
/* -------------------------------------------------------------------------- */

const log10 = (x: number) => Math.log(x) / Math.LN10;
const sanitize = (val: any): number => {
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

export function calcularEdad(fechaNacimiento: string | Date): number {
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
}

export function calcularIMC(peso: number, talla: number): ImcResultado {
  if (!peso || !talla || talla <= 0) {
    return { valor: 0, diagnostico: "Datos inválidos" };
  }
  const tallaMetros = talla / 100;
  const valor = Number((peso / (tallaMetros * tallaMetros)).toFixed(2));
  let diagnostico = "Desconocido";
  if (valor < 18.5) diagnostico = "Bajo peso";
  else if (valor < 25) diagnostico = "Normopeso";
  else if (valor < 30) diagnostico = "Sobrepeso";
  else if (valor < 35) diagnostico = "Obesidad grado I";
  else if (valor < 40) diagnostico = "Obesidad grado II";
  else diagnostico = "Obesidad grado III";
  return { valor, diagnostico };
}

/* -------------------------------------------------------------------------- */
/* A. DENSIDAD CORPORAL (DC)                                                  */
/* -------------------------------------------------------------------------- */

export function getBodyDensity(
  medidas: MedidasAntropometricas,
  profile: TipoPaciente = 'general'
): { dc: number; metodo: string } {
  const { pliegues, sexo, edad } = medidas;
  if (!pliegues) return { dc: 0, metodo: 'Sin datos' };

  const isMale = sexo === 'masculino';

  // 1. GENERAL (Wilmore & Behnke)
  if (profile === 'general') {
    if (isMale) {
      // Hombres (1969): DC = 1.08543 - 0.000886(Abdominal) - 0.00040(Muslo Frontal)
      const abd = sanitize(pliegues.abdominal);
      const muslo = sanitize(pliegues.thigh);
      if (abd <= 0 || muslo <= 0) return { dc: 0, metodo: 'Faltan pliegues (Abd, Muslo)' };
      const dc = 1.08543 - (0.000886 * abd) - (0.00040 * muslo);
      return { dc, metodo: 'Wilmore & Behnke (1969)' };
    } else {
      // Mujeres (1970): DC = 1.06234 - 0.00068(Subescapular) - 0.00039(Tricipital) - 0.00025(Muslo Frontal)
      const sub = sanitize(pliegues.subscapular);
      const tri = sanitize(pliegues.triceps);
      const muslo = sanitize(pliegues.thigh);
      if (sub <= 0 || tri <= 0 || muslo <= 0) return { dc: 0, metodo: 'Faltan pliegues (Sub, Tri, Muslo)' };
      const dc = 1.06234 - (0.00068 * sub) - (0.00039 * tri) - (0.00025 * muslo);
      return { dc, metodo: 'Wilmore & Behnke (1970)' };
    }
  }

  // 2. CONTROL (Durnin & Womersley)
  if (profile === 'control') {
    // Suma 4: Tríceps + Bíceps + Subescapular + Cresta Ilíaca
    // ISAK AUDIT: Durnin & Womersley (1974) refers to "Suprailiac", which strictly maps to ISAK "Iliac Crest".
    const sum4 = sanitize(pliegues.triceps) + sanitize(pliegues.biceps) + sanitize(pliegues.subscapular) + sanitize(pliegues.iliac_crest);
    if (sum4 <= 0) return { dc: 0, metodo: 'Faltan pliegues (Tri, Bi, Sub, Cresta)' };
    const logSum = log10(sum4);

    if (isMale) {
      // Hombres: DC = 1.1765 - 0.0744 * log10(Sum4)
      const dc = 1.1765 - (0.0744 * logSum);
      return { dc, metodo: 'Durnin & Womersley (1974)' };
    } else {
      // Mujeres: DC = 1.1567 - 0.0717 * log10(Sum4)
      // NOTE: User prompt said 0.717, but that is mathematically impossible (yields DC < 0.9). Using standard 0.0717.
      const dc = 1.1567 - (0.0717 * logSum);
      return { dc, metodo: 'Durnin & Womersley (1974)' };
    }
  }

  // 3. FITNESS (Katch & McArdle)
  if (profile === 'fitness') {
    if (isMale) {
      // Hombres: DC = 1.09655 - 0.00103(Tricipital) - 0.00056(Subescapular) + 0.00054(Abdominal)
      const tri = sanitize(pliegues.triceps);
      const sub = sanitize(pliegues.subscapular);
      const abd = sanitize(pliegues.abdominal);
      if (tri <= 0 || sub <= 0 || abd <= 0) return { dc: 0, metodo: 'Faltan pliegues (Tri, Sub, Abd)' };
      const dc = 1.09655 - (0.00103 * tri) - (0.00056 * sub) + (0.00054 * abd); // Note: +0.00054 is unusual but following prompt
      return { dc, metodo: 'Katch & McArdle (1973)' };
    } else {
      // Mujeres: DC = 1.09246 - 0.00049(Subescapular) - 0.00075(Cresta Ilíaca)
      const sub = sanitize(pliegues.subscapular);
      const cresta = sanitize(pliegues.iliac_crest);
      // ISAK AUDIT: "Suprailiac" maps to Iliac Crest.
      if (sub <= 0 || cresta <= 0) return { dc: 0, metodo: 'Faltan pliegues (Sub, Cresta)' };
      const dc = 1.09246 - (0.00049 * sub) - (0.00075 * cresta);
      return { dc, metodo: 'Katch & McArdle (1973)' };
    }
  }

  // 4. ATLETA (Withers et al.)
  if (profile === 'atleta') {
    if (isMale) {
      // Hombres: DC = 1.0988 - 0.0004 * (Suma de 7 pliegues)
      const sum7 = sanitize(pliegues.triceps) + sanitize(pliegues.subscapular) + sanitize(pliegues.biceps) +
        sanitize(pliegues.supraspinale) + sanitize(pliegues.abdominal) + sanitize(pliegues.thigh) + sanitize(pliegues.calf);
      if (sum7 <= 0) return { dc: 0, metodo: 'Faltan pliegues (7)' };
      const dc = 1.0988 - (0.0004 * sum7);
      return { dc, metodo: 'Withers et al. (1987)' };
    } else {
      // Mujeres: DC = 1.20953 - 0.08294 * log10(Tríceps + Subescapular + Supraespinal + Pantorrilla Medial)
      const sum4 = sanitize(pliegues.triceps) + sanitize(pliegues.subscapular) + sanitize(pliegues.supraspinale) + sanitize(pliegues.calf);
      if (sum4 <= 0) return { dc: 0, metodo: 'Faltan pliegues (Tri, Sub, Supra, Pant)' };
      const dc = 1.20953 - (0.08294 * log10(sum4));
      return { dc, metodo: 'Withers et al. (1987)' };
    }
  }

  // 5. RÁPIDA (Sloan)
  if (profile === 'rapida') {
    if (isMale) {
      // Hombres (1967): DC = 1.1043 - 0.001327(Muslo Frontal) - 0.001310(Subescapular)
      const muslo = sanitize(pliegues.thigh);
      const sub = sanitize(pliegues.subscapular);
      if (muslo <= 0 || sub <= 0) return { dc: 0, metodo: 'Faltan pliegues (Muslo, Sub)' };
      const dc = 1.1043 - (0.001327 * muslo) - (0.001310 * sub);
      return { dc, metodo: 'Sloan (1967)' };
    } else {
      // Mujeres (1962): DC = 1.0764 - 0.00081(Cresta Ilíaca) - 0.00088(Tricipital)
      const cresta = sanitize(pliegues.iliac_crest);
      const tri = sanitize(pliegues.triceps);
      // ISAK AUDIT: Sloan uses "Suprailiac", mapping to Iliac Crest.
      if (cresta <= 0 || tri <= 0) return { dc: 0, metodo: 'Faltan pliegues (Cresta, Tri)' };
      const dc = 1.0764 - (0.00081 * cresta) - (0.00088 * tri);
      return { dc, metodo: 'Sloan (1962)' };
    }
  }

  return { dc: 0, metodo: 'Perfil desconocido' };
}

export function calculateBodyFat(dc: number): number {
  if (dc <= 0) return 0;
  // Siri Equation: (495 / DC) - 450
  const fat = (495 / dc) - 450;
  // Clamp to physiologically valid range (3-60%)
  // Essential fat is ~3% for men, extreme obesity rarely exceeds 60%
  return Math.max(3, Math.min(fat, 60));
}

/* -------------------------------------------------------------------------- */
/* B. SOMATOTIPO (Heath-Carter)                                               */
/* -------------------------------------------------------------------------- */

export function calculateSomatotype(data: MedidasAntropometricas): Somatotipo {
  const { peso, talla, pliegues, perimetros, diametros } = data;
  const H = sanitize(talla); // cm
  const W = sanitize(peso); // kg

  if (!H || !W || !pliegues || !perimetros || !diametros) {
    return { endo: 0, meso: 0, ecto: 0 };
  }

  // 1. ENDOMORFIA
  // Suma de 3 pliegues: Triceps, Subescapular, Supraespinal * (170.18 / Talla)
  // ISAK AUDIT: STRICTLY requires Supraspinale. Do NOT use Iliac Crest.
  const valSupraspinale = sanitize(pliegues.supraspinale);
  const valTriceps = sanitize(pliegues.triceps);
  const valSubscapular = sanitize(pliegues.subscapular);

  // Validation: If Supraspinale is missing, return 0 (or null logic if supported, but preserving types)
  if (valSupraspinale <= 0 || valTriceps <= 0 || valSubscapular <= 0) {
    // Missing critical skinfolds for Somatotype
    // Returning default 0.1 components to indicate failure/min value
    return { endo: 0.1, meso: 0.1, ecto: 0.1 };
  }

  const sum3 = (valTriceps + valSubscapular + valSupraspinale) * (170.18 / H);
  const endo = -0.7182 + (0.1451 * sum3) - (0.00068 * Math.pow(sum3, 2)) + (0.0000014 * Math.pow(sum3, 3));

  // 2. MESOMORFIA
  // 0.858 * Humero + 0.601 * Femur + 0.188 * BrazoCorr + 0.161 * PantCorr - 0.131 * Talla + 4.5
  const brazoCorr = sanitize(perimetros.brazoFlex) - (sanitize(pliegues.triceps) / 10);
  const pantCorr = sanitize(perimetros.pantorrilla) - (sanitize(pliegues.calf) / 10);
  const humero = sanitize(diametros.humero);
  const femur = sanitize(diametros.femur);

  const meso = (0.858 * humero) + (0.601 * femur) + (0.188 * brazoCorr) + (0.161 * pantCorr) - (0.131 * H) + 4.5;

  // 3. ECTOMORFIA
  // IP = Talla / RaizCubica(Peso)
  const ip = H / Math.pow(W, 1 / 3);  // Usar 1/3 para mayor precisión
  let ecto = 0;
  if (ip >= 40.75) {
    ecto = (0.732 * ip) - 28.58;
  } else if (ip > 38.25) {  // Corrección: > no >=
    ecto = (0.463 * ip) - 17.63;
  } else {
    ecto = 0.1; // Min value
  }

  return {
    endo: Math.max(0.1, Number(endo.toFixed(1))),
    meso: Math.max(0.1, Number(meso.toFixed(1))),
    ecto: Math.max(0.1, Number(ecto.toFixed(1)))
  };
}

/* -------------------------------------------------------------------------- */
/* C. FRACCIONAMIENTO DE MASAS (Phantom Z-Scores)                             */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* C. FRACCIONAMIENTO DE MASAS (Modelo Kerr 5-Componentes)                    */
/* -------------------------------------------------------------------------- */

export function calculateKerrMasses(data: MedidasAntropometricas) {
  const { talla, peso, pliegues, perimetros, diametros, sexo } = data;
  const H = sanitize(talla);
  const W = sanitize(peso);

  if (!pliegues || !perimetros || !diametros || H <= 0 || W <= 0) {
    return { osea: 0, muscular: 0, residual: 0, grasa: 0, piel: 0 };
  }

  // Helper: Z-Score calculation: Z = (Value * (170.18/H)^d - P) / S
  // d=1 for lengths/girths/skinfolds
  const getZ = (val: number | undefined, p: number, s: number) => {
    const v = sanitize(val);
    if (v <= 0) return null; // null indicates missing/unusable value
    const vAdj = v * (170.18 / H);
    return (vAdj - p) / s;
  };

  // Helper: Calculate Mean Z from a list of components, ignoring missing values
  const getMeanZ = (items: { val: number | undefined, p: number, s: number }[]) => {
    let sum = 0;
    let count = 0;
    items.forEach(item => {
      const z = getZ(item.val, item.p, item.s);
      if (z !== null && !isNaN(z)) {
        sum += z as number;
        count++;
      }
    });
    return count > 0 ? sum / count : 0;
  };

  // 1. MASA PIEL (Skin)
  const masaPielRaw = Math.max(0, (0.000105 * W * H) + 0.5);

  // 2. MASA ADIPOSA (Adipose)
  const zAdipose = getMeanZ([
    { val: getAnthroNumber(pliegues.triceps), p: PHANTOM.triceps.p, s: PHANTOM.triceps.s },
    { val: getAnthroNumber(pliegues.subscapular), p: PHANTOM.subscapular.p, s: PHANTOM.subscapular.s },
    { val: getAnthroNumber(pliegues.supraspinale), p: PHANTOM.supraspinale.p, s: PHANTOM.supraspinale.s }, // ISAK AUDIT: Uses Supraspinale
    { val: getAnthroNumber(pliegues.abdominal), p: PHANTOM.abdominal.p, s: PHANTOM.abdominal.s },
    { val: getAnthroNumber(pliegues.thigh), p: PHANTOM.thigh.p, s: PHANTOM.thigh.s },
    { val: getAnthroNumber(pliegues.calf), p: PHANTOM.calf.p, s: PHANTOM.calf.s }
  ]);
  const masaAdiposaRaw = Math.max(0, (zAdipose * PHANTOM.masaGrasa.s + PHANTOM.masaGrasa.p) / Math.pow(170.18 / H, 3));

  // 3. MASA MUSCULAR (Muscle)
  // Corrected girth estimations: subtract skinfold/10 (standard correction), remove accidental PI factor
  const gBrazoCorr = sanitize(perimetros.brazoFlex) - (sanitize(pliegues.triceps) / 10);
  const gMusloCorr = sanitize(perimetros.musloMedio) - (sanitize(pliegues.thigh) / 10);
  const gPantCorr = sanitize(perimetros.pantorrilla) - (sanitize(pliegues.calf) / 10);

  const zMuscle = getMeanZ([
    { val: gBrazoCorr, p: PHANTOM.brazo.p, s: PHANTOM.brazo.s },
    { val: gMusloCorr, p: PHANTOM.muslo.p, s: PHANTOM.muslo.s },
    { val: gPantCorr, p: PHANTOM.pantorrilla.p, s: PHANTOM.pantorrilla.s }
  ]);
  const masaMuscularRaw = Math.max(0, (zMuscle * PHANTOM.masaMuscular.s + PHANTOM.masaMuscular.p) / Math.pow(170.18 / H, 3));

  // 4. MASA ÓSEA (Bone)
  const zBone = getMeanZ([
    { val: getAnthroNumber(diametros.biacromial), p: PHANTOM.biacromial.p, s: PHANTOM.biacromial.s },
    { val: getAnthroNumber(diametros.biiliocristal), p: PHANTOM.biiliocristal.p, s: PHANTOM.biiliocristal.s },
    { val: getAnthroNumber(diametros.humero), p: PHANTOM.humero.p, s: PHANTOM.humero.s },
    { val: getAnthroNumber(diametros.femur), p: PHANTOM.femur.p, s: PHANTOM.femur.s }
  ]);
  const masaOseaRaw = Math.max(0, (zBone * PHANTOM.masaOsea.s + PHANTOM.masaOsea.p) / Math.pow(170.18 / H, 3));

  // 5. MASA RESIDUAL (Residual)
  const zResidual = (zAdipose + zMuscle + zBone) / 3;
  const masaResidualRaw = Math.max(0, (zResidual * PHANTOM.masaResidual.s + PHANTOM.masaResidual.p) / Math.pow(170.18 / H, 3));

  // AJUSTE FINAL (Scaling to Weight)
  const totalCalculated = masaPielRaw + masaAdiposaRaw + masaMuscularRaw + masaOseaRaw + masaResidualRaw;

  // Prevent division by zero or negative total
  if (totalCalculated <= 0) {
    return { osea: 0, muscular: 0, residual: 0, grasa: 0, piel: 0 };
  }

  const factor = W / totalCalculated;

  return {
    piel: masaPielRaw * factor,
    grasa: masaAdiposaRaw * factor,
    muscular: masaMuscularRaw * factor,
    osea: masaOseaRaw * factor,
    residual: masaResidualRaw * factor
  };
}

/* -------------------------------------------------------------------------- */
/* MAIN ORCHESTRATOR                                                          */
/* -------------------------------------------------------------------------- */

export function calculateAnthropometry(
  data: MedidasAntropometricas,
  profileOrProtocol: string = 'general'
): ResultadosComposicion & { metodo: string } {
  const { peso, talla, perimetros, pliegues } = data;
  const W = sanitize(peso);
  const H = sanitize(talla);

  // Determine actual protocol based on profile
  const profile = profileOrProtocol.toLowerCase();

  // --- FULL ANTHROPOMETRY (All Profiles) ---

  // 1. Body Density & Fat (2C Model)
  // Now we pass the profile directly to getBodyDensity
  const densityResult = getBodyDensity(data, profile as TipoPaciente);
  const fatPct2C = calculateBodyFat(densityResult.dc);

  // 2. Somatotype
  const somato = calculateSomatotype(data);

  // 3. Fractionation (Kerr 5-Component)
  const masses = calculateKerrMasses(data);
  let { osea, muscular, residual, piel, grasa } = masses;

  const fatMass2C = (fatPct2C / 100) * W;

  return {
    densidadCorporal: Number(densityResult.dc.toFixed(4)),
    porcentajeGrasa: Number(fatPct2C.toFixed(2)),
    masaGrasa: Number(fatMass2C.toFixed(2)), // From 2C (Lipid Mass)
    masaAdiposa: Number(grasa.toFixed(2)),     // From Kerr (Adipose Tissue)
    masaMuscular: Number(muscular.toFixed(2)), // From Kerr
    masaOsea: Number(osea.toFixed(2)),         // From Kerr
    masaResidual: Number(residual.toFixed(2)), // From Kerr
    masaPiel: Number(piel.toFixed(2)),         // From Kerr
    somatotipo: somato,
    metodo: densityResult.metodo
  };
}


// --- HELPERS & COMPATIBILITY ---

export const calcularComposicionCorporal = (
  medidas: MedidasAntropometricas,
  tipo: string = 'general',
  formula: string = ''
) => {
  // If formula is explicitly provided (e.g. from historical override), use it to infer protocol
  // Otherwise use profile type
  let effectiveProfile = tipo;
  if (formula.toLowerCase().includes('withers')) effectiveProfile = 'atleta';
  if (formula.toLowerCase().includes('durnin')) effectiveProfile = 'general';

  return calculateAnthropometry(medidas, effectiveProfile);
};

export const calcularTodasLasFormulas = (medidas: MedidasAntropometricas): ResultadoFormula[] => {
  const durnin = calculateAnthropometry(medidas, 'general');
  const withers = calculateAnthropometry(medidas, 'atleta');
  return [
    { metodo: 'Durnin & Womersley', resultado: { DC: durnin.densidadCorporal, gc: durnin.porcentajeGrasa } },
    { metodo: 'Withers et al.', resultado: { DC: withers.densidadCorporal, gc: withers.porcentajeGrasa } }
  ];
};

export const seleccionarMejorFormula = (tipo: string) => {
  if (tipo === 'general') return 'Wilmore & Behnke';
  if (tipo === 'control') return 'Durnin & Womersley';
  if (tipo === 'fitness') return 'Katch & McArdle';
  if (tipo === 'atleta') return 'Withers et al.';
  if (tipo === 'rapida') return 'Sloan';
  return 'General';
};

export function getRequisitosFormula(profileOrFormula: string, sexo: string): string[] {
  const p = profileOrFormula.toLowerCase();
  const isMale = sexo === 'masculino';

  // 1. GENERAL (Wilmore)
  if (p === 'general') {
    return isMale ? ['abdominal', 'thigh'] : ['subscapular', 'triceps', 'thigh'];
  }

  // 2. CONTROL (Durnin)
  if (p === 'control') {
    return ['triceps', 'biceps', 'subscapular', 'iliac_crest'];
  }

  // 3. FITNESS (Katch)
  if (p === 'fitness') {
    return isMale ? ['triceps', 'subscapular', 'abdominal'] : ['subscapular', 'iliac_crest'];
  }

  // 4. ATLETA (Withers)
  if (p === 'atleta') {
    return isMale
      ? ['triceps', 'subscapular', 'biceps', 'supraspinale', 'abdominal', 'thigh', 'calf']
      : ['triceps', 'subscapular', 'supraspinale', 'calf'];
  }

  // 5. RÁPIDA (Sloan)
  if (p === 'rapida') {
    return isMale ? ['thigh', 'subscapular'] : ['iliac_crest', 'triceps'];
  }

  return [];
}

export type TipoPaciente = "general" | "control" | "fitness" | "atleta" | "rapida";

/* -------------------------------------------------------------------------- */
/* GASTO ENERGÉTICO (Migrado de calculations.ts)                              */
/* -------------------------------------------------------------------------- */

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentario (Poco o nada de ejercicio)',
  light: 'Ligero (Ejercicio ligero 1-3 días/sem)',
  moderate: 'Moderado (Ejercicio moderado 3-5 días/sem)',
  active: 'Activo (Ejercicio fuerte 6-7 días/sem)',
  very_active: 'Muy Activo (Ejercicio muy fuerte/doble sesión)'
};

/**
 * Harris-Benedict (Original 1919 / Revised 1984)
 * Men: 88.362 + (13.397 x kg) + (4.799 x cm) - (5.677 x years)
 * Women: 447.593 + (9.247 x kg) + (3.098 x cm) - (4.330 x years)
 */
export function calculateHarrisBenedict(weight: number, height: number, age: number, sex: string): number {
  const isMale = sex.toLowerCase().startsWith('m') || sex.toLowerCase() === 'hombre';

  if (isMale) {
    return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
    return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }
}

/**
 * Mifflin-St Jeor (1990) - Often considered more accurate for modern populations
 * Men: (10 x kg) + (6.25 x cm) - (5 x years) + 5
 * Women: (10 x kg) + (6.25 x cm) - (5 x years) - 161
 */
export function calculateMifflinStJeor(weight: number, height: number, age: number, sex: string): number {
  const isMale = sex.toLowerCase().startsWith('m') || sex.toLowerCase() === 'hombre';
  const base = (10 * weight) + (6.25 * height) - (5 * age);

  return isMale ? base + 5 : base - 161;
}

/**
 * FAO/WHO/UNU (2001)
 * Simplified equations based on age ranges
 */
export function calculateFAOWHO(weight: number, age: number, sex: string): number {
  const isMale = sex.toLowerCase().startsWith('m') || sex.toLowerCase() === 'hombre';

  if (isMale) {
    if (age < 3) return (60.9 * weight) - 54;
    if (age < 10) return (22.7 * weight) + 495;
    if (age < 18) return (17.5 * weight) + 651;
    if (age < 30) return (15.3 * weight) + 679;
    if (age < 60) return (11.6 * weight) + 879;
    return (13.5 * weight) + 487;
  } else {
    if (age < 3) return (61.0 * weight) - 51;
    if (age < 10) return (22.5 * weight) + 499;
    if (age < 18) return (12.2 * weight) + 746;
    if (age < 30) return (14.7 * weight) + 496;
    if (age < 60) return (8.7 * weight) + 829;
    return (10.5 * weight) + 596;
  }
}

/**
 * Katch-McArdle (1975) - Best for athletes/individuals with known body composition
 * Uses Fat-Free Mass (FFM) for more accurate prediction
 * BMR = 370 + (21.6 × FFM)
 * 
 * @param weight - Body weight in kg
 * @param fatPercentage - Body fat percentage (e.g., 15 for 15%)
 * @returns BMR in kcal/day
 */
export function calculateKatchMcArdle(weight: number, fatPercentage: number): number {
  if (weight <= 0 || fatPercentage < 0 || fatPercentage > 100) return 0;
  const ffm = weight * (1 - fatPercentage / 100);
  return 370 + (21.6 * ffm);
}

/**
 * Cunningham (1980) - Alternative to Katch-McArdle
 * BMR = 500 + (22 × FFM)
 */
export function calculateCunningham(weight: number, fatPercentage: number): number {
  if (weight <= 0 || fatPercentage < 0 || fatPercentage > 100) return 0;
  const ffm = weight * (1 - fatPercentage / 100);
  return 500 + (22 * ffm);
}

/* -------------------------------------------------------------------------- */
/* GASTO ENERGÉTICO TOTAL (GET) CON TEF                                       */
/* -------------------------------------------------------------------------- */

/**
 * Thermic Effect of Food (TEF) Factor
 * Typically 10% of total energy expenditure
 * Higher for protein-rich diets (~20-30% of protein calories)
 */
export const TEF_FACTOR = 0.10;

export type BMRFormula = 'mifflin' | 'harris' | 'fao' | 'katch' | 'cunningham';

export interface EnergyExpenditureParams {
  weight: number;
  height: number;
  age: number;
  sex: string;
  activityLevel: ActivityLevel;
  formula?: BMRFormula;
  fatPercentage?: number; // Required for katch/cunningham
  includeTEF?: boolean;
}

export interface EnergyExpenditureResult {
  bmr: number;
  activityFactor: number;
  tef: number;
  tdee: number; // Total Daily Energy Expenditure
  formula: string;
}

/**
 * Calculate Total Daily Energy Expenditure (TDEE)
 * TDEE = BMR × Activity Factor + TEF
 * 
 * @param params - All parameters needed for calculation
 * @returns Complete breakdown of energy expenditure
 */
export function calculateTDEE(params: EnergyExpenditureParams): EnergyExpenditureResult {
  const {
    weight,
    height,
    age,
    sex,
    activityLevel,
    formula = 'mifflin',
    fatPercentage,
    includeTEF = true
  } = params;

  const activityFactor = ACTIVITY_FACTORS[activityLevel];

  let bmr = 0;
  let formulaName = '';

  switch (formula) {
    case 'mifflin':
      bmr = calculateMifflinStJeor(weight, height, age, sex);
      formulaName = 'Mifflin-St Jeor';
      break;
    case 'harris':
      bmr = calculateHarrisBenedict(weight, height, age, sex);
      formulaName = 'Harris-Benedict';
      break;
    case 'fao':
      bmr = calculateFAOWHO(weight, age, sex);
      formulaName = 'FAO/OMS';
      break;
    case 'katch':
      if (fatPercentage === undefined) {
        // Fallback to Mifflin if no body fat data
        bmr = calculateMifflinStJeor(weight, height, age, sex);
        formulaName = 'Mifflin-St Jeor (fallback)';
      } else {
        bmr = calculateKatchMcArdle(weight, fatPercentage);
        formulaName = 'Katch-McArdle';
      }
      break;
    case 'cunningham':
      if (fatPercentage === undefined) {
        bmr = calculateMifflinStJeor(weight, height, age, sex);
        formulaName = 'Mifflin-St Jeor (fallback)';
      } else {
        bmr = calculateCunningham(weight, fatPercentage);
        formulaName = 'Cunningham';
      }
      break;
    default:
      bmr = calculateMifflinStJeor(weight, height, age, sex);
      formulaName = 'Mifflin-St Jeor';
  }

  const baseExpenditure = bmr * activityFactor;
  const tef = includeTEF ? baseExpenditure * TEF_FACTOR : 0;
  const tdee = baseExpenditure + tef;

  return {
    bmr: Math.round(bmr),
    activityFactor,
    tef: Math.round(tef),
    tdee: Math.round(tdee),
    formula: formulaName
  };
}
