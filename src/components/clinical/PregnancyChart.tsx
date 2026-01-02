"use client";

/**
 * PregnancyChart
 * 
 * Visualizes the Atalah curve for pregnancy weight monitoring.
 * Shows the patient's current position on the curve and classification.
 */

import { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Area, ComposedChart
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Baby, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import {
    ATALAH_CURVE_DATA,
    classifyAtalah,
    getIOMWeightGainGoals,
    evaluatePregnancyWeightGain,
    type AtalahClassification
} from '@/utils/clinical-formulas';

interface PregnancyChartProps {
    currentIMC: number;
    gestationalWeeks: number;
    prePregnancyWeight: number;
    currentWeight: number;
    height: number; // in cm
    isMultiple?: boolean;
}

// Generate curve data for the chart
const generateCurveData = () => {
    return ATALAH_CURVE_DATA.map(([week, bajoPeso, normal, sobrepeso]) => ({
        week,
        bajoPesoMin: 15,
        bajoPesoMax: bajoPeso,
        normalMax: normal,
        sobrepesoMax: sobrepeso,
        obesidadMax: 40,
    }));
};

const CLASSIFICATION_COLORS: Record<AtalahClassification, string> = {
    'Bajo Peso': '#ef4444',   // Red
    'Normal': '#22c55e',       // Green
    'Sobrepeso': '#f59e0b',    // Orange
    'Obesidad': '#dc2626',     // Dark Red
};

const CLASSIFICATION_ICONS: Record<AtalahClassification, React.ReactNode> = {
    'Bajo Peso': <AlertTriangle className="h-4 w-4" />,
    'Normal': <CheckCircle className="h-4 w-4" />,
    'Sobrepeso': <AlertTriangle className="h-4 w-4" />,
    'Obesidad': <AlertTriangle className="h-4 w-4" />,
};

export function PregnancyChart({
    currentIMC,
    gestationalWeeks,
    prePregnancyWeight,
    currentWeight,
    height,
    isMultiple = false
}: PregnancyChartProps) {
    const curveData = useMemo(() => generateCurveData(), []);

    const classification = useMemo(() =>
        classifyAtalah(currentIMC, gestationalWeeks),
        [currentIMC, gestationalWeeks]
    );

    const prePregnancyBMI = useMemo(() =>
        prePregnancyWeight / Math.pow(height / 100, 2),
        [prePregnancyWeight, height]
    );

    const iomGoals = useMemo(() =>
        getIOMWeightGainGoals(prePregnancyBMI, isMultiple),
        [prePregnancyBMI, isMultiple]
    );

    const weightEvaluation = useMemo(() =>
        evaluatePregnancyWeightGain(
            currentWeight,
            prePregnancyWeight,
            gestationalWeeks,
            prePregnancyBMI,
            isMultiple
        ),
        [currentWeight, prePregnancyWeight, gestationalWeeks, prePregnancyBMI, isMultiple]
    );

    // Current point on the chart
    const currentPoint = [{
        week: gestationalWeeks,
        imc: currentIMC
    }];

    return (
        <Card className="w-full">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Baby className="h-5 w-5 text-pink-500" />
                        <CardTitle className="text-lg">Curva de Atalah</CardTitle>
                    </div>
                    <Badge
                        variant="outline"
                        className="text-white"
                        style={{ backgroundColor: CLASSIFICATION_COLORS[classification] }}
                    >
                        {CLASSIFICATION_ICONS[classification]}
                        <span className="ml-1">{classification}</span>
                    </Badge>
                </div>
                <CardDescription>
                    Semana {gestationalWeeks} • IMC: {currentIMC.toFixed(1)} kg/m²
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={curveData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis
                                dataKey="week"
                                label={{ value: 'Semanas de gestación', position: 'insideBottom', offset: -5 }}
                                domain={[6, 42]}
                            />
                            <YAxis
                                label={{ value: 'IMC (kg/m²)', angle: -90, position: 'insideLeft' }}
                                domain={[15, 40]}
                            />
                            <Tooltip
                                formatter={(value: number, name: string) => {
                                    const labels: Record<string, string> = {
                                        bajoPesoMax: 'Bajo Peso',
                                        normalMax: 'Normal',
                                        sobrepesoMax: 'Sobrepeso',
                                        imc: 'IMC Actual'
                                    };
                                    return [value.toFixed(1), labels[name] || name];
                                }}
                                labelFormatter={(label) => `Semana ${label}`}
                            />

                            {/* Zones - stacked areas */}
                            <Area
                                type="monotone"
                                dataKey="bajoPesoMax"
                                fill="#fee2e2"
                                stroke="#ef4444"
                                strokeWidth={2}
                                fillOpacity={0.5}
                            />
                            <Area
                                type="monotone"
                                dataKey="normalMax"
                                fill="#dcfce7"
                                stroke="#22c55e"
                                strokeWidth={2}
                                fillOpacity={0.5}
                            />
                            <Area
                                type="monotone"
                                dataKey="sobrepesoMax"
                                fill="#fef3c7"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                fillOpacity={0.5}
                            />

                            {/* Current position marker */}
                            <ReferenceLine
                                x={gestationalWeeks}
                                stroke="#6366f1"
                                strokeDasharray="5 5"
                                label={{ value: 'Actual', position: 'top' }}
                            />

                            {/* Current IMC point as a line for visibility */}
                            <Line
                                data={currentPoint}
                                type="monotone"
                                dataKey="imc"
                                stroke="#6366f1"
                                strokeWidth={0}
                                dot={{
                                    r: 8,
                                    fill: '#6366f1',
                                    stroke: '#fff',
                                    strokeWidth: 2
                                }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* Weight gain summary */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-muted/50 p-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <TrendingUp className="h-4 w-4" />
                            <span>Ganancia de peso</span>
                        </div>
                        <div className="mt-1 text-lg font-semibold">
                            {weightEvaluation.gain.toFixed(1)} kg
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Meta: {weightEvaluation.expectedRange.min.toFixed(1)} - {weightEvaluation.expectedRange.max.toFixed(1)} kg
                        </div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                        <div className="text-sm text-muted-foreground">
                            Meta IOM total
                        </div>
                        <div className="mt-1 text-lg font-semibold">
                            {iomGoals.minGain} - {iomGoals.maxGain} kg
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {isMultiple ? 'Embarazo gemelar' : 'Embarazo único'}
                        </div>
                    </div>
                </div>

                {/* Status badge */}
                <div className="mt-4 flex justify-center">
                    <Badge
                        variant={
                            weightEvaluation.status === 'adecuado' ? 'default' :
                                weightEvaluation.status === 'bajo' ? 'destructive' : 'secondary'
                        }
                        className="text-sm"
                    >
                        Ganancia de peso: {
                            weightEvaluation.status === 'adecuado' ? '✓ Adecuada' :
                                weightEvaluation.status === 'bajo' ? '↓ Insuficiente' : '↑ Excesiva'
                        }
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
}

export default PregnancyChart;
