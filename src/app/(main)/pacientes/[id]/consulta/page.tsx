"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Save, Scale, Ruler, Calendar,
  Activity, User, Clock, Heart, Sparkles,
  ChevronRight
} from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Logic - Use centralized store
import { usePatientStore } from "@/store/usePatientStore";
import type { MedidasAntropometricas, Paciente } from "@/types";
import { calcularEdad } from "@/lib/calculos-nutricionales";

export default function NuevaConsultaPage() {
  const router = useRouter();
  const params = useParams();
  const fechaHoy = new Date().toLocaleDateString("es-PE", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const horaActual = new Date().toLocaleTimeString("es-PE", { hour: '2-digit', minute: '2-digit' });

  // Use centralized patient store
  const { patient: paciente, loadPatient, addMedidas, medidas } = usePatientStore();

  // Estados locales para el formulario
  const [peso, setPeso] = useState("");
  const [talla, setTalla] = useState("");
  const [cintura, setCintura] = useState("");
  const [cadera, setCadera] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadPatient(params.id as string);
    }
  }, [params.id, loadPatient]);

  // Pre-fill talla from last measurement if exists
  useEffect(() => {
    if (medidas.length > 0 && !talla) {
      const ultimaMedida = medidas[medidas.length - 1];
      if (ultimaMedida.talla) {
        setTalla(ultimaMedida.talla.toString());
      }
    }
  }, [medidas, talla]);

  // Calculate IMC in real-time
  const pesoNum = parseFloat(peso) || 0;
  const tallaNum = parseFloat(talla) || 0;
  const imcCalculado = tallaNum > 0 ? pesoNum / Math.pow(tallaNum / 100, 2) : 0;

  const getImcCategory = (imc: number) => {
    if (imc === 0) return { label: "---", color: "text-slate-400", bg: "bg-slate-100 dark:bg-slate-800" };
    if (imc < 18.5) return { label: "Bajo peso", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" };
    if (imc < 25) return { label: "Normal", color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" };
    if (imc < 30) return { label: "Sobrepeso", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20" };
    return { label: "Obesidad", color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" };
  };

  const imcCategory = getImcCategory(imcCalculado);

  const handleGuardar = async () => {
    // Validación básica
    if (!peso || !talla) {
      toast.error("Por favor ingresa al menos Peso y Talla");
      return;
    }

    if (!paciente) {
      toast.error("Error: No se ha cargado la información del paciente");
      return;
    }

    setIsSaving(true);

    try {
      const edad = calcularEdad(paciente.datosPersonales.fechaNacimiento);
      const sexo = paciente.datosPersonales.sexo || 'otro';

      // Construimos el objeto de medidas
      const nuevaMedida: MedidasAntropometricas = {
        id: crypto.randomUUID(),
        pacienteId: params.id as string,
        fecha: new Date().toISOString(),
        peso: pesoNum,
        talla: tallaNum,
        imc: imcCalculado,
        edad,
        sexo,
        perimetros: {
          cintura: cintura ? parseFloat(cintura) : undefined,
          cadera: cadera ? parseFloat(cadera) : undefined,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save using centralized store (syncs to storage + Supabase)
      addMedidas(nuevaMedida);

      toast.success("Consulta registrada exitosamente");

      // Redirigimos al perfil - datos ya están sincronizados
      setTimeout(() => {
        router.push(`/pacientes/${params.id}`);
      }, 500);
    } catch (error) {
      console.error("Error al guardar:", error);
      toast.error("Error al guardar la consulta");
    } finally {
      setIsSaving(false);
    }
  };

  const edad = paciente ? calcularEdad(paciente.datosPersonales.fechaNacimiento) : 0;
  const initials = paciente
    ? `${paciente.datosPersonales.nombre?.[0] || ""}${paciente.datosPersonales.apellido?.[0] || ""}`.toUpperCase()
    : "??";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a]">
      <div className="container max-w-3xl mx-auto p-6 md:p-8 space-y-8 animate-in fade-in duration-500">

        {/* Header con navegación */}
        <div className="flex flex-col gap-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="hover:text-slate-900 dark:hover:text-slate-300 cursor-pointer transition-colors" onClick={() => router.push('/dashboard')}>Dashboard</span>
            <ChevronRight className="w-4 h-4" />
            <span className="hover:text-slate-900 dark:hover:text-slate-300 cursor-pointer transition-colors" onClick={() => router.push('/pacientes')}>Pacientes</span>
            <ChevronRight className="w-4 h-4" />
            <span className="hover:text-slate-900 dark:hover:text-slate-300 cursor-pointer transition-colors" onClick={() => router.push(`/pacientes/${params.id}`)}>Expediente</span>
            <ChevronRight className="w-4 h-4" />
            <span className="font-semibold text-slate-900 dark:text-white">Nueva Consulta</span>
          </div>

          {/* Header principal */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Nueva <span className="text-[#6cba00]">Consulta</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2 text-sm mt-1">
                  <Calendar className="w-4 h-4" />
                  <span className="capitalize">{fechaHoy}</span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <Clock className="w-4 h-4" />
                  <span>{horaActual}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info del paciente */}
        {paciente && (
          <Card className="bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-[#daeaac] dark:border-[#6cba00]/30">
                  <AvatarFallback className="bg-[#f0f9e8] dark:bg-[#6cba00]/10 text-[#6cba00] font-bold text-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="font-semibold text-lg text-slate-900 dark:text-white">
                    {paciente.datosPersonales.nombre} {paciente.datosPersonales.apellido}
                  </h2>
                  <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> {edad} años
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="capitalize">{paciente.datosPersonales.sexo}</span>
                    {medidas.length > 0 && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span className="flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5" /> {medidas.length} consulta{medidas.length !== 1 ? 's' : ''} previas
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <Badge variant="secondary" className="bg-[#f0f9e8] dark:bg-[#6cba00]/10 text-[#6cba00] border-0 px-3 py-1">
                  Consulta #{medidas.length + 1}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formulario de Medidas */}
        <Card className="bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#6cba00]/10 flex items-center justify-center">
                <Scale className="w-5 h-5 text-[#6cba00]" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-800 dark:text-white">Medidas Antropométricas</CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">
                  Registra los datos del paciente
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-8">

            {/* Peso y Talla - Campos principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Peso */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#6cba00]" />
                  Peso Actual
                </Label>
                <div className="relative group">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={peso}
                    onChange={(e) => setPeso(e.target.value)}
                    className="h-16 pl-4 pr-14 text-3xl font-bold text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#6cba00]/30 focus:border-[#6cba00] transition-all"
                    autoFocus
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-medium text-slate-400">
                    kg
                  </span>
                </div>
              </div>

              {/* Talla */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-[#ff8508]" />
                  Talla
                </Label>
                <div className="relative group">
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="170"
                    value={talla}
                    onChange={(e) => setTalla(e.target.value)}
                    className="h-16 pl-4 pr-14 text-3xl font-bold text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#ff8508]/30 focus:border-[#ff8508] transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-medium text-slate-400">
                    cm
                  </span>
                </div>
              </div>
            </div>

            {/* Preview del IMC en tiempo real */}
            <div className={`p-5 rounded-xl border-2 border-dashed transition-all ${imcCategory.bg} ${pesoNum > 0 && tallaNum > 0 ? 'border-slate-200 dark:border-slate-700' : 'border-slate-100 dark:border-slate-800'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center">
                    <Heart className={`w-5 h-5 ${imcCategory.color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      IMC Calculado
                    </p>
                    <p className={`text-2xl font-bold ${imcCategory.color}`}>
                      {imcCalculado > 0 ? imcCalculado.toFixed(1) : "---"}
                      <span className="text-sm font-normal text-slate-400 ml-1">kg/m²</span>
                    </p>
                  </div>
                </div>
                {imcCalculado > 0 && (
                  <Badge className={`${imcCategory.bg} ${imcCategory.color} border-0 px-3 py-1 text-sm font-medium`}>
                    {imcCategory.label}
                  </Badge>
                )}
              </div>
            </div>

            {/* Campos secundarios */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                <Sparkles className="w-4 h-4" />
                Medidas adicionales (opcional)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cintura */}
                <div className="space-y-2">
                  <Label className="text-sm text-slate-600 dark:text-slate-400">
                    Perímetro de Cintura
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="Opcional"
                      value={cintura}
                      onChange={(e) => setCintura(e.target.value)}
                      className="h-12 pl-4 pr-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#6cba00]/20 focus:border-[#6cba00]"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      cm
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Útil para evaluar riesgo cardiovascular
                  </p>
                </div>

                {/* Cadera */}
                <div className="space-y-2">
                  <Label className="text-sm text-slate-600 dark:text-slate-400">
                    Perímetro de Cadera
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="Opcional"
                      value={cadera}
                      onChange={(e) => setCadera(e.target.value)}
                      className="h-12 pl-4 pr-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#6cba00]/20 focus:border-[#6cba00]"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      cm
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Para calcular índice cintura-cadera
                  </p>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="h-12 px-6 rounded-xl border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleGuardar}
                disabled={!peso || !talla || isSaving}
                className="flex-1 h-12 text-base font-semibold rounded-xl bg-[#6cba00] hover:bg-[#5aa300] text-white shadow-lg shadow-green-500/20 transition-all hover:shadow-xl hover:shadow-green-500/30 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Registrar Consulta
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Indicador de campos requeridos */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          Los campos de Peso y Talla son obligatorios para registrar la consulta
        </p>
      </div>
    </div>
  );
}