import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyStats, DEFAULT_MICRO_GOALS } from "@/lib/diet-generator";
import { Pickaxe, Pill, Zap } from "lucide-react";

interface MicronutrientsPanelProps {
    stats: DailyStats;
}

const MicroRow = ({ label, value, goal, unit, inverse = false, isAvg = false }: { label: string, value: number, goal: number, unit: string, inverse?: boolean, isAvg?: boolean }) => {
    const percent = Math.min(100, Math.round((value / (goal || 1)) * 100));

    let colorClass = "bg-green-500";
    if (inverse) {
        if (percent > 100) colorClass = "bg-red-500";
        else if (percent > 85) colorClass = "bg-yellow-500";
    } else {
        if (percent < 50) colorClass = "bg-red-500";
        else if (percent < 80) colorClass = "bg-yellow-500";
    }

    return (
        <div className="flex flex-col gap-1.5 py-1">
            <div className="flex justify-between items-center text-sm">
                {/* DARK MODE FIX: Added dark:text-slate-200 */}
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
                <div className="flex items-center gap-1.5">
                    {/* DARK MODE FIX: Added dark:text variants */}
                    <span className={`font-bold ${inverse && percent > 100 ? 'text-red-500' : (!inverse && percent < 80 ? 'text-orange-500' : 'text-slate-700 dark:text-slate-100')}`}>
                        {Math.round(value)}
                    </span>
                    {/* DARK MODE FIX: Added dark:text-slate-500 */}
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-normal">
                        / {Math.round(goal)} <span className="text-[10px] uppercase">{unit}</span>
                    </span>
                </div>
            </div>
            {/* DARK MODE FIX: Changed bg-slate-100 to dark:bg-slate-700 */}
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                    className={`h-full ${colorClass} rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    )
}

export function MicronutrientsPanel({ stats }: MicronutrientsPanelProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 5.1 MINERALS - DARK MODE FIX */}
            <Card className="shadow-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800/50">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-800 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <CardTitle className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Pickaxe className="w-4 h-4 text-blue-500" />
                        Minerales
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    <MicroRow label="Calcio" value={stats.micros.calcio} goal={DEFAULT_MICRO_GOALS.calcio} unit="mg" />
                    <MicroRow label="Hierro" value={stats.micros.hierro} goal={DEFAULT_MICRO_GOALS.hierro} unit="mg" />
                    <MicroRow label="Zinc" value={stats.micros.zinc} goal={DEFAULT_MICRO_GOALS.zinc} unit="mg" />
                    <MicroRow label="Fósforo" value={stats.micros.fosforo} goal={DEFAULT_MICRO_GOALS.fosforo} unit="mg" />
                </CardContent>
            </Card>

            {/* 5.2 VITAMINS - DARK MODE FIX */}
            <Card className="shadow-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800/50">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-800 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <CardTitle className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Pill className="w-4 h-4 text-green-500" />
                        Vitaminas
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    <MicroRow label="Vit. A" value={stats.micros.vitaminaA} goal={DEFAULT_MICRO_GOALS.vitaminaA} unit="µg" />
                    <MicroRow label="Vit. C" value={stats.micros.vitaminaC} goal={DEFAULT_MICRO_GOALS.vitaminaC} unit="mg" />
                    <MicroRow label="B9 (Ác. Fólico)" value={stats.micros.acidoFolico} goal={DEFAULT_MICRO_GOALS.acidoFolico} unit="µg" />
                    <MicroRow label="B1, B2, B3 (Prom.)" value={(stats.micros.tiamina + stats.micros.riboflavina + stats.micros.niacina) / 3} goal={(DEFAULT_MICRO_GOALS.tiamina + DEFAULT_MICRO_GOALS.riboflavina + DEFAULT_MICRO_GOALS.niacina) / 3} unit="mg" isAvg />
                </CardContent>
            </Card>

            {/* 5.3 ELECTROLYTES & OTHERS - DARK MODE FIX */}
            <Card className="shadow-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800/50">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-800 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <CardTitle className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-orange-500" />
                        Electrolitos
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    <MicroRow label="Sodio" value={stats.micros.sodio} goal={DEFAULT_MICRO_GOALS.sodio} unit="mg" inverse />
                    <MicroRow label="Potasio" value={stats.micros.potasio} goal={DEFAULT_MICRO_GOALS.potasio} unit="mg" />
                </CardContent>
            </Card>
        </div>
    );
}
