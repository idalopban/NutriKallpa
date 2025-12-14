import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DailyStats, NutritionalGoals } from "@/lib/diet-generator";
import { Flame, Fish, Wheat, Droplet, Target } from "lucide-react";

interface MacronutrientsPanelProps {
    stats: DailyStats;
    goals: NutritionalGoals;
}

export function MacronutrientsPanel({ stats, goals }: MacronutrientsPanelProps) {
    const macroItems = [
        {
            label: "Calorías",
            icon: Flame,
            actual: stats.calories,
            goal: goals.calories,
            unit: "kcal",
            color: "bg-primary",
            bgColor: "bg-primary/10 dark:bg-primary/20",
            textColor: "text-primary",
            progressColor: "bg-primary",
            borderColor: "border-primary/20 dark:border-primary/30"
        },
        {
            label: "Proteínas",
            icon: Fish,
            actual: stats.macros.protein,
            goal: goals.macros.protein,
            isMacro: true,
            ratio: 4,
            percent: goals.macros.protein,
            unit: "g",
            color: "bg-blue-500",
            bgColor: "bg-blue-500/10 dark:bg-blue-500/20",
            textColor: "text-blue-600 dark:text-blue-400",
            progressColor: "bg-blue-500",
            borderColor: "border-blue-200 dark:border-blue-800"
        },
        {
            label: "Carbohidratos",
            icon: Wheat,
            actual: stats.macros.carbs,
            isMacro: true,
            ratio: 4,
            percent: goals.macros.carbs,
            unit: "g",
            color: "bg-green-500",
            bgColor: "bg-green-500/10 dark:bg-green-500/20",
            textColor: "text-green-600 dark:text-green-400",
            progressColor: "bg-green-500",
            borderColor: "border-green-200 dark:border-green-800"
        },
        {
            label: "Grasas",
            icon: Droplet,
            actual: stats.macros.fat,
            isMacro: true,
            ratio: 9,
            percent: goals.macros.fat,
            unit: "g",
            color: "bg-orange-500",
            bgColor: "bg-orange-500/10 dark:bg-orange-500/20",
            textColor: "text-orange-600 dark:text-orange-400",
            progressColor: "bg-orange-500",
            borderColor: "border-orange-200 dark:border-orange-800"
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {macroItems.map((item, idx) => {
                const goalValue = item.isMacro
                    ? (goals.calories * (item.percent / 100)) / item.ratio
                    : (item.goal || 0);

                const progress = Math.min(100, (item.actual / (goalValue || 1)) * 100);
                const Icon = item.icon;

                return (
                    <Card key={idx} className={`border ${item.borderColor} shadow-sm hover:shadow-md transition-all dark:bg-slate-800/50`}>
                        <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-2xl ${item.bgColor} ${item.textColor}`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                                    <div className="flex items-baseline justify-end gap-1">
                                        <span className={`text-2xl font-bold ${item.textColor}`}>
                                            {Math.round(item.actual)}
                                        </span>
                                        <span className="text-xs font-semibold text-muted-foreground uppercase">
                                            {item.unit}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Progress value={progress} className={`h-2.5 bg-slate-100 dark:bg-slate-700 [&>div]:${item.progressColor}`} />
                                <div className="flex justify-between items-center text-xs">
                                    <span className="font-semibold text-slate-500 dark:text-slate-400">{Math.round(progress)}%</span>
                                    <div className="flex items-center gap-1 text-muted-foreground bg-slate-50 dark:bg-slate-700 px-2 py-1 rounded-md">
                                        <Target className="w-3 h-3" />
                                        <span>Meta: <strong className="dark:text-slate-200">{Math.round(goalValue)}</strong> {item.unit}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    );
}
