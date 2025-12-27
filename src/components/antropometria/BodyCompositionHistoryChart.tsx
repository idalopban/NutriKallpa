"use client";

/**
 * Body Composition History Chart
 * 
 * Displays the evolution of 5-component body fractionation over time.
 * Useful for tracking athlete progress and body recomposition.
 */

import { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area,
    AreaChart,
    ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface BodyCompositionRecord {
    date: string;  // ISO date string
    weight: number;
    skin: number;      // kg
    adipose: number;   // kg
    muscle: number;    // kg
    bone: number;      // kg
    residual: number;  // kg
    fatPercent?: number;
}

interface BodyCompositionHistoryChartProps {
    data: BodyCompositionRecord[];
    showPercentages?: boolean;
    height?: number;
}

// ============================================================================
// COLORS
// ============================================================================

const COMPONENT_COLORS = {
    adipose: '#ef4444',   // Red
    muscle: '#f97316',    // Orange
    bone: '#eab308',      // Yellow
    skin: '#22c55e',      // Green
    residual: '#3b82f6',  // Blue
    weight: '#8b5cf6',    // Purple
    fatPercent: '#ec4899' // Pink
};

// ============================================================================
// COMPONENT
// ============================================================================

export function BodyCompositionHistoryChart({
    data,
    showPercentages = false,
    height = 350
}: BodyCompositionHistoryChartProps) {
    // Format data for chart
    const chartData = useMemo(() => {
        return data.map(record => {
            const total = record.weight || (record.skin + record.adipose + record.muscle + record.bone + record.residual);

            if (showPercentages) {
                return {
                    ...record,
                    date: new Date(record.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
                    skin: ((record.skin / total) * 100).toFixed(1),
                    adipose: ((record.adipose / total) * 100).toFixed(1),
                    muscle: ((record.muscle / total) * 100).toFixed(1),
                    bone: ((record.bone / total) * 100).toFixed(1),
                    residual: ((record.residual / total) * 100).toFixed(1),
                };
            }

            return {
                ...record,
                date: new Date(record.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
            };
        });
    }, [data, showPercentages]);

    // Calculate trends (compare first vs last)
    const trends = useMemo(() => {
        if (data.length < 2) return null;

        const first = data[0];
        const last = data[data.length - 1];

        const calcTrend = (field: keyof BodyCompositionRecord) => {
            const start = Number(first[field]) || 0;
            const end = Number(last[field]) || 0;
            const change = end - start;
            const percentChange = start > 0 ? ((change / start) * 100).toFixed(1) : '0';
            return { change: Math.round(change * 10) / 10, percentChange, trend: change > 0.1 ? 'up' : change < -0.1 ? 'down' : 'stable' };
        };

        return {
            muscle: calcTrend('muscle'),
            adipose: calcTrend('adipose'),
            weight: calcTrend('weight'),
        };
    }, [data]);

    const TrendIndicator = ({ trend, value, unit = 'kg' }: { trend: 'up' | 'down' | 'stable'; value: number; unit?: string }) => {
        const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
        const color = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-slate-400';
        return (
            <span className={`inline-flex items-center gap-1 ${color}`}>
                <Icon className="w-3 h-3" />
                <span className="text-xs font-medium">{value > 0 ? '+' : ''}{value}{unit}</span>
            </span>
        );
    };

    if (data.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="flex items-center justify-center py-10">
                    <div className="text-center text-slate-500">
                        <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay datos históricos de composición corporal</p>
                        <p className="text-xs opacity-70">Realiza evaluaciones periódicas para ver la evolución</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-500" />
                        Evolución Composición Corporal (5C Kerr)
                    </CardTitle>
                    {trends && (
                        <div className="flex gap-3">
                            <Badge variant="outline" className="gap-1">
                                💪 Músculo: <TrendIndicator trend={trends.muscle.trend as 'up' | 'down' | 'stable'} value={trends.muscle.change} />
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                                🔴 Adiposo: <TrendIndicator trend={trends.adipose.trend as 'up' | 'down' | 'stable'} value={trends.adipose.change} />
                            </Badge>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={height}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorMuscle" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COMPONENT_COLORS.muscle} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={COMPONENT_COLORS.muscle} stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="colorAdipose" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COMPONENT_COLORS.adipose} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={COMPONENT_COLORS.adipose} stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="colorBone" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COMPONENT_COLORS.bone} stopOpacity={0.6} />
                                <stop offset="95%" stopColor={COMPONENT_COLORS.bone} stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            className="text-slate-500"
                        />
                        <YAxis
                            tick={{ fontSize: 11 }}
                            tickLine={false}
                            domain={showPercentages ? [0, 100] : ['auto', 'auto']}
                            unit={showPercentages ? '%' : 'kg'}
                            className="text-slate-500"
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(255,255,255,0.95)',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                            }}
                            formatter={(value: number) => [`${value}${showPercentages ? '%' : 'kg'}`, '']}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: 10 }}
                            formatter={(value) => <span className="text-xs">{value}</span>}
                        />

                        <Area
                            type="monotone"
                            dataKey="muscle"
                            name="Músculo"
                            stroke={COMPONENT_COLORS.muscle}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorMuscle)"
                        />
                        <Area
                            type="monotone"
                            dataKey="adipose"
                            name="Adiposo"
                            stroke={COMPONENT_COLORS.adipose}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorAdipose)"
                        />
                        <Line
                            type="monotone"
                            dataKey="bone"
                            name="Óseo"
                            stroke={COMPONENT_COLORS.bone}
                            strokeWidth={1.5}
                            dot={{ r: 3 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>

                {/* Summary Stats */}
                {trends && (
                    <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-center">
                            <p className="text-xs text-slate-500">Cambio Músculo</p>
                            <p className={`text-lg font-bold ${trends.muscle.trend === 'up' ? 'text-green-600' : trends.muscle.trend === 'down' ? 'text-red-600' : 'text-slate-500'}`}>
                                {trends.muscle.change > 0 ? '+' : ''}{trends.muscle.change} kg
                            </p>
                            <p className="text-xs text-slate-400">({trends.muscle.percentChange}%)</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-slate-500">Cambio Adiposo</p>
                            <p className={`text-lg font-bold ${trends.adipose.trend === 'down' ? 'text-green-600' : trends.adipose.trend === 'up' ? 'text-red-600' : 'text-slate-500'}`}>
                                {trends.adipose.change > 0 ? '+' : ''}{trends.adipose.change} kg
                            </p>
                            <p className="text-xs text-slate-400">({trends.adipose.percentChange}%)</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-slate-500">Cambio Peso</p>
                            <p className="text-lg font-bold text-slate-700 dark:text-white">
                                {trends.weight.change > 0 ? '+' : ''}{trends.weight.change} kg
                            </p>
                            <p className="text-xs text-slate-400">({trends.weight.percentChange}%)</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default BodyCompositionHistoryChart;
