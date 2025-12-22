'use client';

import { useMemo, memo } from 'react';
import {
    ComposedChart,
    Line,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Scatter,
    ReferenceLine,
} from 'recharts';
import { generatePercentileCurves, type Sex, type GrowthIndicator } from '@/lib/growth-standards';

// ============================================================================
// TYPES
// ============================================================================

export interface PatientDataPoint {
    ageInMonths: number;
    value: number; // weight in kg, height in cm, etc.
    date: string;
    zScore?: number;
    diagnosis?: string;
    ageInDays?: number; // Exact days for infants < 1 month
}

interface PediatricGrowthChartProps {
    indicator: GrowthIndicator;
    sex: Sex;
    patientData: PatientDataPoint[];
    patientName?: string;
    startMonth?: number;
    endMonth?: number;
    className?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const INDICATOR_LABELS: Record<GrowthIndicator, { title: string; yAxisLabel: string; unit: string }> = {
    wfa: { title: 'Peso para la Edad', yAxisLabel: 'Peso (kg)', unit: 'kg' },
    lhfa: { title: 'Longitud/Talla para la Edad', yAxisLabel: 'Longitud/Talla (cm)', unit: 'cm' },
    wflh: { title: 'Peso para la Longitud/Talla', yAxisLabel: 'Peso (kg)', unit: 'kg' },
    bfa: { title: 'IMC para la Edad', yAxisLabel: 'IMC (kg/m²)', unit: 'kg/m²' },
    hcfa: { title: 'Perímetro Cefálico para la Edad', yAxisLabel: 'Circunferencia (cm)', unit: 'cm' },
};

const ZONE_COLORS = {
    severe_negative: '#fee2e2', // Red light
    moderate_negative: '#fef3c7', // Yellow light
    normal: '#dcfce7', // Green light
    moderate_positive: '#fef3c7', // Yellow light
    severe_positive: '#fee2e2', // Red light
};

const LINE_COLORS = {
    sd_neg3: '#ef4444', // Red
    sd_neg2: '#f59e0b', // Amber
    median: '#22c55e', // Green
    sd_pos2: '#f59e0b', // Amber
    sd_pos3: '#ef4444', // Red
    patient: '#3b82f6', // Blue
};

// ============================================================================
// CUSTOM TOOLTIP
// ============================================================================

interface CustomTooltipProps {
    active?: boolean;
    payload?: any[];
    label?: number;
    unit: string;
}

function CustomTooltip({ active, payload, label, unit }: CustomTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;

    // Find patient data point if exists
    const patientPoint = payload.find(p => p.dataKey === 'patientValue');

    if (patientPoint) {
        const data = patientPoint.payload;
        // Show days if age < 1 month. Use explicit ageInDays if available, otherwise fallback.
        const ageDisplay = data.ageInDays !== undefined
            ? `${Math.floor(data.ageInDays)} días`
            : data.ageInMonths < 1
                ? `${Math.round(data.ageInMonths * 30.4375)} días`
                : `${data.ageInMonths} meses`;

        return (
            <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                <p className="font-semibold text-slate-800 dark:text-white mb-1">
                    📍 Edad: {ageDisplay}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                    Valor: <span className="font-medium">{data.patientValue?.toFixed(2)} {unit}</span>
                </p>
                {data.zScore !== undefined && (
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Z-Score: <span className="font-medium">{data.zScore?.toFixed(2)}</span>
                    </p>
                )}
                {data.diagnosis && (
                    <p className="text-sm font-medium mt-1" style={{
                        color: data.zScore > 2 || data.zScore < -2 ? '#ef4444' :
                            data.zScore > 1 || data.zScore < -1 ? '#f59e0b' : '#22c55e'
                    }}>
                        {data.diagnosis}
                    </p>
                )}
            </div>
        );
    }

    // Reference curve tooltip
    const medianPoint = payload.find(p => p.dataKey === 'median');
    if (medianPoint) {
        const ageVal = typeof label === 'number' ? label : parseFloat(String(label));
        const finalAge = isNaN(ageVal) ? 0 : ageVal;

        const ageDisplay = finalAge < 1
            ? `${Math.round(finalAge * 30.4375)} días`
            : `${finalAge} meses`;

        return (
            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-xs">
                <p className="text-slate-500 dark:text-slate-400">Edad: {ageDisplay}</p>
                <p className="text-green-600">Mediana: {medianPoint.value?.toFixed(1)} {unit}</p>
            </div>
        );
    }

    return null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function PediatricGrowthChartComponent({
    indicator,
    sex,
    patientData,
    patientName,
    startMonth = 0,
    endMonth = 60,
    className = '',
}: PediatricGrowthChartProps) {
    // Generate reference curves (memoized - static data)
    const referenceCurves = useMemo(() => {
        return generatePercentileCurves(indicator, sex, startMonth, endMonth);
    }, [indicator, sex, startMonth, endMonth]);

    // Merge patient data with reference curves
    const chartData = useMemo(() => {
        // Use string keys (toFixed(2)) to avoid floating point issues and rounding errors
        const dataMap = new Map<string, any>();

        // Add reference curve data
        referenceCurves.forEach(point => {
            const key = point.month.toFixed(2);
            dataMap.set(key, {
                month: point.month,
                sd_neg3: point.sd_neg3,
                sd_neg2: point.sd_neg2,
                median: point.median,
                sd_pos2: point.sd_pos2,
                sd_pos3: point.sd_pos3,
            });
        });

        // Add patient data points
        patientData.forEach(point => {
            // Do NOT round to integer. Match precision with reference curves if possible.
            const key = point.ageInMonths.toFixed(2);
            const existing = dataMap.get(key) || { month: point.ageInMonths };

            dataMap.set(key, {
                ...existing,
                patientValue: point.value,
                zScore: point.zScore,
                diagnosis: point.diagnosis,
                date: point.date,
                ageInMonths: point.ageInMonths,
            });
        });

        return Array.from(dataMap.values()).sort((a, b) => a.month - b.month);
    }, [referenceCurves, patientData]);

    const labels = INDICATOR_LABELS[indicator];
    const sexLabel = sex === 'male' ? 'Niños' : 'Niñas';

    return (
        <div className={`bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                        {labels.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {sexLabel} ({startMonth}-{endMonth} meses)
                        {patientName && <span className="ml-2 text-blue-600">• {patientName}</span>}
                    </p>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-slate-500">±3 DE</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <span className="text-slate-500">±2 DE</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-slate-500">Mediana</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="text-slate-500">Paciente</span>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer>
                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

                        <XAxis
                            dataKey="month"
                            type="number"
                            domain={[startMonth, endMonth]}
                            tickCount={13}
                            label={{ value: 'Edad (meses)', position: 'insideBottom', offset: -10 }}
                            stroke="#94a3b8"
                        />

                        <YAxis
                            label={{ value: labels.yAxisLabel, angle: -90, position: 'insideLeft' }}
                            stroke="#94a3b8"
                        />

                        <Tooltip content={<CustomTooltip unit={labels.unit} />} />

                        {/* Shaded area between -3 and +3 SD */}
                        <Area
                            type="monotone"
                            dataKey="sd_pos3"
                            stroke="none"
                            fill={ZONE_COLORS.severe_positive}
                            fillOpacity={0.3}
                            connectNulls
                        />

                        {/* Reference Lines (Static) */}
                        <Line
                            type="monotone"
                            dataKey="sd_neg3"
                            stroke={LINE_COLORS.sd_neg3}
                            strokeWidth={1}
                            strokeDasharray="4 4"
                            dot={false}
                            name="-3 DE"
                            connectNulls
                        />
                        <Line
                            type="monotone"
                            dataKey="sd_neg2"
                            stroke={LINE_COLORS.sd_neg2}
                            strokeWidth={1.5}
                            dot={false}
                            name="-2 DE"
                            connectNulls
                        />
                        <Line
                            type="monotone"
                            dataKey="median"
                            stroke={LINE_COLORS.median}
                            strokeWidth={2}
                            dot={false}
                            name="Mediana"
                            connectNulls
                        />
                        <Line
                            type="monotone"
                            dataKey="sd_pos2"
                            stroke={LINE_COLORS.sd_pos2}
                            strokeWidth={1.5}
                            dot={false}
                            name="+2 DE"
                            connectNulls
                        />
                        <Line
                            type="monotone"
                            dataKey="sd_pos3"
                            stroke={LINE_COLORS.sd_pos3}
                            strokeWidth={1}
                            strokeDasharray="4 4"
                            dot={false}
                            name="+3 DE"
                            connectNulls
                        />

                        {/* Patient Data Points (Dynamic) */}
                        <Line
                            type="linear"
                            dataKey="patientValue"
                            stroke={LINE_COLORS.patient}
                            strokeWidth={2}
                            dot={{ r: 6, fill: LINE_COLORS.patient, stroke: '#fff', strokeWidth: 2 }}
                            activeDot={{ r: 8, fill: LINE_COLORS.patient }}
                            name="Paciente"
                            connectNulls
                        />

                        {/* 24 month transition line (Length to Height) */}
                        {indicator === 'lhfa' && (
                            <ReferenceLine x={24} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: "Long → Talla", position: 'insideTopRight', fill: '#94a3b8', fontSize: 10 }} />
                        )}

                        {/* First Month Weekly Markers (7, 14, 21 days) */}
                        {startMonth === 0 && (
                            <>
                                <ReferenceLine x={0.23} stroke="#64748b" strokeDasharray="3 3" label={{ value: "7d", position: 'insideBottom', fill: '#64748b', fontSize: 10, dy: -10 }} isFront={true} />
                                <ReferenceLine x={0.46} stroke="#64748b" strokeDasharray="3 3" label={{ value: "14d", position: 'insideBottom', fill: '#64748b', fontSize: 10, dy: -10 }} isFront={true} />
                                <ReferenceLine x={0.69} stroke="#64748b" strokeDasharray="3 3" label={{ value: "21d", position: 'insideBottom', fill: '#64748b', fontSize: 10, dy: -10 }} isFront={true} />
                            </>
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Diagnosis Legend */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-green-700 dark:text-green-400">Normal (-2 a +2 DE)</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-amber-700 dark:text-amber-400">Riesgo (-2 a -3 / +2 a +3)</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-red-700 dark:text-red-400">Severo (&lt;-3 o &gt;+3 DE)</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-blue-700 dark:text-blue-400">Datos del paciente</span>
                </div>
            </div>
        </div>
    );
}

// Memoize the component to prevent unnecessary re-renders of static curves
export const PediatricGrowthChart = memo(PediatricGrowthChartComponent);
