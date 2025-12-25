"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
    ArrowLeft, Search, Plus, Trash2,
    Utensils, Save, ChevronDown, ChevronUp,
    PieChart, Apple
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { type Alimento } from "@/lib/csv-parser";
import { getAllFoods } from "@/lib/food-service";
import { usePatientStore, usePatientNutrition } from "@/store/usePatientStore";
import { PatientNutritionConfig } from "@/components/patient/PatientNutritionConfig";
import type { Paciente } from "@/types";

interface MealFood {
    id: string; // unique id for the list item
    food: Alimento;
    quantity: number; // grams
}

interface Meal {
    name: string;
    foods: MealFood[];
}

const MEAL_NAMES = ["Desayuno", "Almuerzo", "Cena", "Colación Mañana", "Colación Tarde"];

function DietasContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const targetCalories = Number(searchParams.get("calories")) || 2000;

    // Use centralized patient store
    const { patient: paciente, isLoading, loadPatient } = usePatientStore();

    const [alimentos, setAlimentos] = useState<Alimento[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Diet State
    const [meals, setMeals] = useState<Meal[]>(
        MEAL_NAMES.map(name => ({ name, foods: [] }))
    );

    const [selectedMealIndex, setSelectedMealIndex] = useState<number>(0);

    useEffect(() => {
        if (params.id) {
            // Load patient from centralized store
            loadPatient(params.id as string);

            getAllFoods().then(data => {
                setAlimentos(data);
                setLoading(false);
            });
        }
    }, [params.id, loadPatient]);

    // Filter foods
    const filteredFoods = useMemo(() => {
        if (!searchTerm) return [];
        const lower = searchTerm.toLowerCase();
        return alimentos
            .filter(a => a.nombre.toLowerCase().includes(lower))
            .slice(0, 50); // Limit results for performance
    }, [searchTerm, alimentos]);

    // Add food to current meal
    const addFoodToMeal = (food: Alimento) => {
        const newFood: MealFood = {
            id: Math.random().toString(36).substr(2, 9),
            food,
            quantity: 100 // Default 100g
        };

        const newMeals = [...meals];
        newMeals[selectedMealIndex].foods.push(newFood);
        setMeals(newMeals);
    };

    // Remove food
    const removeFood = (mealIndex: number, foodId: string) => {
        const newMeals = [...meals];
        newMeals[mealIndex].foods = newMeals[mealIndex].foods.filter(f => f.id !== foodId);
        setMeals(newMeals);
    };

    // Update quantity
    const updateQuantity = (mealIndex: number, foodId: string, newQty: number) => {
        const newMeals = [...meals];
        const food = newMeals[mealIndex].foods.find(f => f.id === foodId);
        if (food) {
            food.quantity = newQty;
        }
        setMeals(newMeals);
    };

    // Calculations
    const totalStats = useMemo(() => {
        let calories = 0;
        let protein = 0;
        let carbs = 0;
        let fat = 0;

        meals.forEach(meal => {
            meal.foods.forEach(item => {
                const ratio = item.quantity / 100;
                calories += item.food.energia * ratio;
                protein += item.food.proteinas * ratio;
                carbs += item.food.carbohidratos * ratio;
                fat += item.food.grasa * ratio;
            });
        });

        return { calories, protein, carbs, fat };
    }, [meals]);

    if (loading) return <div className="p-8 text-center text-muted-foreground">Cargando base de datos de alimentos...</div>;
    if (!paciente) return <div className="p-8 text-center text-red-500">Paciente no encontrado</div>;

    const caloriesProgress = Math.min((totalStats.calories / targetCalories) * 100, 100);

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 h-[calc(100vh-4rem)] flex flex-col">

            {/* HEADER */}
            <div className="flex flex-col gap-4 shrink-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="hover:text-primary cursor-pointer" onClick={() => router.push(`/pacientes/${params.id}`)}>Expediente</span>
                    <span>/</span>
                    <span className="font-medium text-foreground">Plan de Alimentación</span>
                </div>

                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <Utensils className="w-8 h-8 text-primary" />
                            Plan Nutricional
                        </h1>
                        <p className="text-muted-foreground">
                            Para: {paciente.datosPersonales.nombre} {paciente.datosPersonales.apellido}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => router.back()}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
                        </Button>
                        <Button>
                            <Save className="w-4 h-4 mr-2" /> Guardar Plan
                        </Button>
                    </div>
                </div>

                {/* Patient Nutrition Config - Compact View */}
                <PatientNutritionConfig editable={true} compact={true} />

                {/* SUMMARY CARD */}
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 grid md:grid-cols-4 gap-4 items-center">
                        <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">Meta Calórica</span>
                            <div className="text-2xl font-bold text-primary">{targetCalories} kcal</div>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Consumo Actual: <strong>{Math.round(totalStats.calories)}</strong> kcal</span>
                                <span>{Math.round(caloriesProgress)}%</span>
                            </div>
                            <Progress value={caloriesProgress} className="h-3" />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="p-2 bg-background rounded border">
                                <div className="font-bold text-blue-600">{Math.round(totalStats.protein)}g</div>
                                <div className="text-muted-foreground">Prot</div>
                            </div>
                            <div className="p-2 bg-background rounded border">
                                <div className="font-bold text-green-600">{Math.round(totalStats.carbs)}g</div>
                                <div className="text-muted-foreground">Carb</div>
                            </div>
                            <div className="p-2 bg-background rounded border">
                                <div className="font-bold text-yellow-600">{Math.round(totalStats.fat)}g</div>
                                <div className="text-muted-foreground">Grasa</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* MAIN CONTENT - SPLIT VIEW */}
            <div className="grid md:grid-cols-12 gap-6 flex-1 min-h-0">

                {/* LEFT: MEAL PLANNER */}
                <div className="md:col-span-7 flex flex-col gap-4 overflow-hidden h-full">
                    <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-6 pb-10">
                            {meals.map((meal, index) => (
                                <Card key={index}
                                    className={`transition-all ${selectedMealIndex === index ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
                                    onClick={() => setSelectedMealIndex(index)}
                                >
                                    <CardHeader className="py-3 px-4 bg-muted/30 flex flex-row items-center justify-between cursor-pointer">
                                        <CardTitle className="text-lg font-medium flex items-center gap-2">
                                            {meal.name}
                                            <Badge variant="secondary" className="text-xs font-normal">
                                                {Math.round(meal.foods.reduce((acc, item) => acc + (item.food.energia * item.quantity / 100), 0))} kcal
                                            </Badge>
                                        </CardTitle>
                                        {selectedMealIndex === index && <Badge className="bg-primary">Seleccionado</Badge>}
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {meal.foods.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-muted-foreground border-t border-dashed">
                                                No hay alimentos agregados. Selecciona este tiempo de comida y busca alimentos.
                                            </div>
                                        ) : (
                                            <Table>
                                                <TableBody>
                                                    {meal.foods.map((item) => (
                                                        <TableRow key={item.id}>
                                                            <TableCell className="font-medium">
                                                                {item.food.nombre}
                                                                <div className="text-xs text-muted-foreground">
                                                                    {Math.round(item.food.energia * item.quantity / 100)} kcal | P: {Math.round(item.food.proteinas * item.quantity / 100)}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <Input
                                                                        type="number"
                                                                        value={item.quantity}
                                                                        onChange={(e) => updateQuantity(index, item.id, Number(e.target.value))}
                                                                        className="w-20 h-8"
                                                                    />
                                                                    <span className="text-xs text-muted-foreground">g</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeFood(index, item.id);
                                                                }}>
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                {/* RIGHT: FOOD SEARCH */}
                <div className="md:col-span-5 flex flex-col gap-4 h-full">
                    <Card className="flex flex-col h-full border-l-4 border-l-primary/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Search className="w-5 h-5" /> Buscar Alimentos
                            </CardTitle>
                            <CardDescription>
                                Agregando a: <span className="font-bold text-primary">{meals[selectedMealIndex].name}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
                            <Input
                                placeholder="Ej. Manzana, Pollo, Arroz..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-background"
                                autoFocus
                            />

                            <div className="flex-1 border rounded-md overflow-hidden bg-muted/10">
                                <ScrollArea className="h-full">
                                    {searchTerm === "" ? (
                                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground p-6 text-center">
                                            <Apple className="w-10 h-10 mb-2 opacity-20" />
                                            <p>Escribe para buscar en la base de datos de alimentos.</p>
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
                                                            <span>P: {food.proteinas}g</span>
                                                            <span>G: {food.grasa}g</span>
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
