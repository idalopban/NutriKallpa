"use client";

import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ComposedChart, Line
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DailyPlan, DEFAULT_MICRO_GOALS } from "@/lib/diet-generator";

interface DietChartsProps {
    currentPlan: DailyPlan;
    weeklyPlan: DailyPlan[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function DietCharts({ currentPlan, weeklyPlan }: DietChartsProps) {

    // 1. Macro Data (Pie)
    const macroData = [
        { name: 'Proteína', value: Math.round(currentPlan.stats.macros.protein * 4) },
        { name: 'Carbohidratos', value: Math.round(currentPlan.stats.macros.carbs * 4) },
        { name: 'Grasa', value: Math.round(currentPlan.stats.macros.fat * 9) },
    ];

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
                {/* Macros Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Distribución Diaria (kcal)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={macroData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {macroData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Micros Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Cobertura de Micronutrientes (%)</CardTitle>
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
                    <CardTitle className="text-sm font-medium">Progreso Semanal (Calorías vs Meta)</CardTitle>
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
