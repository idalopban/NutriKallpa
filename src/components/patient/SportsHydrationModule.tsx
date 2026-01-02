"use client";

import { useState, useEffect } from "react";
import { Droplets, Timer, Scale, Calculator, Info, Check, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { calculateSweatRate } from "@/lib/hydration-calculator";
import { usePatientStore } from "@/store/usePatientStore";

export function SportsHydrationModule() {
    const { patient, updateHistoriaClinica } = usePatientStore();
    const sportData = patient?.historiaClinica?.estiloVida?.deporte;

    const [form, setForm] = useState({
        pesoPre: sportData?.pesoPreEntreno || 0,
        pesoPost: sportData?.pesoPostEntreno || 0,
        intake: sportData?.liquidoIngerido || 500,
        duracion: sportData?.duracionEjercicio || 60,
        orina: sportData?.orina || 0
    });

    const [result, setResult] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (form.pesoPre > 0 && form.pesoPost > 0 && form.duracion > 0) {
            const res = calculateSweatRate({
                weightPreKg: form.pesoPre,
                weightPostKg: form.pesoPost,
                intakeML: form.intake,
                exerciseDurationMin: form.duracion,
                urineML: form.orina
            });
            setResult(res);
        } else {
            setResult(null);
        }
    }, [form]);

    const handleSave = async () => {
        if (!result) return;
        setIsSaving(true);

        const currentHistoria = patient?.historiaClinica || {};
        const currentEstiloVida = currentHistoria.estiloVida || {
            fuma: false,
            alcohol: 'nunca',
            suenoHoras: 8
        };

        await updateHistoriaClinica({
            ...currentHistoria,
            estiloVida: {
                ...currentEstiloVida,
                deporte: {
                    pesoPreEntreno: form.pesoPre,
                    pesoPostEntreno: form.pesoPost,
                    liquidoIngerido: form.intake,
                    duracionEjercicio: form.duracion,
                    orina: form.orina,
                    tasaSudoracion: result.rateLPerHour
                }
            } as any
        });

        setIsSaving(false);
    };

    return (
        <Card className="border-none shadow-xl bg-white dark:bg-[#1e293b] overflow-hidden">
            {/* Header */}
            <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-6 py-5">
                <CardTitle className="flex items-center gap-3 text-lg font-bold">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                        <Droplets className="w-5 h-5" />
                    </div>
                    Calculadora de Tasa de Sudoración
                </CardTitle>
                <p className="text-blue-100 text-sm mt-1">
                    Optimiza la reposición de líquidos basándote en la pérdida real por ejercicio.
                </p>
            </CardHeader>

            <CardContent className="p-6">
                {/* Main Content - Side by side on desktop */}
                <div className="flex flex-col lg:flex-row gap-6">

                    {/* LEFT: Input Fields */}
                    <div className="flex-1 space-y-4">
                        {/* Row 1: Weight Pre/Post */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                                    <Scale className="w-3 h-3" /> Peso Pre (kg)
                                </Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={form.pesoPre || ""}
                                    onChange={e => setForm({ ...form, pesoPre: parseFloat(e.target.value) })}
                                    className="h-11 rounded-xl border-slate-200 dark:border-slate-700 focus:ring-blue-500 dark:bg-slate-900"
                                    placeholder="0.0"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                                    <Scale className="w-3 h-3" /> Peso Post (kg)
                                </Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={form.pesoPost || ""}
                                    onChange={e => setForm({ ...form, pesoPost: parseFloat(e.target.value) })}
                                    className="h-11 rounded-xl border-slate-200 dark:border-slate-700 focus:ring-blue-500 dark:bg-slate-900"
                                    placeholder="0.0"
                                />
                            </div>
                        </div>

                        {/* Row 2: Duration / Intake */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                                    <Timer className="w-3 h-3" /> Duración (min)
                                </Label>
                                <Input
                                    type="number"
                                    value={form.duracion || ""}
                                    onChange={e => setForm({ ...form, duracion: parseInt(e.target.value) })}
                                    className="h-11 rounded-xl border-slate-200 dark:border-slate-700 focus:ring-blue-500 dark:bg-slate-900"
                                    placeholder="60"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                                    <Calculator className="w-3 h-3" /> Ingesta (ml)
                                </Label>
                                <Input
                                    type="number"
                                    value={form.intake || ""}
                                    onChange={e => setForm({ ...form, intake: parseInt(e.target.value) })}
                                    className="h-11 rounded-xl border-slate-200 dark:border-slate-700 focus:ring-blue-500 dark:bg-slate-900"
                                    placeholder="500"
                                />
                            </div>
                        </div>

                        {/* Row 3: Urine (Optional) */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium text-slate-500">
                                    Pérdida por Orina (ml) - Opcional
                                </Label>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Info className="w-3.5 h-3.5 text-slate-400" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs text-xs">
                                                Si el paciente orinó durante el ejercicio, ingresa el volumen estimado.
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <Input
                                type="number"
                                value={form.orina || ""}
                                onChange={e => setForm({ ...form, orina: parseInt(e.target.value) })}
                                className="h-11 rounded-xl border-slate-200 dark:border-slate-700 focus:ring-blue-500 dark:bg-slate-900"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* RIGHT: Results Panel */}
                    <div className="flex-1 flex flex-col">
                        <div className="flex-1 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-center min-h-[280px]">
                            {result ? (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    {/* Main Result */}
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">
                                            Tasa de Sudoración
                                        </p>
                                        <div className="flex items-baseline justify-center gap-1">
                                            <span className="text-5xl font-black text-slate-800 dark:text-white tabular-nums">
                                                {result.rateLPerHour}
                                            </span>
                                            <span className="text-xl font-bold text-slate-400">L/h</span>
                                        </div>
                                    </div>

                                    {/* Secondary Stats */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-center">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Pérdida Total</p>
                                            <p className="text-lg font-black text-slate-800 dark:text-white">{result.totalLossL}L</p>
                                        </div>
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 text-center">
                                            <p className="text-[9px] font-black text-blue-400 uppercase mb-0.5">Meta Reposición</p>
                                            <p className="text-lg font-black text-blue-600 dark:text-blue-300">{result.fluidReplacementL}L</p>
                                        </div>
                                    </div>

                                    {/* Save Button */}
                                    <Button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md gap-2"
                                    >
                                        {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Droplets className="w-4 h-4" />}
                                        Guardar en Historial
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center space-y-3 opacity-50">
                                    <Calculator className="w-12 h-12 mx-auto text-slate-300" />
                                    <p className="text-sm text-slate-500">
                                        Ingresa peso pre/post y duración para calcular.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Protocol Info - Full Width Below */}
                {result && (
                    <div className="mt-5 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                        <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed">
                            <strong>Protocolo 150%:</strong> Para una recuperación óptima, se recomienda ingerir
                            el 150% del peso perdido ({(parseFloat(result.totalLossL) * 1.5).toFixed(1)}L) durante
                            las 2-4 horas posteriores al ejercicio.
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
