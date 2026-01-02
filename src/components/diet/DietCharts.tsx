"use client";

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ComposedChart, Line, ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DailyPlan, DEFAULT_MICRO_GOALS } from "@/lib/diet-generator";
import { NutritionalDonut } from "./NutritionalDonut";

interface DietChartsProps {
    currentPlan: DailyPlan;
    weeklyPlan: DailyPlan[];
}

export function DietCharts({ currentPlan, weeklyPlan }: DietChartsProps) {

    // 1. Macro Data
    const donutData = {
        protein: {
            grams: currentPlan.stats.macros.protein,
            percent: 0 // Will be calculated by NutritionalDonut
        },
        carbs: {
            grams: currentPlan.stats.macros.carbs,
            percent: 0
        },
        fat: {
            grams: currentPlan.stats.macros.fat,
            percent: 0
        }
    };

    const totalCalories = Math.round(currentPlan.stats.calories);

    // 2. Micro Data (Radar) - Normalized to % of Goal
    const microData = [
        { subject: 'Calcio', A: Math.min(100, (currentPlan.stats.micros.calcio / DEFAULT_MICRO_GOALS.calcio) * 100), fullMark: 100 },
        { subject: 'Hierro', A: Math.min(100, (currentPlan.stats.micros.hierro / DEFAULT_MICRO_GOALS.hierro) * 100), fullMark: 100 },
        { subject: 'Zinc', A: Math.min(100, (currentPlan.stats.micros.zinc / DEFAULT_MICRO_GOALS.zinc) * 100), fullMark: 100 },
        { subject: 'Vit A', A: Math.min(100, (currentPlan.stats.micros.vitaminaA / DEFAULT_MICRO_GOALS.vitaminaA) * 100), fullMark: 100 },
        { subject: 'Vit C', A: Math.min(100, (currentPlan.stats.micros.vitaminaC / DEFAULT_MICRO_GOALS.vitaminaC) * 100), fullMark: 100 },
        { subject: 'Folato', A: Math.min(100, (currentPlan.stats.micros.acidoFolico / DEFAULT_MICRO_GOALS.acidoFolico) * 100), fullMark: 100 },
    ];

    // 3. Weekly Progress (Bar + Line)
    const weeklyData = weeklyPlan.map(day => ({
        name: day.day.substring(0, 3), // Mon, Tue...
        calorias: Math.round(day.stats.calories),
        meta: day.goals.calories,
        proteina: Math.round(day.stats.macros.protein),
    }));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Macros Chart - NutritionalDonut Premium */}
                <Card className="bg-white dark:bg-[#1e293b] border-none shadow-sm dark:border dark:border-[#334155] overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold text-slate-800 dark:text-white">Distribución Diaria</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center min-h-[350px] pt-0">
                        <NutritionalDonut
                            data={donutData}
                            totalCalories={totalCalories}
                            size="md"
                        />
                    </CardContent>
                </Card>

                {/* Micros Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-bold text-slate-800 dark:text-white">Cobertura de Micronutrientes (%)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={microData}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="subject" />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                <Radar
                                    name="% Cubierto"
                                    dataKey="A"
                                    stroke="#8884d8"
                                    fill="#8884d8"
                                    fillOpacity={0.6}
                                />
                                <Tooltip />
                            </RadarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Weekly Progress Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-bold text-slate-800 dark:text-white">Progreso Semanal (Calorías vs Meta)</CardTitle>
                    <CardDescription>Comparativa de consumo calórico a lo largo de la semana.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={weeklyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="calorias" fill="#8884d8" name="Calorías Consumidas" />
                            <Line type="monotone" dataKey="meta" stroke="#ff7300" name="Meta Calórica" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
