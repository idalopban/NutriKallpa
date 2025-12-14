"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Label } from "recharts";
import { Cita } from "@/types";

interface ScheduledEventsChartProps {
    citas: Cita[];
}

// Duración estimada por tipo de cita (en minutos)
const DURATION_BY_TYPE: Record<string, number> = {
    "Consulta": 60,           // 1 hora
    "Control": 30,            // 30 minutos
    "Antropometría": 45,      // 45 minutos
    "Primera vez": 90,        // 1.5 horas
    "Seguimiento": 30,        // 30 minutos
    "Emergencia": 30,         // 30 minutos
    "Evaluación": 60,         // 1 hora
    "default": 45             // 45 minutos por defecto
};

// Categorías para agrupar tipos de citas
const CATEGORIES = {
    "Consultas": ["Consulta", "Control", "Primera vez", "Seguimiento", "Emergencia"],
    "Antropometrías": ["Antropometría", "Evaluación"]
};

const COLORS: Record<string, string> = {
    "Consultas": "#6cba00",      // Verde Vida
    "Antropometrías": "#ff8508", // Naranja Energía
    "Tiempo Libre": "#e5e7eb"    // Gris claro
};

export function ScheduledEventsChart({ citas }: ScheduledEventsChartProps) {
    // Jornada laboral de 8 horas (480 minutos)
    const WORK_DAY_MINUTES = 480;

    // Filtrar citas del día de hoy
    const todaysCitas = useMemo(() => {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        return citas.filter(cita => cita.fecha === todayStr);
    }, [citas]);

    // Calcular estadísticas reales del día
    const stats = useMemo(() => {
        const consultas = todaysCitas.filter(c =>
            CATEGORIES["Consultas"].some(type =>
                c.motivo?.toLowerCase().includes(type.toLowerCase())
            )
        );

        const antropometrias = todaysCitas.filter(c =>
            CATEGORIES["Antropometrías"].some(type =>
                c.motivo?.toLowerCase().includes(type.toLowerCase())
            )
        );

        // Calcular minutos ocupados
        const calcMinutes = (citasList: Cita[]) => {
            return citasList.reduce((acc, cita) => {
                const motivo = cita.motivo || "";
                const matchedType = Object.keys(DURATION_BY_TYPE).find(t =>
                    motivo.toLowerCase().includes(t.toLowerCase())
                );
                return acc + (matchedType ? DURATION_BY_TYPE[matchedType] : DURATION_BY_TYPE.default);
            }, 0);
        };

        const consultasMinutes = calcMinutes(consultas);
        const antropometriasMinutes = calcMinutes(antropometrias);

        return {
            consultas: {
                count: consultas.length || todaysCitas.filter(c => !CATEGORIES["Antropometrías"].some(t => c.motivo?.toLowerCase().includes(t.toLowerCase()))).length,
                minutes: consultasMinutes || (todaysCitas.length - antropometrias.length) * 45
            },
            antropometrias: {
                count: antropometrias.length,
                minutes: antropometriasMinutes
            }
        };
    }, [todaysCitas]);

    // Calcular horario de trabajo basado en citas
    const workHours = useMemo(() => {
        if (todaysCitas.length === 0) {
            return { start: "8:00 AM", end: "4:00 PM" };
        }

        const sortedCitas = [...todaysCitas].sort((a, b) => a.hora.localeCompare(b.hora));
        const firstCita = sortedCitas[0];
        const lastCita = sortedCitas[sortedCitas.length - 1];

        const formatHour = (time: string) => {
            const [hours, minutes] = time.split(':');
            const h = parseInt(hours, 10);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            return `${h12}:${minutes} ${ampm}`;
        };

        // Calcular hora de término estimada (última cita + duración)
        const [lastHours, lastMinutes] = lastCita.hora.split(':').map(Number);
        const lastDuration = DURATION_BY_TYPE[Object.keys(DURATION_BY_TYPE).find(t =>
            lastCita.motivo?.toLowerCase().includes(t.toLowerCase())
        ) || "default"] || 45;

        const endDate = new Date();
        endDate.setHours(lastHours, lastMinutes + lastDuration, 0, 0);
        const endTime = `${endDate.getHours()}:${String(endDate.getMinutes()).padStart(2, '0')}`;

        return {
            start: formatHour(firstCita.hora),
            end: formatHour(endTime)
        };
    }, [todaysCitas]);

    // Datos del gráfico
    const events = [
        {
            name: "Consultas",
            count: stats.consultas.count,
            durationMinutes: stats.consultas.minutes,
            color: COLORS["Consultas"]
        },
        {
            name: "Antropometrías",
            count: stats.antropometrias.count,
            durationMinutes: stats.antropometrias.minutes,
            color: COLORS["Antropometrías"]
        }
    ].filter(e => e.count > 0 || e.durationMinutes > 0);

    // Cálculos de ocupación
    const occupiedMinutes = events.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    const freeMinutes = Math.max(0, WORK_DAY_MINUTES - occupiedMinutes);
    const busynessPercentage = todaysCitas.length > 0
        ? Math.round((occupiedMinutes / WORK_DAY_MINUTES) * 100)
        : 0;

    // Datos para el gráfico
    const chartData = [
        ...events.map(e => ({ name: e.name, value: e.durationMinutes, color: e.color, count: e.count })),
        { name: "Tiempo Libre", value: freeMinutes, color: COLORS["Tiempo Libre"], count: 0 }
    ];

    // Tooltip personalizado
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            if (data.name === "Tiempo Libre") return null;

            return (
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-3 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 text-xs">
                    <p className="font-bold text-gray-900 dark:text-gray-100 mb-1">{data.name}</p>
                    <p className="text-gray-500 dark:text-gray-400">
                        {data.count} sesion{data.count !== 1 ? 'es' : ''} ({Math.round(data.value / 60 * 10) / 10}h)
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white dark:bg-[#1e293b] text-gray-900 dark:text-gray-100 p-6 rounded-3xl shadow-sm dark:border dark:border-[#334155] h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Agenda de Hoy
                </h3>
                <div className="bg-green-50 text-[#6cba00] px-3 py-1 rounded-lg text-xs font-bold dark:bg-green-900/20">
                    {workHours.start} - {workHours.end}
                </div>
            </div>

            {/* Chart Container */}
            <div className="flex-1 min-h-[180px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={5}
                            paddingAngle={2}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}

                            {/* Label Central */}
                            <Label
                                content={({ viewBox }) => {
                                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                        return (
                                            <text
                                                x={viewBox.cx}
                                                y={viewBox.cy}
                                                textAnchor="middle"
                                                dominantBaseline="central"
                                            >
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) - 5}
                                                    className="fill-gray-900 dark:fill-white text-3xl font-bold"
                                                >
                                                    {busynessPercentage}%
                                                </tspan>
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) + 15}
                                                    className="fill-gray-500 dark:fill-gray-400 text-[10px] uppercase font-semibold tracking-wide"
                                                >
                                                    Ocupación
                                                </tspan>
                                            </text>
                                        );
                                    }
                                    return null;
                                }}
                            />
                        </Pie>
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Legend / Stats */}
            <div className="mt-4 space-y-3">
                {todaysCitas.length > 0 ? (
                    events.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <span
                                    className="w-3 h-3 rounded-full shadow-sm ring-2 ring-white dark:ring-gray-800"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                    {item.name}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                    {item.count}
                                </span>
                                <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                    {Math.round(item.durationMinutes / 60 * 10) / 10}h
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                        No hay citas programadas para hoy
                    </div>
                )}
            </div>
        </div>
    );
}
