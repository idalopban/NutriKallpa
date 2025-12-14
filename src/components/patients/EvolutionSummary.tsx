"use client";

import { useEffect, useState } from "react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, TrendingUp, Calendar, AlertCircle } from "lucide-react";
import { getPatientHistory, AnthropometryHistoryRecord } from "@/actions/patient-actions";
import { getMedidasByPaciente, getPacienteById } from "@/lib/storage";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface EvolutionSummaryProps {
    patientId: string;
}

// Helper function to calculate body fat % using Yuhasz modified formula
function calculateBodyFatPercent(pliegues: any, sexo: string): number {
    if (!pliegues) return 0;
    const sumPliegues = Object.values(pliegues).reduce((a: number, b: any) => a + Number(b || 0), 0) as number;
    if (sumPliegues === 0) return 0;

    let bodyFat = 0;
    if (sexo === 'masculino') {
        bodyFat = (sumPliegues * 0.097) + 3.64;
    } else {
        bodyFat = (sumPliegues * 0.1429) + 4.56;
    }
    return Math.max(3, Math.min(bodyFat, 50));
}

export function EvolutionSummary({ patientId }: EvolutionSummaryProps) {
    const [history, setHistory] = useState<AnthropometryHistoryRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (patientId) {
            // Try to get data from localStorage first (immediate)
            const localMedidas = getMedidasByPaciente(patientId);
            const paciente = getPacienteById(patientId);
            const sexo = paciente?.datosPersonales?.sexo || 'masculino';

            if (localMedidas && localMedidas.length > 0) {
                // Convert local medidas to history records with calculated values
                const localHistory: AnthropometryHistoryRecord[] = localMedidas
                    .filter((m: any) => m.peso && m.talla)
                    .map((m: any) => {
                        const bodyFatPercent = calculateBodyFatPercent(m.pliegues, m.sexo || sexo);
                        const masaGrasa = (bodyFatPercent / 100) * (m.peso || 0);
                        const masaMuscular = (m.peso || 0) - masaGrasa;

                        return {
                            id: m.id,
                            date: m.fecha || m.createdAt || new Date().toISOString(),
                            weight: m.peso || 0,
                            height: m.talla || 0,
                            bodyFatPercent: Math.round(bodyFatPercent * 10) / 10,
                            muscleMassKg: Math.round(masaMuscular * 10) / 10,
                            somatotypeEndo: null,
                            somatotypeMeso: null,
                            somatotypeEcto: null
                        };
                    })
                    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

                setHistory(localHistory);
                setLoading(false);
            }

            // Also try to get from API (may have more complete data)
            getPatientHistory(patientId).then(res => {
                if (res.success && res.data && res.data.length > 0) {
                    // Merge with local calculations if API data lacks body composition
                    const enrichedData = res.data.map(rec => {
                        if (!rec.bodyFatPercent || !rec.muscleMassKg) {
                            // Find matching local record
                            const localMatch = localMedidas.find((m: any) => m.id === rec.id);
                            if (localMatch && localMatch.pliegues) {
                                const bodyFatPercent = calculateBodyFatPercent(localMatch.pliegues, localMatch.sexo || sexo);
                                const masaGrasa = (bodyFatPercent / 100) * rec.weight;
                                return {
                                    ...rec,
                                    bodyFatPercent: Math.round(bodyFatPercent * 10) / 10,
                                    muscleMassKg: Math.round((rec.weight - masaGrasa) * 10) / 10
                                };
                            }
                        }
                        return rec;
                    });
                    setHistory(enrichedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
                }
                setLoading(false);
            });
        }
    }, [patientId]);

    if (loading) {
        return <div className="h-64 flex items-center justify-center animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl">Cargando historial...</div>;
    }

    if (history.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Activity className="w-12 h-12 mb-4 opacity-20" />
                    <p>No hay historial de evaluaciones para este paciente.</p>
                </CardContent>
            </Card>
        );
    }

    // Format data for charts
    const chartData = history.map(rec => ({
        date: format(new Date(rec.date), 'dd MMM', { locale: es }),
        fullDate: format(new Date(rec.date), 'dd MMMM yyyy', { locale: es }),
        weight: rec.weight,
        fat: rec.bodyFatPercent || 0,
        muscle: rec.muscleMassKg || 0
    }));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                    label="Último Peso"
                    value={`${history[history.length - 1].weight} kg`}
                    trend={calculateTrend(history, 'weight')}
                    icon={Activity}
                    color="text-blue-500"
                />
                <MetricCard
                    label="% Grasa Actual"
                    value={history[history.length - 1].bodyFatPercent ? `${history[history.length - 1].bodyFatPercent}%` : '-'}
                    trend={calculateTrend(history, 'bodyFatPercent')}
                    icon={TrendingUp}
                    color="text-orange-500"
                />
                <MetricCard
                    label="Masa Muscular"
                    value={history[history.length - 1].muscleMassKg ? `${history[history.length - 1].muscleMassKg} kg` : '-'}
                    trend={calculateTrend(history, 'muscleMassKg')}
                    icon={Activity}
                    color="text-green-500"
                />
            </div>

            <Tabs defaultValue="charts" className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="charts">Gráficos de Tendencia</TabsTrigger>
                        <TabsTrigger value="table">Tabla Histórica</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="charts" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Weight Chart */}
                        <ChartCard title="Evolución de Peso (kg)">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                                    <Tooltip content={<CustomTooltip unit="kg" />} />
                                    <Area type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </ChartCard>

                        {/* Fat % Chart */}
                        <ChartCard title="Porcentaje de Grasa vs Músculo (kg)">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="left" stroke="#f97316" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#22c55e" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip unit="" />} />
                                    <Line yAxisId="left" type="monotone" dataKey="fat" name="% Grasa" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: "#f97316" }} />
                                    <Line yAxisId="right" type="monotone" dataKey="muscle" name="Músculo (kg)" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, fill: "#22c55e" }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </div>
                </TabsContent>

                <TabsContent value="table">
                    <Card>
                        <CardHeader>
                            <CardTitle>Historial Detallado</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Peso</TableHead>
                                        <TableHead>% Grasa</TableHead>
                                        <TableHead>Masa Muscular</TableHead>
                                        <TableHead>Somatotipo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {[...history].reverse().map((rec) => (
                                        <TableRow key={rec.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-slate-400" />
                                                    {format(new Date(rec.date), "dd MMM yyyy", { locale: es })}
                                                </div>
                                            </TableCell>
                                            <TableCell>{rec.weight} kg</TableCell>
                                            <TableCell>{rec.bodyFatPercent ? `${rec.bodyFatPercent}%` : '-'}</TableCell>
                                            <TableCell>{rec.muscleMassKg ? `${rec.muscleMassKg} kg` : '-'}</TableCell>
                                            <TableCell>
                                                {rec.somatotypeEndo ? (
                                                    <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                                                        {rec.somatotypeEndo}-{rec.somatotypeMeso}-{rec.somatotypeEcto}
                                                    </span>
                                                ) : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Helper Components
function MetricCard({ label, value, trend, icon: Icon, color }: any) {
    return (
        <Card>
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
                    <h4 className="text-2xl font-bold">{value}</h4>
                    {trend && (
                        <p className={`text-xs mt-1 ${trend > 0 ? 'text-green-500' : 'text-red-500'} flex items-center gap-1`}>
                            {trend > 0 ? '+' : ''}{trend}% vs anterior
                        </p>
                    )}
                </div>
                <div className={`p-3 rounded-full bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
                    <Icon className={`w-6 h-6 ${color}`} />
                </div>
            </CardContent>
        </Card>
    );
}

function ChartCard({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <Card className="h-[400px] flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-slate-700 dark:text-gray-200">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 pb-6 pr-6">
                {children}
            </CardContent>
        </Card>
    );
}

function CustomTooltip({ active, payload, label, unit }: any) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg text-sm">
                <p className="font-bold mb-2 text-slate-700 dark:text-slate-200">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 mb-1" style={{ color: entry.stroke || entry.fill }}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.stroke || entry.fill }} />
                        <span>{entry.name}: <b>{entry.value} {unit || (entry.name.includes('%') ? '%' : 'kg')}</b></span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
}

function calculateTrend(history: AnthropometryHistoryRecord[], key: keyof AnthropometryHistoryRecord): number | null {
    if (history.length < 2) return null;
    const current = Number(history[history.length - 1][key]);
    const previous = Number(history[history.length - 2][key]);

    if (!current || !previous) return null;

    const diff = ((current - previous) / previous) * 100;
    return Math.round(diff * 10) / 10;
}
