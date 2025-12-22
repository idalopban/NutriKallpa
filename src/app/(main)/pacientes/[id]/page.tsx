"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
    ArrowLeft, Calendar, Mail, Phone, MapPin,
    Activity, Scale, Utensils, TrendingUp, Edit3,
    MoreVertical, FileText, Ruler, User as UserIcon,
    TrendingDown, Minus, History, Clock, ChevronRight, Trash2
} from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EvolutionSummary } from "@/components/patients/EvolutionSummary";
import { ClinicalHistoryTab } from "@/components/patients/ClinicalHistoryTab";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PediatricGrowthChart } from "@/components/pediatrics/PediatricGrowthChart";
import { NewPediatricMeasurementForm, type PediatricMeasurementData } from "@/components/pediatrics/NewPediatricMeasurementForm";
import { useToast } from "@/hooks/use-toast";

// Logic
import { usePatientStore } from "@/store/usePatientStore";
import { getPatientDietHistory, deleteSavedPlan, type SavedPlan } from "@/lib/diet-service";
import type { Paciente, MedidasAntropometricas } from "@/types";
import { getAnthroNumber } from "@/types";
import {
    calculateMifflinStJeor,
    ACTIVITY_FACTORS,
    ACTIVITY_LABELS,
    type ActivityLevel
} from "@/lib/calculos-nutricionales";
import { calculateChronologicalAge, calculateExactAgeInDays, calculateDetailedAge } from "@/lib/clinical-calculations";
import { calculateZScore } from "@/lib/growth-standards";
import { type PatientDataPoint } from "@/components/pediatrics/PediatricGrowthChart";

export default function DetallePacientePage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeTab = searchParams.get('tab') || 'clinica';

    // Use centralized patient store
    const {
        patient: paciente,
        medidas,
        isLoading: loading,
        loadPatient,
        refreshMedidas
    } = usePatientStore();

    const { toast } = useToast();

    const [activityLevel, setActivityLevel] = useState<ActivityLevel>('sedentary');
    const [nutritionalGoal, setNutritionalGoal] = useState<'maintain' | 'cut' | 'bulk'>('maintain');
    const [proteinRatio, setProteinRatio] = useState<number>(1.6); // g/kg
    const [dietHistory, setDietHistory] = useState<SavedPlan[]>([]);
    const [selectedEvaluationIndex, setSelectedEvaluationIndex] = useState<number>(0); // 0 = última evaluación

    // Load patient diet history
    const loadDietHistory = (patientId: string) => {
        try {
            const history = getPatientDietHistory(patientId);
            setDietHistory(history);
        } catch (error) {
            console.error("Error loading diet history:", error);
        }
    };

    // Handle diet deletion
    const handleDeleteDiet = (planId: string) => {
        if (!confirm('¿Estás seguro de eliminar esta dieta?')) return;
        try {
            deleteSavedPlan(planId);
            if (params.id) {
                loadDietHistory(params.id as string);
            }
        } catch (error) {
            console.error("Error deleting diet:", error);
        }
    };

    // Load patient on mount
    useEffect(() => {
        if (params.id) {
            loadPatient(params.id as string);
            loadDietHistory(params.id as string);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id]);

    // Refresh medidas when navigating to this page (e.g., after saving anthropometry)
    // This runs on every mount and when tab changes
    useEffect(() => {
        if (params.id) {
            // Force refresh from localStorage to pick up new saves
            refreshMedidas();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id, activeTab]);

    // Auto-detect nutritional goal when patient loads
    useEffect(() => {
        if (paciente?.historiaClinica?.objetivos) {
            const obj = paciente.historiaClinica.objetivos.toLowerCase();
            if (obj.includes('bajar') || obj.includes('perder') || obj.includes('disminuir') || obj.includes('definición')) {
                setNutritionalGoal('cut');
            } else if (obj.includes('subir') || obj.includes('ganar') || obj.includes('aumentar') || obj.includes('volumen')) {
                setNutritionalGoal('bulk');
            }
        }
    }, [paciente]);

    if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando expediente...</div>;
    if (!paciente) return <div className="p-8 text-center text-red-500">Paciente no encontrado</div>;

    // --- CÁLCULOS ---
    // Las medidas están ordenadas de más reciente a más antigua, así que [0] es la última
    const ultimaMedida = medidas[0] || {};
    // Medida seleccionada para la pestaña Antropometría (por defecto la última)
    const selectedMedida = medidas[selectedEvaluationIndex] || ultimaMedida;

    const pesoActual = ultimaMedida.peso || 0;
    const tallaActual = ultimaMedida.talla || 0;
    const imc = ultimaMedida.imc || 0;

    const birthDate = new Date(paciente.datosPersonales.fechaNacimiento);
    const ageDetailed = calculateDetailedAge(paciente.datosPersonales.fechaNacimiento);
    const age = ageDetailed.years;

    const getImcColor = (valor: number) => {
        if (valor < 18.5) return "text-blue-500";
        if (valor < 25) return "text-green-500";
        if (valor < 30) return "text-orange-500";
        return "text-red-500";
    };

    // Calculate body composition values for metric cards
    const sumPliegues = ultimaMedida.pliegues
        ? Object.values(ultimaMedida.pliegues).reduce((a, b) => Number(a || 0) + Number(b || 0), 0)
        : 0;
    const sex = ultimaMedida.sexo || paciente.datosPersonales.sexo || 'masculino';
    let bodyFatPercent = 0;
    if (sumPliegues > 0) {
        if (sex === 'masculino') {
            bodyFatPercent = (sumPliegues * 0.097) + 3.64;
        } else {
            bodyFatPercent = (sumPliegues * 0.1429) + 4.56;
        }
        bodyFatPercent = Math.max(3, Math.min(bodyFatPercent, 50));
    }
    const masaGrasa = (bodyFatPercent / 100) * pesoActual;
    const masaMuscular = pesoActual - masaGrasa;

    // Get last visit date
    const lastVisit = medidas[0]?.fecha
        ? new Date(medidas[0].fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Sin visitas';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a]">
            <div className="flex h-full">

                {/* SIDEBAR IZQUIERDO - Información del Paciente */}
                <aside className="hidden lg:flex flex-col w-[380px] min-h-screen bg-white dark:bg-slate-900 p-5 shrink-0 ml-8">
                    {/* Back Button */}
                    <button
                        onClick={() => router.push('/pacientes')}
                        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors mb-6"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver a pacientes
                    </button>

                    {/* Patient Avatar & Name */}
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#6cba00] to-[#4a8c00] flex items-center justify-center text-4xl font-bold text-white shadow-lg shadow-green-500/30 mb-4 overflow-hidden">
                            {paciente.datosPersonales.avatarUrl ? (
                                paciente.datosPersonales.avatarUrl.startsWith('avatar-') ? (
                                    <span className="text-4xl">
                                        {paciente.datosPersonales.avatarUrl === 'avatar-1' && '👤'}
                                        {paciente.datosPersonales.avatarUrl === 'avatar-2' && '👨'}
                                        {paciente.datosPersonales.avatarUrl === 'avatar-3' && '👩'}
                                        {paciente.datosPersonales.avatarUrl === 'avatar-4' && '👴'}
                                        {paciente.datosPersonales.avatarUrl === 'avatar-5' && '👵'}
                                        {paciente.datosPersonales.avatarUrl === 'avatar-6' && '🧑‍⚕️'}
                                        {paciente.datosPersonales.avatarUrl === 'avatar-7' && '🏃'}
                                        {paciente.datosPersonales.avatarUrl === 'avatar-8' && '🏋️'}
                                        {paciente.datosPersonales.avatarUrl === 'avatar-9' && '🧘'}
                                        {paciente.datosPersonales.avatarUrl === 'avatar-10' && '🚴'}
                                    </span>
                                ) : (
                                    <img
                                        src={paciente.datosPersonales.avatarUrl}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                )
                            ) : (
                                <>{paciente.datosPersonales.nombre[0]}{paciente.datosPersonales.apellido[0]}</>
                            )}
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            {paciente.datosPersonales.nombre} {paciente.datosPersonales.apellido}
                        </h2>
                        <p className="text-sm text-slate-500">Edad: {ageDetailed.formatted}</p>
                        <Button
                            size="sm"
                            className="mt-4 bg-[#0d9488] hover:bg-[#0f766e] text-white rounded-full px-6"
                            onClick={() => router.push(`/pacientes/${paciente.id}/editar`)}
                        >
                            Actualizar
                        </Button>
                    </div>

                    <Separator className="my-4" />

                    {/* Information Section - Improved Design */}
                    <div className="flex-1 overflow-y-auto space-y-4">

                        {/* Métricas Principales - Cards */}
                        <div className="grid grid-cols-2 gap-2">
                            {/* IMC */}
                            <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-900/10 border border-yellow-200/50 dark:border-yellow-800/30">
                                <p className="text-[10px] uppercase tracking-wider text-yellow-600 dark:text-yellow-400 font-medium">IMC</p>
                                <p className={`text-xl font-bold ${getImcColor(imc)}`}>{imc.toFixed(1)}</p>
                                <p className="text-[10px] text-slate-400">kg/m²</p>
                            </div>
                            {/* % Grasa */}
                            <div className="p-3 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-900/10 border border-orange-200/50 dark:border-orange-800/30">
                                <p className="text-[10px] uppercase tracking-wider text-orange-600 dark:text-orange-400 font-medium">% Grasa</p>
                                <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{bodyFatPercent > 0 ? bodyFatPercent.toFixed(1) : '--'}</p>
                                <p className="text-[10px] text-slate-400">corporal</p>
                            </div>
                            {/* Peso */}
                            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 border border-blue-200/50 dark:border-blue-800/30">
                                <p className="text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 font-medium">Peso</p>
                                <p className="text-xl font-bold text-slate-800 dark:text-white">{pesoActual}</p>
                                <p className="text-[10px] text-slate-400">kg</p>
                            </div>
                            {/* Talla */}
                            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-900/10 border border-purple-200/50 dark:border-purple-800/30">
                                <p className="text-[10px] uppercase tracking-wider text-purple-600 dark:text-purple-400 font-medium">Talla</p>
                                <p className="text-xl font-bold text-slate-800 dark:text-white">{tallaActual}</p>
                                <p className="text-[10px] text-slate-400">cm</p>
                            </div>
                        </div>

                        {/* Somatotipo */}
                        {masaMuscular > 0 && (
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2">Somatotipo</p>
                                <div className="flex items-center gap-1">
                                    <span className="px-2 py-1 rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium">
                                        Endo {bodyFatPercent > 20 ? (bodyFatPercent > 30 ? '↑↑' : '↑') : '○'}
                                    </span>
                                    <span className="px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
                                        Meso {masaMuscular > 50 ? (masaMuscular > 60 ? '↑↑' : '↑') : '○'}
                                    </span>
                                    <span className="px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium">
                                        Ecto {pesoActual < 60 ? '↑' : '○'}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Patologías */}
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2">Patologías</p>
                            {paciente.historiaClinica?.patologias && paciente.historiaClinica.patologias.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                    {paciente.historiaClinica.patologias.map((patologia, index) => (
                                        <span key={index} className="px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] font-medium">
                                            {patologia}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                    ✓ Sin patologías registradas
                                </span>
                            )}
                        </div>

                        <Separator className="my-2" />

                        {/* Datos de Contacto */}
                        <div className="space-y-3">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Contacto</p>

                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">Sexo</span>
                                <span className="font-medium text-slate-700 dark:text-slate-200 capitalize">{paciente.datosPersonales.sexo}</span>
                            </div>

                            {paciente.datosPersonales.email && (
                                <div className="flex justify-between items-start gap-2 text-sm">
                                    <span className="text-slate-400 shrink-0">Email</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-200 text-right text-xs break-all">{paciente.datosPersonales.email}</span>
                                </div>
                            )}

                            {paciente.datosPersonales.telefono && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">Teléfono</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-200">{paciente.datosPersonales.telefono}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-start gap-2 text-sm">
                                <span className="text-slate-400 shrink-0">Objetivo</span>
                                <span className="font-medium text-slate-700 dark:text-slate-200 text-right text-xs">{paciente.historiaClinica?.objetivos || "Sin definir"}</span>
                            </div>

                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">ID</span>
                                <span className="font-mono text-xs text-slate-500">{paciente.id.slice(0, 8).toUpperCase()}</span>
                            </div>

                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">Última visita</span>
                                <span className="font-medium text-slate-700 dark:text-slate-200 text-xs">{lastVisit}</span>
                            </div>
                        </div>
                    </div>

                </aside>

                {/* CONTENIDO PRINCIPAL */}
                <main className="flex-1 overflow-y-auto">
                    <div className="p-4 md:p-6 lg:pr-8 space-y-6 w-full">

                        {/* Mobile Header - Only visible on small screens */}
                        <div className="lg:hidden flex flex-col gap-4">
                            <button
                                onClick={() => router.push('/pacientes')}
                                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Volver
                            </button>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6cba00] to-[#4a8c00] flex items-center justify-center text-2xl font-bold text-white">
                                    {paciente.datosPersonales.nombre[0]}{paciente.datosPersonales.apellido[0]}
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                                        {paciente.datosPersonales.nombre} {paciente.datosPersonales.apellido}
                                    </h1>
                                    <p className="text-sm text-slate-500">{age} años • {paciente.datosPersonales.sexo}</p>
                                </div>
                            </div>
                        </div>

                        {/* Page Title - Desktop */}
                        <div className="hidden lg:flex lg:items-center lg:justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                    Expediente <span className="text-[#ff8508]">del Paciente</span>
                                </h1>
                                <p className="text-sm text-slate-500">Resumen clínico y seguimiento nutricional</p>
                            </div>
                            <Button
                                className="gap-2 bg-[#ff8508] hover:bg-[#e67600] text-white rounded-full px-6 shadow-lg shadow-orange-500/20"
                                onClick={() => router.push(`/pacientes/nuevo?patientId=${paciente.id}`)}
                            >
                                <FileText className="w-4 h-4" />
                                Nueva Consulta
                            </Button>
                        </div>


                        {/* --- TABS --- */}
                        <Tabs defaultValue={activeTab} className="w-full space-y-6">
                            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit gap-1">
                                {['Clínica', 'Antropometria', 'Cálculos', 'Dietas', 'Avance'].map(tab => (
                                    <TabsTrigger
                                        key={tab}
                                        value={tab.toLowerCase().replace('é', 'e').replace('á', 'a').replace('í', 'i')}
                                        className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 dark:text-slate-400 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-[#ff8508] dark:data-[state=active]:text-[#6cba00] data-[state=active]:shadow-sm hover:text-slate-900 dark:hover:text-slate-200"
                                    >
                                        {tab}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {/* Clínica */}
                            <TabsContent value="clinica" className="space-y-6 focus-visible:outline-none">
                                <ClinicalHistoryTab patient={paciente} />
                            </TabsContent>

                            {/* Antropometría - Resumen Completo */}
                            <TabsContent value="antropometria" className="space-y-6 focus-visible:outline-none">
                                {(() => {
                                    // Calcular edad del paciente para determinar el tipo de formulario
                                    const birthDate = typeof paciente.datosPersonales.fechaNacimiento === 'string'
                                        ? new Date(paciente.datosPersonales.fechaNacimiento)
                                        : paciente.datosPersonales.fechaNacimiento;
                                    const patientAge = birthDate ? calculateChronologicalAge(birthDate) : age;

                                    // PEDIÁTRICO (0-5 años): Resumen visual OMS
                                    if (patientAge < 6) {
                                        const lastWeight = ultimaMedida?.peso || 0;
                                        const lastHeight = ultimaMedida?.talla || 0;
                                        const ageInMonths = Math.floor(patientAge * 12);
                                        const patientSex = paciente.datosPersonales.sexo === 'femenino' ? 'female' as const : 'male' as const;

                                        // Calcular Z-Scores reales
                                        const wfaResult = lastWeight > 0 ? calculateZScore(lastWeight, ageInMonths, patientSex, 'wfa') : null;
                                        const lhfaResult = lastHeight > 0 ? calculateZScore(lastHeight, ageInMonths, patientSex, 'lhfa') : null;
                                        const imc = lastWeight > 0 && lastHeight > 0 ? lastWeight / Math.pow(lastHeight / 100, 2) : 0;
                                        const bfaResult = imc > 0 ? calculateZScore(imc, ageInMonths, patientSex, 'bfa') : null;

                                        // Preparar datos para gráficas desde historial de medidas
                                        // Preparar datos para gráficas desde historial de medidas
                                        const weightChartData: PatientDataPoint[] = medidas.map(m => {
                                            const measureDate = new Date(m.fecha);
                                            const birthDateStr = paciente?.datosPersonales?.fechaNacimiento;
                                            const birthDateObj = birthDateStr ? new Date(birthDateStr) : new Date();

                                            // Calcular días exactos usando la función centralizada
                                            let exactDays = 0;
                                            if (birthDateStr) {
                                                exactDays = calculateExactAgeInDays(birthDateStr, m.fecha);
                                            }

                                            const ageMs = measureDate.getTime() - birthDateObj.getTime();
                                            const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30.4375);
                                            const zRes = calculateZScore(m.peso, ageMonths, patientSex, 'wfa');

                                            return {
                                                ageInMonths: Math.round(ageMonths * 100) / 100,
                                                value: m.peso,
                                                date: typeof m.fecha === 'string' ? m.fecha : new Date(m.fecha).toISOString(),
                                                zScore: zRes?.zScore,
                                                diagnosis: zRes?.diagnosis,
                                                ageInDays: exactDays
                                            };
                                        }).filter(p => p.ageInMonths >= 0 && p.ageInMonths <= 60);

                                        // Calcular edad en años, meses y días
                                        const today = new Date();
                                        const birth = paciente?.datosPersonales?.fechaNacimiento ? new Date(paciente.datosPersonales.fechaNacimiento) : new Date();
                                        let years = today.getFullYear() - birth.getFullYear();
                                        let months = today.getMonth() - birth.getMonth();
                                        let days = today.getDate() - birth.getDate();

                                        if (days < 0) {
                                            months--;
                                            const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                                            days += prevMonth.getDate();
                                        }
                                        if (months < 0) {
                                            years--;
                                            months += 12;
                                        }

                                        const ageDisplay = years > 0
                                            ? `${years}a ${months}m ${days}d`
                                            : months > 0
                                                ? `${months}m ${days}d`
                                                : `${days}d`;

                                        // Helper para color de Z-Score
                                        const getZColor = (z: number | undefined) => {
                                            if (z === undefined) return 'bg-slate-50 border-slate-200 text-slate-600';
                                            if (z < -3 || z > 3) return 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-400';
                                            if (z < -2 || z > 2) return 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800/30 dark:text-amber-400';
                                            return 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800/30 dark:text-green-400';
                                        };

                                        return (
                                            <div className="space-y-6">
                                                {/* Header Pediátrico */}
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                            <span className="text-2xl">👶</span>
                                                            Evaluación Pediátrica OMS
                                                        </h3>
                                                        <p className="text-sm text-slate-500">
                                                            Patrones de crecimiento infantil (0-5 años)
                                                        </p>
                                                    </div>
                                                    <Badge className="bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 px-3 py-1">
                                                        {patientAge < 2 ? '🍼 Lactante' : '👶 Pediátrico'} • {ageDisplay}
                                                    </Badge>
                                                </div>

                                                {/* Métricas Básicas Pediátricas */}
                                                <Card className="border-pink-200 dark:border-pink-800/30 bg-gradient-to-br from-pink-50/50 to-blue-50/50 dark:from-pink-900/10 dark:to-blue-900/10">
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                                            <Scale className="w-4 h-4 text-pink-500" />
                                                            Datos de Crecimiento
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl text-center border border-pink-100 dark:border-pink-900/20 shadow-sm">
                                                                <p className="text-xs text-pink-600 font-medium mb-1">Peso</p>
                                                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                                                    {lastWeight > 0 ? lastWeight.toFixed(1) : '--'}
                                                                    <span className="text-sm font-normal text-slate-400 ml-1">kg</span>
                                                                </p>
                                                            </div>
                                                            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl text-center border border-blue-100 dark:border-blue-900/20 shadow-sm">
                                                                <p className="text-xs text-blue-600 font-medium mb-1">
                                                                    {ageInMonths < 24 ? 'Longitud' : 'Talla'}
                                                                </p>
                                                                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                                                    {lastHeight > 0 ? lastHeight.toFixed(1) : '--'}
                                                                    <span className="text-sm font-normal text-slate-400 ml-1">cm</span>
                                                                </p>
                                                            </div>
                                                            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl text-center border border-purple-100 dark:border-purple-900/20 shadow-sm">
                                                                <p className="text-xs text-purple-600 font-medium mb-1">Edad</p>
                                                                <p className="text-lg font-bold text-slate-900 dark:text-white">
                                                                    {years > 0 && <>{years}<span className="text-xs font-normal text-slate-400 ml-0.5">a</span> </>}
                                                                    {months}<span className="text-xs font-normal text-slate-400 ml-0.5">m</span> {days}<span className="text-xs font-normal text-slate-400 ml-0.5">d</span>
                                                                </p>
                                                            </div>
                                                            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl text-center border border-green-100 dark:border-green-900/20 shadow-sm">
                                                                <p className="text-xs text-green-600 font-medium mb-1">Estado</p>
                                                                <p className="text-lg font-bold text-green-600">
                                                                    {lastWeight > 0 ? '✓ Normal' : 'Sin datos'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                {/* Indicadores Z-Score Reales */}
                                                {lastWeight > 0 && (
                                                    <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
                                                        <CardHeader className="pb-2">
                                                            <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                                                <TrendingUp className="w-4 h-4 text-blue-500" />
                                                                Indicadores de Crecimiento (Z-Score OMS)
                                                            </CardTitle>
                                                        </CardHeader>
                                                        <CardContent>
                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                                <div className={`p-3 rounded-xl border ${getZColor(wfaResult?.zScore)}`}>
                                                                    <p className="text-xs font-medium">Peso/Edad</p>
                                                                    <p className="text-xl font-bold">
                                                                        Z: {wfaResult?.zScore?.toFixed(2) || '--'}
                                                                    </p>
                                                                    <p className="text-[10px]">{wfaResult?.diagnosis || 'Sin datos'}</p>
                                                                </div>
                                                                <div className={`p-3 rounded-xl border ${getZColor(lhfaResult?.zScore)}`}>
                                                                    <p className="text-xs font-medium">{ageInMonths < 24 ? 'Long' : 'Talla'}/Edad</p>
                                                                    <p className="text-xl font-bold">
                                                                        Z: {lhfaResult?.zScore?.toFixed(2) || '--'}
                                                                    </p>
                                                                    <p className="text-[10px]">{lhfaResult?.diagnosis || 'Sin datos'}</p>
                                                                </div>
                                                                <div className={`p-3 rounded-xl border ${getZColor(bfaResult?.zScore)}`}>
                                                                    <p className="text-xs font-medium">IMC/Edad</p>
                                                                    <p className="text-xl font-bold">
                                                                        Z: {bfaResult?.zScore?.toFixed(2) || '--'}
                                                                    </p>
                                                                    <p className="text-[10px]">{bfaResult?.diagnosis || 'Sin datos'}</p>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                )}

                                                {/* Gráfica de Crecimiento con datos reales */}
                                                <PediatricGrowthChart
                                                    indicator="wfa"
                                                    sex={patientSex}
                                                    patientData={weightChartData}
                                                    patientName={`${paciente.datosPersonales.nombre} ${paciente.datosPersonales.apellido}`}
                                                    startMonth={0}
                                                    endMonth={Math.min(ageInMonths + 12, 60)}
                                                />

                                                {/* Botón Nueva Evaluación */}
                                                <div className="flex justify-center py-4">
                                                    <Button
                                                        size="lg"
                                                        className="gap-2 bg-pink-600 hover:bg-pink-700 text-white px-8 rounded-full shadow-lg shadow-pink-500/20"
                                                        onClick={() => router.push(`/antropometria?id=${paciente.id}`)}
                                                    >
                                                        <Activity className="w-5 h-5" />
                                                        Nueva Evaluación Pediátrica
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    }

                                    // ADULTO (6+ años): Formulario estándar de composición corporal
                                    return medidas.length > 0 ? (() => {
                                        // Calculate body composition from skinfolds usando la medida seleccionada
                                        const sumPliegues = selectedMedida.pliegues
                                            ? Object.values(selectedMedida.pliegues).reduce((a, b) => Number(a || 0) + Number(b || 0), 0)
                                            : 0;

                                        // Estimate body fat % using Yuhasz modified formula
                                        const sex = selectedMedida.sexo || paciente.datosPersonales.sexo || 'masculino';
                                        let bodyFatPercent = 0;
                                        if (sex === 'masculino') {
                                            bodyFatPercent = (sumPliegues * 0.097) + 3.64;
                                        } else {
                                            bodyFatPercent = (sumPliegues * 0.1429) + 4.56;
                                        }
                                        bodyFatPercent = Math.max(3, Math.min(bodyFatPercent, 50));

                                        const masaGrasa = (bodyFatPercent / 100) * (selectedMedida.peso || 0);
                                        const masaMuscular = (selectedMedida.peso || 0) - masaGrasa;

                                        // Estimate somatotype (simplified Heath-Carter)
                                        const talla = selectedMedida.talla || 170;
                                        const peso = selectedMedida.peso || 70;
                                        const triceps = getAnthroNumber(selectedMedida.pliegues?.triceps);
                                        const subscapular = getAnthroNumber(selectedMedida.pliegues?.subscapular);
                                        const supraspinale = getAnthroNumber(selectedMedida.pliegues?.supraspinale);

                                        // Endomorphy
                                        const sumTres = triceps + subscapular + supraspinale;
                                        const correccion = (170.18 / talla);
                                        const endo = sumTres > 0 ? Math.max(0.5, -0.7182 + 0.1451 * (sumTres * correccion) - 0.00068 * Math.pow(sumTres * correccion, 2) + 0.0000014 * Math.pow(sumTres * correccion, 3)) : 0;

                                        // Mesomorphy (simplified)
                                        const humero = getAnthroNumber(selectedMedida.diametros?.humero, 7);
                                        const femur = getAnthroNumber(selectedMedida.diametros?.femur, 10);
                                        const brazoFlex = getAnthroNumber(selectedMedida.perimetros?.brazoFlex, 30);
                                        const pantorrilla = getAnthroNumber(selectedMedida.perimetros?.pantorrilla, 35);
                                        const meso = humero > 0 ? Math.max(0.5, 0.858 * humero + 0.601 * femur + 0.188 * brazoFlex + 0.161 * pantorrilla - 0.131 * talla + 4.5) : 0;

                                        // Ectomorphy
                                        const ponderal = talla / Math.pow(peso, 1 / 3);
                                        let ecto = 0;
                                        if (ponderal >= 40.75) ecto = 0.732 * ponderal - 28.58;
                                        else if (ponderal >= 38.25) ecto = 0.463 * ponderal - 17.63;
                                        else ecto = 0.5;
                                        ecto = Math.max(0.5, ecto);

                                        return (
                                            <div className="space-y-6">
                                                {/* Header con indicador de evaluación seleccionada */}
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                                            {selectedEvaluationIndex === 0 ? 'Última Evaluación' : `Evaluación #${medidas.length - selectedEvaluationIndex}`}
                                                        </h3>
                                                        <p className="text-sm text-slate-500">
                                                            {selectedMedida.fecha ? new Date(selectedMedida.fecha).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Sin fecha'}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {selectedEvaluationIndex !== 0 && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="gap-2 text-xs"
                                                                onClick={() => setSelectedEvaluationIndex(0)}
                                                            >
                                                                Ver última
                                                            </Button>
                                                        )}
                                                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                            {medidas.length} evaluación{medidas.length > 1 ? 'es' : ''}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                {/* Datos Básicos */}
                                                <Card className="border-slate-100 dark:border-slate-700 shadow-sm rounded-xl bg-white dark:bg-slate-800">
                                                    <CardHeader className="pb-2">
                                                        <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                                            <Scale className="w-4 h-4 text-[#6cba00]" />
                                                            Datos Básicos
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                            <div className="p-4 bg-[#f0f9e8] dark:bg-[#6cba00]/10 rounded-xl text-center border border-[#daeaac] dark:border-[#6cba00]/20">
                                                                <p className="text-xs text-[#6cba00] font-medium mb-1">Peso</p>
                                                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{selectedMedida.peso || 0}<span className="text-sm font-normal text-slate-400 ml-1">kg</span></p>
                                                            </div>
                                                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-center">
                                                                <p className="text-xs text-slate-500 mb-1">Talla</p>
                                                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{selectedMedida.talla || 0}<span className="text-sm font-normal text-slate-400 ml-1">cm</span></p>
                                                            </div>
                                                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-center">
                                                                <p className="text-xs text-slate-500 mb-1">IMC</p>
                                                                <p className={`text-2xl font-bold ${getImcColor(selectedMedida.imc || 0)}`}>{(selectedMedida.imc || 0).toFixed(1)}<span className="text-sm font-normal text-slate-400 ml-1">kg/m²</span></p>
                                                            </div>
                                                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-center">
                                                                <p className="text-xs text-slate-500 mb-1">Edad</p>
                                                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{selectedMedida.edad || age}<span className="text-sm font-normal text-slate-400 ml-1">años</span></p>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                {/* Composición Corporal */}
                                                {sumPliegues > 0 && (
                                                    <Card className="border-slate-100 dark:border-slate-700 shadow-sm rounded-xl bg-white dark:bg-slate-800">
                                                        <CardHeader className="pb-2">
                                                            <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                                                <Activity className="w-4 h-4 text-orange-500" />
                                                                Composición Corporal
                                                            </CardTitle>
                                                        </CardHeader>
                                                        <CardContent>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl text-center border border-red-100 dark:border-red-900/20">
                                                                    <p className="text-xs text-red-600 font-medium mb-1">% Grasa</p>
                                                                    <p className="text-2xl font-bold text-red-600">{bodyFatPercent.toFixed(1)}<span className="text-sm font-normal text-red-400 ml-1">%</span></p>
                                                                </div>
                                                                <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl text-center border border-orange-100 dark:border-orange-900/20">
                                                                    <p className="text-xs text-orange-600 font-medium mb-1">Masa Grasa</p>
                                                                    <p className="text-2xl font-bold text-orange-600">{masaGrasa.toFixed(1)}<span className="text-sm font-normal text-orange-400 ml-1">kg</span></p>
                                                                </div>
                                                                <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-xl text-center border border-green-100 dark:border-green-900/20">
                                                                    <p className="text-xs text-green-600 font-medium mb-1">Masa Muscular</p>
                                                                    <p className="text-2xl font-bold text-green-600">{masaMuscular.toFixed(1)}<span className="text-sm font-normal text-green-400 ml-1">kg</span></p>
                                                                </div>
                                                                <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl text-center border border-purple-100 dark:border-purple-900/20">
                                                                    <p className="text-xs text-purple-600 font-medium mb-1">Σ Pliegues</p>
                                                                    <p className="text-2xl font-bold text-purple-600">{sumPliegues.toFixed(1)}<span className="text-sm font-normal text-purple-400 ml-1">mm</span></p>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                )}

                                                {/* Somatotipo */}
                                                {(endo > 0 || meso > 0 || ecto > 0) && (
                                                    <Card className="border-slate-100 dark:border-slate-700 shadow-sm rounded-xl bg-white dark:bg-slate-800">
                                                        <CardHeader className="pb-2">
                                                            <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                                                <UserIcon className="w-4 h-4 text-blue-500" />
                                                                Somatotipo
                                                            </CardTitle>
                                                        </CardHeader>
                                                        <CardContent>
                                                            <div className="grid grid-cols-3 gap-4">
                                                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl text-center border border-yellow-100 dark:border-yellow-900/20">
                                                                    <p className="text-xs text-yellow-700 font-medium mb-1">Endomorfia</p>
                                                                    <p className="text-3xl font-bold text-yellow-600">{endo.toFixed(1)}</p>
                                                                    <p className="text-[10px] text-yellow-500 mt-1">Adiposidad</p>
                                                                </div>
                                                                <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-xl text-center border border-green-100 dark:border-green-900/20">
                                                                    <p className="text-xs text-green-700 font-medium mb-1">Mesomorfia</p>
                                                                    <p className="text-3xl font-bold text-green-600">{meso.toFixed(1)}</p>
                                                                    <p className="text-[10px] text-green-500 mt-1">Muscularidad</p>
                                                                </div>
                                                                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl text-center border border-blue-100 dark:border-blue-900/20">
                                                                    <p className="text-xs text-blue-700 font-medium mb-1">Ectomorfia</p>
                                                                    <p className="text-3xl font-bold text-blue-600">{ecto.toFixed(1)}</p>
                                                                    <p className="text-[10px] text-blue-500 mt-1">Linealidad</p>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                )}

                                                {/* Historial de Evaluaciones */}
                                                <Card className="border-slate-100 dark:border-slate-700 shadow-sm rounded-xl bg-white dark:bg-slate-800">
                                                    <CardHeader className="pb-3">
                                                        <div className="flex items-center justify-between">
                                                            <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                                                                <History className="w-5 h-5 text-slate-400" />
                                                                Historial de Evaluaciones
                                                            </CardTitle>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="gap-2 text-xs"
                                                                onClick={() => router.push(`/antropometria?id=${paciente.id}`)}
                                                            >
                                                                <Activity className="w-3 h-3" /> Nueva Evaluación
                                                            </Button>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <div className="space-y-2">
                                                            {medidas.map((medida, index) => (
                                                                <div
                                                                    key={medida.id || index}
                                                                    className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${selectedEvaluationIndex === index
                                                                        ? 'bg-[#6cba00]/10 border-[#6cba00] ring-2 ring-[#6cba00]/20'
                                                                        : index === 0
                                                                            ? 'bg-[#6cba00]/5 border-[#6cba00]/20 hover:bg-[#6cba00]/10'
                                                                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                                                        }`}
                                                                    onClick={() => setSelectedEvaluationIndex(index)}
                                                                >
                                                                    <div className="flex items-center gap-4">
                                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedEvaluationIndex === index
                                                                            ? 'bg-[#6cba00] text-white'
                                                                            : index === 0
                                                                                ? 'bg-[#6cba00]/10 text-[#6cba00]'
                                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                                                            }`}>
                                                                            <Scale className="w-4 h-4" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-semibold text-slate-800 dark:text-white">
                                                                                {medida.fecha ? new Date(medida.fecha).toLocaleDateString('es-PE', {
                                                                                    weekday: 'long',
                                                                                    day: 'numeric',
                                                                                    month: 'long',
                                                                                    year: 'numeric'
                                                                                }) : 'Sin fecha'}
                                                                            </p>
                                                                            <p className="text-xs text-slate-500">
                                                                                {index === 0 ? 'Última evaluación' : `Evaluación #${medidas.length - index}`}
                                                                                {selectedEvaluationIndex === index && <span className="ml-2 text-[#6cba00] font-medium">• Seleccionada</span>}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-6 text-sm">
                                                                        <div className="text-right">
                                                                            <p className="font-semibold text-slate-800 dark:text-white">{medida.peso || 0} kg</p>
                                                                            <p className="text-xs text-slate-400">Peso</p>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className={`font-semibold ${getImcColor(medida.imc || 0)}`}>{(medida.imc || 0).toFixed(1)}</p>
                                                                            <p className="text-xs text-slate-400">IMC</p>
                                                                        </div>
                                                                        <ChevronRight className={`w-4 h-4 transition-colors ${selectedEvaluationIndex === index ? 'text-[#6cba00]' : 'text-slate-300'}`} />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                {/* Action Button */}
                                                <div className="flex flex-col items-center gap-4 py-6">
                                                    <Button
                                                        size="lg"
                                                        className="gap-3 bg-[#6cba00] hover:bg-[#5aa300] text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-green-500/20"
                                                        onClick={() => router.push(`/antropometria?id=${paciente.id}`)}
                                                    >
                                                        <Activity className="w-5 h-5" />
                                                        Nueva Evaluación Antropométrica
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })() : (
                                        /* Empty State */
                                        <div className="flex flex-col items-center justify-center py-16 text-center">
                                            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                                                <Scale className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                                            </div>
                                            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Sin Evaluaciones</h3>
                                            <p className="text-slate-500 max-w-sm mb-6">
                                                Este paciente aún no tiene evaluaciones antropométricas registradas.
                                            </p>
                                            <Button
                                                size="lg"
                                                className="gap-2 bg-[#6cba00] hover:bg-[#5aa300] text-white"
                                                onClick={() => router.push(`/antropometria?id=${paciente.id}`)}
                                            >
                                                <Activity className="w-5 h-5" />
                                                Registrar Primera Evaluación
                                            </Button>
                                        </div>
                                    );
                                })()}
                            </TabsContent>

                            {/* Cálculos */}
                            <TabsContent value="calculos" className="space-y-6 focus-visible:outline-none">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Activity className="w-5 h-5" /> Nivel de Actividad
                                            </CardTitle>
                                            <CardDescription>Selecciona el nivel de actividad física para calcular el requerimiento calórico.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {/* Botones de niveles de actividad */}
                                            <div className="grid gap-2">
                                                <div
                                                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${activityLevel === 'sedentary' ? 'bg-[#ff8508]/10 border-[#ff8508] ring-2 ring-[#ff8508]/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-[#ff8508]/50'}`}
                                                    onClick={() => setActivityLevel('sedentary')}
                                                >
                                                    <span className="font-medium text-slate-800 dark:text-white">Sedentario (x1.2)</span>
                                                    <p className="text-xs text-muted-foreground">Trabajo de escritorio, sin ejercicio regular</p>
                                                </div>
                                                <div
                                                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${activityLevel === 'light' ? 'bg-[#ff8508]/10 border-[#ff8508] ring-2 ring-[#ff8508]/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-[#ff8508]/50'}`}
                                                    onClick={() => setActivityLevel('light')}
                                                >
                                                    <span className="font-medium text-slate-800 dark:text-white">Ligero (x1.375)</span>
                                                    <p className="text-xs text-muted-foreground">Ejercicio ligero 1-3 días/semana</p>
                                                </div>
                                                <div
                                                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${activityLevel === 'moderate' ? 'bg-[#ff8508]/10 border-[#ff8508] ring-2 ring-[#ff8508]/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-[#ff8508]/50'}`}
                                                    onClick={() => setActivityLevel('moderate')}
                                                >
                                                    <span className="font-medium text-slate-800 dark:text-white">Moderado (x1.55)</span>
                                                    <p className="text-xs text-muted-foreground">Ejercicio moderado 3-5 días/semana</p>
                                                </div>
                                                <div
                                                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${activityLevel === 'active' ? 'bg-[#ff8508]/10 border-[#ff8508] ring-2 ring-[#ff8508]/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-[#ff8508]/50'}`}
                                                    onClick={() => setActivityLevel('active')}
                                                >
                                                    <span className="font-medium text-slate-800 dark:text-white">Activo (x1.725)</span>
                                                    <p className="text-xs text-muted-foreground">Ejercicio intenso 6-7 días/semana</p>
                                                </div>
                                                <div
                                                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${activityLevel === 'very_active' ? 'bg-[#ff8508]/10 border-[#ff8508] ring-2 ring-[#ff8508]/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-[#ff8508]/50'}`}
                                                    onClick={() => setActivityLevel('very_active')}
                                                >
                                                    <span className="font-medium text-slate-800 dark:text-white">Muy Activo (x1.9)</span>
                                                    <p className="text-xs text-muted-foreground">Atleta profesional, doble sesión diaria</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Utensils className="w-5 h-5" /> Requerimientos
                                            </CardTitle>
                                            <CardDescription>Gasto Energético Total (GET) Estimado</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Objetivo Nutricional</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <Button
                                                        variant={nutritionalGoal === 'cut' ? 'default' : 'outline'}
                                                        className={`h-auto py-2 px-1 flex flex-col gap-1 ${nutritionalGoal === 'cut' ? 'bg-red-500 hover:bg-red-600' : 'hover:bg-red-50 text-red-600 border-red-200'}`}
                                                        onClick={() => setNutritionalGoal('cut')}
                                                    >
                                                        <TrendingDown className="w-4 h-4" />
                                                        <span className="text-xs">Definición</span>
                                                    </Button>
                                                    <Button
                                                        variant={nutritionalGoal === 'maintain' ? 'default' : 'outline'}
                                                        className={`h-auto py-2 px-1 flex flex-col gap-1 ${nutritionalGoal === 'maintain' ? 'bg-blue-500 hover:bg-blue-600' : 'hover:bg-blue-50 text-blue-600 border-blue-200'}`}
                                                        onClick={() => setNutritionalGoal('maintain')}
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                        <span className="text-xs">Mantener</span>
                                                    </Button>
                                                    <Button
                                                        variant={nutritionalGoal === 'bulk' ? 'default' : 'outline'}
                                                        className={`h-auto py-2 px-1 flex flex-col gap-1 ${nutritionalGoal === 'bulk' ? 'bg-green-500 hover:bg-green-600' : 'hover:bg-green-50 text-green-600 border-green-200'}`}
                                                        onClick={() => setNutritionalGoal('bulk')}
                                                    >
                                                        <TrendingUp className="w-4 h-4" />
                                                        <span className="text-xs">Volumen</span>
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Selector de Proteína */}
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Ratio de Proteína (g/kg)</label>
                                                <div className="flex gap-2 items-center">
                                                    <div className="grid grid-cols-4 gap-2 flex-1">
                                                        {[1.2, 1.6, 2.0, 2.2].map((ratio) => (
                                                            <Button
                                                                key={ratio}
                                                                variant={proteinRatio === ratio ? 'default' : 'outline'}
                                                                className={`h-auto py-2 flex flex-col gap-0.5 ${proteinRatio === ratio ? 'bg-[#ff8508] hover:bg-[#e67600]' : 'hover:bg-[#fff4e6] text-[#ff8508] border-[#ffd9a8]'}`}
                                                                onClick={() => setProteinRatio(ratio)}
                                                            >
                                                                <span className="text-sm font-bold">{ratio}</span>
                                                                <span className="text-[10px] opacity-75">g/kg</span>
                                                            </Button>
                                                        ))}
                                                    </div>
                                                    <div className="flex flex-col items-center gap-1">
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            min="0.8"
                                                            max="3.0"
                                                            value={proteinRatio}
                                                            onChange={(e) => setProteinRatio(parseFloat(e.target.value) || 1.6)}
                                                            className="w-20 h-10 text-center border border-[#ffd9a8] rounded-lg font-bold text-[#ff8508] focus:ring-2 focus:ring-[#ff8508]/30 focus:border-[#ff8508]"
                                                        />
                                                        <span className="text-[10px] text-muted-foreground">Personalizado</span>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Proteína diaria: <span className="font-semibold text-[#ff8508]">{Math.round(pesoActual * proteinRatio)}g</span> ({(pesoActual * proteinRatio * 4).toFixed(0)} kcal)
                                                </p>
                                            </div>

                                            <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 text-center">
                                                <span className="text-muted-foreground font-semibold mb-2 block text-sm">
                                                    {nutritionalGoal === 'cut' ? 'Déficit Calórico (-400)' :
                                                        nutritionalGoal === 'bulk' ? 'Superávit Calórico (+400)' :
                                                            'Mantenimiento'}
                                                </span>
                                                <span className="text-4xl font-extrabold text-slate-900">
                                                    {(() => {
                                                        const base = calculateMifflinStJeor(pesoActual, tallaActual, age, paciente.datosPersonales.sexo || '') * ACTIVITY_FACTORS[activityLevel];
                                                        const adjustment = nutritionalGoal === 'cut' ? -400 : nutritionalGoal === 'bulk' ? 400 : 0;
                                                        return Math.round(base + adjustment);
                                                    })()}
                                                </span>
                                                <span className="text-sm text-muted-foreground ml-2">kcal/día</span>
                                            </div>

                                            <Button
                                                className="w-full mt-4 gap-2 bg-[#6cba00] hover:bg-[#5aa300]"
                                                onClick={() => {
                                                    const base = calculateMifflinStJeor(pesoActual, tallaActual, age, paciente.datosPersonales.sexo || '') * ACTIVITY_FACTORS[activityLevel];
                                                    const adjustment = nutritionalGoal === 'cut' ? -400 : nutritionalGoal === 'bulk' ? 400 : 0;
                                                    const finalCalories = Math.round(base + adjustment);
                                                    const proteinGrams = Math.round(pesoActual * proteinRatio);
                                                    router.push(`/dietas?patientId=${paciente.id}&calories=${finalCalories}&protein=${proteinGrams}`);
                                                }}
                                            >
                                                <Utensils className="w-4 h-4" /> Crear Plan de Alimentación
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            {/* Dietas */}
                            <TabsContent value="dietas" className="space-y-6 focus-visible:outline-none">
                                {/* Header con botón de crear */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Planes Nutricionales</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            Historial de dietas creadas para este paciente
                                        </p>
                                    </div>
                                    <Button
                                        className="gap-2 bg-[#ff8508] hover:bg-[#e67600] text-white shadow-lg shadow-orange-500/20"
                                        onClick={() => {
                                            const base = calculateMifflinStJeor(pesoActual, tallaActual, age, paciente.datosPersonales.sexo || '') * ACTIVITY_FACTORS[activityLevel];
                                            const adjustment = nutritionalGoal === 'cut' ? -400 : nutritionalGoal === 'bulk' ? 400 : 0;
                                            const finalCalories = Math.round(base + adjustment);
                                            router.push(`/dietas?patientId=${paciente.id}&calories=${finalCalories}`);
                                        }}
                                    >
                                        <Utensils className="w-4 h-4" /> Nueva Dieta
                                    </Button>
                                </div>

                                {/* Lista de Dietas */}
                                {dietHistory.length === 0 ? (
                                    <Card className="border-slate-100 dark:border-slate-700 shadow-sm rounded-xl bg-white dark:bg-slate-800">
                                        <CardContent className="py-16">
                                            <div className="flex flex-col items-center justify-center text-center">
                                                <div className="w-20 h-20 rounded-full bg-[#ff8508]/10 flex items-center justify-center mb-6">
                                                    <Utensils className="w-10 h-10 text-[#ff8508]/50" />
                                                </div>
                                                <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                                    Sin Planes Nutricionales
                                                </h4>
                                                <p className="text-sm text-muted-foreground max-w-sm mb-6">
                                                    Este paciente aún no tiene dietas guardadas. Crea un plan nutricional personalizado.
                                                </p>
                                                <Button
                                                    className="gap-2 bg-[#ff8508] hover:bg-[#e67600] text-white"
                                                    onClick={() => router.push(`/dietas?patientId=${paciente.id}`)}
                                                >
                                                    <Utensils className="w-4 h-4" /> Crear Primera Dieta
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="grid gap-4">
                                        {dietHistory.map((plan) => {
                                            const totalCalories = plan.planData.reduce((sum, day) => sum + (day.goals?.calories || 0), 0);
                                            const avgCalories = plan.planData.length > 0 ? Math.round(totalCalories / plan.planData.length) : 0;

                                            return (
                                                <Card
                                                    key={plan.id}
                                                    className="group border-slate-100 dark:border-slate-700 shadow-sm rounded-xl bg-white dark:bg-slate-800 hover:border-[#ff8508]/50 hover:shadow-md transition-all cursor-pointer"
                                                    onClick={() => router.push(`/dietas?patientId=${paciente.id}&planId=${plan.id}`)}
                                                >
                                                    <CardContent className="p-5">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 rounded-xl bg-[#ff8508]/10 flex items-center justify-center">
                                                                    <Utensils className="w-6 h-6 text-[#ff8508]" />
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-semibold text-slate-800 dark:text-white group-hover:text-[#ff8508] transition-colors">
                                                                        {plan.name}
                                                                    </h4>
                                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                                                        <span className="flex items-center gap-1">
                                                                            <Clock className="w-3.5 h-3.5" />
                                                                            {new Date(plan.createdAt).toLocaleDateString('es-PE', {
                                                                                day: 'numeric',
                                                                                month: 'long',
                                                                                year: 'numeric'
                                                                            })}
                                                                        </span>
                                                                        <span className="flex items-center gap-1 text-[#ff8508] font-semibold">
                                                                            🔥 {avgCalories} kcal/día
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <Badge
                                                                    variant={plan.status === 'active' ? 'default' : 'secondary'}
                                                                    className={`${plan.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}`}
                                                                >
                                                                    {plan.status === 'active' ? 'Activo' : 'Archivado'}
                                                                </Badge>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteDiet(plan.id);
                                                                    }}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#ff8508] transition-colors" />
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </TabsContent>

                            {/* Avance */}
                            <TabsContent value="avance" className="mt-6 focus-visible:outline-none">
                                <Card className="border-none shadow-none bg-transparent">
                                    <CardHeader className="px-0 pt-0">
                                        <CardTitle className="text-xl">Evolución del Paciente</CardTitle>
                                        <CardDescription>Seguimiento histórico de peso, composición corporal y medidas.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="px-0">
                                        <EvolutionSummary patientId={paciente.id} />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                        </Tabs>
                    </div>
                </main>
            </div>
        </div>
    );
}