"use client";

import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    Search, Plus, Trash2, Minus,
    Utensils, Save, ChevronRight, Wand2, CalendarDays, FileText, Printer, History, Clock, RotateCcw,
    Activity, TrendingUp, Users, FileCheck, AlertCircle, CheckCircle2, ChevronRight as ChevronRightIcon,
    Baby, Scale, CheckCircle
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

import { type Alimento } from "@/lib/csv-parser";
import { getAllFoods } from "@/lib/food-service";
import { getPlanById } from "@/lib/diet-service";
import { getPacientes, getPacientesAsync, getMedidasByPaciente } from "@/lib/storage";
import { usePatientStore, usePatientNutrition } from "@/store/usePatientStore";
import {
    generateSmartDailyPlan,
    calculateDailyStats,
    calculateMealStats,
    calculateCookedQuantity,
    calculateGrossQuantity,
    DEFAULT_MICRO_GOALS,
    type DailyPlan,
    type Meal,
    type NutritionalGoals
} from "@/lib/diet-generator";
import { DietCharts } from "@/components/diet/DietCharts";
import { DietReport } from "@/components/diet/DietReport";
import { MacronutrientsPanel } from "@/components/diet/MacronutrientsPanel";
import { MicronutrientsPanel } from "@/components/diet/MicronutrientsPanel";
import { PatientAgeBadge } from "@/components/patient/PatientAgeBadge";
import { PatientAvatar } from "@/components/patient/PatientAvatar";
import { getClinicalContextByAge } from "@/lib/clinical-calculations";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Paciente, MedidasAntropometricas } from "@/types";
import { PatientNutritionConfig } from "@/components/patient/PatientNutritionConfig";
import { calculateMifflinStJeor, ACTIVITY_FACTORS, calcularEdad, type ActivityLevel } from "@/lib/calculos-nutricionales";
import { useAuthStore } from "@/store/useAuthStore";
import { useDietHistory } from "@/hooks/useDietHistory";
import { DownloadButton } from "@/components/diet/pdf/DownloadButton";
import {
    generatePediatricNutritionPlan,
    formatPediatricPlanAsText,
    generateExampleMeal,
    type LactationType,
    type ExampleMeal
} from "@/lib/pediatric-nutrition-guidelines";
import { generateAnemiaProtocol, type AnemiaStatus } from "@/lib/anemia-nts-protocol";
import { HydrationCard } from "@/components/diet/HydrationCard";
import { NutrientTimingCard } from "@/components/diet/NutrientTimingCard";
import { MealMomentsManager } from "@/components/patient/MealMomentsManager";
import { ShoppingListDialog } from "@/components/diet/ShoppingListDialog";
import { SyncDot } from "@/components/ui/SyncStatusIndicator";
import { FoodQuantityStepper } from "@/components/diet/FoodQuantityStepper";
const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function DietasContent() {
    const { config: nutritionConfig } = usePatientNutrition();
    const MEAL_NAMES = (nutritionConfig?.mealMoments?.filter(m => m.enabled).map(m => m.name)) || ["Desayuno", "Almuerzo", "Cena", "Colación"];

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

    // Get macro configuration and clinical indicators from patient store
    const {
        macroProteina,
        macroCarbohidratos,
        macroGrasa,
        proteinWarning,
        calorieFloorApplied,
        minCalories,
        isPediatric,
        isGeriatric,
        patientAge,
        pediatricDeficitBlocked,
        autoAdjustedForObesity,
        proteinBasisLabel,
        proteinTargetWeight,
        effectiveFormulaName,
        updateConfig,
        totalCalories // 🔗 SYNC: Get calculated TDEE for reactive updates
    } = usePatientNutrition();


    const [isStructureOpen, setIsStructureOpen] = useState(false);

    // --- STATE ---
    const [pacientesList, setPacientesList] = useState<Paciente[]>([]);
    const [alimentos, setAlimentos] = useState<Alimento[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [patientSearch, setPatientSearch] = useState("");
    const [ageRangeFilter, setAgeRangeFilter] = useState("all");

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
    const autoGeneratedRef = useRef<string | null>(null);

    // Sync Status State (for optimistic UI feedback)
    const [pendingOperations, setPendingOperations] = useState(0);
    const [lastSyncError, setLastSyncError] = useState<string | null>(null);


    // Default Goals - use calculated macros if protein was specified
    const initialMacros = calculateMacrosFromProtein(targetCalories, targetProteinGrams);
    const [goals, setGoals] = useState<NutritionalGoals>({
        calories: targetCalories,
        macros: initialMacros,
        micros: DEFAULT_MICRO_GOALS
    });

    // --- SYNC MEAL STRUCTURE ---
    // If the configuration changes (new meals added), sync the current weeklyPlan structure
    useEffect(() => {
        if (!nutritionConfig?.mealMoments || weeklyPlan.length === 0) return;

        const enabledMoments = nutritionConfig.mealMoments.filter(m => m.enabled);

        // Check if any day in the weekly plan needs structural sync
        const needsSync = weeklyPlan.some(day =>
            day.meals.length !== enabledMoments.length ||
            day.meals.some((m, idx) => !m.name.startsWith(enabledMoments[idx]?.name || ''))
        );

        if (needsSync) {
            setWeeklyPlan(currentPlanState =>
                currentPlanState.map(day => {
                    // Create a map of existing meals by name to preserve content if possible
                    const mealMap = new Map(day.meals.map(m => [m.name, m]));

                    const syncedMeals = enabledMoments.map(moment => {
                        // FIX: Check if a meal exists that starts with the moment name
                        // This preserves plans like "Almuerzo - Lomo Saltado" when syncing with "Almuerzo"
                        const existingMeal = day.meals.find(m => m.name.startsWith(moment.name));

                        if (existingMeal) {
                            return existingMeal;
                        }
                        // Otherwise, create a new empty meal slot for this moment
                        return {
                            name: moment.name,
                            items: [],
                            stats: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 }
                        };
                    });

                    return {
                        ...day,
                        meals: syncedMeals,
                        stats: calculateDailyStats(syncedMeals)
                    };
                })
            );
        }
    }, [nutritionConfig?.mealMoments, weeklyPlan.length]);

    // Handle initial load
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

        // Load foods using server-side cached service
        getAllFoods().then(data => {
            setAlimentos(data);
            setLoading(false);

            // 🪄 AUTO-GENERATE: If this is a new plan (no planId) and foods just loaded,
            // trigger the smart generation automatically to restore the "magic" UX.
            if (!planId && data.length > 0 && autoGeneratedRef.current !== patientId) {
                console.log("[Dietas] Triggering automatic smart generation...");

                // We need to wait a tick for goals to be stable if they were just set
                setTimeout(() => {
                    handleAutoGenerateWeekForData(data);
                    autoGeneratedRef.current = patientId;
                }, 100);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paciente?.id, patientId, planId, medidas.length, targetCalories, alimentos.length]);


    // Load patients list if no patientId
    useEffect(() => {
        async function loadPatients() {
            // Wait for user authentication before loading data
            if (!user?.id) return;

            if (!patientId) {
                setLoading(true);
                try {
                    const list = await getPacientesAsync(user.id);
                    setPacientesList(list);
                } catch (error) {
                    console.error("Error loading patients in Dietas:", error);
                    setPacientesList(getPacientes(user.id));
                } finally {
                    setLoading(false);
                }
            }
        }
        loadPatients();
    }, [patientId, user?.id]);


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

    // 🔗 SYNC: Keep goals.calories in sync with totalCalories from the nutrition hook
    // This ensures the header and config panel always show matching calorie values
    useEffect(() => {
        if (totalCalories && totalCalories > 0) {
            setGoals(prev => {
                if (prev.calories !== totalCalories) {
                    return { ...prev, calories: totalCalories };
                }
                return prev;
            });
        }
    }, [totalCalories]);

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

        // Clear any previous error
        setLastSyncError(null);

        const newMeals = [...currentPlan.meals];
        newMeals[selectedMealIndex].items.push({
            id: Math.random().toString(36).substr(2, 9),
            food,
            quantity: 100, // default 100g
            category: (food as any).categoria || 'otro' // Added fallback category
        });
        updateDailyStats(currentDayIndex, newMeals);

        // Simulate background sync with optimistic feedback
        setPendingOperations(prev => prev + 1);
        setTimeout(() => {
            setPendingOperations(prev => Math.max(0, prev - 1));
        }, 300 + Math.random() * 200);
    };

    const removeFood = (mealIndex: number, foodIndex: number) => {
        setLastSyncError(null);
        const newMeals = [...currentPlan.meals];
        newMeals[mealIndex].items.splice(foodIndex, 1);
        updateDailyStats(currentDayIndex, newMeals);

        // Simulate background sync
        setPendingOperations(prev => prev + 1);
        setTimeout(() => {
            setPendingOperations(prev => Math.max(0, prev - 1));
        }, 200 + Math.random() * 100);
    };

    const updateQuantity = (mealIndex: number, foodIndex: number, newQty: number) => {
        setLastSyncError(null);
        const newMeals = [...currentPlan.meals];
        newMeals[mealIndex].items[foodIndex].quantity = newQty;
        updateDailyStats(currentDayIndex, newMeals);

        // Simulate background sync (debounced effect)
        setPendingOperations(prev => prev + 1);
        setTimeout(() => {
            setPendingOperations(prev => Math.max(0, prev - 1));
        }, 150 + Math.random() * 100);
    };

    const handleAutoGenerateDay = () => {
        // Convert Preferencias to UserPreferences format with clinical data
        const pathologies = paciente?.historiaClinica?.patologias?.map((p: string | { nombre: string }) =>
            typeof p === 'string' ? p : p.nombre
        ) || [];

        const allergies = paciente?.historiaClinica?.alergias?.map((a: string | { nombre: string; severidad?: string }) =>
            typeof a === 'string'
                ? { allergen: a, severity: 'intolerance' as const }
                : { allergen: a.nombre, severity: (a.severidad as 'fatal' | 'intolerance' | 'preference') || 'intolerance' }
        ) || [];

        // Calculate patient age for pediatric safeguards
        const birthDate = paciente?.datosPersonales?.fechaNacimiento;
        const patientAge = birthDate ? Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : undefined;

        const userPrefs = {
            likedFoods: paciente?.preferencias?.likedFoods || [],
            dislikedFoods: paciente?.preferencias?.dislikedFoods || [],
            pathologies,
            allergies,
            age: patientAge,
            medications: (paciente as any)?.medicamentos || [],
            // NEW: Dynamic Meal Management
            mealMoments: nutritionConfig?.mealMoments || [],
        };

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
        handleAutoGenerateWeekForData(alimentos);
    };

    // Shared logic for manual and automatic generation
    const handleAutoGenerateWeekForData = (foodData: Alimento[]) => {
        if (!foodData || foodData.length === 0) return;

        // Convert Preferencias to UserPreferences format with clinical data
        const pathologies = paciente?.historiaClinica?.patologias?.map((p: string | { nombre: string }) =>
            typeof p === 'string' ? p : p.nombre
        ) || [];

        const allergies = paciente?.historiaClinica?.alergias?.map((a: string | { nombre: string; severidad?: string }) =>
            typeof a === 'string'
                ? { allergen: a, severity: 'intolerance' as const }
                : { allergen: a.nombre, severity: (a.severidad as 'fatal' | 'intolerance' | 'preference') || 'intolerance' }
        ) || [];

        const birthDate = paciente?.datosPersonales?.fechaNacimiento;
        const patientAge = birthDate ? Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : undefined;

        const userPrefs = {
            likedFoods: paciente?.preferencias?.likedFoods || [],
            dislikedFoods: paciente?.preferencias?.dislikedFoods || [],
            pathologies,
            allergies,
            age: patientAge,
            medications: (paciente as any)?.medicamentos || [],
            // NEW: Dynamic Meal Management
            mealMoments: nutritionConfig?.mealMoments || [],
        };

        const newPlan = DAYS.map(day => generateSmartDailyPlan(
            goals,
            foodData,
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

        // Normalize: remove accents, punctuation and split into keywords
        const normalize = (str: string) =>
            str.toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "") // Remove accents
                .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // Remove punctuation
                .trim();

        const searchKeywords = normalize(searchTerm).split(/\s+/).filter(k => k.length > 0);

        if (searchKeywords.length === 0) return [];

        return alimentos
            .filter(a => {
                const normalizedFoodName = normalize(a.nombre);
                // All keywords must be present in the food name
                return searchKeywords.every(keyword => normalizedFoodName.includes(keyword));
            })
            .slice(0, 50);
    }, [searchTerm, alimentos]);

    const processedPatients = useMemo(() => {
        return pacientesList
            .filter((p: Paciente) => {
                // Search filter
                const nameMatch = !patientSearch ||
                    p.datosPersonales.nombre.toLowerCase().includes(patientSearch.toLowerCase()) ||
                    p.datosPersonales.apellido.toLowerCase().includes(patientSearch.toLowerCase());

                // Age range filter
                let matchesAge = true;
                if (ageRangeFilter !== "all") {
                    const { context } = getClinicalContextByAge(p.datosPersonales.fechaNacimiento);
                    matchesAge = context === ageRangeFilter;
                }

                return nameMatch && matchesAge;
            })
            .sort((a: Paciente, b: Paciente) => {
                // Sort by createdAt descending (most recent first)
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });
    }, [patientSearch, ageRangeFilter, pacientesList]);


    // --- RENDER: PATIENT SELECTION (DASHBOARD) ---
    if (!patientId) {
        return (
            <div className="min-h-screen bg-background">
                {/* HEADER - SAME STYLE AS ANTROPOMETRIA */}
                <div className="border-b border-slate-100 dark:border-slate-800 bg-background sticky top-0 z-30">
                    <div className="container mx-auto px-4 md:px-6 py-4 md:py-0 md:h-20 flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-[1600px]">

                        {/* LEFT: Title & Subtitle */}
                        <div className="flex flex-col">
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight font-sans">
                                Gestor de <span className="text-[#ff8508]">Dietas</span>
                            </h1>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                                Administración Nutricional Integral
                            </p>
                        </div>

                        {/* RIGHT: Controls */}
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
                            {/* Age Range Filter */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 hidden lg:inline">Rango Etario:</span>
                                <Select value={ageRangeFilter} onValueChange={setAgeRangeFilter}>
                                    <SelectTrigger className="w-[160px] h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm focus:ring-[#ff8508] focus:border-[#ff8508]">
                                        <SelectValue placeholder="Todos los rangos" />
                                    </SelectTrigger>
                                    <SelectContent align="end" className="rounded-xl border-slate-200 dark:border-slate-700">
                                        <SelectItem value="all">Todos los rangos</SelectItem>
                                        <SelectItem value="lactante">Lactantes</SelectItem>
                                        <SelectItem value="pediatrico">Pediátricos</SelectItem>
                                        <SelectItem value="adulto">Adultos</SelectItem>
                                        <SelectItem value="adulto_mayor">Adultos Mayores</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

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
                                <h2 className="text-lg font-semibold text-slate-800 dark:text-[#f8fafc]">
                                    Directorio de Pacientes
                                    <span className="ml-2 text-xs text-slate-400 font-normal lowercase">
                                        ({processedPatients.length} {processedPatients.length === 1 ? 'paciente' : 'pacientes'})
                                    </span>
                                </h2>
                                {(patientSearch || ageRangeFilter !== "all") && (
                                    <Button variant="ghost" size="sm" onClick={() => {
                                        setPatientSearch("");
                                        setAgeRangeFilter("all");
                                    }}>
                                        Limpiar filtros
                                    </Button>
                                )}
                            </div>
                            <div className="grid gap-3">
                                {loading ? (
                                    <div className="text-center py-12 text-muted-foreground">Cargando pacientes...</div>
                                ) : processedPatients.length === 0 ? (
                                    <div className="p-8 border rounded-xl bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-center text-muted-foreground">
                                        No se encontraron pacientes con los filtros aplicados.
                                    </div>
                                ) : (
                                    processedPatients.map(p => (
                                        <div
                                            key={p.id}
                                            className="group flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-[#ff8508]/50 hover:shadow-md transition-all cursor-pointer"
                                            onClick={() => router.push(`/dietas?patientId=${p.id}`)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <PatientAvatar
                                                    patient={p}
                                                    className="h-12 w-12 group-hover:border-[#ff8508]/20"
                                                />
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
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 text-center">
                                No hay pacientes registrados
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md mb-8 leading-relaxed">
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

    // Calculate patient age in months for pediatric detection
    const birthDateStr = paciente.datosPersonales?.fechaNacimiento;
    const patientAgeInMonths = birthDateStr
        ? Math.floor((Date.now() - new Date(birthDateStr).getTime()) / (1000 * 60 * 60 * 24 * 30.4375))
        : 999;

    // =========================================================================
    // PEDIATRIC UI: Patients under 36 months get special INS/MINSA handles
    // =========================================================================
    if (patientAgeInMonths < 36) {
        const pediatricPlan = generatePediatricNutritionPlan({
            ageInMonths: patientAgeInMonths,
            lactationType: "materna" as LactationType, // Default, could be configurable
        });

        // --- ANEMIA PROTOCOL LOGIC (NTS 213-2024) ---
        const latestWeight = medidas.length > 0
            ? [...medidas].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0].peso
            : paciente.datosPersonales.peso || 10; // Fallback to 10kg if missing

        const latestHb = paciente.historiaClinica?.bioquimicaReciente?.hemoglobina;
        const altitude = paciente.historiaClinica?.altitudResidencia || 0;
        const isPregnant = paciente.pregnancyInfo?.isPregnant || false;
        const gestationalWeeks = paciente.pediatricInfo?.semanasGestacion;

        const hasAnemiaTag = paciente.historiaClinica?.patologias?.includes('anemia');
        const anemiaStatus: AnemiaStatus = hasAnemiaTag ? "SI" : "NO";

        const anemiaProtocol = generateAnemiaProtocol({
            ageInMonths: patientAgeInMonths,
            weightKg: latestWeight,
            anemiaStatus: anemiaStatus,
            hbValue: latestHb,
            altitudeMeters: altitude,
            isPregnant: isPregnant,
            gestationalWeeks: gestationalWeeks,
            isPremature: paciente.pediatricInfo?.isPremature,
            isLowBirthWeight: paciente.pediatricInfo?.isLowBirthWeight,
            sex: (paciente.datosPersonales.sexo === 'masculino' || paciente.datosPersonales.sexo === 'femenino')
                ? paciente.datosPersonales.sexo
                : undefined,
        });

        // Generate example meal for babies 6+ months
        const exampleMeal = patientAgeInMonths >= 6 ? generateExampleMeal(patientAgeInMonths) : null;

        return (
            <div className="container mx-auto p-4 md:p-6 max-w-4xl">
                {/* Header */}
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="hover:text-primary cursor-pointer" onClick={() => router.push('/dietas')}>Dietas</span>
                        <span>/</span>
                        <span className="font-medium text-foreground">Guías Pediátricas INS/MINSA</span>
                    </div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-3">
                                <PatientAvatar
                                    patient={paciente}
                                    className="h-10 w-10 border-none bg-white shadow-sm"
                                />
                                Plan <span className="text-[#ff8508]">Nutricional</span>
                            </h1>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                                {paciente.datosPersonales.nombre} {paciente.datosPersonales.apellido} • {patientAgeInMonths} meses
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {paciente.pediatricInfo?.isPremature || (paciente.pediatricInfo?.semanasGestacion && paciente.pediatricInfo.semanasGestacion < 37) ? (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 rounded-lg border border-orange-500/20 w-fit">
                                        <Baby className="w-3.5 h-3.5 text-orange-500" />
                                        <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-tight">
                                            Prematuro ({paciente.pediatricInfo.semanasGestacion} sem)
                                        </span>
                                    </div>
                                ) : paciente.pediatricInfo?.semanasGestacion ? (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 rounded-lg border border-blue-500/20 w-fit">
                                        <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tight">
                                            A Término ({paciente.pediatricInfo.semanasGestacion} sem)
                                        </span>
                                    </div>
                                ) : null}

                                {paciente.pediatricInfo?.isLowBirthWeight || (paciente.pediatricInfo?.pesoNacer && paciente.pediatricInfo.pesoNacer < 2500) ? (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 rounded-lg border border-red-500/20 w-fit">
                                        <Scale className="w-3.5 h-3.5 text-red-500" />
                                        <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-tight">
                                            Bajo Peso ({paciente.pediatricInfo.pesoNacer}g)
                                        </span>
                                    </div>
                                ) : paciente.pediatricInfo?.pesoNacer ? (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20 w-fit">
                                        <Scale className="w-3.5 h-3.5 text-emerald-500" />
                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">
                                            Peso Normal ({paciente.pediatricInfo.pesoNacer}g)
                                        </span>
                                    </div>
                                ) : null}

                                {effectiveFormulaName && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 rounded-lg border border-sky-500/20 w-fit">
                                        <Activity className="w-3.5 h-3.5 text-sky-500" />
                                        <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-tight">
                                            Fórmula: {effectiveFormulaName}
                                        </span>
                                    </div>
                                )}

                                {!paciente.pediatricInfo?.semanasGestacion && !paciente.pediatricInfo?.pesoNacer && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-500/5 rounded-lg border border-slate-500/10 w-fit">
                                        <AlertCircle className="w-3 h-3 text-slate-400" />
                                        <span className="text-[10px] font-medium text-slate-500 italic">
                                            Sin antecedentes de nacimiento registrados
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <PatientAgeBadge birthDate={birthDateStr || ""} className="text-sm px-3 py-1" />
                    </div>
                </div>

                {/* Main Content */}
                <div className="space-y-6">
                    {/* Age-specific banner */}
                    <Card className={`border-2 ${patientAgeInMonths < 6
                        ? 'border-pink-300 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30'
                        : 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30'}`}
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                {patientAgeInMonths < 6 ? '🤱 Lactancia Materna Exclusiva' : '🥣 Alimentación Complementaria'}
                            </CardTitle>
                            <CardDescription>
                                {patientAgeInMonths < 6
                                    ? 'Hasta los 6 meses: Solo leche materna o fórmula'
                                    : 'Leche materna + alimentos sólidos según guías INS/MINSA'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                {pediatricPlan.breastfeedingRecommendation}
                            </p>
                            <p className="text-xs text-slate-500 mt-2">
                                <strong>Frecuencia:</strong> {pediatricPlan.breastfeedingFrequency}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Texture and Frequency (for 6+ months) */}
                    {pediatricPlan.texture && (
                        <Card className="border-blue-200 dark:border-blue-800/30 bg-gradient-to-br from-blue-50/80 to-sky-50/50 dark:from-blue-950/30 dark:to-sky-950/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    🥄 ¿Qué Comer Hoy?
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border">
                                        <p className="text-xs text-slate-500 mb-1">Textura</p>
                                        <p className="text-sm font-medium">{pediatricPlan.texture.description}</p>
                                    </div>
                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border">
                                        <p className="text-xs text-slate-500 mb-1">Frecuencia</p>
                                        <p className="text-sm font-medium">{pediatricPlan.mealFrequency}</p>
                                    </div>
                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border">
                                        <p className="text-xs text-slate-500 mb-1">Cantidad</p>
                                        <p className="text-sm font-medium">{pediatricPlan.portionSize}</p>
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <p className="text-xs text-slate-500 mb-2">Ejemplos de preparaciones:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {pediatricPlan.texture.examples.map((ex, i) => (
                                            <Badge key={i} variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                                {ex}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* PLATO IDEAL - Example Meal (for 6+ months) */}
                    {exampleMeal && (
                        <Card className="border-2 border-orange-300 dark:border-orange-700/50 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/30 shadow-lg">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    🍽️ Plato Ideal: {exampleMeal.name}
                                </CardTitle>
                                <CardDescription className="text-sm">
                                    Ejemplo de comida apta para <Badge variant="secondary" className="ml-1">{exampleMeal.ageRange}</Badge>
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* 4 Components Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {/* Base - Energía */}
                                    <div className="p-3 bg-amber-100/70 dark:bg-amber-900/30 rounded-xl border border-amber-200 dark:border-amber-800">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">🍚</span>
                                            <span className="font-semibold text-sm text-amber-800 dark:text-amber-300">La Base (Energía)</span>
                                        </div>
                                        <p className="font-medium text-sm">{exampleMeal.base.ingredient}</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                            <em>Preparación:</em> {exampleMeal.base.preparation}
                                        </p>
                                    </div>

                                    {/* Proteína - Hierro */}
                                    <div className="p-3 bg-red-100/70 dark:bg-red-900/30 rounded-xl border border-red-200 dark:border-red-800">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">🥩</span>
                                            <span className="font-semibold text-sm text-red-800 dark:text-red-300">El Constructor (Hierro)</span>
                                        </div>
                                        <p className="font-medium text-sm">{exampleMeal.protein.ingredient}</p>
                                        <p className="text-xs text-red-700 dark:text-red-400 font-medium mt-1">
                                            📏 {exampleMeal.protein.quantity}
                                        </p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                            <em>Preparación:</em> {exampleMeal.protein.preparation}
                                        </p>
                                    </div>

                                    {/* Vegetales - Vitaminas */}
                                    <div className="p-3 bg-green-100/70 dark:bg-green-900/30 rounded-xl border border-green-200 dark:border-green-800">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">🥬</span>
                                            <span className="font-semibold text-sm text-green-800 dark:text-green-300">El Protector (Vitaminas)</span>
                                        </div>
                                        <p className="font-medium text-sm">{exampleMeal.vegetable.ingredient}</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                            <em>Preparación:</em> {exampleMeal.vegetable.preparation}
                                        </p>
                                    </div>

                                    {/* Grasa Saludable */}
                                    <div className="p-3 bg-yellow-100/70 dark:bg-yellow-900/30 rounded-xl border border-yellow-200 dark:border-yellow-800">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">🫒</span>
                                            <span className="font-semibold text-sm text-yellow-800 dark:text-yellow-300">Grasa Saludable</span>
                                        </div>
                                        <p className="font-medium text-sm">{exampleMeal.fat.ingredient}</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                            {exampleMeal.fat.quantity}
                                        </p>
                                    </div>
                                </div>

                                {/* Resumen Visual */}
                                <div className="mt-4 pt-3 border-t border-orange-200 dark:border-orange-800 flex flex-wrap gap-3 text-xs">
                                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border">
                                        <span>📊</span>
                                        <span><strong>Consistencia:</strong> {exampleMeal.texture}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border">
                                        <span>🥄</span>
                                        <span><strong>Cantidad:</strong> {exampleMeal.totalQuantity}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800">
                                        <span>💧</span>
                                        <span>{exampleMeal.accompaniment}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Iron-rich foods */}
                    {pediatricPlan.ironRichFoods.length > 0 && (
                        <Card className="border-red-200 dark:border-red-800/30 bg-gradient-to-br from-red-50/80 to-orange-50/50 dark:from-red-950/30 dark:to-orange-950/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    🩸 Alimentos Estrella (Prioridad Hierro)
                                </CardTitle>
                                <CardDescription>Incluir DIARIAMENTE 2 cucharadas de alguno de estos:</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                                    {pediatricPlan.ironRichFoods.slice(0, 10).map((food, i) => (
                                        <div key={i} className="p-2 bg-white dark:bg-slate-800 rounded-lg border text-xs text-center">
                                            {food}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Forbidden foods */}
                    <Card className="border-amber-300 dark:border-amber-800/30 bg-gradient-to-br from-amber-50/80 to-yellow-50/50 dark:from-amber-950/30 dark:to-yellow-950/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                ⚠️ Lista de Prohibidos
                            </CardTitle>
                            <CardDescription>Por seguridad del bebé, evitar completamente:</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {pediatricPlan.forbiddenFoods.slice(0, 8).map((food, i) => (
                                    <div key={i} className="flex items-center gap-2 p-2 bg-amber-100/50 dark:bg-amber-900/20 rounded-lg text-xs">
                                        <span className="text-red-500">❌</span>
                                        <span>{food}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Alerts */}
                    {pediatricPlan.alerts.length > 0 && (
                        <Card className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    💡 Notas Importantes
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {pediatricPlan.alerts.map((alert, i) => (
                                        <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2">
                                            <span className="mt-0.5">•</span>
                                            <span>{alert}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    {/* ANEMIA PROTOCOL (NTS 213-2024) - Specialized Report */}
                    {patientAgeInMonths < 36 && (
                        <Card className={`border-2 shadow-md overflow-hidden ${anemiaProtocol.protocolType === 'TRATAMIENTO CURATIVO'
                            ? 'border-red-400 dark:border-red-900/50 bg-red-50/30 dark:bg-red-950/20'
                            : 'border-blue-300 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20'}`}
                        >
                            <CardHeader className="pb-3 border-b bg-white/50 dark:bg-slate-800/50">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">🩸</span>
                                        <div>
                                            <CardTitle className="text-lg font-bold">Protocolo de Hierro: {anemiaProtocol.protocolType}</CardTitle>
                                            <CardDescription className="text-xs font-semibold text-red-600 dark:text-red-400">
                                                NTS N° 213-MINSA/DGIESP-2024
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <Badge className={anemiaProtocol.protocolType === 'TRATAMIENTO CURATIVO' ? 'bg-red-500' : 'bg-blue-500'}>
                                            {anemiaProtocol.diagnosisLabel}
                                        </Badge>
                                        {(anemiaProtocol.altitudeAdjustment || 0) > 0 && (
                                            <span className="text-[10px] font-medium text-slate-500 italic">
                                                Hb ajustada por altitud (-{anemiaProtocol.altitudeAdjustment})
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                {/* Doses */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 -mr-8 -mt-8 rounded-full transition-all group-hover:scale-110"></div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Dosis Diaria Calculada</p>
                                        <p className="text-xl font-black text-slate-800 dark:text-white">
                                            Debes darle <span className="text-red-600 dark:text-red-400">{anemiaProtocol.doseMg} mg</span> de Hierro al día.
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <div className="px-3 py-1 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-lg text-xs font-bold border border-red-100 dark:border-red-900/30">
                                                💧 {anemiaProtocol.drops} gotas
                                            </div>
                                            <div className="px-3 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold border border-blue-100 dark:border-blue-900/30">
                                                🥄 {anemiaProtocol.syrupMl} ml jarabe
                                            </div>
                                            {anemiaProtocol.folicAcidMg && (
                                                <div className="px-3 py-1 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 rounded-lg text-xs font-bold border border-purple-100 dark:border-purple-900/30">
                                                    ➕ {anemiaProtocol.folicAcidMg} mg Ác. Fólico
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-[#fff7ed] dark:bg-orange-950/10 border-2 border-orange-100 dark:border-orange-900/20 shadow-sm">
                                        <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> Ojo Nutricional
                                        </p>
                                        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                                            Dárselo a <strong>media mañana</strong> (1 hora antes de comer) acompañado de algo <strong>cítrico</strong> (mandarina/naranja) para mejor absorción. <span className="text-red-600 font-bold">NUNCA</span> con leche.
                                        </p>
                                    </div>
                                </div>

                                {/* Menu rules */}
                                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Utensils className="w-5 h-5 text-[#6cba00]" />
                                        <h4 className="font-bold text-slate-800 dark:text-white">Reglas Alimentarias</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Textura sugerida</span>
                                            <span className="font-semibold text-[#6cba00]">{anemiaProtocol.texture}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Cantidad y Frecuencia</span>
                                            <span className="font-semibold">{anemiaProtocol.portionSize} ({anemiaProtocol.mealFrequency})</span>
                                        </div>
                                        <div className="md:col-span-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-3">
                                            <span className="text-2xl animate-pulse">🌟</span>
                                            <p className="text-xs">
                                                <strong className="text-red-700 dark:text-red-400 uppercase">El "Cura-Anemia" (Obligatorio):</strong><br />
                                                {anemiaProtocol.ironRichFoodRule}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Inhibitors & Meta */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700">
                                        <h5 className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1 uppercase">🚫 Enemigos del Hierro</h5>
                                        <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                                            <li className="flex items-center gap-2"><span>•</span> No infusiones (té, anís, manzanilla).</li>
                                            <li className="flex items-center gap-2"><span>•</span> No leche/yogur junto con el almuerzo.</li>
                                            <li className="flex items-center gap-2"><span>•</span> El calcio bloquea el hierro. Esperar 2 horas.</li>
                                        </ul>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-[#6cba00]/10 border-2 border-[#6cba00]/20 flex flex-col justify-center items-center text-center">
                                        <h5 className="text-[10px] font-bold text-[#6cba00] uppercase mb-1">📅 Meta del Mes</h5>
                                        <p className="text-xs font-bold text-slate-800 dark:text-white leading-snug">
                                            {anemiaProtocol.meta}
                                        </p>
                                    </div>
                                </div>

                                {/* Recordatorio de inicio de suplementación para prematuros vs términos */}
                                {paciente.pediatricInfo?.semanasGestacion && patientAgeInMonths < 12 && (
                                    <div className={`p-4 rounded-xl border ${paciente.pediatricInfo.semanasGestacion < 37 ? 'bg-orange-500/10 border-orange-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <AlertCircle className={`w-4 h-4 ${paciente.pediatricInfo.semanasGestacion < 37 ? 'text-orange-500' : 'text-blue-500'}`} />
                                            <span className={`text-xs font-bold uppercase ${paciente.pediatricInfo.semanasGestacion < 37 ? 'text-orange-400' : 'text-blue-400'}`}>
                                                Nota de Inicio (NTS 2024)
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                            {paciente.pediatricInfo.semanasGestacion < 37
                                                ? "Inicia suplementación a los 30 días de nacido por antecedentes de prematuridad."
                                                : "Inicia suplementación a los 4 meses cumplidos para niños nacidos a término."}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Back button */}
                    <div className="flex justify-center pt-4">
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/pacientes/${paciente.id}`)}
                            className="gap-2"
                        >
                            ← Volver al Expediente
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // =========================================================================
    // REGULAR DIET PLANNER (for patients 24+ months)
    // =========================================================================
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
                    <div className="flex items-center gap-4">
                        <PatientAvatar
                            patient={paciente}
                            className="h-14 w-14 shadow-md bg-white border-white dark:border-slate-800"
                        />
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
                                Plan <span className="text-[#ff8508]">Nutricional</span>
                            </h1>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                                {paciente.datosPersonales.nombre} {paciente.datosPersonales.apellido} • Meta: {goals.calories} kcal
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {isPediatric && (
                                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 gap-1 animate-pulse">
                                        <Baby className="w-3 h-3" /> Pediátrico ({patientAge} años)
                                    </Badge>
                                )}
                                {isGeriatric && (
                                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 gap-1">
                                        <Users className="w-3 h-3" /> Adulto Mayor ({patientAge} años)
                                    </Badge>
                                )}
                                {effectiveFormulaName && (
                                    <Badge variant="outline" className="text-[10px] border-sky-500/50 text-sky-600 dark:text-sky-400 bg-sky-50/30 dark:bg-sky-900/10">
                                        Fórmula: {effectiveFormulaName}
                                    </Badge>
                                )}
                                {/* Sync Status Indicator */}
                                <div className="flex items-center gap-1.5" title={pendingOperations > 0 ? `Guardando ${pendingOperations} cambio${pendingOperations > 1 ? 's' : ''}...` : 'Cambios guardados'}>
                                    <SyncDot
                                        hasPendingActions={pendingOperations > 0}
                                        lastError={lastSyncError}
                                    />
                                </div>
                            </div>
                        </div>
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

                        {/* ==================== MEAL STRUCTURE BUTTON ==================== */}
                        <Sheet open={isStructureOpen} onOpenChange={setIsStructureOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" className="h-10 rounded-xl border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#ff8508] hover:border-[#ff8508] gap-2 font-bold shadow-sm">
                                    <Clock className="w-4 h-4" />
                                    Estructura
                                </Button>
                            </SheetTrigger>
                            <SheetContent className="sm:max-w-md md:max-w-lg">
                                <SheetHeader className="mb-6">
                                    <SheetTitle className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                                        <Clock className="w-6 h-6 text-[#ff8508]" />
                                        Estructura de Dieta
                                    </SheetTitle>
                                    <SheetDescription>
                                        Configura los momentos de comida y su distribución calórica.
                                    </SheetDescription>
                                </SheetHeader>
                                <div className="space-y-6">
                                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-2xl">
                                        <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                                            💡 Los cambios que realices aquí se aplicarán a la <strong>próxima generación</strong> automática del plan.
                                        </p>
                                    </div>
                                    <MealMomentsManager
                                        moments={nutritionConfig?.mealMoments || []}
                                        totalCalories={targetCalories}
                                        isEditing={true}
                                        onUpdate={(updated) => updateConfig({ mealMoments: updated })}
                                    />
                                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <Button
                                            className="w-full bg-[#ff8508] hover:bg-[#e67600] text-white font-black h-12 rounded-2xl shadow-lg shadow-orange-500/20"
                                            onClick={() => setIsStructureOpen(false)}
                                        >
                                            <CheckCircle className="w-5 h-5 mr-2" /> LISTO
                                        </Button>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>

                        {/* ==================== GHOST BUTTONS: Detalles/Historial ==================== */}
                        <div className="flex items-center gap-1">
                            <ShoppingListDialog plan={weeklyPlan} />
                        </div>

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
                                            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 italic">{currentPlan.day}</DialogDescription>
                                        </div>
                                    </DialogHeader>

                                    {/* 1. MACROS */}
                                    <section>
                                        <h3 className="text-[15.5px] font-black text-slate-500 dark:text-slate-400 tracking-[0.1em] flex items-center gap-2 mb-4">
                                            <TrendingUp className="w-4 h-4 text-[#ff8508]" /> Macronutrientes (Actual vs Meta)
                                        </h3>
                                        <MacronutrientsPanel stats={currentPlan.stats} goals={goals} />
                                    </section>

                                    {/* 2. MICROS */}
                                    <section>
                                        <h3 className="text-[15.5px] font-black text-slate-500 dark:text-slate-400 tracking-[0.1em] flex items-center gap-2 mb-4">
                                            <Activity className="w-4 h-4 text-[#ff8508]" /> Micronutrientes
                                        </h3>
                                        <MicronutrientsPanel stats={currentPlan.stats} />
                                    </section>

                                    {/* 3. HYDRATION */}
                                    <section>
                                        <h3 className="text-[15.5px] font-black text-slate-500 dark:text-slate-400 tracking-[0.1em] flex items-center gap-2 mb-4">
                                            💧 Hidratación Diaria
                                        </h3>
                                        <HydrationCard
                                            weightKg={medidas.length > 0 ? medidas[0].peso : 70}
                                            activityLevel={paciente?.configuracionNutricional?.nivelActividad || 'moderada'}
                                            age={birthDateStr ? Math.floor((Date.now() - new Date(birthDateStr).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : undefined}
                                            pathologies={paciente?.historiaClinica?.patologias as string[] || []}
                                        />
                                    </section>

                                    {/* 4. TIMING NUTRICIONAL (for athletes) */}
                                    <section>
                                        <h3 className="text-[15.5px] font-black text-slate-500 dark:text-slate-400 tracking-[0.1em] flex items-center gap-2 mb-4">
                                            ⏱️ Timing Nutricional
                                        </h3>
                                        <NutrientTimingCard
                                            weightKg={medidas.length > 0 ? medidas[0].peso : 70}
                                            activityLevel={paciente?.configuracionNutricional?.nivelActividad || 'moderada'}
                                            totalCalories={goals.calories}
                                            targetCarbsG={Math.round((goals.calories * (goals.macros.carbs / 100)) / 4)}
                                            targetProteinG={Math.round((goals.calories * (goals.macros.protein / 100)) / 4)}
                                        />
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

                {/* SAFETY WARNINGS PANEL - Clinical Audit Integration */}
                {currentPlan.safetyWarnings && currentPlan.safetyWarnings.length > 0 && (
                    <Card className="border-amber-200 dark:border-amber-800/30 bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 shadow-sm">
                        <CardHeader className="py-3 px-4">
                            <CardTitle className="text-lg font-semibold text-red-500 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Advertencias de Seguridad
                                <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-[10px] lowercase tracking-normal">
                                    {currentPlan.safetyWarnings.length}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-2 px-4">
                            <div className="space-y-2">
                                {/* Clinical Store Warnings (Highest Priority) */}
                                {proteinWarning && (
                                    <div className="px-3 py-2 rounded-lg border bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 text-xs font-medium flex items-start gap-2">
                                        <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
                                        {proteinWarning}
                                    </div>
                                )}
                                {calorieFloorApplied && (
                                    <div className="px-3 py-2 rounded-lg border bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300 text-xs font-medium flex items-start gap-2">
                                        <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
                                        🚨 PISO DE SEGURIDAD ACTIVADO: Se forzó el mínimo de {minCalories} kcal para evitar riesgos metabólicos.
                                    </div>
                                )}
                                {pediatricDeficitBlocked && (
                                    <div className="px-3 py-2 rounded-lg border bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/40 text-orange-700 dark:text-orange-300 text-xs font-medium flex items-start gap-2">
                                        <Baby className="w-3.5 h-3.5 mt-0.5" />
                                        🛡️ BLOQUEO PEDIÁTRICO: No se permiten objetivos de déficit en menores de edad para asegurar el crecimiento.
                                    </div>
                                )}

                                {/* Diet Plan Logic Warnings */}
                                {currentPlan.safetyWarnings.map((warning, index) => {
                                    // ... existing severity logic ...
                                    // Determine severity based on emoji/keyword
                                    const isCritical = warning.includes('🚨') || warning.includes('ALERTA') || warning.includes('🔴');
                                    const isModerate = warning.includes('⚠️') || warning.includes('💊') || warning.includes('⏱️');
                                    const isInfo = warning.includes('🔬') || warning.includes('🍽️') || warning.includes('ℹ️');

                                    const bgColor = isCritical
                                        ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/40'
                                        : isModerate
                                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40'
                                            : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/40';

                                    const textColor = isCritical
                                        ? 'text-red-700 dark:text-red-300'
                                        : isModerate
                                            ? 'text-amber-700 dark:text-amber-300'
                                            : 'text-blue-700 dark:text-blue-300';

                                    return (
                                        <div
                                            key={index}
                                            className={`px-3 py-2 rounded-lg border text-xs ${bgColor} ${textColor}`}
                                        >
                                            {warning}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

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
                <div className="lg:col-span-8 flex flex-col gap-4">
                    <div className="space-y-4">
                        {currentPlan.meals.map((meal, mealIndex) => (
                            <Card key={mealIndex}
                                className={`transition-all ${selectedMealIndex === mealIndex ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
                                onClick={() => setSelectedMealIndex(mealIndex)}
                            >
                                <CardHeader className="py-3 px-4 bg-muted/30 flex flex-row items-center justify-center cursor-pointer relative">
                                    <CardTitle className="text-lg font-medium text-slate-800 dark:text-white flex items-center gap-2">
                                        {meal.name}
                                        <Badge variant="secondary" className="text-[10px] font-bold text-[#ff8508] bg-[#ff8508]/10 lowercase tracking-normal italic">
                                            {Math.round(calculateMealStats(meal.items).calories)} kcal
                                        </Badge>
                                    </CardTitle>
                                    {selectedMealIndex === mealIndex && (
                                        <Badge className="absolute right-4 bg-primary text-white text-[10px] py-0 px-2 h-5">
                                            Seleccionado
                                        </Badge>
                                    )}
                                </CardHeader>
                                <CardContent className="p-0">
                                    {meal.items.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-muted-foreground border-t border-dashed">
                                            Sin alimentos. Selecciona para agregar.
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/50">
                                                    <TableHead className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-4">Alimento</TableHead>
                                                    <TableHead className="text-[10px] font-bold text-blue-600 dark:text-blue-400 text-center w-[110px] leading-tight p-2 uppercase">
                                                        <div className="flex flex-col items-center justify-center w-full">
                                                            <span className="mb-0.5 text-center">Crudo</span>
                                                            <div className="h-0.5 w-6 bg-blue-500/50 rounded-full mx-auto"></div>
                                                        </div>
                                                    </TableHead>
                                                    <TableHead className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 text-center w-20 leading-tight p-2 uppercase">
                                                        <div className="flex flex-col items-center justify-center w-full">
                                                            <span className="mb-0.5 text-center">Cocido</span>
                                                            <div className="h-0.5 w-6 bg-emerald-500/50 rounded-full mx-auto"></div>
                                                        </div>
                                                    </TableHead>
                                                    <TableHead className="text-[10px] font-bold text-orange-600 dark:text-orange-400 text-center w-20 leading-tight p-2 uppercase">
                                                        <div className="flex flex-col items-center justify-center w-full">
                                                            <span className="mb-0.5 text-center">Bruto</span>
                                                            <div className="h-0.5 w-4 bg-orange-500/50 rounded-full mx-auto"></div>
                                                        </div>
                                                    </TableHead>
                                                    <TableHead className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 text-center w-14 p-2">KCAL</TableHead>
                                                    <TableHead className="text-[10px] font-semibold text-blue-500/70 dark:text-blue-400/70 text-center w-14 p-2">P(G)</TableHead>
                                                    <TableHead className="text-[10px] font-semibold text-amber-500/70 dark:text-amber-400/70 text-center w-14 p-2">CH(G)</TableHead>
                                                    <TableHead className="text-[10px] font-semibold text-orange-500/70 dark:text-orange-400/70 text-center w-14 p-2">GR(G)</TableHead>
                                                    <TableHead className="w-10 p-2"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {meal.items.map((item, itemIndex) => {
                                                    const factor = item.quantity / 100;
                                                    const kcal = Math.round(item.food.energia * factor);
                                                    const protein = (item.food.proteinas * factor).toFixed(1);
                                                    const carbs = (item.food.carbohidratos * factor).toFixed(1);
                                                    const fat = (item.food.grasa * factor).toFixed(1);

                                                    const cookedVal = ['fruta', 'lacteo', 'grasa'].includes(item.category)
                                                        ? item.quantity
                                                        : calculateCookedQuantity(item.quantity, item.category, item.food.nombre);
                                                    const grossVal = calculateGrossQuantity(item.quantity, item.food.factorDesecho);

                                                    return (
                                                        <TableRow key={item.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all duration-200">
                                                            <TableCell className="font-medium text-slate-700 dark:text-slate-200 py-3 pl-4 text-sm">
                                                                {item.food.nombre}
                                                            </TableCell>
                                                            <TableCell className="text-center py-3 px-1">
                                                                <FoodQuantityStepper
                                                                    value={item.quantity}
                                                                    onChange={(val) => updateQuantity(mealIndex, itemIndex, val)}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-center py-3 px-1">
                                                                <div className="inline-flex items-center justify-center w-20 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium text-sm shadow-sm">
                                                                    {cookedVal}g
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center py-3 px-1">
                                                                <div className="inline-flex items-center justify-center w-20 h-9 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 text-orange-600 dark:text-orange-400 font-medium text-sm shadow-sm">
                                                                    {grossVal}g
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center py-3 px-1 font-medium text-slate-600 dark:text-slate-300 text-sm">
                                                                {kcal}
                                                            </TableCell>
                                                            <TableCell className="text-center py-3 px-1 font-medium text-blue-600/90 dark:text-blue-400/90 text-sm">
                                                                {protein}
                                                            </TableCell>
                                                            <TableCell className="text-center py-3 px-1 font-medium text-amber-600/90 dark:text-amber-400/90 text-sm">
                                                                {carbs}
                                                            </TableCell>
                                                            <TableCell className="text-center py-3 px-1 font-medium text-orange-600/90 dark:text-orange-400/90 text-sm">
                                                                {fat}
                                                            </TableCell>
                                                            <TableCell className="text-center py-3 pr-4">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        removeFood(mealIndex, itemIndex);
                                                                    }}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}

                                                {/* MEAL SUMMARY ROW - PREMIUM CLEAN STYLE */}
                                                <TableRow className="bg-slate-50/50 dark:bg-slate-900/40 border-t-2 border-slate-100 dark:border-slate-800">
                                                    <TableCell className="py-4 pl-8 font-normal text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-widest">
                                                        Total {meal.name}
                                                    </TableCell>
                                                    <TableCell colSpan={3}></TableCell>
                                                    <TableCell className="text-center py-4 px-1 font-medium text-slate-700 dark:text-slate-200 text-sm">
                                                        {calculateMealStats(meal.items).calories.toFixed(0)}
                                                    </TableCell>
                                                    <TableCell className="text-center py-4 px-1 font-medium text-blue-600/80 dark:text-blue-400/80 text-sm">
                                                        {calculateMealStats(meal.items).macros.protein.toFixed(1)}
                                                    </TableCell>
                                                    <TableCell className="text-center py-4 px-1 font-medium text-amber-600/80 dark:text-amber-400/80 text-sm">
                                                        {calculateMealStats(meal.items).macros.carbs.toFixed(1)}
                                                    </TableCell>
                                                    <TableCell className="text-center py-4 px-1 font-medium text-orange-600/80 dark:text-orange-400/80 text-sm">
                                                        {calculateMealStats(meal.items).macros.fat.toFixed(1)}
                                                    </TableCell>
                                                    <TableCell></TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* RIGHT: FOOD SEARCH */}
                <div className="lg:col-span-4 flex flex-col gap-4 h-full">
                    <Card className="flex flex-col h-full border-l-4 border-l-primary/20 sticky top-4">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                                <Search className="w-4 h-4 text-[#ff8508]" /> Buscar Alimentos
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
