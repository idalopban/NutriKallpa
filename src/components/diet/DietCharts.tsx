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

// Dashboard brand colors for macros
const MACRO_COLORS = {
    protein: '#3B82F6', // Blue
    carbs: '#22C55E',   // Green  
    fat: '#F59E0B',     // Orange/Yellow
};

const RADIAN = Math.PI / 180;

// Custom label renderer with connector lines
const renderCustomizedLabel = (props: {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    value: number;
    index: number;
    name: string;
}) => {
    const { cx, cy, midAngle, outerRadius, value } = props;

    // Calculate the position for the label (further out)
    const labelRadius = outerRadius * 1.5;
    const labelX = cx + labelRadius * Math.cos(-midAngle * RADIAN);
    const labelY = cy + labelRadius * Math.sin(-midAngle * RADIAN);

    // Calculate the position for the connector line start (on the pie edge)
    const lineStartRadius = outerRadius * 1.05;
    const lineStartX = cx + lineStartRadius * Math.cos(-midAngle * RADIAN);
    const lineStartY = cy + lineStartRadius * Math.sin(-midAngle * RADIAN);

    // Middle bend point for the elbow
    const lineMidRadius = outerRadius * 1.25;
    const lineMidX = cx + lineMidRadius * Math.cos(-midAngle * RADIAN);
    const lineMidY = cy + lineMidRadius * Math.sin(-midAngle * RADIAN);

    // Determine text anchor and line end based on position
    const isRight = labelX > cx;
    const textAnchor = isRight ? 'start' : 'end';
    const lineEndX = isRight ? labelX - 8 : labelX + 8;

    return (
        <g>
            {/* Connector polyline */}
            <polyline
                points={`${lineStartX},${lineStartY} ${lineMidX},${lineMidY} ${lineEndX},${labelY}`}
                fill="none"
                stroke="#94a3b8"
                strokeWidth={1.5}
            />
            {/* Small circle at the end of the line */}
            <circle
                cx={lineEndX}
                cy={labelY}
                r={2}
                fill="#94a3b8"
            />
            {/* Value text */}
            <text
                x={labelX}
                y={labelY}
                textAnchor={textAnchor}
                dominantBaseline="central"
                style={{
                    fill: '#e2e8f0',
                    fontSize: '14px',
                    fontWeight: 600,
                }}
            >
                {value}
            </text>
        </g>
    );
};

export function DietCharts({ currentPlan, weeklyPlan }: DietChartsProps) {

    // 1. Macro Data (Pie) with colors
    const proteinKcal = Math.round(currentPlan.stats.macros.protein * 4);
    const carbsKcal = Math.round(currentPlan.stats.macros.carbs * 4);
    const fatKcal = Math.round(currentPlan.stats.macros.fat * 9);
    const totalMacroKcal = proteinKcal + carbsKcal + fatKcal;

    const macroData = [
        { name: 'Proteína', value: proteinKcal, percent: totalMacroKcal > 0 ? Math.round((proteinKcal / totalMacroKcal) * 100) : 0, color: MACRO_COLORS.protein },
        { name: 'Carbohidratos', value: carbsKcal, percent: totalMacroKcal > 0 ? Math.round((carbsKcal / totalMacroKcal) * 100) : 0, color: MACRO_COLORS.carbs },
        { name: 'Grasa', value: fatKcal, percent: totalMacroKcal > 0 ? Math.round((fatKcal / totalMacroKcal) * 100) : 0, color: MACRO_COLORS.fat },
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
                {/* Macros Chart - Modern Donut with External Labels */}
                <Card className="bg-slate-900/80 dark:bg-slate-900/80 border-slate-700/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-200">Distribución Diaria (kcal)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] pt-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={macroData}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={3}
                                    dataKey="value"
                                    label={renderCustomizedLabel}
                                    labelLine={false}
                                    stroke="none"
                                    isAnimationActive={true}
                                >
                                    {macroData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.color}
                                            style={{
                                                filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))'
                                            }}
                                        />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Custom Legend at bottom with percentages */}
                        <div className="flex justify-center items-center gap-6 -mt-6">
                            {macroData.map((entry, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <div
                                        className="w-2.5 h-2.5 rounded-full"
                                        style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="text-xs text-slate-400">{entry.name}</span>
                                    <span className="text-xs font-semibold text-slate-200">({entry.percent}%)</span>
                                </div>
                            ))}
                        </div>
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
