import { DailyPlan, calculateMealStats, DEFAULT_MICRO_GOALS } from '@/lib/diet-generator';
import { Paciente, MedidasAntropometricas } from '@/types';
import { calculateAnthropometry, calcularEdad } from '@/lib/calculos-nutricionales';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DietCharts } from '@/components/diet/DietCharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { User, Calendar, Activity, Scale, TrendingUp, Utensils, Baby, CheckCircle } from 'lucide-react';
import { ShoppingListDialog } from './ShoppingListDialog';

interface DietReportProps {
    paciente: Paciente;
    medidas: MedidasAntropometricas;
    weeklyPlan: DailyPlan[];
    currentDayIndex: number;
}

const MicroRow = ({ label, value, goal, unit, inverse = false, isAvg = false }: { label: string, value: number, goal: number, unit: string, inverse?: boolean, isAvg?: boolean }) => {
    const percent = Math.min(100, Math.round((value / goal) * 100));
    // Color logic: 
    // Normal: <50 red, <80 yellow, >=80 green
    // Inverse (Sodio): <100 green, >100 red (simplified)

    let colorClass = "bg-green-500";
    if (inverse) {
        if (percent > 100) colorClass = "bg-red-500";
        else if (percent > 85) colorClass = "bg-yellow-500";
    } else {
        if (percent < 50) colorClass = "bg-red-500";
        else if (percent < 80) colorClass = "bg-yellow-500";
    }

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-600">{label}</span>
                <span className="text-slate-400">
                    <span className={`font-bold ${inverse && percent > 100 ? 'text-red-500' : (!inverse && percent < 80 ? 'text-orange-500' : 'text-slate-700')}`}>
                        {Math.round(value)}
                    </span>
                    /{Math.round(goal)} {unit}
                </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${colorClass} rounded-full`} style={{ width: `${percent}%` }}></div>
            </div>
        </div>
    )
}

export function DietReport({ paciente, medidas, weeklyPlan, currentDayIndex }: DietReportProps) {
    const age = calcularEdad(paciente.datosPersonales.fechaNacimiento);
    const weight = medidas.peso || 0;
    const height = medidas.talla || 0;
    const imc = medidas.imc || 0;

    // Calculate Body Comp using new ISAK logic
    let bodyFat = 0;
    let fatMass = 0;
    let leanMass = 0;

    if (medidas && medidas.peso && medidas.talla) {
        try {
            const anthropometry = calculateAnthropometry(medidas, 'durnin');
            bodyFat = anthropometry.porcentajeGrasa || 0;
            fatMass = anthropometry.masaGrasa || 0;
            leanMass = (anthropometry.masaMuscular + anthropometry.masaOsea + anthropometry.masaResidual + anthropometry.masaPiel) || (weight - fatMass);
        } catch (e) {
            console.warn("Error calculating anthropometry for report:", e);
        }
    }

    const currentPlan = weeklyPlan[currentDayIndex];

    return (
        <div className="bg-slate-50 min-h-screen print:bg-white print:p-0" id="diet-report">
            {/* HERRO HEADER */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-8 md:rounded-b-[2.5rem] shadow-lg print:rounded-none client-side-header">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                                <Utensils className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Reporte Nutricional</h1>
                        </div>
                        <p className="text-primary-foreground/90 text-lg opacity-90 max-w-sm">
                            Plan personalizado para optimizar tu salud y rendimiento.
                        </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-white text-primary flex items-center justify-center font-bold text-xl shadow-inner">
                            {paciente.datosPersonales.nombre[0]}{paciente.datosPersonales.apellido[0]}
                        </div>
                        <div>
                            <p className="font-bold text-lg leading-none mb-1">
                                {paciente.datosPersonales.nombre} {paciente.datosPersonales.apellido}
                            </p>
                            <p className="text-xs opacity-80 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {new Date().toLocaleDateString()}
                            </p>
                            <div className="print:hidden mt-2">
                                <ShoppingListDialog plan={weeklyPlan} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto p-6 space-y-8 -mt-8 relative z-10 print:mt-0 print:p-0">

                {/* 1. BODY COMPOSITION & SUMMARY */}
                <div className="grid md:grid-cols-3 gap-6">
                    <Card className="shadow-lg border-none shadow-slate-200/60 overflow-hidden md:col-span-1">
                        <CardHeader className="bg-slate-100/50 pb-4">
                            <CardTitle className="text-lg text-primary flex items-center gap-2">
                                <User className="w-5 h-5" /> Datos Personales
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Edad</span>
                                    <p className="font-medium text-lg">{age} años</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-medium text-lg capitalize">{paciente.datosPersonales.sexo}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Peso</span>
                                    <p className="font-medium text-lg">{weight} kg</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Talla</span>
                                    <p className="font-medium text-lg">{height} cm</p>
                                </div>
                                {paciente.pediatricInfo && (
                                    <>
                                        {paciente.pediatricInfo.semanasGestacion && (
                                            <div className="space-y-1">
                                                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Gestación</span>
                                                <p className="font-medium text-sm">
                                                    {paciente.pediatricInfo.semanasGestacion} sem
                                                    ({paciente.pediatricInfo.semanasGestacion < 37 ? 'PRENATURO' : 'A TÉRMINO'})
                                                </p>
                                            </div>
                                        )}
                                        {paciente.pediatricInfo.pesoNacer && (
                                            <div className="space-y-1">
                                                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Peso al nacer</span>
                                                <p className="font-medium text-sm">
                                                    {paciente.pediatricInfo.pesoNacer} g
                                                    ({paciente.pediatricInfo.pesoNacer < 2500 ? 'BAJO PESO' : 'NORMAL'})
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg border-none shadow-slate-200/60 overflow-hidden md:col-span-2">
                        <CardHeader className="bg-slate-100/50 pb-4">
                            <CardTitle className="text-lg text-primary flex items-center gap-2">
                                <Activity className="w-5 h-5" /> Composición Corporal
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid sm:grid-cols-4 gap-6 text-center">
                                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                                    <div className="text-2xl font-bold text-primary">{imc.toFixed(1)}</div>
                                    <div className="text-xs font-semibold text-primary/70 uppercase mt-1">IMC</div>
                                </div>
                                <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                                    <div className="text-2xl font-bold text-orange-600">{bodyFat.toFixed(1)}%</div>
                                    <div className="text-xs font-semibold text-orange-600/70 uppercase mt-1">Grasa Corporal</div>
                                </div>
                                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                    <div className="text-2xl font-bold text-blue-600">{leanMass.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">kg</span></div>
                                    <div className="text-xs font-semibold text-blue-600/70 uppercase mt-1">Masa Magra</div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="text-2xl font-bold text-slate-700">{fatMass.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">kg</span></div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase mt-1">Masa Grasa</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 2. DAILY GOALS */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" /> Metas Diarias
                        </h2>
                        <Badge variant="outline" className="px-3 py-1 text-sm border-primary/20 text-primary bg-primary/5">
                            {currentPlan.goals.calories} kcal
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="border-l-4 border-l-blue-500 shadow-md">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-semibold text-slate-600">Proteínas</span>
                                    <span className="font-bold text-xl text-blue-600">{currentPlan.goals.macros.protein}g</span>
                                </div>
                                <Progress value={100} className="h-2 bg-blue-100 [&>div]:bg-blue-500" />
                                <p className="text-xs text-muted-foreground mt-2">Construcción muscular y recuperación</p>
                            </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-green-500 shadow-md">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-semibold text-slate-600">Carbohidratos</span>
                                    <span className="font-bold text-xl text-green-600">{currentPlan.goals.macros.carbs}g</span>
                                </div>
                                <Progress value={100} className="h-2 bg-green-100 [&>div]:bg-green-500" />
                                <p className="text-xs text-muted-foreground mt-2">Energía principal para tu día</p>
                            </CardContent>
                        </Card>
                        <Card className="border-l-4 border-l-orange-500 shadow-md">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-semibold text-slate-600">Grasas</span>
                                    <span className="font-bold text-xl text-orange-600">{currentPlan.goals.macros.fat}g</span>
                                </div>
                                <Progress value={100} className="h-2 bg-orange-100 [&>div]:bg-orange-500" />
                                <p className="text-xs text-muted-foreground mt-2">Salud hormonal y energía de reserva</p>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* 3. WEEKLY PLAN SUMMARY */}
                <section className="break-inside-avoid">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <Calendar className="w-5 h-5 text-primary" /> Resumen Semanal
                    </h2>
                    <Card className="shadow-lg border-none shadow-slate-200/60 overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                                        <TableHead className="font-bold text-primary">Día</TableHead>
                                        <TableHead className="text-right">Calorías</TableHead>
                                        <TableHead className="text-right"><span className="text-blue-600">Proteína</span></TableHead>
                                        <TableHead className="text-right"><span className="text-green-600">Carbs</span></TableHead>
                                        <TableHead className="text-right"><span className="text-orange-600">Grasa</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {weeklyPlan.map((day, idx) => (
                                        <TableRow key={day.day} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                                            <TableCell className="font-medium text-slate-700">{day.day}</TableCell>
                                            <TableCell className="text-right font-medium">{Math.round(day.stats.calories)}</TableCell>
                                            <TableCell className="text-right text-muted-foreground">{Math.round(day.stats.macros.protein)}g</TableCell>
                                            <TableCell className="text-right text-muted-foreground">{Math.round(day.stats.macros.carbs)}g</TableCell>
                                            <TableCell className="text-right text-muted-foreground">{Math.round(day.stats.macros.fat)}g</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </section>

                {/* 4. DAILY DETAIL */}
                <section className="break-before-page">
                    <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-200">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {currentPlan.day[0]}
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">
                            Plan Detallado: <span className="text-primary">{currentPlan.day}</span>
                        </h2>
                    </div>

                    <div className="space-y-8">
                        {currentPlan.meals.map((meal, idx) => {
                            const mealStats = calculateMealStats(meal.items);
                            return (
                                <Card key={idx} className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow bg-white break-inside-avoid">
                                    <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-b border-slate-100">
                                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                            {meal.name}
                                        </h3>
                                        <Badge variant="secondary" className="font-normal bg-white border border-slate-200 text-slate-600">
                                            {Math.round(mealStats.calories)} kcal
                                        </Badge>
                                    </div>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-white border-b-slate-100">
                                                    <TableHead className="w-[30%] pl-6">Alimento</TableHead>
                                                    <TableHead className="text-right whitespace-nowrap">Peso Neto<span className="text-[10px] block text-slate-400 font-normal">(Crudo)</span></TableHead>
                                                    <TableHead className="text-right whitespace-nowrap">Peso<span className="text-[10px] block text-slate-400 font-normal">Cocido</span></TableHead>
                                                    <TableHead className="text-right whitespace-nowrap">Peso Bruto<span className="text-[10px] block text-slate-400 font-normal">(Compra)</span></TableHead>
                                                    <TableHead className="text-right">Kcal</TableHead>
                                                    <TableHead className="text-right text-xs">Prot (g)</TableHead>
                                                    <TableHead className="text-right text-xs">Carb (g)</TableHead>
                                                    <TableHead className="text-right text-xs pr-6">Gras (g)</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {meal.items.map((item, i) => {
                                                    const pb = Math.round(item.quantity * (item.food.factorDesecho || 1.0));
                                                    const pc = item.cookedQuantity ? Math.round(item.cookedQuantity) : undefined;

                                                    return (
                                                        <TableRow key={i} className="border-b-slate-50 hover:bg-slate-50/50">
                                                            <TableCell className="font-medium text-slate-700 py-3 pl-6">{item.food.nombre}</TableCell>
                                                            <TableCell className="text-right py-3 bg-blue-50/10 font-bold">{item.quantity}g</TableCell>
                                                            <TableCell className="text-right py-3 bg-green-50/10 text-emerald-700 font-bold">{pc ? `${pc}g` : '-'}</TableCell>
                                                            <TableCell className="text-right py-3 bg-orange-50/10 text-orange-600 font-bold">{Math.round(item.grossQuantity || pb)}g</TableCell>
                                                            <TableCell className="text-right py-3 font-semibold text-slate-600">{Math.round(item.food.energia * (item.quantity / 100))}</TableCell>
                                                            <TableCell className="text-right py-3 text-muted-foreground">{Math.round(item.food.proteinas * (item.quantity / 100))}</TableCell>
                                                            <TableCell className="text-right py-3 text-muted-foreground">{Math.round(item.food.carbohidratos * (item.quantity / 100))}</TableCell>
                                                            <TableCell className="text-right py-3 text-muted-foreground pr-6">{Math.round(item.food.grasa * (item.quantity / 100))}</TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Daily Totals Footer */}
                    <div className="mt-8 bg-slate-900 text-slate-50 p-6 md:p-8 rounded-2xl break-inside-avoid shadow-2xl">
                        <h3 className="font-bold text-center text-lg mb-6 opacity-90">Resumen Nutricional del Día</h3>
                        <div className="grid grid-cols-4 gap-4 text-center divide-x divide-white/10">
                            <div>
                                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">
                                    {Math.round(currentPlan.stats.calories)}
                                </div>
                                <div className="text-xs uppercase tracking-widest opacity-60 mt-1">Kcal Totales</div>
                            </div>
                            <div>
                                <div className="text-2xl md:text-3xl font-bold text-blue-300">{Math.round(currentPlan.stats.macros.protein)}g</div>
                                <div className="text-xs uppercase tracking-widest opacity-60 mt-1">Proteína</div>
                            </div>
                            <div>
                                <div className="text-2xl md:text-3xl font-bold text-green-300">{Math.round(currentPlan.stats.macros.carbs)}g</div>
                                <div className="text-xs uppercase tracking-widest opacity-60 mt-1">Carbs</div>
                            </div>
                            <div>
                                <div className="text-2xl md:text-3xl font-bold text-orange-300">{Math.round(currentPlan.stats.macros.fat)}g</div>
                                <div className="text-xs uppercase tracking-widest opacity-60 mt-1">Grasa</div>
                            </div>
                        </div>

                        <Separator className="my-6 bg-white/10" />

                        <div className="grid grid-cols-3 gap-4 text-center text-sm opacity-70">
                            <div className="p-2 bg-white/5 rounded-lg">Hierro: <b>{currentPlan.stats.micros.hierro.toFixed(1)}mg</b></div>
                            <div className="p-2 bg-white/5 rounded-lg">Calcio: <b>{currentPlan.stats.micros.calcio.toFixed(0)}mg</b></div>
                            <div className="p-2 bg-white/5 rounded-lg">Vit C: <b>{currentPlan.stats.micros.vitaminaC.toFixed(0)}mg</b></div>
                        </div>
                    </div>
                </section>

                {/* 5. DETAILED MICRONUTRIENTS */}
                <section className="break-inside-avoid">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <Activity className="w-5 h-5 text-primary" /> Micronutrientes al Detalle
                    </h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {/* 5.1 MINERALS */}
                        <Card className="shadow-md border-none shadow-slate-200/50">
                            <CardHeader className="bg-slate-50/50 pb-3 border-b border-slate-100">
                                <CardTitle className="text-base text-slate-700 font-bold flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div> Minerales
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <MicroRow label="Calcio" value={currentPlan.stats.micros.calcio} goal={DEFAULT_MICRO_GOALS.calcio} unit="mg" />
                                <MicroRow label="Hierro" value={currentPlan.stats.micros.hierro} goal={DEFAULT_MICRO_GOALS.hierro} unit="mg" />
                                <MicroRow label="Zinc" value={currentPlan.stats.micros.zinc} goal={DEFAULT_MICRO_GOALS.zinc} unit="mg" />
                                <MicroRow label="Fósforo" value={currentPlan.stats.micros.fosforo} goal={DEFAULT_MICRO_GOALS.fosforo} unit="mg" />
                            </CardContent>
                        </Card>

                        {/* 5.2 VITAMINS */}
                        <Card className="shadow-md border-none shadow-slate-200/50">
                            <CardHeader className="bg-slate-50/50 pb-3 border-b border-slate-100">
                                <CardTitle className="text-base text-slate-700 font-bold flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div> Vitaminas
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <MicroRow label="Vit. A" value={currentPlan.stats.micros.vitaminaA} goal={DEFAULT_MICRO_GOALS.vitaminaA} unit="µg" />
                                <MicroRow label="Vit. C" value={currentPlan.stats.micros.vitaminaC} goal={DEFAULT_MICRO_GOALS.vitaminaC} unit="mg" />
                                <MicroRow label="B9 (Ácido Fólico)" value={currentPlan.stats.micros.acidoFolico} goal={DEFAULT_MICRO_GOALS.acidoFolico} unit="µg" />
                                <MicroRow label="B1, B2, B3" value={(currentPlan.stats.micros.tiamina + currentPlan.stats.micros.riboflavina + currentPlan.stats.micros.niacina) / 3} goal={(DEFAULT_MICRO_GOALS.tiamina + DEFAULT_MICRO_GOALS.riboflavina + DEFAULT_MICRO_GOALS.niacina) / 3} unit="mg" isAvg />
                            </CardContent>
                        </Card>

                        {/* 5.3 ELECTROLYTES & OTHERS */}
                        <Card className="shadow-md border-none shadow-slate-200/50">
                            <CardHeader className="bg-slate-50/50 pb-3 border-b border-slate-100">
                                <CardTitle className="text-base text-slate-700 font-bold flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-orange-500"></div> Electrolitos
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <MicroRow label="Sodio" value={currentPlan.stats.micros.sodio} goal={DEFAULT_MICRO_GOALS.sodio} unit="mg" inverse />
                                <MicroRow label="Potasio" value={currentPlan.stats.micros.potasio} goal={DEFAULT_MICRO_GOALS.potasio} unit="mg" />
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* 6. CHARTS */}
                <section className="break-before-page pt-8">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
                        <Scale className="w-5 h-5 text-primary" /> Análisis y Distribución
                    </h2>
                    <div className="print:block p-4 bg-white rounded-xl shadow-sm border">
                        <DietCharts currentPlan={currentPlan} weeklyPlan={weeklyPlan} />
                    </div>
                </section>
            </main>
        </div>
    );
}
