"use client";

import { useEffect, useState, useMemo } from "react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, BarChart, Bar, Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, TrendingUp, Calendar, AlertCircle, PieChart } from "lucide-react";
import { getPatientHistory, AnthropometryHistoryRecord } from "@/actions/patient-actions";
import { getMedidasByPaciente, getPacienteById } from "@/lib/storage";
import { calcularComposicionCorporal } from "@/lib/calculos-nutricionales";
import { calculateFiveComponentFractionation, FiveComponentInput } from "@/lib/fiveComponentMath";
import { getAnthroNumber, MedidasAntropometricas, Paciente } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PediatricGrowthChart } from "@/components/pediatrics/PediatricGrowthChart";
import { calculateExactAgeInMonths } from "@/lib/growth-standards";
import { Badge } from "@/components/ui/badge";

interface EvolutionSummaryProps {
    patientId: string;
    mode?: 'pediatric' | 'adult' | 'geriatric';
}

// Helper function to calculate body fat % using proper formulas
function calculateBodyFatPercent(medida: MedidasAntropometricas): number {
    if (!medida.pliegues) return 0;

    // Try to use calcularComposicionCorporal for accurate calculation
    try {
        const composicion = calcularComposicionCorporal(medida, medida.tipoPaciente || 'general', '');
        if (composicion && composicion.porcentajeGrasa > 0) {
            return Math.round(composicion.porcentajeGrasa * 10) / 10;
        }
    } catch (e) {
        // Fallback to Yuhasz
    }

    // Fallback: Yuhasz modified formula
    const pliegues = medida.pliegues;
    const sumPliegues = Object.values(pliegues).reduce((a: number, b: any) => a + Number(getAnthroNumber(b, 0)), 0) as number;
    if (sumPliegues === 0) return 0;

    let bodyFat = 0;
    if (medida.sexo === 'masculino') {
        bodyFat = (sumPliegues * 0.097) + 3.64;
    } else {
        bodyFat = (sumPliegues * 0.1429) + 4.56;
    }
    return Math.max(3, Math.min(Math.round(bodyFat * 10) / 10, 50));
}

// Helper function to calculate 5-component fractionation
function calculate5Components(medida: MedidasAntropometricas): { adipose: number; muscle: number; bone: number; residual: number; skin: number } | null {
    // Check if we have enough data for 5-component model
    if (!medida.pliegues || !medida.perimetros || !medida.diametros) return null;

    try {
        const input: FiveComponentInput = {
            weight: medida.peso,
            height: medida.talla,
            age: medida.edad || 30,
            gender: medida.sexo === 'masculino' ? 'male' : 'female',
            triceps: getAnthroNumber(medida.pliegues?.triceps, 0),
            subscapular: getAnthroNumber(medida.pliegues?.subscapular, 0),
            biceps: getAnthroNumber(medida.pliegues?.biceps, 0),
            suprailiac: getAnthroNumber(medida.pliegues?.supraspinale || medida.pliegues?.iliac_crest, 0),
            abdominal: getAnthroNumber(medida.pliegues?.abdominal, 0),
            thigh: getAnthroNumber(medida.pliegues?.thigh, 0),
            calf: getAnthroNumber(medida.pliegues?.calf, 0),
            armRelaxedGirth: getAnthroNumber(medida.perimetros?.brazoRelax || medida.perimetros?.brazoRelajado, 0),
            armFlexedGirth: getAnthroNumber(medida.perimetros?.brazoFlex, 0),
            forearmGirth: 0,
            chestGirth: 0,
            waistGirth: getAnthroNumber(medida.perimetros?.cintura, 0),
            thighGirth: getAnthroNumber(medida.perimetros?.musloMedio, 0),
            calfGirth: getAnthroNumber(medida.perimetros?.pantorrilla, 0),
            humerusBreadth: getAnthroNumber(medida.diametros?.humero, 0),
            femurBreadth: getAnthroNumber(medida.diametros?.femur, 0),
            wristBreadth: getAnthroNumber(medida.diametros?.biestiloideo, 0),
            biacromialBreadth: getAnthroNumber(medida.diametros?.biacromial, 0),
            biiliocristalBreadth: getAnthroNumber(medida.diametros?.biiliocristal, 0),
            headCircumference: getAnthroNumber(medida.headCircumference || medida.perimetros?.headCircumference, 0),
        };

        // Check minimum required data for Kerr 5-component model
        if (input.triceps > 0 && input.subscapular > 0 && input.humerusBreadth > 0 && input.femurBreadth > 0 &&
            input.armRelaxedGirth > 0 && input.thighGirth > 0 && input.calfGirth > 0) {
            const result = calculateFiveComponentFractionation(input);
            if (result.isValid) {
                return {
                    adipose: Math.round(result.adipose.kg * 10) / 10,
                    muscle: Math.round(result.muscle.kg * 10) / 10,
                    bone: Math.round(result.bone.kg * 10) / 10,
                    residual: Math.round(result.residual.kg * 10) / 10,
                    skin: Math.round(result.skin.kg * 10) / 10,
                };
            }
        }
    } catch (e) {
        console.warn('5-component calculation failed:', e);
    }
    return null;
}

export function EvolutionSummary({ patientId, mode = 'adult' }: EvolutionSummaryProps) {
    const [history, setHistory] = useState<AnthropometryHistoryRecord[]>([]);
    const [patient, setPatient] = useState<Paciente | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (patientId) {
            // Get patient info for birth date and sex
            const patientData = getPacienteById(patientId);
            if (patientData) {
                setPatient(patientData);
            }

            // Try to get data from localStorage first (immediate)
            const localMedidas = getMedidasByPaciente(patientId);
            const sexo = patientData?.datosPersonales?.sexo === 'femenino' ? 'female' : 'male';
            const birthDate = patientData?.datosPersonales?.fechaNacimiento;

            if (localMedidas && localMedidas.length > 0) {
                const localHistory: AnthropometryHistoryRecord[] = localMedidas
                    .filter((m: MedidasAntropometricas) => m.peso && m.talla)
                    .map((m: MedidasAntropometricas) => {
                        const ageInMonths = birthDate ? calculateExactAgeInMonths(birthDate, m.fecha || m.createdAt || new Date()) : 0;
                        const medidaWithSexo = { ...m, sexo: m.sexo || (sexo === 'female' ? 'femenino' : 'masculino') } as MedidasAntropometricas;
                        const bodyFatPercent = calculateBodyFatPercent(medidaWithSexo);
                        const fiveComp = calculate5Components(medidaWithSexo);
                        const masaGrasa = fiveComp ? fiveComp.adipose : (bodyFatPercent / 100) * (m.peso || 0);
                        const masaMuscular = fiveComp ? fiveComp.muscle : (m.peso || 0) - masaGrasa;

                        return {
                            id: m.id,
                            date: m.fecha || m.createdAt || new Date().toISOString(),
                            weight: m.peso || 0,
                            height: m.talla || 0,
                            ageInMonths,
                            bodyFatPercent: fiveComp ? (fiveComp.adipose / (m.peso || 70)) * 100 : bodyFatPercent,
                            muscleMassKg: Math.round(masaMuscular * 10) / 10,
                            somatotypeEndo: null,
                            somatotypeMeso: null,
                            somatotypeEcto: null,
                            // Store 5-component data if available
                            fiveComponent: fiveComp
                        } as AnthropometryHistoryRecord & { fiveComponent?: any; ageInMonths?: number };
                    })
                    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

                setHistory(localHistory);
                setLoading(false);
            }

            getPatientHistory(patientId).then(res => {
                if (res.success && res.data && res.data.length > 0) {
                    const enrichedData = res.data.map(rec => {
                        const ageInMonths = birthDate ? calculateExactAgeInMonths(birthDate, rec.date) : 0;
                        if (!rec.bodyFatPercent || !rec.muscleMassKg) {
                            const localMatch = localMedidas.find((m: any) => m.id === rec.id) as MedidasAntropometricas | undefined;
                            if (localMatch && localMatch.pliegues) {
                                const medidaWithSexo = { ...localMatch, sexo: localMatch.sexo || (sexo === 'female' ? 'femenino' : 'masculino') } as MedidasAntropometricas;
                                const bodyFatPercent = calculateBodyFatPercent(medidaWithSexo);
                                const fiveComp = calculate5Components(medidaWithSexo);
                                const masaGrasa = fiveComp ? fiveComp.adipose : (bodyFatPercent / 100) * rec.weight;
                                return {
                                    ...rec,
                                    ageInMonths,
                                    bodyFatPercent: fiveComp ? (fiveComp.adipose / rec.weight) * 100 : bodyFatPercent,
                                    muscleMassKg: fiveComp ? fiveComp.muscle : Math.round((rec.weight - masaGrasa) * 10) / 10,
                                    fiveComponent: fiveComp
                                };
                            }
                        }
                        return { ...rec, ageInMonths };
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

    const latest = history[history.length - 1];
    const previous = history.length > 1 ? history[history.length - 2] : null;

    const weightDelta = previous ? latest.weight - previous.weight : 0;
    const heightDelta = previous ? latest.height - previous.height : 0;

    const formatDelta = (delta: number, unit: string) => {
        if (delta > 0) return `Ganó ${delta.toFixed(2)}${unit}`;
        if (delta < 0) return `Perdió ${Math.abs(delta).toFixed(2)}${unit}`;
        return "Sin cambios";
    };

    const chartData = history.map(rec => ({
        date: format(new Date(rec.date), 'dd MMM', { locale: es }),
        fullDate: format(new Date(rec.date), 'dd MMMM yyyy', { locale: es }),
        weight: rec.weight,
        fat: rec.bodyFatPercent || 0,
        muscle: rec.muscleMassKg || 0
    }));

    // Calculate dynamic end month for pediatric charts to avoid excessive whitespace
    const maxAgeInMonths = history.length > 0
        ? Math.max(...history.map(h => (h as any).ageInMonths || 0))
        : 0;

    let dynamicEndMonth = 24; // Default/Minimum
    if (maxAgeInMonths <= 6) dynamicEndMonth = 6;
    else if (maxAgeInMonths <= 12) dynamicEndMonth = 12;
    else if (maxAgeInMonths <= 24) dynamicEndMonth = 24;
    else if (maxAgeInMonths <= 36) dynamicEndMonth = 36;
    else dynamicEndMonth = 60;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                    label={mode === 'geriatric' ? "Masa Múscular Est." : "Peso Actual"}
                    value={mode === 'geriatric' ? `${latest.muscleMassKg} kg` : `${latest.weight} kg`}
                    delta={mode === 'geriatric' ? null : formatDelta(weightDelta, 'kg')}
                    icon={Activity}
                    color={mode === 'geriatric' ? "text-green-500" : "text-blue-500"}
                />
                <MetricCard
                    label={mode === 'pediatric' ? "Talla Actual" : "% Grasa Actual"}
                    value={mode === 'pediatric' ? `${latest.height} cm` : (latest.bodyFatPercent ? `${latest.bodyFatPercent}%` : '-')}
                    delta={mode === 'pediatric' ? formatDelta(heightDelta, 'cm') : null}
                    icon={TrendingUp}
                    color="text-orange-500"
                />
                <MetricCard
                    label={mode === 'adult' ? "Masa Muscular" : "Mantenimiento"}
                    value={mode === 'adult' ? `${latest.muscleMassKg} kg` : 'Estable'}
                    icon={Activity}
                    color="text-green-500"
                />
            </div>

            {/* Tabs for Charts vs Table */}
            <Tabs defaultValue="charts" className="w-full">
                <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-4">
                    <TabsTrigger value="charts" className="text-sm font-medium rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                        Gráficos de Tendencia
                    </TabsTrigger>
                    <TabsTrigger value="table" className="text-sm font-medium rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm">
                        Tabla Histórica
                    </TabsTrigger>
                </TabsList>

                {/* Charts Tab Content */}
                <TabsContent value="charts" className="focus-visible:outline-none">
                    {mode === 'pediatric' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <PediatricGrowthChart
                                indicator="wfa"
                                sex={patient?.datosPersonales?.sexo === 'femenino' ? 'female' : 'male'}
                                patientData={history.map(h => ({
                                    ageInMonths: (h as any).ageInMonths || 0,
                                    value: h.weight,
                                    date: h.date
                                }))}
                                startMonth={0}
                                endMonth={dynamicEndMonth}
                                patientName={patient?.datosPersonales?.nombre}
                            />
                            <PediatricGrowthChart
                                indicator="lhfa"
                                sex={patient?.datosPersonales?.sexo === 'femenino' ? 'female' : 'male'}
                                patientData={history.map(h => ({
                                    ageInMonths: (h as any).ageInMonths || 0,
                                    value: h.height,
                                    date: h.date
                                }))}
                                startMonth={0}
                                endMonth={dynamicEndMonth}
                                patientName={patient?.datosPersonales?.nombre}
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Chart 1: Priority based on mode */}
                            {mode === 'geriatric' ? (
                                <ChartCard title="Evolución de Masa Muscular (kg)">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorMuscle" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                                            <Tooltip content={<CustomTooltip unit="kg" />} />
                                            <Area type="monotone" dataKey="muscle" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorMuscle)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </ChartCard>
                            ) : (
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
                            )}

                            {/* Chart 2: Secondary based on mode */}
                            <ChartCard title={mode === 'geriatric' ? "Control de Peso (kg)" : (chartData.some(d => d.fat > 0 || d.muscle > 0) ? "Porcentaje de Grasa vs Músculo (kg)" : "Evolución de Peso (kg)")}>
                                <ResponsiveContainer width="100%" height="100%">
                                    {chartData.some(d => d.fat > 0 || d.muscle > 0) ? (
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis yAxisId="left" stroke="#f97316" fontSize={12} tickLine={false} axisLine={false} domain={[0, 'auto']} />
                                            <YAxis yAxisId="right" orientation="right" stroke="#22c55e" fontSize={12} tickLine={false} axisLine={false} domain={[0, 'auto']} />
                                            <Tooltip content={<CustomTooltip unit="" />} />
                                            <Line yAxisId="left" type="monotone" dataKey="fat" name="% Grasa" stroke="#f97316" strokeWidth={3} dot={{ r: 5, fill: "#f97316" }} />
                                            <Line yAxisId="right" type="monotone" dataKey="muscle" name="Músculo (kg)" stroke="#22c55e" strokeWidth={3} dot={{ r: 5, fill: "#22c55e" }} />
                                        </LineChart>
                                    ) : (
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorWeightAlt" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                                            <Tooltip content={<CustomTooltip unit="kg" />} />
                                            <Area type="monotone" dataKey="weight" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorWeightAlt)" dot={{ r: 5, fill: "#8b5cf6" }} />
                                        </AreaChart>
                                    )}
                                </ResponsiveContainer>
                            </ChartCard>
                        </div>
                    )}

                    {/* 5-Component Kerr Evolution Chart - Full width */}
                    {mode === 'adult' && chartData.some(d => d.muscle > 0) && (
                        <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
                            <CardHeader className="pb-2 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <PieChart className="w-5 h-5 text-orange-500" />
                                        <CardTitle className="text-sm font-bold text-slate-700 dark:text-gray-200">
                                            Evolución Composición Corporal (5C Kerr)
                                        </CardTitle>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs">
                                        <div className="flex items-center gap-1">
                                            <span className="text-orange-500">🔥</span>
                                            <span className="text-slate-600 dark:text-slate-300">Músculo:</span>
                                            <span className="font-bold text-slate-800 dark:text-white">{chartData[chartData.length - 1]?.muscle || 0}kg</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-red-500">●</span>
                                            <span className="text-slate-600 dark:text-slate-300">Adiposo:</span>
                                            <span className="font-bold text-slate-800 dark:text-white">{((chartData[chartData.length - 1]?.fat || 0) / 100 * (chartData[chartData.length - 1]?.weight || 70)).toFixed(1)}kg</span>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData.map(d => ({
                                            ...d,
                                            musclePercent: (d.muscle / d.weight) * 100,
                                            adiposePercent: d.fat
                                        }))}>
                                            <defs>
                                                <linearGradient id="colorMuscleStack" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.8} />
                                                    <stop offset="100%" stopColor="#fb923c" stopOpacity={0.6} />
                                                </linearGradient>
                                                <linearGradient id="colorAdiposeStack" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.7} />
                                                    <stop offset="100%" stopColor="#f87171" stopOpacity={0.5} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                                            <Tooltip
                                                content={({ active, payload, label }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md p-3 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl text-xs">
                                                                <p className="font-bold mb-2 text-slate-800 dark:text-slate-100">{label}</p>
                                                                {payload.map((entry: any, index: number) => (
                                                                    <div key={index} className="flex items-center gap-2 mb-1">
                                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                                                        <span className="text-slate-600 dark:text-slate-300">{entry.name}:</span>
                                                                        <span className="font-bold">{entry.value.toFixed(1)}%</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Legend
                                                verticalAlign="bottom"
                                                height={36}
                                                content={() => (
                                                    <div className="flex justify-center gap-6 pt-2">
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="text-orange-500">→</span>
                                                            <span className="text-slate-600 dark:text-slate-300">Músculo</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="text-red-500">→</span>
                                                            <span className="text-slate-600 dark:text-slate-300">Adiposo</span>
                                                        </div>
                                                    </div>
                                                )}
                                            />
                                            <Area type="monotone" dataKey="musclePercent" name="Músculo" stackId="1" stroke="#f97316" fill="url(#colorMuscleStack)" />
                                            <Area type="monotone" dataKey="adiposePercent" name="Adiposo" stackId="1" stroke="#ef4444" fill="url(#colorAdiposeStack)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Change Summary */}
                                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="text-center">
                                        <p className="text-xs text-slate-500">Cambio Músculo</p>
                                        <p className="text-lg font-bold text-slate-800 dark:text-white">
                                            {chartData.length > 1 ? (chartData[chartData.length - 1].muscle - chartData[0].muscle).toFixed(1) : '0'} kg
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            ({chartData.length > 1 && chartData[0].muscle > 0 ?
                                                (((chartData[chartData.length - 1].muscle - chartData[0].muscle) / chartData[0].muscle) * 100).toFixed(1) : '0.0'}%)
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-slate-500">Cambio Adiposo</p>
                                        <p className="text-lg font-bold text-slate-800 dark:text-white">
                                            {chartData.length > 1 ? (chartData[chartData.length - 1].fat - chartData[0].fat).toFixed(1) : '0'} kg
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            ({chartData.length > 1 && chartData[0].fat > 0 ?
                                                (((chartData[chartData.length - 1].fat - chartData[0].fat) / chartData[0].fat) * 100).toFixed(1) : '0.0'}%)
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-slate-500">Cambio Peso</p>
                                        <p className="text-lg font-bold text-slate-800 dark:text-white">
                                            {chartData.length > 1 ? (chartData[chartData.length - 1].weight - chartData[0].weight).toFixed(1) : '0'} kg
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            ({chartData.length > 1 && chartData[0].weight > 0 ?
                                                (((chartData[chartData.length - 1].weight - chartData[0].weight) / chartData[0].weight) * 100).toFixed(1) : '0.0'}%)
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Table Tab Content */}
                <TabsContent value="table" className="focus-visible:outline-none">
                    <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
                        <CardHeader className="pb-2 bg-slate-50/50 dark:bg-slate-900/30">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <CardTitle className="text-sm font-bold text-slate-700 dark:text-gray-200 uppercase tracking-tight flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Historial de Evaluaciones
                                </CardTitle>

                                <Tabs defaultValue="resumen" className="w-full sm:w-auto">
                                    <TabsList className="bg-slate-200/50 dark:bg-slate-800 p-1 h-8">
                                        <TabsTrigger value="resumen" className="text-[10px] sm:text-xs h-6 px-3">Resumen</TabsTrigger>
                                        <TabsTrigger value="composicion" className="text-[10px] sm:text-xs h-6 px-3">Composición 5C</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Tabs defaultValue="resumen" className="w-full">
                                <TabsContent value="resumen" className="mt-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                                                <TableHead className="font-bold text-slate-600 dark:text-slate-300">Fecha</TableHead>
                                                <TableHead className="font-bold text-slate-600 dark:text-slate-300 text-center">Peso (kg)</TableHead>
                                                {mode !== 'pediatric' && (
                                                    <TableHead className="font-bold text-slate-600 dark:text-slate-300 text-center">% Grasa</TableHead>
                                                )}
                                                {mode === 'pediatric' && (
                                                    <TableHead className="font-bold text-slate-600 dark:text-slate-300 text-center">Talla (cm)</TableHead>
                                                )}
                                                <TableHead className="font-bold text-slate-600 dark:text-slate-300 text-center">
                                                    {mode === 'pediatric' ? 'IMC' : 'Masa Muscular (kg)'}
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {history.slice().reverse().map((rec, index) => (
                                                <TableRow key={rec.id || index} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                    <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                                                        {format(new Date(rec.date), 'dd MMM yyyy', { locale: es })}
                                                    </TableCell>
                                                    <TableCell className="text-center font-semibold text-blue-600 dark:text-blue-400">
                                                        {rec.weight}
                                                    </TableCell>
                                                    {mode !== 'pediatric' && (
                                                        <TableCell className="text-center font-semibold text-orange-500">
                                                            {rec.bodyFatPercent ? `${rec.bodyFatPercent.toFixed(1)}%` : '-'}
                                                        </TableCell>
                                                    )}
                                                    {mode === 'pediatric' && (
                                                        <TableCell className="text-center font-semibold text-purple-600 dark:text-purple-400">
                                                            {rec.height}
                                                        </TableCell>
                                                    )}
                                                    <TableCell className="text-center font-semibold text-green-600 dark:text-green-400">
                                                        {mode === 'pediatric'
                                                            ? (rec.weight && rec.height ? ((rec.weight / ((rec.height / 100) ** 2)).toFixed(1)) : '-')
                                                            : (rec.muscleMassKg || '-')
                                                        }
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TabsContent>

                                <TabsContent value="composicion" className="mt-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                                                <TableHead className="font-bold text-slate-600 dark:text-slate-300">Fecha</TableHead>
                                                <TableHead className="font-bold text-red-600 dark:text-red-400 text-center">Adiposo (kg)</TableHead>
                                                <TableHead className="font-bold text-orange-600 dark:text-orange-400 text-center">Músculo (kg)</TableHead>
                                                <TableHead className="font-bold text-blue-600 dark:text-blue-400 text-center">Óseo (kg)</TableHead>
                                                <TableHead className="font-bold text-gray-600 dark:text-gray-400 text-center">Residual (kg)</TableHead>
                                                <TableHead className="font-bold text-yellow-600 dark:text-yellow-400 text-center">Piel (kg)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {history.slice().reverse().map((rec, index) => (
                                                <TableRow key={rec.id || index} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                    <TableCell className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                                                        {format(new Date(rec.date), 'dd MMM yyyy', { locale: es })}
                                                    </TableCell>
                                                    <TableCell className="text-center font-semibold text-red-500">
                                                        {(rec as any).fiveComponent?.adipose || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center font-semibold text-orange-500">
                                                        {(rec as any).fiveComponent?.muscle || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center font-semibold text-blue-500">
                                                        {(rec as any).fiveComponent?.bone || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center font-semibold text-gray-500">
                                                        {(rec as any).fiveComponent?.residual || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center font-semibold text-yellow-600">
                                                        {(rec as any).fiveComponent?.skin || '-'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    {!history.some(rec => (rec as any).fiveComponent) && (
                                        <div className="py-8 text-center text-slate-400">
                                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-xs">No hay datos de fraccionamiento 5C para este paciente.</p>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>

                            {history.length === 0 && (
                                <div className="py-8 text-center text-slate-400">
                                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>No hay registros históricos disponibles</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div >
    );
}

// Helper Components
function MetricCard({ label, value, trend, delta, icon: Icon, color }: any) {
    // Define gradient backgrounds based on color
    const gradientStyles: Record<string, string> = {
        'text-blue-500': 'bg-gradient-to-br from-blue-500 to-blue-600',
        'text-orange-500': 'bg-gradient-to-br from-orange-400 to-orange-500',
        'text-green-500': 'bg-gradient-to-br from-green-500 to-green-600',
    };

    const bgClass = gradientStyles[color] || 'bg-gradient-to-br from-slate-500 to-slate-600';

    // Extract number and unit from value
    const valueMatch = value.match(/^([\d.]+)\s*(.*)$/);
    const numberValue = valueMatch ? valueMatch[1] : value;
    const unitValue = valueMatch ? valueMatch[2] : '';

    return (
        <div className={`${bgClass} rounded-2xl p-5 text-white shadow-lg relative overflow-hidden`}>
            {/* Background pattern */}
            <div className="absolute right-0 bottom-0 opacity-10">
                <svg width="120" height="120" viewBox="0 0 120 120" fill="currentColor">
                    <circle cx="100" cy="100" r="80" />
                </svg>
            </div>

            {/* Content */}
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider opacity-90">{label}</span>
                    <Icon className="w-4 h-4 opacity-70" />
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{numberValue}</span>
                    <span className="text-sm font-medium opacity-80">{unitValue}</span>
                </div>

                {delta && (
                    <div className="mt-2 flex items-center gap-1">
                        <Badge variant="outline" className="bg-white/20 border-white/30 text-white text-[10px] font-bold">
                            {delta}
                        </Badge>
                    </div>
                )}

                {trend !== undefined && trend !== null && !delta && (
                    <div className="mt-2">
                        <span className="text-sm font-medium opacity-80">
                            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

function ChartCard({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <Card className="h-[350px] flex flex-col border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-2 bg-slate-50/30 dark:bg-slate-900/30">
                <CardTitle className="text-sm font-bold text-slate-700 dark:text-gray-200 uppercase tracking-tight">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 pb-6 pr-6 pt-4">
                {children}
            </CardContent>
        </Card>
    );
}

function CustomTooltip({ active, payload, label, unit }: any) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-3 border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl text-xs">
                <p className="font-black mb-2 text-slate-800 dark:text-slate-100 uppercase">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 mb-1" style={{ color: entry.stroke || entry.fill }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.stroke || entry.fill }} />
                        <span className="font-semibold">{entry.name}: <span className="font-black">{entry.value}{unit || (entry.name.includes('%') ? '%' : ' kg')}</span></span>
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

    if (!current || !previous || previous === 0) return null;

    const diff = ((current - previous) / previous) * 100;
    return Math.round(diff * 10) / 10;
}
