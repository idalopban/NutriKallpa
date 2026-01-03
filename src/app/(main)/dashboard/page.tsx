"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import {
    Banner,
    StatsWidget,
    ProfileWidget,
    CalendarWidget,
    ScheduledEventsWidget,
    PlansDoneWidget
} from "@/components/dashboard/DashboardWidgets";
import { AtRiskPatientsWidget, WeeklyProgressWidget } from "@/components/dashboard/ClinicalWidgets";
import { DraggableDashboard } from "@/components/dashboard/DraggableDashboard";
import { SortableWidget } from "@/components/dashboard/SortableWidget";
import { useAuthStore } from "@/store/useAuthStore";
import { getPacientes, getPacientesAsync, getCitas, getCitasAsync, getAllMedidas } from "@/lib/storage";
import { getUserDietHistoryAsync, type SavedPlan } from "@/lib/diet-service";
import { Paciente, Cita, MedidasAntropometricas } from "@/types";

// Widget IDs for drag and drop
const WIDGET_IDS = {
    STATS_PACIENTES: "stats-pacientes",
    STATS_CITAS: "stats-citas",
    STATS_DIETAS: "stats-dietas",
    SCHEDULED_EVENTS: "scheduled-events",
    PLANS_DONE: "plans-done",
    PROFILE: "profile",
    CALENDAR: "calendar",
    AT_RISK: "at-risk",
    WEEKLY_PROGRESS: "weekly-progress",
};

export default function DashboardPage() {
    const { user } = useAuthStore();
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [citas, setCitas] = useState<Cita[]>([]);
    const [medidas, setMedidas] = useState<MedidasAntropometricas[]>([]);
    const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
    const [mounted, setMounted] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        async function loadData() {
            // Wait for user authentication before loading data
            if (!user?.id) {
                // Still waiting for AuthGuard to restore session
                return;
            }

            setMounted(true);
            setIsLoadingData(true);

            try {
                const [pData, cData, sPlans] = await Promise.all([
                    getPacientesAsync(user.id),
                    getCitasAsync(),
                    getUserDietHistoryAsync(user.id)
                ]);
                setPacientes(pData);
                setCitas(cData);
                setSavedPlans(sPlans);
                setMedidas(getAllMedidas());
            } catch (error) {
                console.error("Error loading dashboard data:", error);
            } finally {
                setIsLoadingData(false);
            }
        }
        loadData();
    }, [user?.id]);

    if (!mounted || isLoadingData || !user?.id) {
        return (
            <div className="flex items-center justify-center h-full w-full">
                <span className="text-muted-foreground text-lg">Cargando dashboard...</span>
            </div>
        );
    }


    // Mock data for charts
    const offlineData = [{ value: 40 }, { value: 30 }, { value: 45 }, { value: 25 }, { value: 55 }, { value: 40 }, { value: 60 }];
    const onlineData = [{ value: 20 }, { value: 40 }, { value: 30 }, { value: 50 }, { value: 35 }, { value: 65 }, { value: 50 }];
    const labData = [{ value: 30 }, { value: 30 }, { value: 30 }, { value: 30 }, { value: 30 }, { value: 30 }, { value: 30 }];

    // Calculate real stats
    const totalPacientes = pacientes.length;
    const totalCitas = citas.length;
    const totalDietas = savedPlans.length;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 h-full px-4 md:px-6 lg:px-8 pb-4 md:pb-6 lg:pb-8">
            {/* Left Column */}
            <div className="lg:col-span-2 flex flex-col gap-4 md:gap-6 lg:gap-8">
                <Banner userName={user?.nombre} />

                {/* Profile + Calendar - Mobile Only (appears after banner) */}
                <div className="lg:hidden flex flex-col gap-4">
                    <ProfileWidget user={user} />
                    <CalendarWidget citas={citas} pacientes={pacientes} />
                </div>

                {/* Stats Row - Draggable */}
                <DraggableDashboard
                    defaultOrder={[WIDGET_IDS.STATS_PACIENTES, WIDGET_IDS.STATS_CITAS, WIDGET_IDS.STATS_DIETAS]}
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 lg:gap-6"
                >
                    <SortableWidget id={WIDGET_IDS.STATS_PACIENTES}>
                        <StatsWidget
                            title="Pacientes"
                            value={totalPacientes}
                            label="Total registrados"
                            trend="+5% este mes"
                            trendUp={true}
                            data={offlineData}
                            color="var(--brand-orange)"
                        />
                    </SortableWidget>
                    <SortableWidget id={WIDGET_IDS.STATS_CITAS}>
                        <StatsWidget
                            title="Citas"
                            value={totalCitas}
                            label="En agenda"
                            trend="+12% vs ayer"
                            trendUp={true}
                            data={onlineData}
                            color="var(--brand-green)"
                        />
                    </SortableWidget>
                    <SortableWidget id={WIDGET_IDS.STATS_DIETAS}>
                        <StatsWidget
                            title="Dietas"
                            value={totalDietas}
                            label="Planes creados"
                            trend="+2% vs mes pasado"
                            trendUp={true}
                            data={labData}
                            color="var(--brand-orange)"
                        />
                    </SortableWidget>
                </DraggableDashboard>

                {/* Clinical Widgets Row - NEW */}
                <DraggableDashboard
                    defaultOrder={[WIDGET_IDS.AT_RISK, WIDGET_IDS.WEEKLY_PROGRESS]}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 lg:gap-6"
                >
                    <SortableWidget id={WIDGET_IDS.AT_RISK}>
                        <AtRiskPatientsWidget pacientes={pacientes} medidas={medidas} />
                    </SortableWidget>
                    <SortableWidget id={WIDGET_IDS.WEEKLY_PROGRESS}>
                        <WeeklyProgressWidget medidas={medidas} pacientes={pacientes} />
                    </SortableWidget>
                </DraggableDashboard>

                {/* Charts Row - Draggable */}
                <DraggableDashboard
                    defaultOrder={[WIDGET_IDS.SCHEDULED_EVENTS, WIDGET_IDS.PLANS_DONE]}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 lg:gap-6 flex-1"
                >
                    <SortableWidget id={WIDGET_IDS.SCHEDULED_EVENTS}>
                        <ScheduledEventsWidget citas={citas} />
                    </SortableWidget>
                    <SortableWidget id={WIDGET_IDS.PLANS_DONE}>
                        <PlansDoneWidget dietPlans={savedPlans} />
                    </SortableWidget>
                </DraggableDashboard>
            </div>

            {/* Right Column - Desktop Only */}
            <div className="hidden lg:flex flex-col gap-4 md:gap-6 lg:gap-8">
                <DraggableDashboard
                    defaultOrder={[WIDGET_IDS.PROFILE, WIDGET_IDS.CALENDAR]}
                    className="flex flex-col gap-4 md:gap-6 lg:gap-8"
                >
                    <SortableWidget id={WIDGET_IDS.PROFILE}>
                        <ProfileWidget user={user} />
                    </SortableWidget>
                    <SortableWidget id={WIDGET_IDS.CALENDAR}>
                        <CalendarWidget citas={citas} pacientes={pacientes} />
                    </SortableWidget>
                </DraggableDashboard>
            </div>


        </div>
    );
}


