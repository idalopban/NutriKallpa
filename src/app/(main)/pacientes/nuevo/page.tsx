"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
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
  Plus
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

// --- VALIDATION SCHEMA ---
const formSchema = z.object({
  nombreCompleto: z.string().min(2, "Nombre requerido"),
  fechaNacimiento: z.string().min(1, "Fecha de nacimiento requerida"),
  sexo: z.enum(["masculino", "femenino"]),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().optional(),

  // Motivo de Consulta (Prioridad Clínica)
  motivoConsulta: z.string().optional(),

  // Antropometría
  peso: z.coerce.number().min(1, "Peso requerido"),
  talla: z.coerce.number().min(1, "Talla requerida"),
  circunferenciaCintura: z.coerce.number().optional(),
  circunferenciaCadera: z.coerce.number().optional(),
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

  // Bioquímica (Opcional)
  glucosa: z.coerce.number().optional(),
  hemoglobina: z.coerce.number().optional(),
  colesterolTotal: z.coerce.number().optional(),
  trigliceridos: z.coerce.number().optional(),
  hdl: z.coerce.number().optional(),
  ldl: z.coerce.number().optional(),
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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombreCompleto: "",
      fechaNacimiento: "",
      sexo: "masculino",
      email: "",
      telefono: "",
      motivoConsulta: "",
      peso: 70.0,
      talla: 170.0,
      circunferenciaCintura: undefined,
      circunferenciaCadera: undefined,
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
    },
  });

  // --- Real-time Calculations ---
  const peso = form.watch("peso");
  const talla = form.watch("talla");
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

  // Cálculos derivados visuales
  const imc = (peso && talla) ? (peso / Math.pow(talla / 100, 2)).toFixed(1) : "0.0";
  const totalProteina = (peso && ratio) ? (peso * ratio).toFixed(0) : "0";

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
      const pacienteId = crypto.randomUUID();
      const now = new Date().toISOString();

      // 1. Preparar Datos Personales
      const names = data.nombreCompleto.trim().split(" ");
      const nombre = names[0];
      const apellido = names.slice(1).join(" ") || "";
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
          },
          bioquimicaReciente: {
            glucosa: data.glucosa,
            hemoglobina: data.hemoglobina,
            colesterolTotal: data.colesterolTotal,
            trigliceridos: data.trigliceridos,
            hdl: data.hdl,
            ldl: data.ldl
          }
        },
        createdAt: now,
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

      // Siempre guardar en Storage Local
      console.log("💾 Guardando en Storage Local...", nuevoPaciente);
      savePaciente(nuevoPaciente);
      saveMedidas(nuevasMedidas);

      // Redirigir al expediente del paciente recién creado
      const redirectUrl = `/pacientes/${pacienteId}`;
      console.log("🚀 Redirigiendo a:", redirectUrl);
      window.location.href = redirectUrl;

    } catch (e) {
      console.error("🔴 ERROR CRÍTICO AL GUARDAR:", e);
      alert("Hubo un error técnico. Revisa la consola (F12).");
    }
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-500 pb-20">

      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-[#334155] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1 font-medium">
            <span onClick={() => router.back()} className="cursor-pointer hover:text-green-600 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Pacientes
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 dark:text-white">Nuevo Registro</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Crear Expediente</h1>
          <p className="text-slate-500 dark:text-slate-400">Ingresa los datos iniciales para comenzar el seguimiento clínico.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="outline" onClick={() => router.back()} className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900">
            Cancelar
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit, (errors) => {
              console.log("Errores de validación:", errors);
              alert("⚠️ No se puede guardar. Revisa los campos en rojo.");
            })}
            className="min-w-[160px] gap-2 shadow-lg shadow-slate-900/20 bg-slate-900 hover:bg-slate-800 text-white transition-all hover:scale-[1.02]"
          >
            <Save className="w-4 h-4" /> Guardar Ficha
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
                <FormField
                  control={form.control}
                  name="nombreCompleto"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="text-slate-600">Nombre y Apellido</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej. Daniel Lopez" className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-blue-500 focus:ring-blue-500/20 transition-all dark:text-white" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                        <p className="text-xs text-slate-500 mt-1">Edad: <span className="font-semibold text-blue-600">{edadCalculada} años</span></p>
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
                      <FormLabel className="text-slate-600">Sexo Biológico</FormLabel>
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

            {/* 3. Antropometría Base (GREEN THEME) */}
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
                          <Input type="number" step="0.1" {...field} className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-green-500 focus:ring-green-500/20 transition-all pr-8 dark:text-white" />
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
                          <Input type="number" step="0.1" {...field} className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:border-green-500 focus:ring-green-500/20 transition-all pr-8 dark:text-white" />
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
                <FormField
                  control={form.control}
                  name="actividadFisica"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="text-slate-600">Nivel de Actividad Física</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:ring-green-500/20 dark:text-white">
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
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* 3. Plan Nutricional (ORANGE THEME) */}
            <Card className="border-none shadow-md bg-white dark:bg-[#1e293b] dark:border dark:border-[#334155] overflow-hidden">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-[#334155] pb-4">
                <CardTitle className="flex items-center gap-3 text-lg text-slate-800 dark:text-white">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shadow-sm">
                    <Utensils className="w-4 h-4" />
                  </div>
                  Configuración Nutricional
                </CardTitle>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white dark:bg-[#0f172a] border-slate-200 dark:border-[#334155] focus:ring-orange-500/20 dark:text-white">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="mifflin">Mifflin-St Jeor (Recomendada)</SelectItem>
                          <SelectItem value="harris">Harris-Benedict</SelectItem>
                          <SelectItem value="fao">FAO/OMS</SelectItem>
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

            {/* 4. Exámenes de Laboratorio (BLUE THEME) */}
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
                </div>
              </CardContent>
            </Card>

            {/* 5. Patologías y Condiciones (RED THEME) */}
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

            {/* 7. Alergias Alimentarias (ORANGE THEME - SAFETY CRITICAL) */}
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

            {/* 8. Medicamentos (CYAN THEME) */}
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

            {/* 9. Antecedentes Familiares (INDIGO THEME) */}
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

            {/* 10. Estilo de Vida (EMERALD THEME) */}
            <Card className="border-none shadow-md bg-white dark:bg-[#1e293b] dark:border dark:border-[#334155] overflow-hidden">
              <CardHeader className="bg-emerald-50/50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-900/30 pb-4">
                <CardTitle className="flex items-center gap-3 text-lg text-slate-800 dark:text-white">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
                    <Activity className="w-4 h-4" />
                  </div>
                  Estilo de Vida
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-6 pt-6">
                <FormField
                  control={form.control}
                  name="horasSueno"
                  render={({ field }) => (
                    <FormItem>
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

              <Card className="bg-slate-900 text-white border-none shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <CardHeader className="pb-2 relative z-10">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-green-400" />
                    Resumen Rápido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 relative z-10">

                  {/* IMC Preview */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm text-slate-400">
                      <span>IMC Estimado</span>
                      <span className="text-white font-medium">{imc}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${Number(imc) > 25 ? 'bg-orange-500' : Number(imc) < 18.5 ? 'bg-blue-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(Number(imc) * 2, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-right text-slate-500">
                      {Number(imc) >= 25 ? 'Sobrepeso' : Number(imc) < 18.5 ? 'Bajo Peso' : 'Peso Normal'}
                    </p>
                  </div>

                  <Separator className="bg-slate-800" />

                  {/* Proteína Preview */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm text-slate-400">
                      <span>Proteína Diaria</span>
                      <span className="text-white font-medium">{totalProteina} g</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Utensils className="w-3 h-3" />
                      <span>Basado en {ratio} g/kg</span>
                    </div>
                  </div>

                  <Separator className="bg-slate-800" />

                  {/* Objetivo Preview */}
                  <div className={`p-3 rounded-lg border border-white/10 ${getObjectiveColor()} bg-opacity-10`}>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-70">Objetivo</p>
                    <p className="font-semibold capitalize">{objetivo}</p>
                  </div>

                </CardContent>
              </Card>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 flex gap-3 items-start">
                <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">Listo para empezar</h4>
                  <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
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