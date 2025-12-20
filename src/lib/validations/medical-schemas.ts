import { z } from "zod";

// --- Enums ---
export const PathologyEnum = z.enum([
    'diabetes_t1', 'diabetes_t2', 'hipertension',
    'dislipidemia', 'obesidad', 'hipotiroidismo',
    'hipertiroidismo', 'sop', 'gastritis',
    'reflujo', 'renal_cr', 'anemia', 'celiaquia',
    'otro'
]);

export const SexEnum = z.enum(["masculino", "femenino"]);

// --- Biochem ---
export const BiochemistrySchema = z.object({
    fecha: z.union([z.string(), z.date()]),
    glucosa: z.number().min(20).max(600).optional(),
    hba1c: z.number().min(3).max(20).optional(),
    colesterolTotal: z.number().min(50).max(500).optional(),
    trigliceridos: z.number().min(20).max(1000).optional(),
    hdl: z.number().min(10).max(150).optional(),
    ldl: z.number().min(10).max(300).optional(),
    hemoglobina: z.number().min(3).max(25).optional(),
    ferritina: z.number().min(0).max(1000).optional(),
    observaciones: z.string().max(500).optional()
});

// --- Anamnesis ---
export const AnamnesisSchema = z.object({
    motivoConsulta: z.string().min(2, "Requerido"),
    patologias: z.array(z.string()).default([]), // Allow custom strings but UI should prefer Enum
    alergias: z.array(z.string()).default([]),
    medicamentos: z.array(z.string()).default([]),
    antecedentesFamiliares: z.array(z.string()).default([]),
    estiloVida: z.object({
        fuma: z.boolean().default(false),
        alcohol: z.enum(['nunca', 'ocasional', 'frecuente']).default('nunca'),
        suenoHoras: z.number().min(0).max(24).default(7),
        actividadFisicaTipo: z.string().optional()
    }).optional()
});

// --- Anthropometry (ISAK) ---
// Validates a single site measurement (ISAK structure)
export const ISAKValueSchema = z.object({
    val1: z.number(),
    val2: z.number(),
    val3: z.number().optional(),
    final: z.number()
});

// Helper for inputs that can be number (legacy) or ISAK object
export const AnthroValueSchema = z.union([z.number(), ISAKValueSchema]);

export const AnthropometryDesktopSchema = z.object({
    fecha: z.union([z.string(), z.date()]),
    peso: AnthroValueSchema,
    talla: AnthroValueSchema,

    pliegues: z.object({
        triceps: AnthroValueSchema.optional(),
        subscapular: AnthroValueSchema.optional(),
        biceps: AnthroValueSchema.optional(),
        iliac_crest: AnthroValueSchema.optional(),
        supraspinale: AnthroValueSchema.optional(),
        abdominal: AnthroValueSchema.optional(),
        thigh: AnthroValueSchema.optional(),
        calf: AnthroValueSchema.optional(),
    }).optional(),

    perimetros: z.object({
        cintura: AnthroValueSchema.optional(),
        cadera: AnthroValueSchema.optional(),
        brazoRelax: AnthroValueSchema.optional(),
        brazoFlex: AnthroValueSchema.optional(),
        musloMedio: AnthroValueSchema.optional(),
        pantorrilla: AnthroValueSchema.optional(),
        cuello: AnthroValueSchema.optional(),
    }).optional(),

    diametros: z.object({
        humero: AnthroValueSchema.optional(),
        femur: AnthroValueSchema.optional(),
        biestiloideo: AnthroValueSchema.optional(),
        biacromial: AnthroValueSchema.optional(),
        biiliocristal: AnthroValueSchema.optional()
    }).optional(),

    protocolo: z.enum(["isak_l1", "isak_l2", "basic"]).default("basic")
});

export const PatientValidationSchema = z.object({
    datosPersonales: z.object({
        nombre: z.string().min(2),
        apellido: z.string().min(2),
        email: z.string().email(),
        fechaNacimiento: z.union([z.string(), z.date()]),
        sexo: SexEnum
    }),
    historiaClinica: AnamnesisSchema.optional(),
    biochem: BiochemistrySchema.optional()
});
