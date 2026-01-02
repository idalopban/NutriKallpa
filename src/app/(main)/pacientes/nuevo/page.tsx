"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  User,
  Activity,
  Scale,
  Utensils,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Check,
  Plus,
  Baby
} from "lucide-react";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Logic
import { savePaciente, saveMedidas } from "@/lib/storage";
import { createPatient } from "@/actions/patient-actions";
import { useAuthStore } from "@/store/useAuthStore";
import type { Paciente, MedidasAntropometricas } from "@/types";
import { getMedianAnthro, calculateZScore } from "@/lib/growth-standards";
import { calculateCardiometabolicRisk } from "@/utils/clinical-formulas";

// Helper to handle optional numbers in forms (avoids controlled/uncontrolled transition)
const optionalNumber = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : v),
  z.coerce.number().optional()
);

// --- VALIDATION SCHEMA ---
const formSchema = z.object({
  nombre: z.string().min(2, "Nombre requerido"),
  apellido: z.string().min(2, "Apellido requerido"),
  fechaNacimiento: z.string().min(1, "Fecha de nacimiento requerida"),
  sexo: z.enum(["masculino", "femenino"]),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().optional(),

  // Motivo de Consulta (Prioridad Clínica)
  motivoConsulta: z.string().optional(),

  // Antropometría
  peso: z.coerce.number().min(1, "Peso requerido"),
  talla: z.coerce.number().min(1, "Talla requerida"),
  circunferenciaCintura: optionalNumber,
  circunferenciaCadera: optionalNumber,
  actividadFisica: z.string(),

  // Nutrición
  formulaGet: z.string(),
  objetivoPeso: z.string(),
  kcalAjuste: z.coerce.number().default(0),
  proteinaRatio: z.coerce.number().min(0.5).default(1.6),

  // Historia Clínica Estructurada
  notas: z.string().optional(),
  patologias: z.array(z.string()).default([]),
  alergias: z.array(z.string()).default([]),
  medicamentos: z.array(z.string()).default([]),
  antecedentesFamiliares: z.array(z.string()).default([]),

  // Estilo de Vida
  horasSueno: z.coerce.number().min(0).max(24).optional(),
  tabaquismo: z.boolean().default(false),
  consumoAlcohol: z.enum(["nunca", "ocasional", "frecuente"]).default("nunca"),
  consumoAgua: z.coerce.number().min(0).default(2),

  // Bioquímica (Opcional)
  glucosa: optionalNumber,
  hemoglobina: optionalNumber,
  altitudResidencia: optionalNumber,
  colesterolTotal: optionalNumber,
  trigliceridos: optionalNumber,
  hdl: optionalNumber,
  ldl: optionalNumber,

  // Datos Pediátricos (específicos para anemia)
  isPremature: z.boolean().default(false),
  semanasGestacion: optionalNumber,
  isLowBirthWeight: z.boolean().default(false),
  pesoNacer: optionalNumber,
});

// Defined locally, will sync with the main list
const COMMON_PATHOLOGIES = [
  "Diabetes Tipo 1",
  "Diabetes Tipo 2",
  "Hipertensión Arterial",
  "Dislipidemia",
  "Obesidad",
  "Celiaquía",
  "Enfermedad Renal Crónica",
  "Hipotiroidismo",
  "Gastritis",
  "Reflujo GE",
  "SOP",
  "Anemia"
];

// Alergias Alimentarias Comunes (Seguridad del Paciente)
const COMMON_ALLERGIES = [
  "Lácteos",
  "Gluten",
  "Maní",
  "Frutos secos",
  "Mariscos",
  "Pescado",
  "Huevo",
  "Soya",
  "Trigo",
  "Sulfitos"
];

// Medicamentos Comunes que afectan nutrición
const COMMON_MEDICATIONS = [
  "Metformina",
  "Atorvastatina",
  "Losartán",
  "Levotiroxina",
  "Omeprazol",
  "Insulina",
  "Anticonceptivos",
  "Multivitamínico",
  "Warfarina",
  "Prednisona"
];

// Antecedentes Familiares de Riesgo
const FAMILY_HISTORY = [
  "Diabetes",
  "Hipertensión",
  "Obesidad",
  "Cáncer",
  "Enfermedad Cardíaca",
  "Dislipidemia",
  "Hipotiroidismo"
];

type FormValues = z.infer<typeof formSchema>;

export default function NuevoPacientePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const patientId = searchParams.get('patientId');
  const [existingPatient, setExistingPatient] = useState<Paciente | null>(null);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasManuallyEditedAnthro, setHasManuallyEditedAnthro] = useState(false);
  const imcBarRef = useRef<HTMLDivElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      apellido: "",
      fechaNacimiento: "",
      sexo: "masculino",
      email: "",
      telefono: "",
      motivoConsulta: "",
      peso: 70.0,
      talla: 170.0,
      circunferenciaCintura: "" as any,
      circunferenciaCadera: "" as any,
      actividadFisica: "moderada",
      formulaGet: "mifflin",
      objetivoPeso: "mantenimiento",
      kcalAjuste: 0,
      proteinaRatio: 1.6,
      notas: "",
      patologias: [],
      alergias: [],
      medicamentos: [],
      antecedentesFamiliares: [],
      horasSueno: 7,
      tabaquismo: false,
      consumoAlcohol: "nunca",
      glucosa: "" as any,
      hemoglobina: "" as any,
      altitudResidencia: "" as any,
      colesterolTotal: "" as any,
      trigliceridos: "" as any,
      hdl: "" as any,
      ldl: "" as any,
      isPremature: false,
      semanasGestacion: "" as any,
      isLowBirthWeight: false,
      pesoNacer: "" as any,
    },
  });

  // Load existing patient data if patientId is provided
  useEffect(() => {
    if (patientId && user) {
      setIsLoadingPatient(true);
      // Import storage function dynamically to avoid issues
      import('@/lib/storage').then(({ getPacientes, getMedidasByPaciente }) => {
        const pacientes = getPacientes(user.id);
        const patient = pacientes.find(p => p.id === patientId);

        if (patient) {
          setExistingPatient(patient);
          const medidas = getMedidasByPaciente(patientId);
          const ultimaMedida = medidas.length > 0 ? medidas[medidas.length - 1] : null;

          // Pre-fill form with existing patient data
          const fechaNac = typeof patient.datosPersonales.fechaNacimiento === 'string'
            ? patient.datosPersonales.fechaNacimiento.split('T')[0]
            : new Date(patient.datosPersonales.fechaNacimiento).toISOString().split('T')[0];

          form.reset({
            nombre: patient.datosPersonales.nombre,
            apellido: patient.datosPersonales.apellido,
            fechaNacimiento: fechaNac,
            sexo: (patient.datosPersonales.sexo === "masculino" || patient.datosPersonales.sexo === "femenino")
              ? patient.datosPersonales.sexo
              : "masculino",
            email: patient.datosPersonales.email || "",
            telefono: patient.datosPersonales.telefono || "",
            motivoConsulta: patient.historiaClinica?.motivoConsulta || "",
            peso: ultimaMedida?.peso || 70.0,
            talla: ultimaMedida?.talla || 170.0,
            circunferenciaCintura: ultimaMedida?.perimetros?.cintura ?? ("" as any),
            circunferenciaCadera: ultimaMedida?.perimetros?.cadera ?? ("" as any),
            actividadFisica: "moderada",
            formulaGet: "mifflin",
            objetivoPeso: patient.historiaClinica?.objetivos || "mantenimiento",
            kcalAjuste: 0,
            proteinaRatio: 1.6,
            notas: patient.historiaClinica?.antecedentesPersonales || "",
            patologias: patient.historiaClinica?.patologias || [],
            alergias: patient.historiaClinica?.alergias || [],
            medicamentos: patient.historiaClinica?.medicamentos || [],
            antecedentesFamiliares: patient.historiaClinica?.antecedentesFamiliares || [],
            horasSueno: patient.historiaClinica?.estiloVida?.suenoHoras || 7,
            tabaquismo: patient.historiaClinica?.estiloVida?.fuma || false,
            consumoAlcohol: patient.historiaClinica?.estiloVida?.alcohol || "nunca",
            glucosa: patient.historiaClinica?.bioquimicaReciente?.glucosa ?? ("" as any),
            hemoglobina: patient.historiaClinica?.bioquimicaReciente?.hemoglobina ?? ("" as any),
            altitudResidencia: patient.historiaClinica?.altitudResidencia ?? ("" as any),
            colesterolTotal: patient.historiaClinica?.bioquimicaReciente?.colesterolTotal ?? ("" as any),
            trigliceridos: patient.historiaClinica?.bioquimicaReciente?.trigliceridos ?? ("" as any),
            hdl: patient.historiaClinica?.bioquimicaReciente?.hdl ?? ("" as any),
            ldl: patient.historiaClinica?.bioquimicaReciente?.ldl ?? ("" as any),
            isPremature: patient.pediatricInfo?.semanasGestacion ? patient.pediatricInfo.semanasGestacion < 37 : false,
            semanasGestacion: patient.pediatricInfo?.semanasGestacion ?? ("" as any),
            isLowBirthWeight: patient.pediatricInfo?.pesoNacer ? patient.pediatricInfo.pesoNacer < 2500 : false,
            pesoNacer: patient.pediatricInfo?.pesoNacer ?? ("" as any),
          });
        }
        setIsLoadingPatient(false);
      });
    }
  }, [patientId, user, form]);

  // --- SMART DEFAULTS LOGIC ---
  const birthDateValue = form.watch("fechaNacimiento");
  const sexValue = form.watch("sexo");

  useEffect(() => {
    // Only apply if not editing existing patient and user hasn't touched the fields
    if (!existingPatient && !hasManuallyEditedAnthro && birthDateValue) {
      const birthDate = new Date(birthDateValue);
      if (!isNaN(birthDate.getTime())) {
        const ageInMonths = Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4375));

        if (ageInMonths >= 0) {
          const suggested = getMedianAnthro(ageInMonths, sexValue as any);

          form.setValue("peso", suggested.weight, { shouldValidate: true });
          form.setValue("talla", suggested.height, { shouldValidate: true });
        }
      }
    }
  }, [birthDateValue, sexValue, existingPatient, hasManuallyEditedAnthro, form]);

  // --- Real-time Calculations ---
  const peso = form.watch("peso");
  const talla = form.watch("talla");
  const cintura = form.watch("circunferenciaCintura");
  const cadera = form.watch("circunferenciaCadera");
  const ratio = form.watch("proteinaRatio");
  const objetivo = form.watch("objetivoPeso");
  const fechaNacimiento = form.watch("fechaNacimiento");

  // Calcular edad a partir de fecha de nacimiento
  const calcularEdad = (fecha: string): number => {
    if (!fecha) return 0;
    const hoy = new Date();
    const nacimiento = new Date(fecha);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };
  const edadCalculada = calcularEdad(fechaNacimiento);
  const isPediatric = edadCalculada < 19;
  const isAdult = edadCalculada >= 18 && edadCalculada < 65;
  const isGeriatric = edadCalculada >= 65;
  const isChild = edadCalculada < 12; // Threshold for hiding lifestyle habits like smoking/alcohol
  const showBirthHistory = edadCalculada < 5;

  // Cálculos derivados visuales
  const imc = (peso && talla) ? (peso / Math.pow(talla / 100, 2)).toFixed(1) : "0.0";
  const totalProteina = (peso && ratio) ? (peso * ratio).toFixed(0) : "0";

  // Riesgo Cardiometabólico en tiempo real
  const cardiometabolicData = useMemo(() => {
    if (!cintura || !talla || !sexValue) return null;
    return calculateCardiometabolicRisk(
      cintura,
      cadera || cintura * 1.1, // Fallback si no hay cadera
      talla,
      edadCalculada,
      sexValue as 'masculino' | 'femenino'
    );
  }, [cintura, cadera, talla, edadCalculada, sexValue]);

  // Interpretation of BMI based on age group
  const bmiStatus = useMemo(() => {
    const val = Number(imc);
    if (val === 0) return { label: "Esperando datos", color: "text-slate-500", barColor: "bg-slate-700" };

    if (isPediatric) {
      // Use official WHO 2007 Z-Score for Pediatrics (5-19)
      const months = Math.floor((Date.now() - new Date(fechaNacimiento).getTime()) / (1000 * 60 * 60 * 24 * 30.4375));
      const zScoreResult = calculateZScore(val, months, sexValue as 'male' | 'female', 'bfa');

      if (zScoreResult) {
        return {
          label: zScoreResult.diagnosis,
          color: zScoreResult.severityLevel === 'normal' ? "text-emerald-400" :
            zScoreResult.severityLevel.includes('moderate') ? "text-orange-400" : "text-red-400",
          barColor: zScoreResult.severityLevel === 'normal' ? "bg-emerald-500" :
            zScoreResult.severityLevel.includes('moderate') ? "bg-orange-500" : "bg-red-500"
        };
      }
      return { label: "Pediátrico (Ref. OMS)", color: "text-blue-400", barColor: "bg-blue-500" };
    }

    if (isGeriatric) {
      if (val < 23) return { label: "Bajo Peso", color: "text-blue-400", barColor: "bg-blue-500" };
      if (val <= 28) return { label: "Normal (Geriátrico)", color: "text-emerald-400", barColor: "bg-emerald-500" };
      if (val <= 30) return { label: "Sobrepeso", color: "text-orange-400", barColor: "bg-orange-500" };
      return { label: "Obesidad", color: "text-red-400", barColor: "bg-red-500" };
    }

    // Standard Adult
    if (val < 18.5) return { label: "Bajo Peso", color: "text-blue-400", barColor: "bg-blue-500" };
    if (val < 25) return { label: "Peso Normal", color: "text-emerald-400", barColor: "bg-emerald-500" };
    if (val < 30) return { label: "Sobrepeso", color: "text-orange-400", barColor: "bg-orange-500" };
    return { label: "Obesidad", color: "text-red-400", barColor: "bg-red-500" };
  }, [imc, isPediatric, isGeriatric]);

  // Update BMI bar color and width
  useEffect(() => {
    if (imcBarRef.current) {
      const width = Math.min(Number(imc) * 2.5, 100);
      imcBarRef.current.style.width = `${width}%`;
      // Update color class manually since it's a ref
      imcBarRef.current.className = `h-full rounded-full transition-all duration-700 ${bmiStatus.barColor}`;
    }
  }, [imc, bmiStatus]);

  // Color dinámico según objetivo
  const getObjectiveColor = () => {
    if (objetivo === 'perder') return 'text-orange-500 bg-orange-500/10';
    if (objetivo === 'ganar') return 'text-green-500 bg-green-500/10';
    return 'text-blue-500 bg-blue-500/10';
  };

  async function onSubmit(data: FormValues) {
    console.log("🟢 INTENTANDO GUARDAR...", data); // Mira la consola del navegador

    if (!user) {
      alert("⚠️ Error: No hay usuario autenticado. Inicia sesión nuevamente.");
      return;
    }

    try {
      setIsSubmitting(true);
      // FIX: Use existing ID if updating, otherwise generate new
      const pacienteId = existingPatient?.id || crypto.randomUUID();
      const now = new Date().toISOString();
      // FIX: Preserve original creation date if updating
      const createdAt = existingPatient?.createdAt || now;

      // 1. Preparar Datos
      const nombre = data.nombre.trim();
      const apellido = data.apellido.trim();
      const edadFinal = calcularEdad(data.fechaNacimiento);

      // 2. Objeto Paciente (Asegurando tipos)
      const nuevoPaciente: Paciente = {
        id: pacienteId,
        usuarioId: user.id,
        datosPersonales: {
          nombre,
          apellido,
          email: data.email || "",
          telefono: data.telefono || "",
          fechaNacimiento: new Date(data.fechaNacimiento).toISOString(),
          sexo: data.sexo as "masculino" | "femenino",
          peso: data.peso,
          talla: data.talla,
        },
        historiaClinica: {
          motivoConsulta: data.motivoConsulta || "",
          patologias: data.patologias || [],
          alergias: data.alergias || [],
          medicamentos: data.medicamentos || [],
          antecedentesFamiliares: data.antecedentesFamiliares || [],
          objetivos: data.objetivoPeso,
          antecedentesPersonales: data.notas || "",
          estiloVida: {
            fuma: data.tabaquismo,
            alcohol: data.consumoAlcohol,
            suenoHoras: data.horasSueno || 7,
            aguaDiaria: data.consumoAgua || 2, // Consumo de agua diario en L
          },
          bioquimicaReciente: {
            glucosa: data.glucosa,
            hemoglobina: data.hemoglobina,
            colesterolTotal: data.colesterolTotal,
            trigliceridos: data.trigliceridos,
            hdl: data.hdl,
            ldl: data.ldl
          },
          altitudResidencia: data.altitudResidencia
        },
        pediatricInfo: {
          semanasGestacion: data.semanasGestacion,
          isPremature: data.isPremature,
          pesoNacer: data.pesoNacer,
          isLowBirthWeight: data.isLowBirthWeight,
        },
        // 🔗 CRITICAL: Link form values to configuracionNutricional for PatientNutritionConfig
        configuracionNutricional: {
          nivelActividad: data.actividadFisica as 'sedentario' | 'ligera' | 'moderada' | 'intensa' | 'muy_intensa',
          objetivoPeso: data.objetivoPeso as 'perder' | 'mantenimiento' | 'ganar',
          formulaGET: data.formulaGet as 'mifflin' | 'harris' | 'katch' | 'fao' | 'iom' | 'henry',
          proteinaRatio: data.proteinaRatio,
          kcalAjuste: data.kcalAjuste,
          // Macro defaults
          macroProteina: 25,
          macroCarbohidratos: 50,
          macroGrasa: 25,
          proteinBasis: 'total' as const,
        },
        createdAt: createdAt,
        updatedAt: now,
      };


      // 3. Objeto Medidas
      const nuevasMedidas: MedidasAntropometricas = {
        id: crypto.randomUUID(),
        pacienteId: pacienteId,
        fecha: now,
        peso: data.peso,
        talla: data.talla,
        imc: parseFloat(imc),
        edad: edadFinal,
        sexo: data.sexo as "masculino" | "femenino",
        protocolo: "basic",
        perimetros: {
          cintura: data.circunferenciaCintura,
          cadera: data.circunferenciaCadera,
        },
        createdAt: now,
        updatedAt: now,
      };

      // Intentar sincronizar con Supabase (no bloqueante)
      try {
        console.log("💾 Sincronizando con Supabase...", nuevoPaciente);
        const result = await createPatient(nuevoPaciente);
        if (!result.success) {
          console.warn("⚠️ No se pudo sincronizar con Supabase:", result.error);
        }
      } catch (syncError) {
        console.warn("⚠️ Error de conexión con Supabase (se guardará localmente):", syncError);
      }

      // Siempre guardar en Storage Local (ahora asíncrono hacia Supabase)
      console.log("💾 Guardando en Storage Local...", nuevoPaciente);
      await savePaciente(nuevoPaciente);
      await saveMedidas(nuevasMedidas);

      // Redirigir al expediente del paciente recién creado
      const redirectUrl = `/pacientes/${pacienteId}`;
      console.log("🚀 Redirigiendo a:", redirectUrl);
      window.location.href = redirectUrl;

    } catch (e) {
      console.error("🔴 ERROR CRÍTICO AL GUARDAR:", e);
      alert("Hubo un error técnico. Revisa la consola (F12).");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-500 pb-20">

      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-[#334155] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1 font-medium">
            <span onClick={() => router.back()} className="cursor-pointer hover:text-green-600 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> {existingPatient ? 'Expediente' : 'Pacientes'}
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 dark:text-white">{existingPatient ? 'Consulta de Seguimiento' : 'Nuevo Registro'}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {existingPatient ? 'Editar Paciente' : 'Nuevo Paciente'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {existingPatient
              ? `Actualiza los datos de ${existingPatient.datosPersonales.nombre} ${existingPatient.datosPersonales.apellido}`
              : 'Ingresa los datos iniciales para comenzar el seguimiento clínico.'}
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="outline" onClick={() => router.back()} className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900">
            Cancelar
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={form.handleSubmit(onSubmit, (errors) => {
              console.log("Errores de validación:", errors);
              alert("⚠️ No se puede guardar. Revisa los campos en rojo.");
            })}
            className="min-w-[160px] gap-2 shadow-lg shadow-slate-900/20 bg-slate-900 hover:bg-slate-800 text-white transition-all hover:scale-[1.02]"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Guardar Ficha
              </>
            )}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* --- LEFT COLUMN: DATA ENTRY (8 Cols) --- */}
          <div className="lg:col-span-8 space-y-8">

            {/* 1. Datos Personales (BLUE THEME) */}
            <Card className="border-none shadow-md bg-white dark:bg-[#1e293b] dark:border dark:border-[#334155] overflow-hidden">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-[#334155] pb-4">
                <CardTitle className="flex items-center gap-3 text-lg text-slate-800 dark:text-white">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                    <User className="w-4 h-4" />
                  </div>
                  Información Personal
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6 pt-6">
                <div className="grid md:grid-cols-2 gap-4 col-span-2">
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-600">Nombres</FormLabel>
                        <FormControl>
                          <Input placeholder="Escribir nombres completos" className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-blue-500 focus:ring-blue-500/20 transition-all dark:text-white" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="apellido"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-600">Apellidos</FormLabel>
                        <FormControl>
                          <Input placeholder="Escribir apellidos completos" className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-blue-500 focus:ring-blue-500/20 transition-all dark:text-white" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="fechaNacimiento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600">Fecha de Nacimiento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-blue-500 focus:ring-blue-500/20 transition-all dark:text-white" />
                      </FormControl>
                      {fechaNacimiento && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <p className="text-xs text-slate-500 font-medium">
                            Edad: <span className="font-bold text-blue-600 dark:text-blue-400">{edadCalculada} años</span>
                          </p>
                          {isPediatric && <Badge variant="outline" className="text-[10px] h-5 bg-blue-50 text-blue-600 border-blue-200">👦 Pediátrico</Badge>}
                          {isAdult && <Badge variant="outline" className="text-[10px] h-5 bg-green-50 text-green-600 border-green-200">🧑 Adulto</Badge>}
                          {isGeriatric && <Badge variant="outline" className="text-[10px] h-5 bg-orange-50 text-orange-600 border-orange-200">👴 Geriátrico</Badge>}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sexo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600">Sexo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:ring-blue-500/20 dark:text-white">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="femenino">Femenino</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600">Email (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="correo@ejemplo.com" {...field} className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-blue-500 focus:ring-blue-500/20 transition-all dark:text-white" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600">Teléfono (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+51..." {...field} className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-blue-500 focus:ring-blue-500/20 transition-all dark:text-white" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* 2. Motivo de Consulta (PURPLE THEME - PROMINENT) */}
            <Card className="border-none shadow-md bg-white dark:bg-[#1e293b] dark:border dark:border-[#334155] overflow-hidden border-l-4 border-l-purple-500">
              <CardHeader className="bg-purple-50/50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-900/30 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg text-slate-800 dark:text-white">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shadow-sm">
                    <Activity className="w-4 h-4" />
                  </div>
                  Motivo de Consulta
                  <Badge variant="outline" className="ml-2 text-purple-600 border-purple-300">Importante</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="motivoConsulta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600">¿Qué lo trae hoy a consulta?</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ej: Referido por médico por prediabetes, quiere bajar de peso para operación, mejorar rendimiento deportivo..."
                          className="min-h-[100px] bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-purple-500 focus:ring-purple-500/20 transition-all resize-none dark:text-white"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Este es el primer paso de una buena anamnesis. Describe el motivo principal de la visita.
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* 3. Patologías y Condiciones (RED THEME) */}
            <Card className="border-none shadow-md bg-white dark:bg-[#1e293b] dark:border dark:border-[#334155] overflow-hidden">
              <CardHeader className="bg-red-50/50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg text-slate-800 dark:text-white">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 shadow-sm">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  Patologías y Condiciones
                </CardTitle>
                <CardDescription>
                  Selecciona las condiciones que afectan la prescripción dietética.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="patologias"
                  render={({ field }) => {
                    const togglePathology = (patho: string) => {
                      const current = field.value || [];
                      if (current.includes(patho)) {
                        field.onChange(current.filter((p: string) => p !== patho));
                      } else {
                        field.onChange([...current, patho]);
                      }
                    };
                    return (
                      <FormItem>
                        <div className="flex flex-wrap gap-2">
                          {COMMON_PATHOLOGIES.map(patho => (
                            <Badge
                              key={patho}
                              variant={(field.value || []).includes(patho) ? "default" : "outline"}
                              className={`cursor-pointer transition-all ${(field.value || []).includes(patho)
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'hover:bg-red-50 text-slate-600 border-slate-300'}`}
                              onClick={() => togglePathology(patho)}
                            >
                              {(field.value || []).includes(patho) && <Check className="w-3 h-3 mr-1" />}
                              {patho}
                            </Badge>
                          ))}
                        </div>
                        <FormDescription className="mt-3 text-xs">
                          Haz clic en las condiciones que apliquen al paciente. Esto permite generar dietas seguras.
                        </FormDescription>
                      </FormItem>
                    );
                  }}
                />
              </CardContent>
            </Card>

            {/* 4. Alergias Alimentarias (ORANGE THEME - SAFETY CRITICAL) */}
            <Card className="border-none shadow-md bg-white dark:bg-[#1e293b] dark:border dark:border-[#334155] overflow-hidden border-l-4 border-l-orange-500">
              <CardHeader className="bg-orange-50/50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-900/30 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg text-slate-800 dark:text-white">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shadow-sm">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  Alergias Alimentarias
                  <Badge variant="destructive" className="ml-2">Seguridad</Badge>
                </CardTitle>
                <CardDescription>
                  Crítico para generar dietas seguras. Selecciona todas las alergias conocidas.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="alergias"
                  render={({ field }) => {
                    const toggle = (item: string) => {
                      const current = field.value || [];
                      if (current.includes(item)) {
                        field.onChange(current.filter((p: string) => p !== item));
                      } else {
                        field.onChange([...current, item]);
                      }
                    };
                    return (
                      <FormItem>
                        <div className="flex flex-wrap gap-2">
                          {COMMON_ALLERGIES.map(item => (
                            <Badge
                              key={item}
                              variant={(field.value || []).includes(item) ? "default" : "outline"}
                              className={`cursor-pointer transition-all ${(field.value || []).includes(item)
                                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                : 'hover:bg-orange-50 text-slate-600 border-slate-300'}`}
                              onClick={() => toggle(item)}
                            >
                              {(field.value || []).includes(item) && <Check className="w-3 h-3 mr-1" />}
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </FormItem>
                    );
                  }}
                />
              </CardContent>
            </Card>

            {/* 5. Medicamentos Actuales (CYAN THEME) */}
            <Card className="border-none shadow-md bg-white dark:bg-[#1e293b] dark:border dark:border-[#334155] overflow-hidden">
              <CardHeader className="bg-cyan-50/50 dark:bg-cyan-900/20 border-b border-cyan-100 dark:border-cyan-900/30 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg text-slate-800 dark:text-white">
                  <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 shadow-sm">
                    <Plus className="w-4 h-4" />
                  </div>
                  Medicamentos Actuales
                </CardTitle>
                <CardDescription>
                  Selecciona los medicamentos que el paciente está tomando actualmente.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="medicamentos"
                  render={({ field }) => {
                    const toggle = (item: string) => {
                      const current = field.value || [];
                      if (current.includes(item)) {
                        field.onChange(current.filter((p: string) => p !== item));
                      } else {
                        field.onChange([...current, item]);
                      }
                    };
                    return (
                      <FormItem>
                        <div className="flex flex-wrap gap-2">
                          {COMMON_MEDICATIONS.map(item => (
                            <Badge
                              key={item}
                              variant={(field.value || []).includes(item) ? "default" : "outline"}
                              className={`cursor-pointer transition-all ${(field.value || []).includes(item)
                                ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                                : 'hover:bg-cyan-50 text-slate-600 border-slate-300'}`}
                              onClick={() => toggle(item)}
                            >
                              {(field.value || []).includes(item) && <Check className="w-3 h-3 mr-1" />}
                              {item}
                            </Badge>
                          ))}
                        </div>
                        <FormDescription className="mt-3 text-xs">
                          Importante: Warfarina requiere control de Vitamina K. Metformina puede afectar B12.
                        </FormDescription>
                      </FormItem>
                    );
                  }}
                />
              </CardContent>
            </Card>

            {/* 6. Antecedentes Familiares (INDIGO THEME) */}
            <Card className="border-none shadow-md bg-white dark:bg-[#1e293b] dark:border dark:border-[#334155] overflow-hidden">
              <CardHeader className="bg-indigo-50/50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-900/30 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg text-slate-800 dark:text-white">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                    <User className="w-4 h-4" />
                  </div>
                  Antecedentes Familiares
                </CardTitle>
                <CardDescription>
                  Historia familiar de enfermedades metabólicas o crónicas.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="antecedentesFamiliares"
                  render={({ field }) => {
                    const toggle = (item: string) => {
                      const current = field.value || [];
                      if (current.includes(item)) {
                        field.onChange(current.filter((p: string) => p !== item));
                      } else {
                        field.onChange([...current, item]);
                      }
                    };
                    return (
                      <FormItem>
                        <div className="flex flex-wrap gap-2">
                          {FAMILY_HISTORY.map(item => (
                            <Badge
                              key={item}
                              variant={(field.value || []).includes(item) ? "default" : "outline"}
                              className={`cursor-pointer transition-all ${(field.value || []).includes(item)
                                ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                                : 'hover:bg-indigo-50 text-slate-600 border-slate-300'}`}
                              onClick={() => toggle(item)}
                            >
                              {(field.value || []).includes(item) && <Check className="w-3 h-3 mr-1" />}
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </FormItem>
                    );
                  }}
                />
              </CardContent>
            </Card>

            {/* 7. Exámenes de Laboratorio (BLUE THEME) */}
            <Card className="border-none shadow-md bg-white dark:bg-[#1e293b] dark:border dark:border-[#334155] overflow-hidden">
              <CardHeader className="bg-blue-50/50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/30 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg text-slate-800 dark:text-white">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                    <Activity className="w-4 h-4" />
                  </div>
                  Exámenes de Laboratorio
                </CardTitle>
                <CardDescription>
                  Valores bioquímicos recientes (opcional, para seguimiento metabólico).
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="glucosa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-600 text-xs">Glucosa (mg/dL)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="70-100" {...field} className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-blue-500 dark:text-white" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hemoglobina"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-600 text-xs">Hemoglobina (g/dL)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="12-17" {...field} className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-blue-500 dark:text-white" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="colesterolTotal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-600 text-xs">Colesterol Total (mg/dL)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="<200" {...field} className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-blue-500 dark:text-white" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="trigliceridos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-600 text-xs">Triglicéridos (mg/dL)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="<150" {...field} className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-blue-500 dark:text-white" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hdl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-600 text-xs">HDL (mg/dL)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder=">40" {...field} className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-blue-500 dark:text-white" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ldl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-600 text-xs">LDL (mg/dL)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="<100" {...field} className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-blue-500 dark:text-white" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="altitudResidencia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-600 text-xs">Altitud (m.s.n.m.)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type="number" placeholder="Ej: 2335" {...field} className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-blue-500 dark:text-white" />
                            <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-medium">m</span>
                          </div>
                        </FormControl>
                        <FormDescription className="text-[10px]">Para ajuste de Hb</FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Datos Pediátricos de Nacimiento (Conditional) */}
            {showBirthHistory && (
              <Card className="border-none shadow-md bg-white dark:bg-[#1e293b] dark:border dark:border-[#334155] overflow-hidden border-l-4 border-l-blue-400">
                <CardHeader className="bg-blue-50/30 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30 pb-4">
                  <CardTitle className="flex items-center gap-3 text-lg text-slate-800 dark:text-white">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                      <Activity className="w-4 h-4" />
                    </div>
                    Antecedentes de Nacimiento (Pediátrico)
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6 pt-6">
                  <FormField
                    control={form.control}
                    name="isPremature"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-semibold">¿Fue Prematuro?</FormLabel>
                          <FormDescription className="text-xs">Identifica inicio temprano de suplementación hierro</FormDescription>
                        </div>
                        <FormControl>
                          <Select onValueChange={(v) => field.onChange(v === "true")} value={field.value ? "true" : "false"}>
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Sí</SelectItem>
                              <SelectItem value="false">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="semanasGestacion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-600">Semanas de Gestación</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              placeholder="Ej: 36"
                              {...field}
                              onChange={(e) => {
                                const val = e.target.value === "" ? "" : Number(e.target.value);
                                field.onChange(val);
                                if (val !== "" && val < 37) {
                                  form.setValue("isPremature", true);
                                } else if (val !== "" && val >= 37) {
                                  form.setValue("isPremature", false);
                                }
                              }}
                              className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-blue-500 focus:ring-blue-500/20 transition-all pr-12 dark:text-white"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">sem</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isLowBirthWeight"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-semibold">¿Bajo Peso al Nacer?</FormLabel>
                          <FormDescription className="text-xs">Peso inferior a 2500g</FormDescription>
                        </div>
                        <FormControl>
                          <Select onValueChange={(v) => field.onChange(v === "true")} value={field.value ? "true" : "false"}>
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Sí</SelectItem>
                              <SelectItem value="false">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pesoNacer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-600">Peso al Nacer (g)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              placeholder="Ej: 2400"
                              {...field}
                              onChange={(e) => {
                                const val = e.target.value === "" ? "" : Number(e.target.value);
                                field.onChange(val);
                                if (val !== "" && val < 2500) {
                                  form.setValue("isLowBirthWeight", true);
                                } else if (val !== "" && val >= 2500) {
                                  form.setValue("isLowBirthWeight", false);
                                }
                              }}
                              className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-blue-500 focus:ring-blue-500/20 transition-all pr-12 dark:text-white"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">g</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}


            {/* 8. Estilo de Vida y Hábitos (EMERALD THEME) */}
            <Card className="border-none shadow-md bg-white dark:bg-[#1e293b] dark:border dark:border-[#334155] overflow-hidden">
              <CardHeader className="bg-emerald-50/50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-900/30 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg text-slate-800 dark:text-white">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                    <Activity className="w-4 h-4" />
                  </div>
                  Estilo de Vida y Hábitos
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6 pt-6">
                <FormField
                  control={form.control}
                  name="actividadFisica"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="text-slate-600 font-semibold">Nivel de Actividad Física</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:ring-emerald-500/20 dark:text-white">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sedentario">Sedentario (Poco o nada)</SelectItem>
                          <SelectItem value="ligera">Ligera (1-3 días/sem)</SelectItem>
                          <SelectItem value="moderada">Moderada (3-5 días/sem)</SelectItem>
                          <SelectItem value="intensa">Intensa (6-7 días/sem)</SelectItem>
                          <SelectItem value="muy_intensa">Muy Intensa (Doble sesión)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">Este factor es fundamental para el cálculo del gasto energético total (GET).</FormDescription>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="horasSueno"
                  render={({ field }) => (
                    <FormItem className={isChild ? "col-span-2" : ""}>
                      <FormLabel className="text-slate-600">Horas de Sueño</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="number" min="0" max="24" step="0.5" {...field} className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-emerald-500 focus:ring-emerald-500/20 transition-all pr-10 dark:text-white" />
                          <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">hrs</span>
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs">Promedio por noche</FormDescription>
                    </FormItem>
                  )}
                />
                {!isChild && (
                  <>
                    <FormField
                      control={form.control}
                      name="tabaquismo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-600">Tabaquismo</FormLabel>
                          <Select onValueChange={(v) => field.onChange(v === "true")} defaultValue={field.value ? "true" : "false"}>
                            <FormControl>
                              <SelectTrigger className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:ring-emerald-500/20 dark:text-white">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="false">No fuma</SelectItem>
                              <SelectItem value="true">Sí fuma</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="consumoAlcohol"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-600">Consumo de Alcohol</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:ring-emerald-500/20 dark:text-white">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="nunca">Nunca</SelectItem>
                              <SelectItem value="ocasional">Ocasional</SelectItem>
                              <SelectItem value="frecuente">Frecuente</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="consumoAgua"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-600">Consumo de Agua (L/día)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                placeholder="Ej: 2.0"
                                value={field.value ?? ""}
                                onChange={e => field.onChange(e.target.valueAsNumber || 0)}
                                className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-emerald-500 focus:ring-emerald-500/20 transition-all pr-10 dark:text-white"
                              />
                              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">L</span>
                            </div>
                          </FormControl>
                          <FormDescription className="text-xs">Consumo diario aproximado</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            {/* 9. Antropometría Base (GREEN THEME) */}
            <Card className="border-none shadow-md bg-white dark:bg-[#1e293b] dark:border dark:border-[#334155] overflow-hidden">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-[#334155] pb-4">
                <CardTitle className="flex items-center gap-3 text-lg text-slate-800 dark:text-white">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 shadow-sm">
                    <Scale className="w-4 h-4" />
                  </div>
                  Antropometría Base
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6 pt-6">
                <FormField
                  control={form.control}
                  name="peso"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600">Peso Actual (kg)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.1"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              setHasManuallyEditedAnthro(true);
                            }}
                            className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-green-500 focus:ring-green-500/20 transition-all pr-8 dark:text-white"
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">kg</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="talla"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600">Talla (cm)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.1"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              setHasManuallyEditedAnthro(true);
                            }}
                            className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-green-500 focus:ring-green-500/20 transition-all pr-8 dark:text-white"
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">cm</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="circunferenciaCintura"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600">Perímetro Cintura (cm)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="number" step="0.1" placeholder="Ej: 85" {...field} className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-green-500 focus:ring-green-500/20 transition-all pr-8 dark:text-white" />
                          <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">cm</span>
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs">Riesgo CV: H &gt;102cm, M &gt;88cm</FormDescription>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="circunferenciaCadera"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600">Perímetro Cadera (cm)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="number" step="0.1" placeholder="Ej: 95" {...field} className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-green-500 focus:ring-green-500/20 transition-all pr-8 dark:text-white" />
                          <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">cm</span>
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs">Para índice cintura/cadera</FormDescription>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* 10. Configuración Nutricional (ORANGE THEME) */}
            <Card className="border-none shadow-md bg-white dark:bg-[#1e293b] dark:border dark:border-[#334155] overflow-hidden border-l-4 border-l-orange-500">
              <CardHeader className="bg-orange-50/50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-900/30 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg text-slate-800 dark:text-white">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shadow-sm">
                    <Utensils className="w-4 h-4" />
                  </div>
                  Configuración Nutricional
                </CardTitle>
                <CardDescription>
                  Basado en la anamnesis y exploración previa, define la estrategia dietética.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6 pt-6">
                <FormField
                  control={form.control}
                  name="objetivoPeso"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600">Objetivo Principal</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:ring-orange-500/20 dark:text-white">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="perder">Perder Grasa</SelectItem>
                          <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                          <SelectItem value="ganar">Ganar Músculo</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="formulaGet"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600">Fórmula Predictiva (GET)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || (isPediatric ? "fao" : "mifflin")}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:ring-orange-500/20 dark:text-white">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="mifflin">Mifflin-St Jeor {isAdult && "(Recomendada)"}</SelectItem>
                          <SelectItem value="harris">Harris-Benedict</SelectItem>
                          <SelectItem value="fao">FAO/OMS {isPediatric && "(Recomendada)"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="proteinaRatio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600">Ratio Proteína (g/kg)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="number" step="0.1" {...field} className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-orange-500 focus:ring-orange-500/20 transition-all pr-12 dark:text-white" />
                          <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">g/kg</span>
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs">Recomendado: 1.6 - 2.2 g/kg</FormDescription>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="kcalAjuste"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600">Ajuste Calórico (kcal)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="number" step="50" {...field} className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-orange-500 focus:ring-orange-500/20 transition-all pr-12 dark:text-white" />
                          <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">kcal</span>
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs">Ej: -500 (Déficit) o +300 (Superávit)</FormDescription>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* 11. Notas Adicionales (SLATE THEME) */}
            <Card className="border-none shadow-md bg-white dark:bg-[#1e293b] dark:border dark:border-[#334155] overflow-hidden">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-[#334155] pb-4">
                <CardTitle className="flex items-center gap-3 text-lg text-slate-800 dark:text-white">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm">
                    <Activity className="w-4 h-4" />
                  </div>
                  Notas Adicionales
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="notas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-600">Observaciones del Nutricionista</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Cualquier otra información relevante: preferencias alimentarias, limitaciones físicas, objetivos específicos..."
                          className="min-h-[100px] bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-slate-500 focus:ring-slate-500/20 transition-all resize-none dark:text-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </CardContent>
            </Card>

          </div>

          {/* --- RIGHT COLUMN: SUMMARY (4 Cols) --- */}
          <div className="lg:col-span-4 space-y-6">
            <div className="sticky top-6 space-y-6">

              <Card className="bg-[#0f172a] text-white border-none shadow-2xl overflow-hidden rounded-[32px] p-6">
                <CardHeader className="p-0 mb-8 space-y-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#059669]/20 flex items-center justify-center text-[#10b981] shadow-sm">
                      <Calculator className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-xl font-bold tracking-tight">
                      Resumen Rápido
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0 space-y-8">
                  {/* IMC Preview */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-medium text-slate-400">IMC Estimado</span>
                      <span className="text-2xl font-bold text-white">{imc}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        ref={imcBarRef}
                        className="h-full rounded-full transition-all duration-700 bg-slate-700"
                      ></div>
                    </div>
                    <p className={`text-xs text-right font-bold tracking-tight uppercase ${bmiStatus.color}`}>
                      {bmiStatus.label}
                    </p>
                  </div>

                  <Separator className="bg-slate-800/50" />

                  {/* Proteína Preview */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-medium text-slate-400">Proteína Diaria</span>
                      <span className="text-2xl font-bold text-white">{totalProteina} g</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <div className="p-1 rounded bg-slate-800/50">
                        <Utensils className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium text-slate-400">Basado en <span className="text-white">{ratio} g/kg</span></span>
                    </div>
                  </div>

                  {/* Objetivo Badge */}
                  <div className="bg-[#1e293b]/50 border border-slate-800 rounded-2xl p-5 space-y-1.5 transition-all">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-blue-500">Objetivo</p>
                    <p className="text-2xl font-bold text-blue-400 capitalize">{objetivo}</p>
                  </div>

                  {/* Riesgo Cardiometabólico Preview */}
                  {cardiometabolicData && (
                    <div className="bg-[#1e293b]/50 border border-slate-800 rounded-2xl p-5 space-y-3 transition-all">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-red-500">Riesgo Salud</p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] border-none ${cardiometabolicData.overallRisk === 'muy_alto' || cardiometabolicData.overallRisk === 'alto'
                            ? 'bg-red-500/20 text-red-400'
                            : cardiometabolicData.overallRisk === 'moderado'
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-green-500/20 text-green-400'
                            }`}
                        >
                          {cardiometabolicData.overallRisk.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>

                      {isPediatric && (
                        <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                          <AlertTriangle className="w-3 h-3 text-blue-400" />
                          <span className="text-[10px] font-bold text-blue-400 uppercase">Referencia para Adultos</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-500 font-bold uppercase truncate">ICC (Cint/Cad)</p>
                          <p className="text-lg font-bold text-white">{cardiometabolicData.waistHipRatio.ratio.toFixed(2)}</p>
                        </div>
                        <div className="space-y-1 border-l border-slate-800">
                          <p className="text-[10px] text-slate-500 font-bold uppercase truncate">ICT (Cint/Tall)</p>
                          <p className="text-lg font-bold text-white">{cardiometabolicData.waistToHeight.ratio.toFixed(2)}</p>
                        </div>
                      </div>
                      {cardiometabolicData.abdominalObesity && (
                        <div className="flex items-center gap-2 px-2 py-1.5 bg-red-500/10 rounded-lg border border-red-500/20">
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                          <span className="text-[10px] font-bold text-red-400 uppercase">Obesidad Abdominal DETECTADA</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="bg-[#eff6ff] dark:bg-blue-900/10 border border-[#dbeafe] dark:border-blue-900/20 rounded-[24px] p-6 flex gap-4 items-start shadow-sm">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                  <Check className="w-4 h-4" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-base font-bold text-[#1e40af] dark:text-blue-400">Listo para empezar</h4>
                  <p className="text-sm text-[#3b82f6] dark:text-blue-500 leading-relaxed font-medium">
                    Al guardar, serás redirigido al perfil del paciente donde podrás realizar la primera evaluación antropométrica completa.
                  </p>
                </div>
              </div>

            </div>
          </div>

        </form>
      </Form>
    </div>
  );
}