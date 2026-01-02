"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar as CalendarIcon, MoreHorizontal, MapPin, Edit2, Save, ShieldCheck } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { cn } from "@/lib/utils";
import { User, Cita, Paciente } from "@/types";
import { useAuthStore } from "@/store/useAuthStore";
import { saveUser } from "@/lib/storage";
import { ScheduledEventsChart } from "./ScheduledEventsChart";
import { MonthlyProductivity } from "./MonthlyProductivity";

// UI Components for Edit Profile
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// --- Banner Component ---
interface BannerProps {
    userName?: string;
}

export function Banner({ userName }: BannerProps) {
    const today = new Date();
    const dateStr = today.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeStr = today.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit', hour12: true });

    // Dynamic greeting based on local hour
    const hour = today.getHours();
    let greeting = "Buenos días";
    let subGreeting = "Que tengas un buen día!";

    if (hour >= 12 && hour < 18) {
        greeting = "Buenas tardes";
        subGreeting = "Que tengas una buena tarde!";
    } else if (hour >= 18 || hour < 6) {
        greeting = "Buenas noches";
        subGreeting = "Que tenga una buena noche!";
    }

    return (
        <div className="relative w-full h-36 md:h-44 rounded-2xl md:rounded-3xl overflow-hidden bg-gradient-to-r from-[var(--brand-orange)] to-[#ff9f3c] text-white shadow-lg flex items-center">
            {/* Wave Pattern Background */}
            <div className="absolute inset-0">
                <svg
                    className="absolute bottom-0 left-0 w-full h-3/4"
                    viewBox="0 0 1200 200"
                    preserveAspectRatio="none"
                >
                    <path
                        d="M0,200 L0,100 Q150,20 300,80 T600,60 T900,90 T1200,50 L1200,200 Z"
                        fill="rgba(255,133,8,0.6)"
                    />
                    <path
                        d="M0,200 L0,120 Q200,40 400,100 T800,70 T1200,100 L1200,200 Z"
                        fill="rgba(255,133,8,0.4)"
                    />
                </svg>
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 p-4 md:p-8 flex flex-col justify-between h-full">
                <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 w-fit">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{dateStr} {timeStr}</span>
                </div>

                <div>
                    <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-1">{greeting}, {userName || "Doctor"}!</h2>
                    <p className="text-white/90 text-sm md:text-base">{subGreeting}</p>
                </div>
            </div>

            {/* Nueva Consulta Button - Integrated */}
            <div className="relative z-10 pr-4 md:pr-8">
                <a
                    href="/pacientes/nuevo"
                    className="flex items-center gap-2 px-5 py-3 
                        bg-white text-[var(--brand-orange)] font-bold text-sm rounded-xl 
                        shadow-lg hover:shadow-xl hover:scale-105
                        transition-all duration-300"
                >
                    <span className="text-lg">+</span>
                    <span>Nueva Consulta</span>
                </a>
            </div>
        </div>
    );
}

// --- Stats Widget ---
interface StatsWidgetProps {
    title: string;
    value: number;
    label: string;
    trend: string;
    trendUp?: boolean;
    data: { value: number }[];
    color: string;
}

export function StatsWidget({ title, value, label, trend, trendUp, data, color }: StatsWidgetProps) {
    return (
        <div className="bg-card text-card-foreground p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</h3>
                <button className="text-muted-foreground hover:text-primary"><MoreHorizontal className="w-5 h-5" /></button>
            </div>

            <div className="flex items-end gap-2 md:gap-4 mb-4">
                <div className="h-12 md:h-16 w-1/2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="value" stroke={color} fillOpacity={1} fill={`url(#gradient-${title})`} strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex-1">
                    <div className="text-2xl md:text-3xl font-bold text-card-foreground">{value}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className={cn("text-xs font-medium mt-1 px-2 py-1 rounded-lg inline-block", trendUp ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                        {trend}
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Profile Widget ---
interface ProfileWidgetProps {
    user: User | null;
}

export function ProfileWidget({ user }: ProfileWidgetProps) {
    const router = useRouter(); // Need to import useRouter at top

    return (
        <div className="rounded-3xl shadow-lg overflow-hidden flex flex-col h-full relative bg-card">
            {/* Green Background for Top Section */}
            <div className="absolute inset-x-0 top-0 h-40 bg-[var(--brand-green)]" />

            <div className="p-4 flex justify-between items-center border-b border-white/10 shrink-0 relative z-10 text-white">
                <h3 className="text-sm font-semibold uppercase tracking-wider">Mi perfil</h3>

                <button
                    onClick={() => router.push("/settings/nutrition")}
                    className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
                    title="Configurar perfil de nutricionista"
                >
                    <Edit2 className="w-4 h-4" />
                </button>
            </div>

            <div className="p-6 bg-card text-card-foreground rounded-t-3xl mt-2 flex-1 relative z-10">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-muted overflow-hidden shrink-0 border-2 border-[var(--brand-green)]">
                        {user?.photoUrl ? (
                            <img src={user.photoUrl} alt={user.nombre} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-[var(--brand-green)]/10 flex items-center justify-center text-[var(--brand-green)] font-bold text-xl">
                                {user?.nombre ? user.nombre.charAt(0).toUpperCase() : "U"}
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-bold text-lg truncate">{user?.nombre || "Usuario"}</h4>
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide truncate">
                            {user?.especialidad || "Especialista"}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-[150px]">{user?.bio || "Sin biografía"}</span>
                        </div>
                    </div>
                </div>

                {user?.clinicName && (
                    <div className="px-4 pb-4">
                        <div className="text-xs text-muted-foreground mb-1">Consultorio</div>
                        <div className="font-bold text-sm">{user.clinicName} {user.clinicAddress ? `· ${user.clinicAddress}` : ''}</div>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Teléfono</div>
                        <div className="font-bold text-sm truncate">{user?.telefono || "--"}</div>
                    </div>
                    <div className="border-l border-r border-gray-100 dark:border-slate-700">
                        <div className="text-xs text-muted-foreground mb-1">CNP</div>
                        <div className="font-bold text-sm truncate">{user?.cmp || "--"}</div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Rol</div>
                        <div className="font-bold text-sm capitalize">
                            {user?.rol === 'usuario' ? 'Nutricionista' : (user?.rol || "--")}
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );
}

// --- Calendar Widget ---
interface CalendarWidgetProps {
    citas?: Cita[];
    pacientes?: Paciente[];
}

export function CalendarWidget({ citas = [], pacientes = [] }: CalendarWidgetProps) {
    // Real calendar logic
    const today = new Date();

    // Helper to get local YYYY-MM-DD
    const getLocalDateStr = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const todayStr = getLocalDateStr(today);
    const [selectedDate, setSelectedDate] = useState<string>(todayStr);

    const currentDay = today.getDay(); // 0 = Sun, 6 = Sat
    // Adjust to make Monday the first day (getDay: 0=Sun, 1=Mon, ..., 6=Sat)
    // We want: Mon=0, Tue=1, ..., Sun=6
    const adjustedDay = currentDay === 0 ? 6 : currentDay - 1;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - adjustedDay); // Go back to Monday

    const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const dates = days.map((_, i) => {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const dStr = getLocalDateStr(d);
        return {
            date: d.getDate(),
            fullDate: dStr,
            isToday: dStr === todayStr,
            isSelected: dStr === selectedDate
        };
    });

    // Filter appointments for selected date
    const filteredCitas = citas
        .filter(c => c.fecha === selectedDate)
        .sort((a, b) => a.hora.localeCompare(b.hora));

    const getPatientName = (id: string) => {
        const p = pacientes.find(pat => pat.id === id);
        return p ? `${p.datosPersonales.nombre} ${p.datosPersonales.apellido}` : "Paciente";
    };

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'pm' : 'am';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    const getEventDetails = (cita: Cita) => {
        const isPersonal = cita.categoria === 'personal';
        const isUrgent = cita.categoria === 'urgente';
        const isWork = cita.categoria === 'trabajo';

        let color = "bg-[var(--brand-green)]"; // Default/Work
        if (isPersonal) color = "bg-purple-500";
        if (isUrgent) color = "bg-[var(--brand-orange)]";

        // Fallback for unlabeled
        if (!cita.categoria) {
            const m = cita.motivo.toLowerCase();
            if (m.includes("urgente")) color = "bg-[var(--brand-orange)]";
            else if (m.includes("personal") || m.includes("nota")) color = "bg-purple-500";
        }

        let title = cita.motivo;
        let subtitle = "";

        if (isPersonal || isUrgent) {
            // Don't show "con Paciente" for notes
            subtitle = isPersonal ? "Nota Personal" : "Urgente";
        } else {
            // Show patient name for work
            subtitle = getPatientName(cita.pacienteId);
        }

        return { color, title, subtitle };
    };

    return (
        <div className="bg-[var(--brand-orange)] text-white rounded-2xl md:rounded-3xl shadow-lg overflow-hidden p-4 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider">Calendario</h3>
                <button
                    onClick={() => setSelectedDate(todayStr)}
                    className={cn(
                        "px-3 py-1 rounded-lg text-sm transition-colors",
                        selectedDate === todayStr ? "bg-white/20 font-medium" : "hover:bg-white/10"
                    )}
                >
                    Hoy
                </button>
            </div>

            <div className="bg-card text-card-foreground rounded-2xl md:rounded-3xl p-3 md:p-4">
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {days.map(d => <div key={d} className="text-xs text-muted-foreground">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                    {dates.map((d, i) => (
                        <button
                            key={i}
                            onClick={() => setSelectedDate(d.fullDate)}
                            className={cn(
                                "h-8 w-8 flex items-center justify-center rounded-full text-sm font-medium mx-auto transition-all",
                                d.isSelected
                                    ? "bg-card text-[var(--brand-orange)] shadow-md border border-[var(--brand-orange)] scale-110"
                                    : "hover:bg-muted/10",
                                d.isToday && !d.isSelected && "text-[var(--brand-orange)] font-bold"
                            )}
                        >
                            {d.date}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-6 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2">
                    {selectedDate === todayStr ? "Citas de Hoy" : `Citas del ${selectedDate.split('-')[2]}`}
                </div>

                {filteredCitas.length > 0 ? (
                    filteredCitas.map((cita, i) => {
                        const { color, title, subtitle } = getEventDetails(cita);

                        return (
                            <div key={cita.id} className="flex items-center gap-3 text-sm animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                                <div className="w-16 text-right opacity-80 text-xs whitespace-nowrap">{formatTime(cita.hora)}</div>
                                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", color)}></div>
                                <div className="truncate flex-1">
                                    <span className="font-medium">{title}</span>
                                    {subtitle && <span className="text-xs opacity-70 ml-2">· {subtitle}</span>}
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="text-sm opacity-80 text-center py-4 border border-white/10 rounded-xl bg-white/5">
                        No hay citas para este día
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Scheduled Events Widget ---
// Re-exporting the chart component that uses real citas data
export { ScheduledEventsChart as ScheduledEventsWidget };

// --- Plans Done Widget (Legacy) ---
// Re-exporting the new specialized component
export { MonthlyProductivity as PlansDoneWidget };
