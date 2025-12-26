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

// --- Zod Schema (ISAK Level 3 Strict) ---
const medidasSchema = z.object({
  peso: z.number().min(1, "El peso es requerido"),
  talla: z.number().min(1, "La talla es requerida"),
  pliegues: z.object({
    triceps: z.number().min(0).optional(),
    subscapular: z.number().min(0).optional(),
    biceps: z.number().min(0).optional(),
    iliac_crest: z.number().min(0).optional(),
    supraspinale: z.number().min(0).optional(),
    abdominal: z.number().min(0).optional(),
    thigh: z.number().min(0).optional(),
    calf: z.number().min(0).optional(),
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
    formState: { isSubmitting, errors },
  } = useForm<MedidasFormValues>({
    resolver: zodResolver(medidasSchema),
    defaultValues: {
      peso: paciente.datosPersonales.peso || 0,
      talla: paciente.datosPersonales.talla || 0,
      pliegues: { triceps: 0, subscapular: 0, biceps: 0, iliac_crest: 0, supraspinale: 0, abdominal: 0, thigh: 0, calf: 0 },
      perimetros: { brazoFlex: 0, musloMedio: 0, pantorrilla: 0, cintura: 0, cadera: 0 },
      diametros: { humero: 0, femur: 0, biacromial: 0, biiliocristal: 0 },
    }
  })

  const valores = watch()

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
        triceps: Number(valores.pliegues?.triceps || 0),
        subscapular: Number(valores.pliegues?.subscapular || 0),
        biceps: Number(valores.pliegues?.biceps || 0),
        iliac_crest: Number(valores.pliegues?.iliac_crest || 0),
        supraspinale: Number(valores.pliegues?.supraspinale || 0),
        abdominal: Number(valores.pliegues?.abdominal || 0),
        thigh: Number(valores.pliegues?.thigh || 0),
        calf: Number(valores.pliegues?.calf || 0),
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
        pliegues: {
          triceps: Number(data.pliegues?.triceps || 0),
          subscapular: Number(data.pliegues?.subscapular || 0),
          biceps: Number(data.pliegues?.biceps || 0),
          iliac_crest: Number(data.pliegues?.iliac_crest || 0),
          supraspinale: Number(data.pliegues?.supraspinale || 0),
          abdominal: Number(data.pliegues?.abdominal || 0),
          thigh: Number(data.pliegues?.thigh || 0),
          calf: Number(data.pliegues?.calf || 0),
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
    // @ts-ignore
    const tieneValor = (valores.pliegues?.[pliegue] || 0) > 0;
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
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2 mb-4">
                <Scale className="w-4 h-4 text-green-600" />
                Datos Básicos
              </h3>
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

          {/* 2. Skinfolds (Collapsible) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div
              className="p-4 flex items-center justify-between bg-slate-50/50 border-b border-slate-100 cursor-pointer hover:bg-slate-100/50 transition-colors"
              onClick={() => toggleSection('pliegues')}
            >
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Pliegues Cutáneos (mm)
              </h3>
              <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                {openSections.pliegues ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
            {openSections.pliegues && (
              <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-300">
                {[
                  "triceps", "subscapular", "biceps", "iliac_crest", "supraspinale",
                  "abdominal", "thigh", "calf"
                ].map((name) => {
                  const { esRequerido, tieneValor } = checkRequisito(name);
                  return (
                    <div key={name} className="space-y-2 group">
                      <Label htmlFor={`pliegues.${name}`} className={cn(
                        "text-xs font-medium flex items-center gap-1 transition-colors truncate",
                        esRequerido ? "text-blue-700" : "text-slate-500 group-hover:text-slate-700"
                      )}>
                        {getLabelPliegue(name)}
                        {esRequerido && <span className="text-blue-500 text-[10px]">*</span>}
                      </Label>
                      <div className="relative">
                        <Input
                          id={`pliegues.${name}`}
                          type="number"
                          step="0.5"
                          placeholder="0"
                          className={cn(
                            "h-10 text-center font-medium transition-all duration-200",
                            esRequerido && !tieneValor
                              ? "border-blue-200 bg-blue-50/50 focus:border-blue-500 focus:ring-blue-500/20"
                              : "border-slate-200 focus:border-slate-400 focus:ring-slate-200",
                            tieneValor && "bg-white border-slate-300 shadow-sm"
                          )}
                          {...register(`pliegues.${name}` as any, { valueAsNumber: true })}
                        />
                        {esRequerido && tieneValor && (
                          <div className="absolute -right-1 -top-1 bg-white rounded-full p-0.5 shadow-sm">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                          </div>
                        )}
                        {esRequerido && !tieneValor && (
                          <div className="absolute -right-1 -top-1 bg-white rounded-full p-0.5 shadow-sm animate-pulse">
                            <AlertCircle className="w-3 h-3 text-blue-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  )
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
                <div className="p-5 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                  {[
                    { name: "humero", label: "Húmero" },
                    { name: "femur", label: "Fémur" },
                    { name: "biacromial", label: "Biacromial" },
                    { name: "biiliocristal", label: "Bi-iliocristal" },
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
  )
}
