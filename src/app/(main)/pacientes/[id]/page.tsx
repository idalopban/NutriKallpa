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
import { ScrollArea } from "@/components/ui/scroll-area";

// Logic
import { usePatientStore } from "@/store/usePatientStore";
import { getPatientDietHistory, deleteSavedPlan, type SavedPlan } from "@/lib/diet-service";
import type { Paciente, MedidasAntropometricas } from "@/types";
import {
    calculateMifflinStJeor,
    ACTIVITY_FACTORS,
    ACTIVITY_LABELS,
    type ActivityLevel
} from "@/lib/calculos-nutricionales";

export default function DetallePacientePage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeTab = searchParams.get('tab') || 'resumen';

    // Use centralized patient store
    const {
        patient: paciente,
        medidas,
        isLoading: loading,
        loadPatient,
        refreshMedidas
    } = usePatientStore();

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
    const age = new Date().getFullYear() - birthDate.getFullYear();

    const getImcColor = (valor: number) => {
        if (valor < 18.5) return "text-blue-500";
        if (valor < 25) return "text-green-500";
        if (valor < 30) return "text-orange-500";
        return "text-red-500";
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a]">
            <div className="container mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500 max-w-[1600px]">

                {/* --- HEADER --- */}
                <div className="flex flex-col gap-6">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="hover:text-slate-900 cursor-pointer transition-colors" onClick={() => router.push('/dashboard')}>Dashboard</span>
                        <span>/</span>
                        <span className="hover:text-slate-900 cursor-pointer transition-colors" onClick={() => router.push('/pacientes')}>Pacientes</span>
                        <span>/</span>
                        <span className="font-semibold text-slate-900 dark:text-white">Expediente</span>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                        <div className="flex items-center gap-6">
                            {/* Avatar */}
                            <div className="w-20 h-20 rounded-full bg-[#daeaac] dark:bg-[#daeaac]/10 flex items-center justify-center text-3xl font-bold text-[#6cba00]">
                                {paciente.datosPersonales.nombre[0]}{paciente.datosPersonales.apellido[0]}
                            </div>

                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                        {paciente.datosPersonales.nombre} {paciente.datosPersonales.apellido}
                                    </h1>
                                    <Badge variant="secondary" className="uppercase text-[10px] bg-slate-100 text-slate-500 border border-slate-200">
                                        {paciente.historiaClinica?.objetivos || "MANTENIMIENTO"}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-gray-400">
                                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {age} años</span>
                                    <span className="flex items-center gap-1"><UserIcon className="w-4 h-4 capitalize" /> {paciente.datosPersonales.sexo}</span>
                                    {paciente.datosPersonales.email && (
                                        <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {paciente.datosPersonales.email}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ACCIONES RÁPIDAS */}
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                className="h-10 px-4 rounded-full border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                                onClick={() => router.push(`/antropometria?id=${paciente.id}`)}
                            >
                                <Scale className="w-4 h-4" /> Registrar Medidas
                            </Button>
                            <Button
                                variant="outline"
                                className="h-10 px-4 rounded-full border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                                onClick={() => router.push(`/pacientes/${paciente.id}/editar`)}
                            >
                                <Edit3 className="w-4 h-4" /> Editar Datos
                            </Button>
                            <Button
                                className="h-10 px-4 rounded-full bg-[#6cba00] hover:bg-[#5aa300] text-white gap-2 border-0 shadow-lg shadow-green-500/20"
                                onClick={() => router.push(`/pacientes/${paciente.id}/consulta`)}
                            >
                                <FileText className="w-4 h-4" /> Nueva Consulta
                            </Button>
                        </div>
                    </div>
                </div>

                {/* --- TABS --- */}
                <Tabs defaultValue="resumen" className="w-full space-y-8">
                    <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit gap-1">
                        {['Resumen', 'Antropometria', 'Cálculos', 'Dietas', 'Avance'].map(tab => (
                            <TabsTrigger
                                key={tab}
                                value={tab.toLowerCase().replace('é', 'e').replace('á', 'a')}
                                className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 dark:text-slate-400 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-[#ff8508] dark:data-[state=active]:text-[#6cba00] data-[state=active]:shadow-sm hover:text-slate-900 dark:hover:text-slate-200"
                            >
                                {tab}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* Resumen */}
                    <TabsContent value="resumen" className="space-y-6 focus-visible:outline-none">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card className="bg-[#f0f9e8] dark:bg-[#6cba00]/10 border-[#daeaac] dark:border-[#6cba00]/20 shadow-none rounded-xl">
                                <CardHeader className="pb-2">
                                    <CardDescription className="text-[#6cba00] font-medium">Peso Actual</CardDescription>
                                    <CardTitle className="text-3xl font-bold text-slate-900 dark:text-white flex items-baseline gap-1">
                                        {pesoActual} <span className="text-base font-medium text-slate-500">kg</span>
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                            <Card className="bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm rounded-xl">
                                <CardHeader className="pb-2">
                                    <CardDescription>Talla</CardDescription>
                                    <CardTitle className="text-3xl font-bold text-slate-900 dark:text-white flex items-baseline gap-1">
                                        {tallaActual} <span className="text-base font-medium text-slate-500">cm</span>
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                            <Card className="bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm rounded-xl">
                                <CardHeader className="pb-2">
                                    <CardDescription>IMC</CardDescription>
                                    <CardTitle className={`text-3xl font-bold flex items-baseline gap-1 ${getImcColor(imc)}`}>
                                        {imc.toFixed(1)} <span className="text-base font-medium text-slate-500">kg/m²</span>
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                            <Card className="bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm rounded-xl">
                                <CardHeader className="pb-2">
                                    <CardDescription>Consultas</CardDescription>
                                    <CardTitle className="text-3xl font-bold text-slate-900 dark:text-white">
                                        {medidas.length}
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                        </div>

                        {/* Clinical History & Objective */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <Card className="border-slate-100 dark:border-slate-700 shadow-sm rounded-xl bg-white dark:bg-slate-800 h-full">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                                        <Activity className="w-5 h-5 text-slate-400" />
                                        Historia Clínica
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {paciente.historiaClinica?.antecedentesPersonales ? (
                                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                                            {paciente.historiaClinica.antecedentesPersonales}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-slate-400 italic">No hay notas registradas.</p>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="border-slate-100 dark:border-slate-700 shadow-sm rounded-xl bg-white dark:bg-slate-800 h-full">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-100">
                                        <TrendingUp className="w-5 h-5 text-slate-400" />
                                        Objetivo
                                    </CardTitle>
                                    <CardDescription>{paciente.historiaClinica?.objetivos || "Sin objetivo definido"}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">Progreso</span>
                                            <span className="font-bold text-[#6cba00]">En curso</span>
                                        </div>
                                        <Progress value={30} className="h-2 bg-slate-100 dark:bg-slate-700" indicatorClassName="bg-[#6cba00]" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Antropometría - Resumen Completo */}
                    <TabsContent value="antropometria" className="space-y-6 focus-visible:outline-none">
                        {medidas.length > 0 ? (() => {
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
                            const triceps = selectedMedida.pliegues?.triceps || 0;
                            const subscapular = selectedMedida.pliegues?.subscapular || 0;
                            const supraspinale = selectedMedida.pliegues?.supraspinale || 0;

                            // Endomorphy
                            const sumTres = triceps + subscapular + supraspinale;
                            const correccion = (170.18 / talla);
                            const endo = sumTres > 0 ? Math.max(0.5, -0.7182 + 0.1451 * (sumTres * correccion) - 0.00068 * Math.pow(sumTres * correccion, 2) + 0.0000014 * Math.pow(sumTres * correccion, 3)) : 0;

                            // Mesomorphy (simplified)
                            const humero = selectedMedida.diametros?.humero || 7;
                            const femur = selectedMedida.diametros?.femur || 10;
                            const brazoFlex = selectedMedida.perimetros?.brazoFlex || 30;
                            const pantorrilla = selectedMedida.perimetros?.pantorrilla || 35;
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
                        )}
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
                                    <Select value={activityLevel} onValueChange={(v) => setActivityLevel(v as ActivityLevel)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar actividad" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
                                                <SelectItem key={key} value={key}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {/* Descripciones de niveles de actividad */}
                                    <div className="space-y-2 text-xs">
                                        <p className="font-semibold text-slate-700 dark:text-slate-300">Guía de niveles:</p>
                                        <div className="grid gap-2">
                                            <div className={`p-2 rounded-lg border ${activityLevel === 'sedentary' ? 'bg-[#ff8508]/10 border-[#ff8508]' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                                <span className="font-medium text-slate-800 dark:text-white">Sedentario (x1.2)</span>
                                                <p className="text-muted-foreground">Trabajo de escritorio, sin ejercicio regular</p>
                                            </div>
                                            <div className={`p-2 rounded-lg border ${activityLevel === 'light' ? 'bg-[#ff8508]/10 border-[#ff8508]' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                                <span className="font-medium text-slate-800 dark:text-white">Ligero (x1.375)</span>
                                                <p className="text-muted-foreground">Ejercicio ligero 1-3 días/semana</p>
                                            </div>
                                            <div className={`p-2 rounded-lg border ${activityLevel === 'moderate' ? 'bg-[#ff8508]/10 border-[#ff8508]' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                                <span className="font-medium text-slate-800 dark:text-white">Moderado (x1.55)</span>
                                                <p className="text-muted-foreground">Ejercicio moderado 3-5 días/semana</p>
                                            </div>
                                            <div className={`p-2 rounded-lg border ${activityLevel === 'active' ? 'bg-[#ff8508]/10 border-[#ff8508]' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                                <span className="font-medium text-slate-800 dark:text-white">Activo (x1.725)</span>
                                                <p className="text-muted-foreground">Ejercicio intenso 6-7 días/semana</p>
                                            </div>
                                            <div className={`p-2 rounded-lg border ${activityLevel === 'very_active' ? 'bg-[#ff8508]/10 border-[#ff8508]' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                                <span className="font-medium text-slate-800 dark:text-white">Muy Activo (x1.9)</span>
                                                <p className="text-muted-foreground">Atleta profesional, doble sesión diaria</p>
                                            </div>
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
        </div>
    );
}