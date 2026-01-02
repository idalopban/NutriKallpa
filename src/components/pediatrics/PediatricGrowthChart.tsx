'use client';

import { useMemo, memo } from 'react';
import { cn } from '@/lib/utils';
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
    ReferenceLine,
} from 'recharts';
import {
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { generatePercentileCurves, type Sex, type GrowthIndicator } from "@/lib/growth-standards";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatClinicalAgeFromMonths } from '@/lib/clinical-calculations';

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
        const ageDisplay = formatClinicalAgeFromMonths(data.ageInMonths, data.ageInDays);
        const dateDisplay = data.date ? format(new Date(data.date), 'dd MMM yyyy', { locale: es }) : 'Sin fecha';

        return (
            <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
                <p className="font-semibold text-slate-800 dark:text-white mb-0.5">
                    📍 {dateDisplay}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Edad: {ageDisplay}
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
                    <p className={cn(
                        "text-sm font-medium mt-1",
                        (data.zScore > 2 || data.zScore < -2) ? "text-red-500" :
                            (data.zScore > 1 || data.zScore < -1) ? "text-amber-500" : "text-green-500"
                    )}>
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

        const ageDisplay = formatClinicalAgeFromMonths(finalAge);

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
            <div className="w-full h-[400px]">
                <ResponsiveContainer>
                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

                        <XAxis
                            dataKey="month"
                            type="number"
                            domain={[startMonth, endMonth]}
                            ticks={(() => {
                                // School age ticks (every 3 months)
                                if (endMonth > 60) {
                                    const ticks = [];
                                    for (let m = startMonth; m <= endMonth; m += 3) {
                                        ticks.push(m);
                                    }
                                    return ticks;
                                }
                                // Infant ticks (weekly in first month + monthly)
                                if (endMonth <= 24 && startMonth === 0) {
                                    const ticks = [0.23, 0.46, 0.69]; // approx 7, 14, 21 days
                                    for (let m = 0; m <= endMonth; m++) {
                                        ticks.push(m);
                                    }
                                    return ticks.sort((a, b) => a - b);
                                }
                                return undefined;
                            })()}
                            tick={((props: any) => {
                                const { x, y, payload } = props;
                                const month = payload.value;

                                // Special handling for Weight-for-Length (indicator is 'wflh' and uses cm not months)
                                if (indicator === 'wflh') {
                                    return (
                                        <g transform={`translate(${x},${y})`}>
                                            <text
                                                x={0}
                                                y={0}
                                                dy={18}
                                                textAnchor="middle"
                                                fill="#64748b"
                                                fontSize={10}
                                            >
                                                {Math.round(month)}
                                            </text>
                                        </g>
                                    );
                                }

                                // Infant / Preschool formatting (<= 5 years)
                                if (endMonth <= 60) {
                                    let label = `${month}`;
                                    let isSpecial = false;
                                    let isWeekly = false;

                                    if (endMonth <= 24 && startMonth === 0) {
                                        if (month === 0.23) { label = "7d"; isWeekly = true; }
                                        else if (month === 0.46) { label = "14d"; isWeekly = true; }
                                        else if (month === 0.69) { label = "21d"; isWeekly = true; }
                                        else if (month === 12) { label = "1 año"; isSpecial = true; }
                                        else if (month === 24) { label = "2 años"; isSpecial = true; }
                                        else {
                                            label = `${Math.round(month)}`;
                                        }
                                    }

                                    return (
                                        <g transform={`translate(${x},${y})`}>
                                            <text
                                                x={0}
                                                y={0}
                                                dy={isWeekly ? 12 : 18}
                                                textAnchor="middle"
                                                fill={isSpecial ? "#475569" : isWeekly ? "#94a3b8" : "#64748b"}
                                                fontSize={isSpecial ? 11 : isWeekly ? 9 : 10}
                                                fontWeight={isSpecial ? "bold" : "normal"}
                                            >
                                                {label}
                                            </text>
                                        </g>
                                    );
                                }

                                // School age formatting ( > 5 years)
                                const isYear = month % 12 === 0;
                                return (
                                    <g transform={`translate(${x},${y})`}>
                                        <text
                                            x={0}
                                            y={0}
                                            dy={isYear ? 28 : 12}
                                            textAnchor="middle"
                                            fill={isYear ? "#475569" : "#94a3b8"}
                                            fontSize={isYear ? 12 : 9}
                                            fontWeight={isYear ? "bold" : "normal"}
                                        >
                                            {isYear ? `${month / 12}` : `${month % 12}`}
                                        </text>
                                    </g>
                                );
                            }) as any}
                            height={60}
                            interval={0}
                            label={{
                                value: indicator === 'wflh' ? 'Longitud (cm)' : (endMonth > 60 ? 'Edad (meses y años cumplidos)' : 'Edad (meses)'),
                                position: 'insideBottom',
                                offset: 0,
                                fill: '#64748b',
                                fontSize: 12
                            }}
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

                        {/* Patient Line (Continuous Trend) */}
                        <Line
                            type="monotone"
                            dataKey="patientValue"
                            name={`Evolución: ${patientName || 'Paciente'}`}
                            stroke={LINE_COLORS.patient}
                            strokeWidth={3}
                            dot={{ r: 5, fill: LINE_COLORS.patient, strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 8, strokeWidth: 0 }}
                            connectNulls
                        />

                        {/* 24 month transition line (Length to Height) */}
                        {indicator === 'lhfa' && (
                            <ReferenceLine x={24} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: "Long → Talla", position: 'insideTopRight', fill: '#94a3b8', fontSize: 10 }} />
                        )}

                        {/* First Month Weekly Markers (7, 14, 21 days) */}
                        {startMonth === 0 && (
                            <>
                                <ReferenceLine x={0.23} stroke="#94a3b8" strokeDasharray="2 2" isFront={false} />
                                <ReferenceLine x={0.46} stroke="#94a3b8" strokeDasharray="2 2" isFront={false} />
                                <ReferenceLine x={0.69} stroke="#94a3b8" strokeDasharray="2 2" isFront={false} />
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
