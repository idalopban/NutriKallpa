"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  calcularIMC,
  calculateSomatotype,
  calcularEdad,
  calculateAnthropometry,
  calcularTodasLasFormulas,
  seleccionarMejorFormula,
  getRequisitosFormula,
  type TipoPaciente
} from "@/lib/calculos-nutricionales"
import { formatClinicalAge } from "@/lib/clinical-calculations"
import { saveEvaluation } from "@/actions/anthropometry-actions"
import { useToast } from "@/hooks/use-toast"
import type { MedidasAntropometricas, Somatotipo, Paciente, ResultadoFormula } from "@/types"
import { getAnthroNumber } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  Activity,
  SaveIcon,
  Ruler,
  Dumbbell,
  Scale,
  User,
  Target,
  Zap,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { calculateSiteTEM, needsThirdMeasurement, getFinalValue, TEM_COLORS, type MeasurementReplication } from "@/lib/tem-calculations"
import { NumericStepperCompact } from "@/components/ui/numeric-stepper"
import { LoadLastMeasurementButton } from "./LoadLastMeasurementButton"
import { FormProvider } from "react-hook-form"

// Skinfold sites for iteration
const SKINFOLD_SITES = [
  "triceps", "subscapular", "biceps", "iliac_crest",
  "supraspinale", "abdominal", "thigh", "calf"
] as const

// --- Zod Schema (ISAK Level 3 Strict with TEM support) ---
const skinfoldTakeSchema = z.object({
  val1: z.number().min(0),
  val2: z.number().min(0),
  val3: z.number().min(0).optional(),
}).optional()

const medidasSchema = z.object({
  peso: z.number().min(1, "El peso es requerido"),
  talla: z.number().min(1, "La talla es requerida"),
  headCircumference: z.number().min(0).optional(),
  pliegues: z.object({
    triceps: skinfoldTakeSchema,
    subscapular: skinfoldTakeSchema,
    biceps: skinfoldTakeSchema,
    iliac_crest: skinfoldTakeSchema,
    supraspinale: skinfoldTakeSchema,
    abdominal: skinfoldTakeSchema,
    thigh: skinfoldTakeSchema,
    calf: skinfoldTakeSchema,
  }),
  perimetros: z.object({
    brazoFlex: z.number().min(0).optional(),
    musloMedio: z.number().min(0).optional(),
    pantorrilla: z.number().min(0).optional(),
    cintura: z.number().min(0).optional(),
    cadera: z.number().min(0).optional(),
  }),
  diametros: z.object({
    humero: z.number().min(0).optional(),
    femur: z.number().min(0).optional(),
    biacromial: z.number().min(0).optional(),
    biiliocristal: z.number().min(0).optional(),
  }),
  observaciones: z.string().optional(),
})

type MedidasFormValues = z.infer<typeof medidasSchema>

interface FormularioMedidasProps {
  paciente: Paciente;
  onSuccess?: (data: MedidasAntropometricas) => void;
}

export function FormularioMedidas({ paciente, onSuccess }: FormularioMedidasProps) {
  const [resultados, setResultados] = useState<{
    imc?: { valor: number, diagnostico: string },
    somato?: Somatotipo,
    grasa?: number,
    densidad?: number,
    metodoGrasa?: string,
    todasLasFormulas?: ResultadoFormula[]
  }>({})

  const { toast } = useToast()
  const [tipoPaciente, setTipoPaciente] = useState<TipoPaciente>("general")
  const [isSaving, setIsSaving] = useState(false)

  // Sections state
  const [openSections, setOpenSections] = useState({
    pliegues: true,
    perimetros: true,
    diametros: true
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const {
    register,
    watch,
    handleSubmit,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<MedidasFormValues>({
    resolver: zodResolver(medidasSchema),
    defaultValues: {
      peso: paciente.datosPersonales.peso || 0,
      talla: paciente.datosPersonales.talla || 0,
      headCircumference: 0,
      pliegues: {
        triceps: undefined,
        subscapular: undefined,
        biceps: undefined,
        iliac_crest: undefined,
        supraspinale: undefined,
        abdominal: undefined,
        thigh: undefined,
        calf: undefined
      },
      perimetros: { brazoFlex: 0, musloMedio: 0, pantorrilla: 0, cintura: 0, cadera: 0 },
      diametros: { humero: 0, femur: 0, biacromial: 0, biiliocristal: 0 },
      observaciones: "",
    }
  })

  const valores = watch()

  // Helper: Extract final value from skinfold take object
  const getSkinfoldFinalValue = (take: { val1: number; val2: number; val3?: number } | undefined): number => {
    if (!take || !take.val1 || !take.val2) return 0;
    const values = take.val3 !== undefined && take.val3 > 0
      ? [take.val1, take.val2, take.val3]
      : [take.val1, take.val2];
    return getFinalValue(values);
  }

  // Efecto para cálculos en tiempo real
  useEffect(() => {
    const peso = valores.peso || 0;
    const talla = valores.talla || 0;

    console.log("Effect triggered. TipoPaciente:", tipoPaciente);

    if (!peso || !talla) {
      setResultados({})
      return
    }

    const imc = calcularIMC(peso, talla)
    const edadReal = calcularEdad(paciente.datosPersonales.fechaNacimiento)
    const sexoReal = paciente.datosPersonales.sexo || 'otro'

    const medidasParciales: MedidasAntropometricas = {
      id: "temp",
      pacienteId: paciente.id,
      fecha: new Date().toISOString(),
      imc: imc.valor,
      edad: edadReal,
      sexo: sexoReal,
      peso: peso,
      talla: talla,
      pliegues: {
        triceps: getSkinfoldFinalValue(valores.pliegues?.triceps),
        subscapular: getSkinfoldFinalValue(valores.pliegues?.subscapular),
        biceps: getSkinfoldFinalValue(valores.pliegues?.biceps),
        iliac_crest: getSkinfoldFinalValue(valores.pliegues?.iliac_crest),
        supraspinale: getSkinfoldFinalValue(valores.pliegues?.supraspinale),
        abdominal: getSkinfoldFinalValue(valores.pliegues?.abdominal),
        thigh: getSkinfoldFinalValue(valores.pliegues?.thigh),
        calf: getSkinfoldFinalValue(valores.pliegues?.calf),
      },
      perimetros: {
        brazoFlex: Number(valores.perimetros?.brazoFlex || 0),
        musloMedio: Number(valores.perimetros?.musloMedio || 0),
        pantorrilla: Number(valores.perimetros?.pantorrilla || 0),
        cintura: Number(valores.perimetros?.cintura || 0),
        cadera: Number(valores.perimetros?.cadera || 0),
      },
      diametros: {
        humero: Number(valores.diametros?.humero || 0),
        femur: Number(valores.diametros?.femur || 0),
        biacromial: Number(valores.diametros?.biacromial || 0),
        biiliocristal: Number(valores.diametros?.biiliocristal || 0)
      }
    }

    let somato: Somatotipo | null = null
    try {
      if (getAnthroNumber(medidasParciales.pliegues?.triceps) > 0 &&
        getAnthroNumber(medidasParciales.diametros?.humero) > 0 &&
        getAnthroNumber(medidasParciales.diametros?.femur) > 0) {
        somato = calculateSomatotype(medidasParciales)
      }
    } catch (e) {
      console.error("Error cálculo somatotipo:", e)
    }

    // Cálculo de Grasa Corporal (Automático basado en tipoPaciente)
    // La función calculateAnthropometry ahora maneja la lógica de selección de fórmula internamente
    const protocol = tipoPaciente;
    console.log("Selected Protocol:", protocol);

    const anthropometry = calculateAnthropometry(medidasParciales, protocol);
    console.log("Anthropometry Result Method:", anthropometry.metodo);

    const todas = calcularTodasLasFormulas(medidasParciales);

    setResultados({
      imc,
      somato: somato ?? undefined,
      grasa: anthropometry.porcentajeGrasa,
      densidad: anthropometry.densidadCorporal,
      metodoGrasa: anthropometry.metodo,
      todasLasFormulas: todas
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(valores), paciente, tipoPaciente])

  const onSubmit = async (data: MedidasFormValues) => {
    setIsSaving(true)
    try {
      const edadReal = calcularEdad(paciente.datosPersonales.fechaNacimiento)
      const sexoReal = paciente.datosPersonales.sexo || 'otro'

      const datosFinales: MedidasAntropometricas = {
        ...data,
        id: crypto.randomUUID(),
        pacienteId: paciente.id,
        fecha: new Date().toISOString(),
        imc: resultados?.imc?.valor || 0,
        edad: edadReal,
        sexo: sexoReal,
        tipoPaciente: tipoPaciente,
        peso: data.peso,
        talla: data.talla,
        porcentajeGrasa: resultados?.grasa,
        headCircumference: data.headCircumference,
        observaciones: data.observaciones,
        pliegues: {
          // Transform TEM objects to ISAKValue format
          triceps: data.pliegues?.triceps ? {
            val1: data.pliegues.triceps.val1,
            val2: data.pliegues.triceps.val2,
            val3: data.pliegues.triceps.val3,
            final: getSkinfoldFinalValue(data.pliegues.triceps)
          } : undefined,
          subscapular: data.pliegues?.subscapular ? {
            val1: data.pliegues.subscapular.val1,
            val2: data.pliegues.subscapular.val2,
            val3: data.pliegues.subscapular.val3,
            final: getSkinfoldFinalValue(data.pliegues.subscapular)
          } : undefined,
          biceps: data.pliegues?.biceps ? {
            val1: data.pliegues.biceps.val1,
            val2: data.pliegues.biceps.val2,
            val3: data.pliegues.biceps.val3,
            final: getSkinfoldFinalValue(data.pliegues.biceps)
          } : undefined,
          iliac_crest: data.pliegues?.iliac_crest ? {
            val1: data.pliegues.iliac_crest.val1,
            val2: data.pliegues.iliac_crest.val2,
            val3: data.pliegues.iliac_crest.val3,
            final: getSkinfoldFinalValue(data.pliegues.iliac_crest)
          } : undefined,
          supraspinale: data.pliegues?.supraspinale ? {
            val1: data.pliegues.supraspinale.val1,
            val2: data.pliegues.supraspinale.val2,
            val3: data.pliegues.supraspinale.val3,
            final: getSkinfoldFinalValue(data.pliegues.supraspinale)
          } : undefined,
          abdominal: data.pliegues?.abdominal ? {
            val1: data.pliegues.abdominal.val1,
            val2: data.pliegues.abdominal.val2,
            val3: data.pliegues.abdominal.val3,
            final: getSkinfoldFinalValue(data.pliegues.abdominal)
          } : undefined,
          thigh: data.pliegues?.thigh ? {
            val1: data.pliegues.thigh.val1,
            val2: data.pliegues.thigh.val2,
            val3: data.pliegues.thigh.val3,
            final: getSkinfoldFinalValue(data.pliegues.thigh)
          } : undefined,
          calf: data.pliegues?.calf ? {
            val1: data.pliegues.calf.val1,
            val2: data.pliegues.calf.val2,
            val3: data.pliegues.calf.val3,
            final: getSkinfoldFinalValue(data.pliegues.calf)
          } : undefined,
        },
        perimetros: {
          brazoFlex: Number(data.perimetros?.brazoFlex || 0),
          musloMedio: Number(data.perimetros?.musloMedio || 0),
          pantorrilla: Number(data.perimetros?.pantorrilla || 0),
          cintura: Number(data.perimetros?.cintura || 0),
          cadera: Number(data.perimetros?.cadera || 0),
        },
        diametros: {
          humero: Number(data.diametros?.humero || 0),
          femur: Number(data.diametros?.femur || 0),
          biacromial: Number(data.diametros?.biacromial || 0),
          biiliocristal: Number(data.diametros?.biiliocristal || 0)
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Use Server Action for secure saving
      const result = await saveEvaluation(datosFinales, {
        bodyFatPercent: resultados?.grasa,
        somatotypeEndo: resultados?.somato?.endo,
        somatotypeMeso: resultados?.somato?.meso,
        somatotypeEcto: resultados?.somato?.ecto,
      })

      if (result.success) {
        toast({
          title: "✅ Evaluación guardada",
          description: result.message || "Las medidas se guardaron correctamente",
        })
        if (onSuccess) {
          onSuccess(datosFinales)
        }
      } else {
        toast({
          title: "❌ Error al guardar",
          description: result.error || "Ocurrió un error inesperado",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al guardar medidas:", error)
      toast({
        title: "❌ Error del servidor",
        description: "No se pudo conectar con el servidor",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Helper para verificar si un pliegue es requerido y si tiene valor
  const checkRequisito = (pliegue: string) => {
    // Determinar requisitos basados en el perfil seleccionado
    const requisitos = getRequisitosFormula(tipoPaciente, paciente.datosPersonales.sexo || "otro");

    const esRequerido = requisitos.includes(pliegue);
    // @ts-ignore - Check if TEM object has val1 and val2
    const take = valores.pliegues?.[pliegue];
    const tieneValor = take && take.val1 > 0 && take.val2 > 0;
    return { esRequerido, tieneValor };
  }

  // Helper para obtener etiqueta legible
  const getLabelPliegue = (key: string) => {
    const labels: Record<string, string> = {
      triceps: "Tríceps", subscapular: "Subescapular", biceps: "Bíceps",
      iliac_crest: "Cresta Ilíaca", supraspinale: "Supraespinal", abdominal: "Abdominal",
      thigh: "Muslo Frontal", calf: "Pantorrilla Medial"
    };
    return labels[key] || key;
  }

  return (
    <FormProvider {...({ register, watch, handleSubmit, setValue, formState: { isSubmitting, errors }, control: {} } as any)}>
      <form onSubmit={handleSubmit(onSubmit)} className="animate-in fade-in duration-500 pb-10">

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          {/* --- LEFT COLUMN: INPUTS (span-9) --- */}
          <div className="xl:col-span-9 space-y-6">

            {/* 1. Profile Selector & Basic Data Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profile Selector */}
              <section className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    Perfil de Evaluación
                  </h3>
                  <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200 text-[10px]">
                    {tipoPaciente === 'general' ? 'Estándar' : tipoPaciente.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {[
                    { id: 'general', label: 'General', icon: User },
                    { id: 'control', label: 'Control', icon: Scale },
                    { id: 'fitness', label: 'Fitness', icon: Dumbbell },
                    { id: 'atleta', label: 'Atleta', icon: Zap },
                    { id: 'rapida', label: 'Rápida', icon: Activity },
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setTipoPaciente(type.id as TipoPaciente)}
                      className={cn(
                        "flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-200 hover:shadow-sm",
                        tipoPaciente === type.id
                          ? "bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-blue-300"
                      )}
                    >
                      <type.icon className={cn("w-4 h-4 mb-1", tipoPaciente === type.id ? "text-blue-600" : "text-slate-400")} />
                      <span className="text-[10px] font-medium truncate w-full text-center">{type.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Basic Data */}
              <section className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-green-600" />
                    Datos Básicos
                  </h3>
                  <LoadLastMeasurementButton patientId={paciente.id} variant="ghost" className="h-7 text-[10px] px-2" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Peso</Label>
                    <div className="relative">
                      <Input
                        {...register("peso", { valueAsNumber: true })}
                        type="number" step="0.1" placeholder="0.0"
                        className="pl-3 h-10 text-base font-medium border-slate-200 focus:border-green-500 focus:ring-green-500/20"
                      />
                      <span className="absolute right-2 top-2.5 text-xs text-slate-400">kg</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Talla</Label>
                    <div className="relative">
                      <Input
                        {...register("talla", { valueAsNumber: true })}
                        type="number" step="0.1" placeholder="0"
                        className="pl-3 h-10 text-base font-medium border-slate-200 focus:border-green-500 focus:ring-green-500/20"
                      />
                      <span className="absolute right-2 top-2.5 text-xs text-slate-400">cm</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Edad</Label>
                    <div className="relative">
                      <Input
                        value={formatClinicalAge(paciente.datosPersonales.fechaNacimiento)}
                        disabled
                        className="pl-3 h-10 text-base font-medium bg-slate-50 text-slate-500 border-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* 2. Skinfolds (Collapsible) - TEM-Enabled */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div
                className="p-4 flex items-center justify-between bg-slate-50/50 border-b border-slate-100 cursor-pointer hover:bg-slate-100/50 transition-colors"
                onClick={() => toggleSection('pliegues')}
              >
                <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Pliegues Cutáneos (mm) - Protocolo ISAK
                </h3>
                <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                  {openSections.pliegues ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
              {openSections.pliegues && (
                <div className="p-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  {SKINFOLD_SITES.map((name) => {
                    const { esRequerido, tieneValor } = checkRequisito(name);

                    // Get current values from form
                    const val1 = watch(`pliegues.${name}.val1`) || 0;
                    const val2 = watch(`pliegues.${name}.val2`) || 0;
                    const val3 = watch(`pliegues.${name}.val3`);

                    // Calculate TEM if we have at least 2 measurements
                    const hasMeasurements = val1 > 0 && val2 > 0;
                    const needsThird = hasMeasurements && needsThirdMeasurement(val1, val2, name);

                    let temResult = null;
                    if (hasMeasurements) {
                      const values = val3 !== undefined && val3 > 0
                        ? [val1, val2, val3]
                        : [val1, val2];

                      const replication: MeasurementReplication = {
                        values,
                        site: name,
                        unit: 'mm'
                      };
                      temResult = calculateSiteTEM(replication);
                    }

                    const finalValue = hasMeasurements ? getFinalValue(val3 !== undefined && val3 > 0 ? [val1, val2, val3] : [val1, val2]) : 0;

                    return (
                      <div
                        key={name}
                        className={cn(
                          "border rounded-lg overflow-hidden transition-all duration-200",
                          esRequerido && !finalValue
                            ? "border-blue-300 bg-blue-50/30"
                            : "border-slate-200 bg-white"
                        )}
                      >
                        {/* Header */}
                        <div className={cn(
                          "px-4 py-2 flex items-center justify-between",
                          esRequerido ? "bg-blue-100/50" : "bg-slate-50"
                        )}>
                          <Label className={cn(
                            "text-sm font-semibold flex items-center gap-2",
                            esRequerido ? "text-blue-700" : "text-slate-700"
                          )}>
                            {getLabelPliegue(name)}
                            {esRequerido && <span className="text-blue-500 text-xs">* Requerido</span>}
                          </Label>

                          {/* TEM Badge */}
                          {temResult && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs font-semibold",
                                temResult.reliability === 'excellent' && "bg-green-100 text-green-700 border-green-300",
                                temResult.reliability === 'acceptable' && "bg-yellow-100 text-yellow-700 border-yellow-300",
                                temResult.reliability === 'poor' && "bg-red-100 text-red-700 border-red-300"
                              )}
                            >
                              TEM: {temResult.temPercent.toFixed(1)}% {temResult.isReliable ? '✅' : '⚠️'}
                            </Badge>
                          )}
                        </div>

                        {/* Measurement Inputs */}
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            {/* Take 1 - Tablet Friendly */}
                            <div>
                              <label className="text-xs text-slate-500 font-medium mb-1 block">Toma 1 *</label>
                              <NumericStepperCompact
                                value={val1}
                                onChange={(v) => setValue(`pliegues.${name}.val1`, v)}
                                step={0.5}
                                min={0}
                                max={80}
                                unit="mm"
                              />
                            </div>

                            {/* Take 2 - Tablet Friendly */}
                            <div>
                              <label className="text-xs text-slate-500 font-medium mb-1 block">Toma 2 *</label>
                              <NumericStepperCompact
                                value={val2}
                                onChange={(v) => setValue(`pliegues.${name}.val2`, v)}
                                step={0.5}
                                min={0}
                                max={80}
                                unit="mm"
                              />
                            </div>
                          </div>

                          {/* Take 3 (Conditional) - Tablet Friendly */}
                          {(needsThird || (val3 !== undefined && val3 > 0)) && (
                            <div className="border-t pt-3">
                              <label className="text-xs text-amber-600 font-semibold mb-1 block flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Toma 3 (Desempate - Diferencia &gt;5%)
                              </label>
                              <NumericStepperCompact
                                value={val3 || 0}
                                onChange={(v) => setValue(`pliegues.${name}.val3`, v)}
                                step={0.5}
                                min={0}
                                max={80}
                                unit="mm"
                              />
                            </div>
                          )}

                          {/* TEM Results Panel */}
                          {temResult && (
                            <div className={cn(
                              "rounded-md p-3 text-xs space-y-2",
                              temResult.reliability === 'excellent' && "bg-green-50 border border-green-200",
                              temResult.reliability === 'acceptable' && "bg-yellow-50 border border-yellow-200",
                              temResult.reliability === 'poor' && "bg-red-50 border border-red-200"
                            )}>
                              <div className="flex items-center justify-between font-semibold">
                                <span>Valor Final (Mediana):</span>
                                <span className="text-base">{finalValue.toFixed(1)} mm</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Error Abs (TEM):</span>
                                <span className="font-medium">{temResult.tem.toFixed(2)} mm</span>
                              </div>
                              <div className="text-[10px] pt-1 border-t border-current/20">
                                {temResult.message}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Girths & Breadths Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Perimeters */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden h-fit">
                <div
                  className="p-4 flex items-center justify-between bg-slate-50/50 border-b border-slate-100 cursor-pointer hover:bg-slate-100/50 transition-colors"
                  onClick={() => toggleSection('perimetros')}
                >
                  <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-orange-500" />
                    Perímetros (cm)
                  </h3>
                  <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                    {openSections.perimetros ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
                {openSections.perimetros && (
                  <div className="p-5 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                    {[
                      { name: "brazoFlex", label: "Brazo Flex." },
                      { name: "brazoRelajado", label: "Brazo Relax." },
                      { name: "musloMedio", label: "Muslo Med." },
                      { name: "pantorrilla", label: "Pantorrilla" },
                      { name: "cintura", label: "Cintura" },
                      { name: "cadera", label: "Cadera" },
                    ].map((field) => (
                      <div key={field.name} className="space-y-1 group">
                        <Label className="text-[10px] text-slate-500 group-hover:text-slate-900 transition-colors uppercase tracking-wider">{field.label}</Label>
                        <Input
                          type="number" step="0.1"
                          className="w-full h-9 text-center font-medium border-slate-200 focus:border-orange-500 focus:ring-orange-500/20"
                          {...register(`perimetros.${field.name}` as any, { valueAsNumber: true })}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Diameters */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden h-fit">
                <div
                  className="p-4 flex items-center justify-between bg-slate-50/50 border-b border-slate-100 cursor-pointer hover:bg-slate-100/50 transition-colors"
                  onClick={() => toggleSection('diametros')}
                >
                  <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-purple-500" />
                    Diámetros (cm)
                  </h3>
                  <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                    {openSections.diametros ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
                {openSections.diametros && (
                  <div className="p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { name: "humero", label: "Húmero" },
                        { name: "femur", label: "Fémur" },
                        { name: "biacromial", label: "Biacromial" },
                        { name: "biiliocristal", label: "Bi-iliocristal" },
                        { name: "biestiloideo", label: "Biestiloideo" },
                      ].map((field) => (
                        <div key={field.name} className="space-y-1 group">
                          <Label className="text-[10px] text-slate-500 group-hover:text-slate-900 transition-colors uppercase tracking-wider truncate" title={field.label}>{field.label}</Label>
                          <Input
                            type="number" step="0.1"
                            className="w-full h-9 text-center font-medium border-slate-200 focus:border-purple-500 focus:ring-purple-500/20"
                            {...register(`diametros.${field.name}` as any, { valueAsNumber: true })}
                          />
                        </div>
                      ))}
                    </div>
                    {/* Head Circumference - Kerr 5C Enhancement */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="space-y-1 group">
                        <Label className="text-[10px] text-purple-600 group-hover:text-purple-800 transition-colors uppercase tracking-wider flex items-center gap-1">
                          Perímetro Cefálico
                          <span className="text-[9px] text-purple-400 font-normal">(Kerr 5C)</span>
                        </Label>
                        <Input
                          type="number" step="0.1" placeholder="Opcional"
                          className="w-full h-9 text-center font-medium border-purple-200 bg-purple-50/30 focus:border-purple-500 focus:ring-purple-500/20"
                          {...register("headCircumference", { valueAsNumber: true })}
                        />
                        <p className="text-[9px] text-slate-400 mt-0.5">Mejora precisión masa residual</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* --- RIGHT COLUMN: STICKY SUMMARY (span-3) --- */}
          <div className="xl:col-span-3 space-y-6">
            <div className="sticky top-6 space-y-4">

              {/* Real-time Summary Card */}
              <Card className="border-none shadow-lg bg-slate-900 text-white overflow-hidden relative">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl -ml-12 -mb-12"></div>

                <CardHeader className="pb-2 relative z-10 px-4 pt-4">
                  <CardTitle className="text-base font-medium text-slate-200 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-400" />
                    Resumen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 relative z-10 px-4 pb-4">

                  {/* Sum of Skinfolds */}
                  <div className="text-center p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Sumatoria Pliegues</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold text-white tracking-tight">
                        {Object.values(valores.pliegues || {}).reduce((a, b) => Number(a || 0) + Number(b || 0), 0).toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">mm</span>
                    </div>
                  </div>

                  {/* Active Formula */}
                  <div className="text-center p-2 bg-slate-800/30 rounded-lg border border-slate-700/30">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 block">Fórmula Activa</span>
                    <span className="text-xs font-medium text-blue-300">
                      {seleccionarMejorFormula(tipoPaciente)}
                    </span>
                  </div>

                  {/* Estimated Fat % */}
                  {resultados.grasa !== undefined && resultados.grasa > 0 && (
                    <div className="flex items-center justify-between p-2 bg-slate-800/30 rounded-lg border border-slate-700/30">
                      <span className="text-xs text-slate-300">Grasa Estimada</span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-green-400">{resultados.grasa.toFixed(1)}%</span>
                      </div>
                    </div>
                  )}

                  {/* IMC */}
                  {resultados.imc && (
                    <div className="flex items-center justify-between p-2 bg-slate-800/30 rounded-lg border border-slate-700/30">
                      <span className="text-xs text-slate-300">IMC</span>
                      <div className="text-right">
                        <span className="block text-base font-bold text-blue-400">{resultados.imc.valor.toFixed(1)}</span>
                        <span className="text-[9px] text-slate-400 uppercase">{resultados.imc.diagnostico}</span>
                      </div>
                    </div>
                  )}

                </CardContent>
              </Card>

              {/* Clinical Observations */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <Label className="text-xs font-medium text-slate-700 mb-2 block">
                  Observaciones Clínicas (Opcional)
                </Label>
                <textarea
                  {...register("observaciones")}
                  placeholder="Ej: Marca de nacimiento en tríceps izquierdo, medido en derecho..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Anota cualquier detalle relevante sobre las mediciones
                </p>
              </div>

              {/* Save Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 h-12 text-base font-semibold transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || isSaving}
              >
                {(isSubmitting || isSaving) ? (
                  <>
                    <Activity className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <SaveIcon className="mr-2 h-4 w-4" /> Guardar Evaluación
                  </>
                )}
              </Button>

              {/* Helper Info */}
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-xs text-blue-800">
                <h4 className="font-semibold flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Calidad del Dato
                </h4>
                <p className="text-blue-700/80 text-[10px] leading-relaxed">
                  Campos con <span className="text-blue-600 font-bold">*</span> son requeridos para la fórmula seleccionada.
                </p>
              </div>

            </div>
          </div>

        </div>
      </form>
    </FormProvider>
  )
}
