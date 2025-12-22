"use client";

import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    Search, Plus, Trash2,
    Utensils, Save, ChevronRight, Wand2, CalendarDays, FileText, Printer, History, Clock, RotateCcw,
    Activity, TrendingUp, Users, FileCheck, AlertCircle, CheckCircle2, ChevronRight as ChevronRightIcon
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

import { parseAlimentosCSV, type Alimento } from "@/lib/csv-parser";
import { getPlanById } from "@/lib/diet-service";
import { getPacientes, getMedidasByPaciente } from "@/lib/storage";
import { usePatientStore, usePatientNutrition } from "@/store/usePatientStore";
import {
    generateSmartDailyPlan,
    calculateDailyStats,
    calculateMealStats,
    DEFAULT_MICRO_GOALS,
    type DailyPlan,
    type Meal,
    type NutritionalGoals
} from "@/lib/diet-generator";
import { DietCharts } from "@/components/diet/DietCharts";
import { DietReport } from "@/components/diet/DietReport";
import { MacronutrientsPanel } from "@/components/diet/MacronutrientsPanel";
import { MicronutrientsPanel } from "@/components/diet/MicronutrientsPanel";
import type { Paciente, MedidasAntropometricas } from "@/types";
import { PatientNutritionConfig } from "@/components/patient/PatientNutritionConfig";
import { calculateMifflinStJeor, ACTIVITY_FACTORS, calcularEdad, type ActivityLevel } from "@/lib/calculos-nutricionales";
import { useAuthStore } from "@/store/useAuthStore";
import { useDietHistory } from "@/hooks/useDietHistory";
import { DownloadButton } from "@/components/diet/pdf/DownloadButton";
import { PatientAgeBadge } from "@/components/patient/PatientAgeBadge";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MEAL_NAMES = ["Desayuno", "Almuerzo", "Cena", "Colación"];

function DietasContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuthStore();

    const patientId = searchParams.get("patientId");
    const planId = searchParams.get("planId");
    const targetCalories = Number(searchParams.get("calories")) || 2000;
    const targetProteinGrams = Number(searchParams.get("protein")) || 0;

    // Calculate macro percentages based on protein grams
    const calculateMacrosFromProtein = (calories: number, proteinGrams: number) => {
        if (proteinGrams <= 0) {
            // Default distribution
            return { protein: 20, carbs: 50, fat: 30 };
        }
        // 1g protein = 4 kcal
        const proteinCalories = proteinGrams * 4;
        const proteinPercent = Math.round((proteinCalories / calories) * 100);
        // Distribute remaining between carbs (higher) and fat
        const remaining = 100 - proteinPercent;
        const carbPercent = Math.round(remaining * 0.6); // ~60% of remaining to carbs
        const fatPercent = 100 - proteinPercent - carbPercent;

        return {
            protein: Math.min(proteinPercent, 40), // Cap at 40%
            carbs: Math.max(carbPercent, 30), // Minimum 30%
            fat: Math.max(fatPercent, 20) // Minimum 20%
        };
    };

    // --- USE CENTRALIZED PATIENT STORE ---
    const {
        patient: paciente,
        medidas,
        loadPatient
    } = usePatientStore();

    // Get macro configuration from patient store
    const { macroProteina, macroCarbohidratos, macroGrasa } = usePatientNutrition();

    // --- STATE ---
    const [pacientesList, setPacientesList] = useState<Paciente[]>([]);
    const [alimentos, setAlimentos] = useState<Alimento[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [patientSearch, setPatientSearch] = useState("");

    // Diet State
    const [currentDayIndex, setCurrentDayIndex] = useState(0);
    const [weeklyPlan, setWeeklyPlan] = useState<DailyPlan[]>([]);
    const [selectedMealIndex, setSelectedMealIndex] = useState<number>(0);
    const [showReport, setShowReport] = useState(false);

    // History & Save State
    const { savePlan, history, clonePlan, deletePlan } = useDietHistory(user?.id);
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [planName, setPlanName] = useState("");
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Default Goals - use calculated macros if protein was specified
    const initialMacros = calculateMacrosFromProtein(targetCalories, targetProteinGrams);
    const [goals, setGoals] = useState<NutritionalGoals>({
        calories: targetCalories,
        macros: initialMacros,
        micros: DEFAULT_MICRO_GOALS
    });

    // --- EFFECTS ---
    // Load patient when patientId changes
    useEffect(() => {
        if (patientId) {
            loadPatient(patientId);
        }
    }, [patientId, loadPatient]);

    // Calculate TDEE and initialize plan when patient/medidas load
    useEffect(() => {
        if (!paciente || !patientId) return;

        // Calculate TDEE if no explicit calories param and no planId
        let computedCalories = targetCalories;
        const hasExplicitCalories = searchParams.has("calories");

        if (!hasExplicitCalories && medidas.length > 0) {
            // Sort by date desc to get latest
            const sortedMedidas = [...medidas].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            const latest = sortedMedidas[0];

            if (latest.peso && latest.talla && paciente.datosPersonales.fechaNacimiento) {
                const age = calcularEdad(paciente.datosPersonales.fechaNacimiento);

                // Heuristic for activity level
                let activityFactor = 1.2;
                if (latest.tipoPaciente === 'atleta') activityFactor = 1.725;
                else if (latest.tipoPaciente === 'fitness') activityFactor = 1.55;
                else if (latest.tipoPaciente === 'control') activityFactor = 1.375;

                const bmr = calculateMifflinStJeor(
                    latest.peso,
                    latest.talla,
                    age,
                    paciente.datosPersonales.sexo || 'otro'
                );

                computedCalories = Math.round(bmr * activityFactor);
            }
        }

        // Default goals for new plans - USE PATIENT'S CONFIGURED MACROS
        const defaultGoals: NutritionalGoals = {
            calories: computedCalories,
            macros: {
                protein: macroProteina ?? 25,
                carbs: macroCarbohidratos ?? 50,
                fat: macroGrasa ?? 25
            },
            micros: DEFAULT_MICRO_GOALS
        };

        // Initialize plan
        const initialPlan: DailyPlan[] = DAYS.map(day => ({
            day,
            meals: MEAL_NAMES.map(name => ({ name, items: [] })),
            stats: {
                calories: 0,
                macros: { protein: 0, carbs: 0, fat: 0 },
                micros: { calcio: 0, fosforo: 0, zinc: 0, hierro: 0, vitaminaA: 0, tiamina: 0, riboflavina: 0, niacina: 0, vitaminaC: 0, acidoFolico: 0, sodio: 0, potasio: 0 }
            },
            goals: defaultGoals
        }));

        // Update local state goals if we computed new calories
        if (!hasExplicitCalories) {
            setGoals(defaultGoals);
        }

        if (planId) {
            setLoading(true);
            const savedPlan = getPlanById(planId);
            if (savedPlan) {
                setWeeklyPlan(savedPlan.planData);
                if (savedPlan.planData.length > 0) {
                    const planCal = savedPlan.planData[0].goals.calories;
                    setGoals(prev => ({ ...prev, calories: planCal }));
                }
            } else {
                setWeeklyPlan(initialPlan);
            }
            setLoading(false);
        } else {
            setWeeklyPlan(initialPlan);
        }

        // Load foods
        parseAlimentosCSV().then(data => {
            setAlimentos(data);
            setLoading(false);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paciente?.id, patientId, planId, medidas.length, targetCalories]);

    // Load patients list if no patientId
    useEffect(() => {
        if (!patientId && user) {
            const list = getPacientes(user.id);
            setPacientesList(list);
            setLoading(false);
        }
    }, [patientId, user]);

    // Update goals if targetCalories or protein changes explicitly
    useEffect(() => {
        if (searchParams.has("calories") || searchParams.has("protein")) {
            const newMacros = calculateMacrosFromProtein(targetCalories, targetProteinGrams);
            setGoals(prev => ({
                ...prev,
                calories: targetCalories,
                macros: newMacros
            }));
        }
    }, [targetCalories, targetProteinGrams, searchParams]);

    // Sync goals with patient's configured macros when they change
    useEffect(() => {
        if (macroProteina !== undefined && macroCarbohidratos !== undefined && macroGrasa !== undefined) {
            setGoals(prev => ({
                ...prev,
                macros: {
                    protein: macroProteina,
                    carbs: macroCarbohidratos,
                    fat: macroGrasa
                }
            }));
        }
    }, [macroProteina, macroCarbohidratos, macroGrasa]);

    // --- HELPERS ---
    const currentPlan = weeklyPlan[currentDayIndex];

    const updateDailyStats = (dayIndex: number, newMeals: Meal[]) => {
        const stats = calculateDailyStats(newMeals);
        const newPlan = [...weeklyPlan];
        newPlan[dayIndex] = {
            ...newPlan[dayIndex],
            meals: newMeals,
            stats
        };
        setWeeklyPlan(newPlan);
    };

    const addFoodToMeal = (food: Alimento) => {
        if (!currentPlan) return;
        const newMeals = [...currentPlan.meals];
        newMeals[selectedMealIndex].items.push({
            id: Math.random().toString(36).substr(2, 9),
            food,
            quantity: 100, // default 100g
            category: (food as any).categoria || 'otro' // Added fallback category
        });
        updateDailyStats(currentDayIndex, newMeals);
    };

    const removeFood = (mealIndex: number, foodIndex: number) => {
        const newMeals = [...currentPlan.meals];
        newMeals[mealIndex].items.splice(foodIndex, 1);
        updateDailyStats(currentDayIndex, newMeals);
    };

    const updateQuantity = (mealIndex: number, foodIndex: number, newQty: number) => {
        const newMeals = [...currentPlan.meals];
        newMeals[mealIndex].items[foodIndex].quantity = newQty;
        updateDailyStats(currentDayIndex, newMeals);
    };

    const handleAutoGenerateDay = () => {
        // Convert Preferencias to UserPreferences format
        const userPrefs = paciente?.preferencias ? {
            ...paciente.preferencias,
            likedFoods: paciente.preferencias.likedFoods || [],
            dislikedFoods: paciente.preferencias.dislikedFoods || []
        } : undefined;

        const generated = generateSmartDailyPlan(
            goals,
            alimentos,
            DAYS[currentDayIndex],
            userPrefs
        );
        const newPlan = [...weeklyPlan];
        newPlan[currentDayIndex] = generated;
        setWeeklyPlan(newPlan);
    };

    const handleAutoGenerateWeek = () => {
        // Convert Preferencias to UserPreferences format
        const userPrefs = paciente?.preferencias ? {
            ...paciente.preferencias,
            likedFoods: paciente.preferencias.likedFoods || [],
            dislikedFoods: paciente.preferencias.dislikedFoods || []
        } : undefined;

        const newPlan = DAYS.map(day => generateSmartDailyPlan(
            goals,
            alimentos,
            day,
            userPrefs
        ));
        setWeeklyPlan(newPlan);
    };

    const handleSavePlan = async () => {
        if (!planName.trim()) return;
        // Pass patientId if available
        await savePlan(weeklyPlan, planName, patientId || undefined);
        setIsSaveDialogOpen(false);
        setPlanName("");
    };

    const handleLoadPlan = async (planId: string) => {
        const loadedPlan = await clonePlan(planId);
        if (loadedPlan) {
            setWeeklyPlan(loadedPlan);
            setIsHistoryOpen(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const filteredFoods = useMemo(() => {
        if (!searchTerm) return [];
        const lower = searchTerm.toLowerCase();
        return alimentos
            .filter(a => a.nombre.toLowerCase().includes(lower))
            .slice(0, 50);
    }, [searchTerm, alimentos]);

    const filteredPatients = useMemo(() => {
        if (!patientSearch) return pacientesList;
        const lower = patientSearch.toLowerCase();
        return pacientesList.filter(p =>
            p.datosPersonales.nombre.toLowerCase().includes(lower) ||
            p.datosPersonales.apellido.toLowerCase().includes(lower)
        );
    }, [patientSearch, pacientesList]);


    // --- RENDER: PATIENT SELECTION (DASHBOARD) ---
    if (!patientId) {
        return (
            <div className="min-h-screen bg-background">
                {/* HEADER - SAME STYLE AS ANTROPOMETRIA */}
                <div className="border-b border-slate-100 dark:border-slate-800 bg-background sticky top-0 z-30">
                    <div className="container mx-auto px-4 md:px-6 py-4 md:py-0 md:h-20 flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-[1600px]">

                        {/* LEFT: Title & Subtitle */}
                        <div className="flex flex-col">
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Gestor de <span className="text-[#ff8508]">Dietas</span>
                            </h1>
                            <p className="text-sm text-slate-400">
                                Administra los planes nutricionales de tus pacientes
                            </p>
                        </div>

                        {/* RIGHT: Controls */}
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
                            {/* Patient Selector */}
                            <div className="w-full md:w-[300px] relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <Input
                                    placeholder="Buscar paciente..."
                                    className="pl-10 h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:border-[#ff8508] transition-colors focus:ring-[#ff8508]"
                                    value={patientSearch}
                                    onChange={(e) => setPatientSearch(e.target.value)}
                                />
                            </div>

                            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2" />

                            <Button
                                variant="outline"
                                className="h-11 rounded-xl border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 gap-2 font-medium"
                                onClick={() => setIsHistoryOpen(true)}
                            >
                                <History className="w-4 h-4" /> Historial
                            </Button>

                            <Button
                                variant="secondary"
                                size="icon"
                                className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                                onClick={() => router.push('/pacientes/nuevo')}
                            >
                                <Plus className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto p-4 md:p-6 max-w-[1600px]">
                    {/* SHOW PATIENT LIST IF THERE ARE PATIENTS, OTHERWISE SHOW EMPTY STATE */}
                    {pacientesList.length > 0 ? (
                        // PATIENT DIRECTORY
                        <div className="animate-in fade-in duration-300">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                                    Directorio de Pacientes
                                    <span className="ml-2 text-sm font-normal text-slate-400">
                                        ({filteredPatients.length} {filteredPatients.length === 1 ? 'paciente' : 'pacientes'})
                                    </span>
                                </h2>
                                {patientSearch && (
                                    <Button variant="ghost" size="sm" onClick={() => setPatientSearch("")}>
                                        Limpiar búsqueda
                                    </Button>
                                )}
                            </div>
                            <div className="grid gap-3">
                                {loading ? (
                                    <div className="text-center py-12 text-muted-foreground">Cargando pacientes...</div>
                                ) : filteredPatients.length === 0 ? (
                                    <div className="p-8 border rounded-xl bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-center text-muted-foreground">
                                        No se encontraron pacientes con "{patientSearch}".
                                    </div>
                                ) : (
                                    filteredPatients.map(p => (
                                        <div
                                            key={p.id}
                                            className="group flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-[#ff8508]/50 hover:shadow-md transition-all cursor-pointer"
                                            onClick={() => router.push(`/dietas?patientId=${p.id}`)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <Avatar className="h-12 w-12 border-2 border-slate-100 dark:border-slate-600 group-hover:border-[#ff8508]/20 bg-slate-50 dark:bg-slate-700 overflow-hidden">
                                                    {p.datosPersonales.avatarUrl ? (
                                                        p.datosPersonales.avatarUrl.startsWith('avatar-') ? (
                                                            <AvatarFallback className="bg-gradient-to-br from-[#6cba00] to-[#4a8c00] text-white text-lg">
                                                                {p.datosPersonales.avatarUrl === 'avatar-1' && '👤'}
                                                                {p.datosPersonales.avatarUrl === 'avatar-2' && '👨'}
                                                                {p.datosPersonales.avatarUrl === 'avatar-3' && '👩'}
                                                                {p.datosPersonales.avatarUrl === 'avatar-4' && '👴'}
                                                                {p.datosPersonales.avatarUrl === 'avatar-5' && '👵'}
                                                                {p.datosPersonales.avatarUrl === 'avatar-6' && '🧑‍⚕️'}
                                                                {p.datosPersonales.avatarUrl === 'avatar-7' && '🏃'}
                                                                {p.datosPersonales.avatarUrl === 'avatar-8' && '🏋️'}
                                                                {p.datosPersonales.avatarUrl === 'avatar-9' && '🧘'}
                                                                {p.datosPersonales.avatarUrl === 'avatar-10' && '🚴'}
                                                            </AvatarFallback>
                                                        ) : (
                                                            <img
                                                                src={p.datosPersonales.avatarUrl}
                                                                alt={`${p.datosPersonales.nombre} ${p.datosPersonales.apellido}`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        )
                                                    ) : (
                                                        <AvatarFallback className="text-[#ff8508] font-bold bg-[#ff8508]/10">
                                                            {p.datosPersonales.nombre[0]}{p.datosPersonales.apellido[0]}
                                                        </AvatarFallback>
                                                    )}
                                                </Avatar>
                                                <div>
                                                    <h3 className="font-semibold text-slate-800 dark:text-white group-hover:text-[#ff8508] transition-colors">
                                                        {p.datosPersonales.nombre} {p.datosPersonales.apellido}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs text-muted-foreground">{p.datosPersonales.email || "Sin email"}</span>
                                                        <PatientAgeBadge birthDate={p.datosPersonales.fechaNacimiento} className="text-[10px] px-1.5 py-0" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="h-8 w-8 rounded-full bg-slate-50 dark:bg-slate-700 group-hover:bg-[#ff8508]/10 flex items-center justify-center transition-colors">
                                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#ff8508]" />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        // EMPTY STATE - NO PATIENTS REGISTERED
                        <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in zoom-in-95 duration-500">

                            {/* ICON CLUSTER */}
                            <div className="relative mb-8">
                                <div className="w-24 h-24 bg-[#fff7ed] dark:bg-[#fff7ed]/10 rounded-[2rem] flex items-center justify-center mb-4 text-[#ff8508]">
                                    <Users className="w-10 h-10" />
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-[#6cba00] p-2 rounded-full border-4 border-white dark:border-[#0f172a]">
                                    <Utensils className="w-5 h-5 text-white" />
                                </div>
                            </div>

                            {/* TEXT CONTENT */}
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3 text-center">
                                No hay pacientes registrados
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-center max-w-md mb-8 leading-relaxed">
                                Para crear un plan nutricional, primero debes registrar un paciente en el sistema.
                            </p>

                            {/* ACTION BUTTON */}
                            <Button
                                className="h-12 px-8 rounded-full bg-[#ff8508] hover:bg-[#e67600] text-white font-semibold gap-2 shadow-sm"
                                onClick={() => router.push('/pacientes/nuevo')}
                            >
                                <Plus className="w-4 h-4" /> Agregar Paciente
                            </Button>

                        </div>
                    )}
                </div>

                {/* HISTORY SHEET */}
                <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                    <SheetContent>
                        <SheetHeader>
                            <SheetTitle>Historial de Dietas</SheetTitle>
                            <SheetDescription>
                                Planes nutricionales guardados anteriormente.
                            </SheetDescription>
                        </SheetHeader>
                        <div className="mt-6 space-y-4">
                            {history.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">
                                    No hay dietas guardadas.
                                </div>
                            ) : (
                                history.map((plan) => {
                                    const patientNames = pacientesList.find(p => p.id === plan.patientId)?.datosPersonales;
                                    const fullName = patientNames ? `${patientNames.nombre} ${patientNames.apellido}` : 'Paciente desconocido';
                                    return (
                                        <Card key={plan.id} className="overflow-hidden">
                                            <CardHeader className="p-4 bg-muted/30">
                                                <CardTitle className="text-sm font-medium flex justify-between items-center">
                                                    {plan.name}
                                                    <Badge variant={plan.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                                                        {plan.status === 'active' ? 'Activo' : 'Archivado'}
                                                    </Badge>
                                                </CardTitle>
                                                <CardDescription className="text-xs flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(plan.createdAt).toLocaleDateString()} • {fullName}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="p-4 flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => deletePlan(plan.id)}>
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                                <Button size="sm" onClick={() => router.push(`/dietas?patientId=${plan.patientId}&planId=${plan.id}`)}>
                                                    Ver Plan
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    );
                                })
                            )}
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        );
    }

    // --- RENDER: DIET PLANNER ---
    if (loading || !currentPlan) return <div className="p-8 text-center text-muted-foreground">Cargando base de datos de alimentos...</div>;
    if (!paciente) return <div className="p-8 text-center text-red-500">Paciente no encontrado</div>;

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6 flex flex-col">

            {/* PRINTABLE REPORT (Hidden on screen) */}
            {paciente && weeklyPlan.length > 0 && (
                <div className="hidden print:block fixed inset-0 z-[9999] bg-white">
                    <DietReport
                        paciente={paciente}
                        medidas={medidas[medidas.length - 1] || {}}
                        weeklyPlan={weeklyPlan}
                        currentDayIndex={currentDayIndex}
                    />
                </div>
            )}

            {/* HEADER */}
            <div className="flex flex-col gap-4 shrink-0 print:hidden">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="hover:text-primary cursor-pointer" onClick={() => router.push('/dietas')}>Dietas</span>
                    <span>/</span>
                    <span className="font-medium text-foreground">Planificación</span>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
                            Plan <span className="text-[#ff8508]">Nutricional</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            {paciente.datosPersonales.nombre} {paciente.datosPersonales.apellido} • Meta: {goals.calories} kcal
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">

                        {/* ==================== SEGMENTED CONTROL: Día/Semana ==================== */}
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                            <button
                                onClick={handleAutoGenerateDay}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                                           text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm"
                            >
                                <Wand2 className="w-4 h-4" />
                                Día
                            </button>
                            <button
                                onClick={handleAutoGenerateWeek}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                                           text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm"
                            >
                                <CalendarDays className="w-4 h-4" />
                                Semana
                            </button>
                        </div>

                        {/* ==================== GHOST BUTTONS: Detalles/Historial ==================== */}
                        <Dialog open={showReport} onOpenChange={setShowReport}>
                            <DialogTrigger asChild>
                                <button className="flex items-center gap-1.5 px-3 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-sm font-medium transition-colors">
                                    <FileText className="w-4 h-4" />
                                    Detalles
                                </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-[95vw] xl:max-w-[1400px] w-full max-h-[90vh] overflow-y-auto p-0 border-none bg-transparent shadow-none">
                                <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-2xl p-6 md:p-8 space-y-8">
                                    <DialogHeader className="flex flex-row items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                            {currentPlan.day[0]}
                                        </div>
                                        <div>
                                            <DialogTitle className="text-2xl font-bold text-slate-800 dark:text-white">Detalles Nutricionales</DialogTitle>
                                            <DialogDescription className="text-sm text-muted-foreground capitalize">{currentPlan.day}</DialogDescription>
                                        </div>
                                    </DialogHeader>

                                    {/* 1. MACROS */}
                                    <section>
                                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-4">
                                            <TrendingUp className="w-5 h-5 text-primary" /> Macronutrientes (Actual vs Meta)
                                        </h3>
                                        <MacronutrientsPanel stats={currentPlan.stats} goals={goals} />
                                    </section>

                                    {/* 2. MICROS */}
                                    <section>
                                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-4">
                                            <Activity className="w-5 h-5 text-primary" /> Micronutrientes
                                        </h3>
                                        <MicronutrientsPanel stats={currentPlan.stats} />
                                    </section>
                                </div>
                            </DialogContent>
                        </Dialog>

                        {/* HISTORY - Ghost Button */}
                        <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                            <SheetTrigger asChild>
                                <button className="flex items-center gap-1.5 px-3 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-sm font-medium transition-colors">
                                    <History className="w-4 h-4" />
                                    Historial
                                </button>
                            </SheetTrigger>
                            <SheetContent>
                                <SheetHeader>
                                    <SheetTitle>Historial de Dietas</SheetTitle>
                                    <SheetDescription>
                                        Tus planes guardados anteriormente.
                                    </SheetDescription>
                                </SheetHeader>
                                <div className="mt-6 space-y-4">
                                    {history.length === 0 ? (
                                        <div className="text-center text-muted-foreground py-8">
                                            No hay dietas guardadas.
                                        </div>
                                    ) : (
                                        history.map((plan) => (
                                            <Card key={plan.id} className="overflow-hidden">
                                                <CardHeader className="p-4 bg-muted/30">
                                                    <CardTitle className="text-sm font-medium flex justify-between items-center">
                                                        {plan.name}
                                                        <Badge variant={plan.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                                                            {plan.status === 'active' ? 'Activo' : 'Archivado'}
                                                        </Badge>
                                                    </CardTitle>
                                                    <CardDescription className="text-xs flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(plan.createdAt).toLocaleDateString()}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="p-4 flex justify-end gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => deletePlan(plan.id)}>
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                    <Button size="sm" onClick={() => handleLoadPlan(plan.id)}>
                                                        <RotateCcw className="w-3 h-3 mr-1" /> Cargar
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </SheetContent>
                        </Sheet>

                        {/* ==================== DIVIDER ==================== */}
                        <div className="h-6 w-px bg-slate-300 dark:bg-slate-600 mx-1" />

                        {/* ==================== ACTIONS: Descargar (Outline) / Guardar (CTA) ==================== */}
                        <DownloadButton
                            paciente={paciente}
                            weeklyPlan={weeklyPlan}
                            goals={goals}
                        />

                        <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                            <DialogTrigger asChild>
                                {/* PRIMARY CTA - Solid Green */}
                                <Button className="bg-[#6cba00] hover:bg-[#5da600] text-white font-bold shadow-sm">
                                    <Save className="w-4 h-4 mr-2" /> Guardar
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Guardar Plan Semanal</DialogTitle>
                                    <DialogDescription>
                                        Asigna un nombre a este plan para encontrarlo fácilmente después.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                    <Input
                                        placeholder="Ej. Semana de Definición #1"
                                        value={planName}
                                        onChange={(e) => setPlanName(e.target.value)}
                                    />
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>Cancelar</Button>
                                    <Button onClick={handleSavePlan} className="bg-[#6cba00] hover:bg-[#5da600] text-white font-bold">Guardar Plan</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Patient Nutrition Config - Macro Distribution */}
                <PatientNutritionConfig editable={true} compact={true} />

                {/* VISUALIZATIONS */}
                <DietCharts
                    currentPlan={currentPlan}
                    weeklyPlan={weeklyPlan}
                />
            </div>

            {/* WEEKLY TABS */}
            <Tabs value={String(currentDayIndex)} onValueChange={(v) => setCurrentDayIndex(Number(v))} className="w-full print:hidden">
                <TabsList className="flex w-full overflow-x-auto scrollbar-hide pb-1">
                    {DAYS.map((day, index) => (
                        <TabsTrigger key={day} value={String(index)} className="flex-shrink-0 px-3 md:px-4">
                            <span className="hidden sm:inline">{day}</span>
                            <span className="sm:hidden">{day.slice(0, 3)}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {/* MAIN CONTENT - SPLIT VIEW */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 flex-1 min-h-0 print:hidden">

                {/* LEFT: MEAL PLANNER */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                    <div className="space-y-4">
                        {currentPlan.meals.map((meal, mealIndex) => (
                            <Card key={mealIndex}
                                className={`transition-all ${selectedMealIndex === mealIndex ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
                                onClick={() => setSelectedMealIndex(mealIndex)}
                            >
                                <CardHeader className="py-3 px-4 bg-muted/30 flex flex-row items-center justify-between cursor-pointer">
                                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                                        {meal.name}
                                        <Badge variant="secondary" className="text-xs font-normal">
                                            {Math.round(calculateMealStats(meal.items).calories)} kcal
                                        </Badge>
                                    </CardTitle>
                                    {selectedMealIndex === mealIndex && <Badge className="bg-primary">Seleccionado</Badge>}
                                </CardHeader>
                                <CardContent className="p-0">
                                    {meal.items.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-muted-foreground border-t border-dashed">
                                            Sin alimentos. Selecciona para agregar.
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/50 dark:bg-slate-800/50">
                                                    <TableHead className="font-semibold text-slate-700 dark:text-slate-200">Alimento</TableHead>
                                                    <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-center w-24">Gramos</TableHead>
                                                    <TableHead className="font-semibold text-slate-700 dark:text-slate-200 text-center w-16">Kcal</TableHead>
                                                    <TableHead className="font-semibold text-blue-600 dark:text-blue-400 text-center w-16">P(g)</TableHead>
                                                    <TableHead className="font-semibold text-amber-600 dark:text-amber-400 text-center w-20">Carbs(g)</TableHead>
                                                    <TableHead className="font-semibold text-orange-600 dark:text-orange-400 text-center w-20">Grasas(g)</TableHead>
                                                    <TableHead className="w-12"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {meal.items.map((item, itemIndex) => {
                                                    const factor = item.quantity / 100;
                                                    const kcal = Math.round(item.food.energia * factor);
                                                    const protein = (item.food.proteinas * factor).toFixed(1);
                                                    const carbs = (item.food.carbohidratos * factor).toFixed(1);
                                                    const fat = (item.food.grasa * factor).toFixed(1);

                                                    return (
                                                        <TableRow key={item.id} className="hover:bg-muted/30 dark:hover:bg-slate-800/30">
                                                            <TableCell className="font-medium text-slate-800 dark:text-slate-100">
                                                                {item.food.nombre}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Input
                                                                    type="number"
                                                                    value={item.quantity}
                                                                    onChange={(e) => updateQuantity(mealIndex, itemIndex, Number(e.target.value))}
                                                                    className="w-20 h-8 text-center mx-auto"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-center font-medium text-slate-700 dark:text-slate-200">
                                                                {kcal}
                                                            </TableCell>
                                                            <TableCell className="text-center font-medium text-blue-600 dark:text-blue-400">
                                                                {protein}
                                                            </TableCell>
                                                            <TableCell className="text-center font-medium text-amber-600 dark:text-amber-400">
                                                                {carbs}
                                                            </TableCell>
                                                            <TableCell className="text-center font-medium text-orange-600 dark:text-orange-400">
                                                                {fat}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30" onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeFood(mealIndex, itemIndex);
                                                                }}>
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* RIGHT: FOOD SEARCH */}
                <div className="lg:col-span-5 flex flex-col gap-4 h-full">
                    <Card className="flex flex-col h-full border-l-4 border-l-primary/20 sticky top-4">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Search className="w-5 h-5" /> Buscar Alimentos
                            </CardTitle>
                            <CardDescription>
                                Agregando a: <span className="font-bold text-primary">{currentPlan.meals[selectedMealIndex].name}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
                            <Input
                                placeholder="Ej. Manzana, Pollo, Arroz..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-background"
                            />

                            <div className="flex-1 border rounded-md overflow-hidden bg-muted/10 min-h-[400px]">
                                <ScrollArea className="h-[400px]">
                                    {searchTerm === "" ? (
                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
                                            <Utensils className="w-10 h-10 mb-2 opacity-20" />
                                            <p>Escribe para buscar en la base de datos.</p>
                                        </div>
                                    ) : filteredFoods.length === 0 ? (
                                        <div className="p-4 text-center text-muted-foreground">
                                            No se encontraron resultados.
                                        </div>
                                    ) : (
                                        <div className="divide-y">
                                            {filteredFoods.map((food) => (
                                                <div
                                                    key={food.codigo}
                                                    className="p-3 hover:bg-primary/5 cursor-pointer transition-colors flex justify-between items-center group"
                                                    onClick={() => addFoodToMeal(food)}
                                                >
                                                    <div className="flex-1">
                                                        <div className="font-medium text-sm">{food.nombre}</div>
                                                        <div className="text-xs text-muted-foreground flex gap-2">
                                                            <span>{food.energia} kcal</span>
                                                            <span className="text-blue-600">P: {food.proteinas}</span>
                                                            <span className="text-yellow-600">G: {food.grasa}</span>
                                                        </div>
                                                    </div>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Plus className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function DietasPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Cargando...</div>}>
            <DietasContent />
        </Suspense>
    );
}
