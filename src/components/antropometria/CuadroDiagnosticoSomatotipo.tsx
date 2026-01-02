"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface CuadroDiagnosticoProps {
    endo: number;
    meso: number;
    ecto: number;
}

// Helper to determine rating from somatotype value (Carter & Heath)
function getSomatotypeRating(value: number) {
    if (value <= 2.5) return { label: "Bajo", color: "bg-white/20 text-white" };
    if (value <= 5.0) return { label: "Moderado", color: "bg-white/30 text-white" };
    if (value <= 7.0) return { label: "Alto", color: "bg-white/40 text-white" };
    return { label: "Muy Alto", color: "bg-white/50 text-white" };
}

interface SomatotypeComponentCardProps {
    label: string;
    value: number;
    icon: string;
    gradient: string;
    shadow: string;
}

function SomatotypeComponentCard({ label, value, icon, gradient, shadow }: SomatotypeComponentCardProps) {
    const rating = getSomatotypeRating(value);

    return (
        <div className={cn(
            "relative overflow-hidden p-6 h-[220px] rounded-[2.5rem] bg-gradient-to-br transition-all hover:scale-[1.02] active:scale-[0.98] border border-white/20 flex flex-col justify-between group",
            gradient,
            shadow
        )}>
            {/* Background design element - Abstract lines/waves */}
            <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden text-white/50">
                <svg width="100%" height="100%" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M0 100 C 20 120, 50 80, 80 100 S 130 120, 160 100 S 200 80, 200 100"
                        stroke="currentColor" fill="none" strokeWidth="2"
                        className="animate-pulse"
                    />
                    <path
                        d="M0 110 C 20 130, 50 90, 80 110 S 130 130, 160 110 S 200 90, 200 110"
                        stroke="currentColor" fill="none" strokeWidth="1"
                        opacity="0.5"
                    />
                </svg>
            </div>

            <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-xl backdrop-blur-md shadow-inner mb-4 transition-transform group-hover:rotate-12">
                        {icon}
                    </div>
                    <span className="text-[11px] font-black text-white uppercase tracking-[0.25em] drop-shadow-sm opacity-90">{label}</span>
                </div>

                <div className="space-y-4">
                    <div className="text-5xl font-black text-white leading-none tracking-tighter drop-shadow-md">
                        {value.toFixed(1)}
                    </div>
                    <div className={cn(
                        "inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-xl border border-white/20 shadow-lg",
                        rating.color
                    )}>
                        {rating.label}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function CuadroDiagnosticoSomatotipo({ endo, meso, ecto }: CuadroDiagnosticoProps) {

    const diagnostico = useMemo(() => {
        const diffEndoMeso = Math.abs(endo - meso);
        const diffMesoEcto = Math.abs(meso - ecto);
        const diffEctoEndo = Math.abs(ecto - endo);

        if (diffEndoMeso <= 1 && diffMesoEcto <= 1 && diffEctoEndo <= 1) {
            return {
                categoria: "Central",
                descripcion: "Equilibrio entre adiposidad, desarrollo muscular y linealidad.",
                color: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
                badge: "text-slate-500 bg-slate-100"
            };
        }

        if (endo > meso + 0.5 && endo > ecto + 0.5) {
            const res = { categoria: "", descripcion: "", color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800", badge: "text-blue-600 bg-blue-50" };
            if (ecto > meso) res.categoria = "Endo-Ectomórfico";
            else if (diffMesoEcto <= 0.5) res.categoria = "Endomorfismo Balanceado";
            else res.categoria = "Endo-Mesomórfico";
            return res;
        }

        if (meso > endo + 0.5 && meso > ecto + 0.5) {
            const res = { categoria: "", descripcion: "", color: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-200 dark:border-green-800", badge: "text-green-600 bg-green-50" };
            if (endo > ecto) res.categoria = "Meso-Endomórfico";
            else if (diffEctoEndo <= 0.5) res.categoria = "Mesomorfismo Balanceado";
            else res.categoria = "Meso-Ectomórfico";
            return res;
        }

        if (ecto > endo + 0.5 && ecto > meso + 0.5) {
            const res = { categoria: "", descripcion: "", color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800", badge: "text-amber-600 bg-amber-50" };
            if (meso > endo) res.categoria = "Ecto-Mesomórfico";
            else if (diffEndoMeso <= 0.5) res.categoria = "Ectomorfismo Balanceado";
            else res.categoria = "Ecto-Endomórfico";
            return res;
        }

        return {
            categoria: "Mixto",
            descripcion: "Combinación balanceada de componentes.",
            color: "bg-slate-100 text-slate-800 border-slate-200",
            badge: "text-slate-500 bg-slate-100"
        };

    }, [endo, meso, ecto]);

    return (
        <Card className="border-none shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/50 bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 px-10 py-8">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 tracking-tighter">
                            <Activity className="w-8 h-8 text-[#ff8508]" />
                            ANÁLISIS DE SOMATOTIPO
                        </CardTitle>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] mt-1 ml-11">
                            Carter & Heath Analysis
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-10 space-y-12">

                {/* Grid de Componentes - Colores Sincronizados con la Somatocarta */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <SomatotypeComponentCard
                        label="Endomorfia"
                        value={endo}
                        icon="🔵"
                        gradient="from-blue-400 via-blue-500 to-blue-600"
                        shadow="shadow-2xl shadow-blue-200 dark:shadow-blue-900/30"
                    />
                    <SomatotypeComponentCard
                        label="Mesomorfia"
                        value={meso}
                        icon="🟢"
                        gradient="from-green-400 via-green-500 to-green-600"
                        shadow="shadow-2xl shadow-green-200 dark:shadow-green-900/30"
                    />
                    <SomatotypeComponentCard
                        label="Ectomorfia"
                        value={ecto}
                        icon="🟡"
                        gradient="from-amber-400 via-amber-500 to-amber-600"
                        shadow="shadow-2xl shadow-amber-200 dark:shadow-amber-900/30"
                    />
                </div>

                {/* Resultado */}
                <div className={cn(
                    "p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between",
                    diagnostico.color
                )}>
                    <div className="flex items-center gap-6">
                        <div className={cn("px-4 py-2 rounded-2xl font-black text-[10px] tracking-widest", diagnostico.badge)}>
                            CLSF
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Somatotipo Actual</p>
                            <h3 className="text-2xl font-black tracking-tight">{diagnostico.categoria}</h3>
                        </div>
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}
