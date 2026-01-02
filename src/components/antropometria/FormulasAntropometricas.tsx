"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Info, CheckCircle2, Calculator, BookOpen, Activity, Ruler, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function FormulasAntropometricas() {
    const formulas = [
        {
            tipo: "General (hombres/mujeres)",
            formula: "Durnin & Womersley",
            description: "Ideal para población general no deportista.",
        },
        {
            tipo: "Fitness / gimnasio",
            formula: "Jackson & Pollock (3, 4 o 7 pliegues)",
            description: "Estándar para personas activas y de gimnasio.",
        },
        {
            tipo: "Atleta recreativo",
            formula: "Jackson & Pollock 7 pliegues",
            description: "Mayor precisión para deportistas amateurs.",
        },
        {
            tipo: "Atleta competitivo",
            formula: "Thorland et al. o Withers",
            description: "Específico para bajo porcentaje de grasa.",
        },
        {
            tipo: "Solo 2–3 pliegues disponibles",
            formula: "Wilmore & Behnke",
            description: "Útil cuando hay limitaciones de medición.",
        },
    ];

    const detailedFormulas = [
        {
            id: "durnin",
            title: "Durnin & Womersley (1974)",
            uso: "Población general",
            ventajas: "Validada, solo 4 pliegues, usa log10",
            see: "0.010–0.012",
            pliegues: "Tríceps, bíceps, subescapular, suprailiaco",
            math: `Hombres: DC = 1.1765 – 0.0744 log10(X)
Mujeres: DC = 1.1567 – 0.0717 log10(X)`,
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-100"
        },
        {
            id: "jackson-women",
            title: "Jackson & Pollock (1980) — Mujeres",
            uso: "Fitness",
            ventajas: "Precisión alta, incluye perímetros",
            see: "~0.008",
            pliegues: "Tríceps, muslo, cresta ilíaca, abdominal",
            math: `DC = 1.24374 – 0.03162(log10 X1) – 0.00066(glúteo)
DC = 1.221389 – 0.04057(log10 X2) – 0.00016(edad)`,
            icon: Activity,
            color: "text-pink-600",
            bg: "bg-pink-100"
        },
        {
            id: "jackson-men",
            title: "Jackson & Pollock (1978/1984) — Hombres",
            uso: "Fitness / gimnasio",
            ventajas: "Modelo clásico de 7 pliegues",
            see: "0.007–0.009",
            pliegues: "Tríceps, subescapular, axila media, suprailiaco, abdominal, muslo, pantorrilla",
            math: `DC = 1.112 – 0.00043499X + 0.00000055X² – 0.00028826(edad)`,
            icon: Activity,
            color: "text-indigo-600",
            bg: "bg-indigo-100"
        },
        {
            id: "thorland",
            title: "Thorland et al. (1984)",
            uso: "Atletas de élite",
            ventajas: "SEE extremadamente bajo",
            see: "0.0055–0.0060",
            pliegues: "Σ7 pliegues clásicos",
            math: `Hombres: DC = 1.1091 – 0.00052(X) – 0.00000032(X²)
Mujeres: DC = 1.0987 – 0.00122(X) – 0.00000263(X²)`,
            icon: Calculator,
            color: "text-purple-600",
            bg: "bg-purple-100"
        },
        {
            id: "wilmore",
            title: "Wilmore & Behnke (1969/1970)",
            uso: "Estudiantes y jóvenes activos",
            ventajas: "Muy simple, requiere pocos pliegues",
            see: "~0.007–0.008",
            pliegues: "Subescapular, tríceps, muslo, abdominal",
            math: `Hombres: DC = 1.08543 – 0.000886(X1) – 0.00040(X2)
Mujeres: DC = 1.06234 – 0.00068(X1) – 0.00039(X2) – 0.00025(X3)`,
            icon: Ruler,
            color: "text-orange-600",
            bg: "bg-orange-100"
        },
        {
            id: "withers",
            title: "Withers et al. (1987)",
            uso: "Deportistas de alto nivel",
            ventajas: "Altísima precisión, validación densitométrica",
            see: "< 0.006",
            pliegues: "Tríceps, subescapular, supraespinal, abdominal, muslo, pantorrilla",
            math: `Hombres: DC = 1.0988 – 0.0004(X)
Mujeres: DC = 1.20953 – 0.08294(log10 X)`,
            icon: BookOpen,
            color: "text-emerald-600",
            bg: "bg-emerald-100"
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Sección 1: Tabla de Selección */}
            <Card className="w-full shadow-md border-slate-200 dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-slate-800 border-b border-blue-100/50 dark:border-slate-700 pb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Info className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-xl text-slate-800 dark:text-white">
                                ¿Qué fórmula debo usar?
                            </CardTitle>
                            <CardDescription className="text-slate-500 dark:text-slate-400 mt-1">
                                Guía rápida para seleccionar la ecuación más adecuada según el perfil del paciente.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50 dark:bg-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                                <TableHead className="w-[40%] pl-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                                    Tipo de Paciente
                                </TableHead>
                                <TableHead className="w-[60%] py-4 font-semibold text-slate-700 dark:text-slate-300">
                                    Mejor Fórmula
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {formulas.map((item, index) => (
                                <TableRow
                                    key={index}
                                    className="hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0"
                                >
                                    <TableCell className="pl-6 py-4 font-medium text-slate-700 dark:text-slate-300">
                                        {item.tipo}
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-semibold text-blue-700 dark:text-blue-400">
                                                {item.formula}
                                            </span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Sección 2: Detalle de Fórmulas */}
            <div className="grid gap-6 md:grid-cols-2">
                {detailedFormulas.map((formula) => (
                    <Card key={formula.id} className="shadow-sm hover:shadow-md transition-all duration-300 border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-lg", formula.bg, formula.color)}>
                                        <formula.icon className="w-5 h-5" />
                                    </div>
                                    <CardTitle className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
                                        {formula.title}
                                    </CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Uso Recomendado</span>
                                    <p className="text-slate-700 dark:text-slate-300 font-medium">{formula.uso}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">SEE (Error Est.)</span>
                                    <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">
                                        {formula.see}
                                    </Badge>
                                </div>
                            </div>

                            <div>
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Ventajas</span>
                                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-md border border-slate-100 dark:border-slate-600">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                    {formula.ventajas}
                                </div>
                            </div>

                            <div>
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Pliegues Utilizados</span>
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {formula.pliegues}
                                </p>
                            </div>

                            <div className="pt-2">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Fórmula Matemática (DC)</span>
                                <div className="bg-slate-900 rounded-lg p-3 overflow-x-auto">
                                    <pre className="text-xs text-blue-200 font-mono whitespace-pre-wrap">
                                        <code>{formula.math}</code>
                                    </pre>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
