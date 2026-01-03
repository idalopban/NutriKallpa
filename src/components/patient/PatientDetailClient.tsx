"use client";

import { useEffect, useState, useMemo } from "react";
import { calculateFiveComponentFractionation, type FiveComponentInput } from "@/lib/fiveComponentMath";
import { getAnthroNumber } from "@/types";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
    ArrowLeft, Calendar, Mail, Phone, MapPin,
    Activity, Scale, Utensils, TrendingUp, Edit3, Edit2,
    MoreVertical, FileText, Ruler, User as UserIcon,
    TrendingDown, Minus, History, Clock, ChevronRight, Trash2,
    Plus, Apple, LineChart, FileDown, Calculator, Info, Pencil,
    Wine, Cigarette, Moon, Weight, Baby, Pill, Droplet
} from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { es } from "date-fns/locale";

// UI Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { EvolutionSummary } from "@/components/patients/EvolutionSummary";
import { ClinicalHistoryTab } from "@/components/patients/ClinicalHistoryTab";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PediatricGrowthChart } from "@/components/pediatrics/PediatricGrowthChart";
import { PatientAgeBadge } from "@/components/patient/PatientAgeBadge";
import { PatientAvatar } from "@/components/patient/PatientAvatar";
import { PatientProgressCard } from "@/components/patient/PatientProgressCard";
import { PatientDashboard } from "@/components/patients/dashboard/PatientDashboard";
import { PatientNutritionConfig } from "@/components/patient/PatientNutritionConfig";
import { DietPlanningSummary } from "@/components/patients/dashboard/DietPlanningSummary";
import { GlobalNutritionHeader } from "@/components/patient/GlobalNutritionHeader";
import { SportsHydrationModule } from "@/components/patient/SportsHydrationModule";
import { HydrationStatusCard } from "@/components/diet/HydrationStatusCard";
import { InfantSupplementationModule } from "@/components/pediatrics/InfantSupplementationModule";

import { useToast } from "@/hooks/use-toast";
import { ConsentBanner, ConsentIndicator, ConsentDetails } from "@/components/legal/ConsentBanner";

// Logic
import { usePatientStore, usePatientNutrition } from "@/store/usePatientStore";
import { getPatientDietHistory, deleteSavedPlan, type SavedPlan } from "@/lib/diet-service";
import { deletePaciente as deletePacienteAction } from "@/lib/storage";
import type { Paciente, MedidasAntropometricas } from "@/types";
import {
    ACTIVITY_FACTORS,
    ACTIVITY_LABELS,
    type ActivityLevel
} from "@/lib/calculos-nutricionales";
import { calculateChronologicalAge, calculateExactAgeInDays, calculateDetailedAge, getPatientStage } from "@/lib/clinical-calculations";
import { calculateZScore } from "@/lib/growth-standards";
import { type PatientDataPoint } from "@/components/pediatrics/PediatricGrowthChart";
import { generateSafetyAlerts, type SafetyAlert } from "@/lib/safety-alerts";
import { getAltitudeAdjustment } from "@/lib/anemia-nts-protocol";

const calculateAnemiaDiagnosis = (hb: number, sex: string | undefined, altitude: number = 0) => {
    if (!hb) return null;
    const adjustment = getAltitudeAdjustment(altitude);
    const corrected = hb - adjustment;
    const isMale = sex === 'masculino';
    const min = isMale ? 13 : 12;

    if (corrected < min - 2) return 'Anemia Severa';
    if (corrected < min) return 'Anemia';
    if (corrected >= min && corrected <= min + 5) return 'Normal';
    return 'Hb Elevada';
};

export function PatientDetailClient() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeTab = searchParams.get('tab') || 'clinica';

    const {
        patient: paciente,
        medidas,
        isLoading: loading,
        refreshMedidas,
        clearPatient,
        loadPatient
    } = usePatientStore();

    const { hydration: storeHydration } = usePatientNutrition();

    // Reload patient data on mount or when ID changes (ensures fresh data after edits)
    useEffect(() => {
        if (params.id && typeof params.id === 'string') {
            loadPatient(params.id);
        }
    }, [params.id, loadPatient]);

    const stage = paciente ? getPatientStage(paciente.datosPersonales.fechaNacimiento) : 'ADULT';
    const isPediatric = stage === 'PEDIATRIC';

    const { toast } = useToast();

    const [dietHistory, setDietHistory] = useState<SavedPlan[]>([]);
    const [selectedEvaluationIndex, setSelectedEvaluationIndex] = useState<number>(0);
    const [isNutritionDirty, setIsNutritionDirty] = useState(false);

    // Swipe gesture handling for mobile tabs
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const minSwipeDistance = 50;

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

    // Initial load for non-RSC data
    useEffect(() => {
        if (params.id) {
            loadDietHistory(params.id as string);
        }
    }, [params.id]);

    // Safety Alerts Calculation
    const safetyAlerts = useMemo<SafetyAlert[]>(() => {
        if (!paciente || !medidas || medidas.length === 0) return [];

        const ultimaMedidaTemp = medidas[0] || {};
        const pesoTemp = ultimaMedidaTemp.peso || 0;
        const tallaTemp = ultimaMedidaTemp.talla || 0;

        if (!pesoTemp || !tallaTemp) return [];

        const previousMedida = medidas[1];
        const previousWeight = previousMedida?.peso;
        const daysElapsed = previousMedida?.fecha
            ? Math.floor((new Date().getTime() - new Date(previousMedida.fecha).getTime()) / (1000 * 60 * 60 * 24))
            : undefined;

        const patologias = paciente?.historiaClinica?.patologias?.map((p: string | { nombre: string }) =>
            typeof p === 'string' ? p : p.nombre
        ) || [];

        return generateSafetyAlerts({
            currentWeight: pesoTemp,
            previousWeight,
            daysElapsed,
            height: tallaTemp,
            patologias
        });
    }, [paciente, medidas]);

    const handleBorrarPaciente = async () => {
        if (!paciente) return;
        if (!confirm(`¿Estás seguro de eliminar permanentemente a ${paciente.datosPersonales.nombre}? Esta acción no se puede deshacer.`)) return;

        try {
            const result = await deletePacienteAction(paciente.id);
            if (result === true) {
                toast({ title: "Paciente eliminado", description: "El paciente ha sido borrado de la base de datos." });
                clearPatient();
                router.push('/pacientes');
            } else {
                throw new Error("Failed to delete");
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el paciente. Verifica tu conexión." });
        }
    };

    // Swipe gesture handlers for mobile tab navigation
    const getTabOrder = (): string[] => {
        if (isInfant) {
            return ['clinica', 'antropometria', 'suplementacion'];
        }
        return ['clinica', 'antropometria', 'calculos', 'dietas'];
    };

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe || isRightSwipe) {
            const tabs = getTabOrder();
            const currentIndex = tabs.indexOf(activeTab);

            if (isLeftSwipe && currentIndex < tabs.length - 1) {
                // Swipe left = next tab
                router.push(`/pacientes/${params.id}?tab=${tabs[currentIndex + 1]}`);
            } else if (isRightSwipe && currentIndex > 0) {
                // Swipe right = previous tab
                router.push(`/pacientes/${params.id}?tab=${tabs[currentIndex - 1]}`);
            }
        }
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando expediente...</div>;
    if (!paciente) return <div className="p-8 text-center text-red-500">Paciente no encontrado</div>;

    // Ensure we get the latest measure by sorting
    const sortedMedidas = [...medidas].sort((a, b) =>
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
    const ultimaMedida = sortedMedidas[0] || {};
    const selectedMedida = medidas[selectedEvaluationIndex] || ultimaMedida;
    const pesoActual = ultimaMedida.peso || 0;
    const tallaActual = ultimaMedida.talla || 0;
    const imc = ultimaMedida.imc || 0;
    const ageDetailed = calculateDetailedAge(paciente.datosPersonales.fechaNacimiento);
    const age = ageDetailed.years;
    const isInfantLayout = age < 3;
    const isPediatricStage = age < 18;
    const shouldShowAdultTabs = age >= 3;

    const patientAge = paciente.datosPersonales.fechaNacimiento
        ? differenceInYears(new Date(), new Date(paciente.datosPersonales.fechaNacimiento))
        : 0;
    const isInfant = patientAge < 2;

    const handleBack = () => {
        router.push('/pacientes');
    };

    const getImcColor = (valor: number) => {
        if (valor < 18.5) return "text-blue-500";
        if (valor < 25) return "text-green-500";
        if (valor < 30) return "text-orange-500";
        return "text-red-500";
    };

    const sex = ultimaMedida.sexo || paciente.datosPersonales.sexo || 'masculino';
    let bodyFatPercent = (ultimaMedida as any).porcentajeGrasa || 0;

    // If no stored percentage, try to calculate it using the same logic as dashboard
    if (bodyFatPercent === 0 && (ultimaMedida.pliegues || ultimaMedida.talla)) {
        try {
            // Import dynamically or assume it's available via props/context if simpler, 
            // but here we will replicate the robust logic or call the helper if imported.
            // Since we can't easily import calculateAnthropometry without modifying imports,
            // let's assume we update the imports first.

            // For now, let's use the robust Yuhasz/Durnin fallback if specific data exists
            // Improved Fallback: Match EvolutionSummary logic
            // 1. Try Yuhasz (most common default)
            const sumPlieguesOverall = ultimaMedida.pliegues
                ? Object.values(ultimaMedida.pliegues).reduce((a, b) => Number(a || 0) + Number(b || 0), 0)
                : 0;

            if (sumPlieguesOverall > 0) {
                if (sex === 'masculino') bodyFatPercent = (sumPlieguesOverall * 0.097) + 3.64;
                else bodyFatPercent = (sumPlieguesOverall * 0.1429) + 4.56;

                // Clamp
                bodyFatPercent = Math.max(3, Math.min(bodyFatPercent, 50));
            }
        } catch (e) {
            console.error("Error calculating estimated fat", e);
        }
    }

    // Final check to handle legacy string numbers if any
    bodyFatPercent = Number(bodyFatPercent) || 0;


    const masaGrasa = (bodyFatPercent / 100) * pesoActual;
    const masaMuscular = pesoActual - masaGrasa;
    const lastVisit = medidas[0]?.fecha
        ? new Date(medidas[0].fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Sin visitas';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a]">
            <div className="flex h-full">
                {/* SIDEBAR */}
                <aside className="hidden lg:flex flex-col w-[400px] min-h-[calc(10vh-48px)] my-6 ml-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shrink-0 relative overflow-hidden shadow-xl rounded-2xl z-10">
                    <button onClick={() => router.push('/pacientes')} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white mb-8 transition-colors">
                        <ArrowLeft className="w-5 h-5" /> Volver a pacientes
                    </button>

                    <div className="flex flex-col items-center text-center mb-8">
                        <PatientAvatar patient={paciente} className="w-24 h-24 text-4xl mb-4 shadow-2xl" />
                        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">{paciente.datosPersonales.nombre}</h2>
                        <p className="text-base font-medium text-slate-500">{ageDetailed.formatted}</p>
                        <div className="flex gap-2 mt-5">
                            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => router.push(`/pacientes/${paciente.id}/editar`)}>Editar</Button>
                            <Button size="sm" variant="destructive" className="rounded-xl" onClick={handleBorrarPaciente}><Trash2 className="w-4 h-4" /></Button>
                        </div>

                        <div className="mt-4">
                            <ConsentIndicator patientId={paciente.id} />
                        </div>

                        <ConsentDetails patientId={paciente.id} />
                    </div>

                    {/* Contact Info */}
                    <div className="w-full space-y-3 px-2">
                        {paciente.datosPersonales.email && (
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <Mail className="w-4 h-4 text-blue-600" />
                                </div>
                                <span className="text-slate-600 dark:text-slate-400 truncate">{paciente.datosPersonales.email}</span>
                            </div>
                        )}
                        {paciente.datosPersonales.telefono && (
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <Phone className="w-4 h-4 text-green-600" />
                                </div>
                                <span className="text-slate-600 dark:text-slate-400">{paciente.datosPersonales.telefono}</span>
                            </div>
                        )}
                        {(paciente.datosPersonales as any).direccion && (
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                    <MapPin className="w-4 h-4 text-purple-600" />
                                </div>
                                <span className="text-slate-600 dark:text-slate-400 truncate">{(paciente.datosPersonales as any).direccion}</span>
                            </div>
                        )}
                    </div>

                    {/* Lifestyle / Clinical Info Switch */}
                    {isInfant ? (
                        <>
                            <Separator className="my-4" />
                            <div className="w-full space-y-2 px-2">
                                <p className="text-[10px] uppercase font-medium text-slate-400 tracking-wider mb-2">Datos Clínicos</p>

                                {/* Termino / Pretermino */}
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <Baby className="w-3.5 h-3.5 text-blue-600" />
                                    </div>
                                    <span className="text-slate-600 dark:text-slate-400">
                                        {(paciente.historiaClinica?.antecedentes as any)?.nacimientoPrematuro ? 'Pretérmino' : 'A término'}
                                    </span>
                                </div>

                                {/* Peso al Nacer */}
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                                        <Weight className="w-3.5 h-3.5 text-rose-600" />
                                    </div>
                                    <span className="text-slate-600 dark:text-slate-400">
                                        {(paciente.historiaClinica?.antecedentes as any)?.pesoNacimiento ?
                                            `PN: ${(paciente.historiaClinica?.antecedentes as any)?.pesoNacimiento}kg` :
                                            'Peso Nac: Pendiente'}
                                    </span>
                                </div>

                                {/* Hemoglobina */}
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                        <Droplet className="w-3.5 h-3.5 text-red-600" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-slate-600 dark:text-slate-400 text-xs font-semibold">
                                            Hb: {(paciente.historiaClinica?.datosClinicos?.hemoglobina || paciente.historiaClinica?.bioquimicaReciente?.hemoglobina) ?
                                                `${(paciente.historiaClinica?.datosClinicos?.hemoglobina || paciente.historiaClinica?.bioquimicaReciente?.hemoglobina)} g/dL` : '--'}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {calculateAnemiaDiagnosis(
                                                Number(paciente.historiaClinica?.datosClinicos?.hemoglobina || paciente.historiaClinica?.bioquimicaReciente?.hemoglobina || 0),
                                                paciente.datosPersonales.sexo,
                                                paciente.historiaClinica?.altitudResidencia || 0
                                            ) || 'Sin dx anemia'}
                                        </span>
                                    </div>
                                </div>

                                {/* Suplementación Hierro */}
                                <div className="flex items-center gap-3 text-sm">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${(paciente.historiaClinica?.datosClinicos as any)?.suplementoHierro ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                        <Pill className={`w-3.5 h-3.5 ${(paciente.historiaClinica?.datosClinicos as any)?.suplementoHierro ? 'text-emerald-600' : 'text-slate-400'}`} />
                                    </div>
                                    <span className="text-slate-600 dark:text-slate-400 text-xs">
                                        {(paciente.historiaClinica?.datosClinicos as any)?.suplementoHierro ? 'Suplementado (Fe)' : 'Sin Suplemento Fe'}
                                    </span>
                                </div>
                            </div>
                        </>
                    ) : (
                        paciente.historiaClinica?.estiloVida && (
                            <>
                                <Separator className="my-4" />
                                <div className="w-full space-y-2 px-2">
                                    <p className="text-[10px] uppercase font-medium text-slate-400 tracking-wider mb-2">Estilo de Vida</p>

                                    {/* Sleep */}
                                    {paciente.historiaClinica.estiloVida.suenoHoras && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                                            </div>
                                            <span className="text-slate-600 dark:text-slate-400">{paciente.historiaClinica.estiloVida.suenoHoras} hrs de sueño</span>
                                        </div>
                                    )}

                                    {/* Smoking */}
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${paciente.historiaClinica.estiloVida.fuma ? 'bg-red-100 dark:bg-red-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
                                            <Cigarette className={`w-3.5 h-3.5 ${paciente.historiaClinica.estiloVida.fuma ? 'text-red-600' : 'text-emerald-600'}`} />
                                        </div>
                                        <span className="text-slate-600 dark:text-slate-400">
                                            {paciente.historiaClinica.estiloVida.fuma ? 'Fumador' : 'No fuma'}
                                        </span>
                                    </div>

                                    {/* Alcohol */}
                                    {paciente.historiaClinica.estiloVida.alcohol && (
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${paciente.historiaClinica.estiloVida.alcohol === 'nunca' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                                                <Wine className={`w-3.5 h-3.5 ${paciente.historiaClinica.estiloVida.alcohol === 'nunca' ? 'text-emerald-600' : 'text-amber-600'}`} />
                                            </div>
                                            <span className="text-slate-600 dark:text-slate-400 capitalize">
                                                Alcohol: {paciente.historiaClinica.estiloVida.alcohol === 'nunca' ? 'No consume' : paciente.historiaClinica.estiloVida.alcohol}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </>
                        )
                    )}

                    <Separator className="my-5" />

                    {/* Metrics */}
                    <div className="flex-1 overflow-y-auto space-y-5 px-1 pb-4">
                        <div className="grid grid-cols-2 gap-3">
                            {isInfant ? (
                                <>
                                    <div className="p-4 rounded-3xl bg-emerald-500 text-white shadow-sm">
                                        <p className="text-[10px] uppercase font-bold opacity-80">Peso</p>
                                        <p className="text-2xl font-bold">
                                            {ultimaMedida?.peso || paciente.datosPersonales.peso || '--'}
                                            <span className="text-sm font-normal ml-1">kg</span>
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-3xl bg-blue-500 text-white shadow-sm">
                                        <p className="text-[10px] uppercase font-bold opacity-80">Talla</p>
                                        <p className="text-2xl font-bold">
                                            {ultimaMedida?.talla || paciente.datosPersonales.talla || '--'}
                                            <span className="text-sm font-normal ml-1">cm</span>
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="p-4 rounded-3xl bg-amber-500 text-white shadow-sm">
                                        <p className="text-[10px] uppercase font-bold opacity-80">IMC</p>
                                        <p className="text-2xl font-bold">{imc.toFixed(1)}</p>
                                    </div>
                                    <div className="p-4 rounded-3xl bg-orange-500 text-white shadow-sm">
                                        <p className="text-[10px] uppercase font-bold opacity-80">% Grasa</p>
                                        <p className="text-2xl font-bold">{bodyFatPercent > 0 ? bodyFatPercent.toFixed(1) : '--'}</p>
                                    </div>
                                </>
                            )}
                        </div>

                        <Separator className="my-2" />

                        <div className="space-y-3">
                            {/* Water Logic: Custom for infants (0-2y), Standard for > 2y */}
                            {isInfant ? (
                                <div className="bg-cyan-50 dark:bg-cyan-900/20 p-4 rounded-3xl border border-cyan-100 dark:border-cyan-800">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-800 flex items-center justify-center">
                                            <Droplet className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                                        </div>
                                        <p className="text-sm font-bold text-cyan-900 dark:text-cyan-100">Hidratación</p>
                                    </div>
                                    <p className="text-sm text-cyan-700 dark:text-cyan-200 font-medium">
                                        {patientAge < 0.5 ? 'Lactancia materna exclusiva' : 'Lactancia materna y agua a demanda'}
                                    </p>
                                </div>
                            ) : (
                                <HydrationStatusCard
                                    currentLiters={paciente.historiaClinica?.estiloVida?.aguaDiaria}
                                    weightKg={pesoActual}
                                    age={age}
                                    recommendedLiters={storeHydration?.ml ? storeHydration.ml / 1000 : undefined}
                                />
                            )}
                            <PatientProgressCard pacienteId={paciente.id} patientName={paciente.datosPersonales.nombre} compact={true} />
                        </div>
                    </div>
                </aside>

                {/* MAIN CONTENT */}
                <main className="flex-1 overflow-y-auto h-full p-4 md:p-8 lg:p-10 space-y-6 md:space-y-8">
                    {/* Mobile Patient Header - Only visible on mobile */}
                    <div className="lg:hidden bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <button onClick={() => router.push('/pacientes')} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white mb-4 transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Volver a pacientes
                        </button>

                        <div className="flex items-center gap-4 mb-4">
                            <PatientAvatar patient={paciente} className="w-16 h-16 text-2xl shadow-lg shrink-0" />
                            <div className="flex-1 min-w-0">
                                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white truncate">{paciente.datosPersonales.nombre}</h2>
                                <p className="text-sm font-medium text-slate-500">{ageDetailed.formatted}</p>
                                <div className="mt-2">
                                    <ConsentIndicator patientId={paciente.id} />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0">
                                <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={() => router.push(`/pacientes/${paciente.id}/editar`)}>Editar</Button>
                                <Button size="sm" variant="destructive" className="rounded-xl" onClick={handleBorrarPaciente}><Trash2 className="w-3 h-3" /></Button>
                            </div>
                        </div>

                        {/* Mobile Quick Stats */}
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            {isInfant ? (
                                <>
                                    <div className="p-3 rounded-xl bg-emerald-500 text-white">
                                        <p className="text-[9px] uppercase font-bold opacity-80">Peso</p>
                                        <p className="text-xl font-bold">{ultimaMedida?.peso || '--'} <span className="text-xs font-normal">kg</span></p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-blue-500 text-white">
                                        <p className="text-[9px] uppercase font-bold opacity-80">Talla</p>
                                        <p className="text-xl font-bold">{ultimaMedida?.talla || '--'} <span className="text-xs font-normal">cm</span></p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="p-3 rounded-xl bg-amber-500 text-white">
                                        <p className="text-[9px] uppercase font-bold opacity-80">IMC</p>
                                        <p className="text-xl font-bold">{imc.toFixed(1)}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-orange-500 text-white">
                                        <p className="text-[9px] uppercase font-bold opacity-80">% Grasa</p>
                                        <p className="text-xl font-bold">{bodyFatPercent > 0 ? bodyFatPercent.toFixed(1) : '--'}</p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Mobile Clinical Data for Infants */}
                        {isInfant && (
                            <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2">
                                <p className="text-[10px] uppercase font-medium text-slate-400 tracking-wider">Datos Clínicos</p>

                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                        <Baby className="w-3 h-3 text-blue-600" />
                                    </div>
                                    <span className="text-slate-600 dark:text-slate-400 text-xs">
                                        {(paciente.historiaClinica?.antecedentes as any)?.nacimientoPrematuro ? 'Pretérmino' : 'A término'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                                        <Weight className="w-3 h-3 text-rose-600" />
                                    </div>
                                    <span className="text-slate-600 dark:text-slate-400 text-xs">
                                        {(paciente.historiaClinica?.antecedentes as any)?.pesoNacimiento ?
                                            `PN: ${(paciente.historiaClinica?.antecedentes as any)?.pesoNacimiento}kg` :
                                            'Peso Nac: Pendiente'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                                        <Droplet className="w-3 h-3 text-red-600" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-slate-600 dark:text-slate-400 text-xs font-semibold">
                                            Hb: {(paciente.historiaClinica?.datosClinicos?.hemoglobina || paciente.historiaClinica?.bioquimicaReciente?.hemoglobina) ?
                                                `${(paciente.historiaClinica?.datosClinicos?.hemoglobina || paciente.historiaClinica?.bioquimicaReciente?.hemoglobina)} g/dL` : '--'}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {calculateAnemiaDiagnosis(
                                                Number(paciente.historiaClinica?.datosClinicos?.hemoglobina || paciente.historiaClinica?.bioquimicaReciente?.hemoglobina || 0),
                                                paciente.datosPersonales.sexo,
                                                paciente.historiaClinica?.altitudResidencia || 0
                                            ) || 'Sin dx anemia'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-sm">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${(paciente.historiaClinica?.datosClinicos as any)?.suplementoHierro ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                        <Pill className={`w-3 h-3 ${(paciente.historiaClinica?.datosClinicos as any)?.suplementoHierro ? 'text-emerald-600' : 'text-slate-400'}`} />
                                    </div>
                                    <span className="text-slate-600 dark:text-slate-400 text-xs">
                                        {(paciente.historiaClinica?.datosClinicos as any)?.suplementoHierro ? 'Suplementado (Fe)' : 'Sin Suplemento Fe'}
                                    </span>
                                </div>
                            </div>
                        )}

                        <ConsentDetails patientId={paciente.id} />
                    </div>

                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Expediente <span className="text-orange-500">del Paciente</span></h1>
                        <Button className="bg-[#ff8508] hover:bg-[#e67600] rounded-2xl gap-2 font-bold text-sm md:text-base" onClick={() => router.push(`/pacientes/nuevo?patientId=${paciente.id}`)}>
                            <Plus className="w-4 h-4 md:w-5 md:h-5" /> <span className="hidden sm:inline">Nueva Consulta</span><span className="sm:hidden">+</span>
                        </Button>
                    </div>

                    <GlobalNutritionHeader className="mb-6" />

                    {/* Consent Banner - Ley 29733 Compliance */}
                    <ConsentBanner
                        patientId={paciente.id}
                        patientName={paciente.datosPersonales.nombre}
                        isMinor={age < 18}
                        className="mb-6"
                    />

                    {/* Swipeable Tabs Container */}
                    <div
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                        className="touch-pan-y"
                    >
                        <Tabs value={activeTab} className="w-full" onValueChange={(v) => router.push(`/pacientes/${paciente.id}?tab=${v}`)}>
                            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-6 w-full overflow-x-auto flex flex-nowrap scrollbar-hide">
                                <TabsTrigger value="clinica" className="rounded-xl text-xs sm:text-sm px-3 sm:px-4 shrink-0 whitespace-nowrap">Historia</TabsTrigger>
                                <TabsTrigger value="antropometria" className="rounded-xl text-xs sm:text-sm px-3 sm:px-4 shrink-0 whitespace-nowrap">Antropometría</TabsTrigger>
                                {!isInfant && <TabsTrigger value="calculos" className="rounded-xl text-xs sm:text-sm px-3 sm:px-4 shrink-0 whitespace-nowrap">Cálculos</TabsTrigger>}
                                {!isInfant && <TabsTrigger value="dietas" className="rounded-xl text-xs sm:text-sm px-3 sm:px-4 shrink-0 whitespace-nowrap">Dietas</TabsTrigger>}
                                {isInfant && <TabsTrigger value="suplementacion" className="rounded-xl text-xs sm:text-sm px-3 sm:px-4 shrink-0 whitespace-nowrap">Suplementación</TabsTrigger>}
                            </TabsList>

                            <TabsContent value="clinica"><ClinicalHistoryTab patient={paciente} /></TabsContent>
                            <TabsContent value="antropometria">
                                <Card className="p-6 rounded-3xl">
                                    <h3 className="text-xl font-bold mb-4">Evolución Antropométrica</h3>
                                    <EvolutionSummary patientId={paciente.id} mode={isPediatricStage ? 'pediatric' : 'adult'} />
                                    <div className="mt-8 flex justify-center gap-4">
                                        <Button className="rounded-2xl" onClick={() => router.push(`/antropometria?id=${paciente.id}`)}>Registrar Nueva Medida</Button>
                                    </div>
                                </Card>
                            </TabsContent>
                            {!isInfant && (
                                <TabsContent value="calculos">
                                    <PatientNutritionConfig onDirtyChange={setIsNutritionDirty} rightSideContent={<SportsHydrationModule />} />
                                </TabsContent>
                            )}
                            {!isInfant && (
                                <TabsContent value="dietas">
                                    <AdultDietHistoryTab
                                        paciente={paciente}
                                        dietHistory={dietHistory}
                                        router={router}
                                        onDelete={handleDeleteDiet}
                                    />
                                </TabsContent>
                            )}
                            {isInfant && (
                                <TabsContent value="suplementacion">
                                    <InfantSupplementationModule patient={paciente} currentWeight={pesoActual} />
                                </TabsContent>
                            )}
                        </Tabs>
                    </div>
                </main>
            </div>
        </div>
    );
}

function AdultDietHistoryTab({
    paciente,
    dietHistory,
    router,
    onDelete
}: {
    paciente: any,
    dietHistory: SavedPlan[],
    router: any,
    onDelete: (id: string) => void
}) {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Planes Nutricionales</h2>
                    <p className="text-xs text-slate-500 font-medium">Historial de dietas y pautas alimentarias generadas.</p>
                </div>
                <Button className="bg-[#ff8508] hover:bg-[#e67600] rounded-2xl gap-2 font-bold shadow-lg shadow-orange-500/20" onClick={() => router.push(`/dietas?patientId=${paciente.id}`)}>
                    <Plus className="w-5 h-5" /> Nueva Dieta
                </Button>
            </div>

            <ScrollArea className="h-[600px] pr-4 rounded-xl">
                <div className="grid gap-3">
                    {dietHistory.map(diet => {
                        const firstDay = diet.planData?.[0];
                        const calories = firstDay?.stats?.calories || 0;
                        const meals = firstDay?.meals?.map(m => m.name.split(' - ')[0]) || [];
                        const createdAt = new Date(diet.createdAt);
                        const formattedDate = format(createdAt, "d 'de' MMMM 'de' yyyy", { locale: es });
                        const formattedTime = createdAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

                        return (
                            <Card
                                key={diet.id}
                                className="group relative overflow-hidden border-slate-100 dark:border-slate-800 hover:border-orange-200 dark:hover:border-orange-900/40 hover:shadow-md transition-all rounded-2xl cursor-pointer bg-white dark:bg-slate-900"
                            >
                                <div className="p-3 pl-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div className="flex gap-4 items-center" onClick={() => router.push(`/dietas?patientId=${paciente.id}&planId=${diet.id}`)}>
                                        <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center text-orange-500 shrink-0 group-hover:scale-105 transition-transform duration-300">
                                            <Utensils className="w-5 h-5" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-base font-bold text-slate-800 dark:text-white group-hover:text-orange-500 transition-colors">
                                                    {diet.name || "Plan Nutricional"}
                                                </h3>
                                                {calories > 0 && (
                                                    <div className="flex items-center gap-1 text-[10px] text-orange-600 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full">
                                                        <Activity className="w-3 h-3" />
                                                        {Math.round(calories)} kcal
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                                    <Calendar className="w-3 h-3" />
                                                    {formattedDate} <span className="text-slate-300 mx-1">|</span> {formattedTime}
                                                </div>

                                                {meals.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 items-center">
                                                        <span className="text-slate-300 text-[10px] hidden sm:inline">•</span>
                                                        {meals.slice(0, 4).map((m, idx) => (
                                                            <span key={idx} className="text-[9px] px-1.5 py-0 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded md:rounded-md font-semibold uppercase tracking-wider">
                                                                {m}
                                                            </span>
                                                        ))}
                                                        {meals.length > 4 && (
                                                            <span className="text-[9px] text-slate-400">+{meals.length - 4}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 self-end md:self-auto shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(diet.id);
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-full text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 group-hover:translate-x-1 transition-all"
                                            onClick={() => router.push(`/dietas?patientId=${paciente.id}&planId=${diet.id}`)}
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Decorative line color */}
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Card>
                        );
                    })}

                    {dietHistory.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <Apple className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Sin Planes Nutricionales</h3>
                            <p className="text-sm text-slate-500 max-w-[250px] mx-auto mt-1">Aún no has generado pautas de alimentación para este paciente.</p>
                            <Button className="mt-6 bg-[#ff8508] hover:bg-[#e67600] rounded-2xl gap-2 font-bold" onClick={() => router.push(`/dietas?patientId=${paciente.id}`)}>
                                <Plus className="w-4 h-4" /> Crear Primera Dieta
                            </Button>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

