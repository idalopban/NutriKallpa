import { Card, CardContent } from "@/components/ui/card";
import { DailyStats, NutritionalGoals } from "@/lib/diet-generator";
import { Flame, Fish, Wheat, Droplet, Target, ChevronRight } from "lucide-react";
import { NutritionalDonut } from "./NutritionalDonut";
import { cn } from "@/lib/utils";

interface MacronutrientsPanelProps {
    stats: DailyStats;
    goals: NutritionalGoals;
}

export function MacronutrientsPanel({ stats, goals }: MacronutrientsPanelProps) {
    const macroItems = [
        {
            key: 'protein',
            label: "Proteínas",
            icon: Fish,
            actual: stats.macros.protein,
            goal: (goals.calories * (goals.macros.protein / 100)) / 4,
            percent: goals.macros.protein,
            unit: "g",
            color: "text-blue-600 dark:text-blue-400",
            barColor: "bg-blue-500",
            bgColor: "bg-blue-50 dark:bg-blue-900/20",
            iconColor: "text-blue-600",
        },
        {
            key: 'carbs',
            label: "Carbohidratos",
            icon: Wheat,
            actual: stats.macros.carbs,
            goal: (goals.calories * (goals.macros.carbs / 100)) / 4,
            percent: goals.macros.carbs,
            unit: "g",
            color: "text-emerald-600 dark:text-emerald-400",
            barColor: "bg-emerald-500",
            bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
            iconColor: "text-emerald-600",
        },
        {
            key: 'fat',
            label: "Grasas",
            icon: Droplet,
            actual: stats.macros.fat,
            goal: (goals.calories * (goals.macros.fat / 100)) / 9,
            percent: goals.macros.fat,
            unit: "g",
            color: "text-orange-600 dark:text-orange-400",
            barColor: "bg-orange-500",
            bgColor: "bg-orange-50 dark:bg-orange-900/20",
            iconColor: "text-orange-600",
        }
    ];

    const donutData = {
        protein: { grams: stats.macros.protein, percent: goals.macros.protein },
        carbs: { grams: stats.macros.carbs, percent: goals.macros.carbs },
        fat: { grams: stats.macros.fat, percent: goals.macros.fat }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col lg:flex-row items-center gap-10">
                    {/* Left Side: Summary Info */}
                    <div className="flex-1 space-y-8 w-full">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-base font-bold text-slate-800 dark:text-white">Resumen Nutricional</h3>
                                {goals.proteinBasisLabel && (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 animate-pulse">
                                        Basado en: {goals.proteinBasisLabel}
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-bold text-slate-900 dark:text-white">{Math.round(stats.calories)}</span>
                                <span className="text-2xl font-bold text-slate-400">kcal Totales</span>
                            </div>
                            <div className="flex flex-col gap-2 mt-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Meta Diaria:</span>
                                    <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                                        {Math.round(goals.calories)} kcal
                                    </Badge>
                                </div>
                                {goals.proteinWarning && (
                                    <p className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/10 p-2 rounded-lg border border-rose-100 dark:border-rose-900/30">
                                        {goals.proteinWarning}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {macroItems.map((item) => {
                                const progress = Math.min(100, (item.actual / (item.goal || 1)) * 100);
                                return (
                                    <div key={item.key} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("p-1.5 rounded-lg", item.bgColor)}>
                                                    <item.icon className={cn("w-3.5 h-3.5", item.iconColor)} />
                                                </div>
                                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{item.label}</span>
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className={cn("text-lg font-bold", item.color)}>{Math.round(item.actual)}</span>
                                                <span className="text-xs font-medium text-slate-400">g</span>
                                            </div>
                                        </div>
                                        <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out", item.barColor)}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Separator for desktop */}
                    <div className="hidden lg:block w-px h-48 bg-slate-100 dark:bg-slate-800 mx-4" />

                    {/* Right Side: Circular Visualization */}
                    <div className="flex-shrink-0">
                        <NutritionalDonut data={donutData} totalCalories={goals.calories} />
                    </div>
                </div>
            </div>

            {/* Calories Card Secondary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-all hover:bg-white dark:hover:bg-slate-800 shadow-sm flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <Flame className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Diferencia</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {Math.abs(Math.round(stats.calories - goals.calories))} <span className="text-xs font-bold text-slate-400">kcal</span>
                            </p>
                        </div>
                    </div>
                    <div className={cn(
                        "text-[10px] font-bold px-2.5 py-1 rounded-full",
                        stats.calories > goals.calories ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                    )}>
                        {stats.calories > goals.calories ? 'Exceso' : 'Déficit'}
                    </div>
                </div>

                <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-all hover:bg-white dark:hover:bg-slate-800 shadow-sm flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                            <Target className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Cumplimiento</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {Math.round((stats.calories / goals.calories) * 100)}<span className="text-xs font-bold text-slate-400">%</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 rounded-[2rem] bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30 transition-all hover:bg-white dark:hover:bg-indigo-900/10 shadow-sm flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                            <Fish className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-indigo-400 mb-1">Proteína Meta</p>
                            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                {goals.macros.protein}<span className="text-xs font-bold opacity-70 ml-1">%</span>
                            </p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-indigo-300 group-hover:translate-x-1 transition-transform" />
                </div>
            </div>
        </div>
    );
}

function Badge({ children, variant, className }: { children: React.ReactNode, variant?: string, className?: string }) {
    return (
        <span className={cn(
            "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
            className
        )}>
            {children}
        </span>
    );
}
