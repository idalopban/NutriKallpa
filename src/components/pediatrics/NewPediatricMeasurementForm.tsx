'use client';

import { useState, useCallback, useMemo, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Scale,
    Ruler,
    Calendar,
    Save,
    Baby,
    AlertTriangle,
    CheckCircle2,
    Info,
    Calculator,
    Syringe,
    ArrowRight,
    Pencil,
    X
} from 'lucide-react';
import {
    calculateGrowthAssessment,
    getMeasurementType,
    type Sex,
    type GrowthAssessment,
} from '@/lib/growth-standards';
import { calculateChronologicalAge, calculateExactAgeInDays, formatClinicalAge } from '@/lib/clinical-calculations';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

// Live preview data for chart updates  
export interface LivePreviewData {
    weightKg?: number;
    heightCm?: number;
    headCircumferenceCm?: number;
}

interface NewPediatricMeasurementFormProps {
    patientId: string;
    patientName: string;
    patientBirthDate: Date | string;
    patientSex: Sex;
    initialWeight?: number;
    initialHeight?: number;
    initialHeadCircumference?: number;
    onSave: (data: PediatricMeasurementData) => void;
    onCancel?: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    onLiveDataChange?: (data: LivePreviewData) => void;
    className?: string;
    hideSubmitButton?: boolean;
}

export interface PediatricMeasurementFormRef {
    submit: () => void;
}

export interface PediatricMeasurementData {
    patientId: string;
    dateRecorded: Date;
    ageInDays: number;
    ageInMonths: number;
    weightKg: number;
    heightCm: number;
    headCircumferenceCm?: number;
    measurementType: 'recumbent' | 'standing';
    zScores: GrowthAssessment;
}

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const measurementSchema = z.object({
    weightKg: z.number()
        .min(0.5, 'Peso mínimo 0.5 kg')
        .max(150, 'Peso máximo 150 kg'),
    heightCm: z.number()
        .min(30, 'Longitud/Talla mínima 30 cm')
        .max(220, 'Longitud/Talla máxima 220 cm'),
    headCircumferenceCm: z.number()
        .min(25, 'Perímetro cefálico mínimo 25 cm')
        .max(65, 'Perímetro cefálico máximo 65 cm')
        .optional(),
    dateRecorded: z.string().optional(),
});

type MeasurementFormValues = z.infer<typeof measurementSchema>;

// ============================================================================
// SEVERITY COLOR HELPER
// ============================================================================

function getSeverityColor(severityLevel: string): string {
    switch (severityLevel) {
        case 'severe_negative':
        case 'severe_positive':
            return 'text-red-600 bg-red-50 border-red-200';
        case 'moderate_negative':
        case 'moderate_positive':
            return 'text-amber-600 bg-amber-50 border-amber-200';
        default:
            return 'text-green-600 bg-green-50 border-green-200';
    }
}

function getSeverityIcon(severityLevel: string) {
    if (severityLevel.includes('severe')) {
        return <AlertTriangle className="w-4 h-4" />;
    }
    if (severityLevel.includes('moderate')) {
        return <Info className="w-4 h-4" />;
    }
    return <CheckCircle2 className="w-4 h-4" />;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const NewPediatricMeasurementForm = forwardRef<PediatricMeasurementFormRef, NewPediatricMeasurementFormProps>(
    function NewPediatricMeasurementFormInner({
        patientId,
        patientName,
        patientBirthDate,
        patientSex,
        initialWeight,
        initialHeight,
        initialHeadCircumference,
        onSave,
        onCancel,
        onDirtyChange,
        onLiveDataChange,
        className,
        hideSubmitButton = false,
    }, ref) {
        const [assessment, setAssessment] = useState<GrowthAssessment | null>(null);
        const [isEditMode, setIsEditMode] = useState(true);
        const formRef = useRef<HTMLFormElement>(null);

        // Expose submit method via ref
        useImperativeHandle(ref, () => ({
            submit: () => {
                formRef.current?.requestSubmit();
            }
        }));

        // Calculate age
        const birthDate = useMemo(() => {
            return typeof patientBirthDate === 'string'
                ? new Date(patientBirthDate)
                : patientBirthDate;
        }, [patientBirthDate]);

        const { ageInMonths, ageInDays, measurementType } = useMemo(() => {
            const days = calculateExactAgeInDays(patientBirthDate, new Date());
            const months = days / 30.4375; // Average days per month
            return {
                ageInDays: days,
                ageInMonths: Math.round(months * 100) / 100,
                measurementType: getMeasurementType(months),
            };
        }, [patientBirthDate]);

        // --- Advanced Infant Features State ---
        // --- Advanced Infant Features State ---
        const [showPrematurity, setShowPrematurity] = useState(false);
        const [showCPEstimation, setShowCPEstimation] = useState(false);
        // Prematurity
        const [gestationalWeeks, setGestationalWeeks] = useState<string>("");
        const [birthWeight, setBirthWeight] = useState<string>("");
        const [correctedAgeData, setCorrectedAgeData] = useState<{ weeks: number, months: number, text: string } | null>(null);

        // Cerebral Palsy (Stevenson)
        const [tibiaLength, setTibiaLength] = useState<string>("");
        const [kneeHeight, setKneeHeight] = useState<string>("");
        const [estimatedHeightCP, setEstimatedHeightCP] = useState<number | null>(null);

        // Calculate Corrected Age
        const calculateCorrectedAge = useCallback(() => {
            console.log('🔍 calculateCorrectedAge called');
            console.log('Inputs:', { gestationalWeeks, birthWeight, patientBirthDate });

            if (!gestationalWeeks || !patientBirthDate) {
                console.log('❌ Missing gestationalWeeks or patientBirthDate');
                setCorrectedAgeData(null);
                return;
            }

            const weeks = parseFloat(gestationalWeeks);
            console.log('Parsed weeks:', weeks);

            if (isNaN(weeks)) {
                console.log('❌ Invalid gestationalWeeks (NaN)');
                setCorrectedAgeData(null);
                return;
            }

            if (weeks >= 37) {
                console.log('❌ Not premature (>= 37 weeks)');
                setCorrectedAgeData(null);
                return;
            }

            // Chronological Age
            const dob = new Date(patientBirthDate);
            const now = new Date();
            const diffMs = now.getTime() - dob.getTime();
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            const chronoWeeks = diffDays / 7;
            const chronoMonths = diffDays / 30.4375;

            console.log('Chronological:', { diffDays, chronoWeeks, chronoMonths });

            // Validity Checks (Table 11) - NOW OPTIONAL
            const bWeight = parseFloat(birthWeight);
            let validityLimitMonths = 24; // Default

            if (!isNaN(bWeight) && bWeight > 0) {
                if (bWeight < 1.0) validityLimitMonths = 36;
                else if (bWeight < 1.5) validityLimitMonths = 24;
                else validityLimitMonths = 12;

                console.log(`Weight-based limit: ${validityLimitMonths} months for ${bWeight}kg`);

                if (chronoMonths > validityLimitMonths) {
                    console.log(`❌ Child too old for correction (${chronoMonths.toFixed(1)}m > ${validityLimitMonths}m)`);
                    setCorrectedAgeData(null);
                    return;
                }
            } else {
                console.log('⚠️ No valid birth weight, using default 24m limit');
            }

            // Formula: Actual Age (weeks) - (40 - Gestational Age)
            const correctionFactorWeeks = 40 - weeks;
            const correctedWeeks = chronoWeeks - correctionFactorWeeks;

            console.log('Correction:', { correctionFactorWeeks, correctedWeeks });

            if (correctedWeeks <= 0) {
                console.log('❌ Corrected age is negative or zero');
                // Show informative message instead of just hiding
                setCorrectedAgeData({
                    weeks: 0,
                    months: 0,
                    text: `Bebé muy joven (necesita ${Math.ceil(correctionFactorWeeks - chronoWeeks)} sem. más)`
                });
                return;
            }

            // Display Logic with Rounding (Table 12)
            const totalCorrectedDays = correctedWeeks * 7;
            const correctedAgeMonthsFloat = totalCorrectedDays / 30.4375;
            const correctedMonthsInt = Math.floor(correctedAgeMonthsFloat);
            const remainingDays = Math.round((correctedAgeMonthsFloat - correctedMonthsInt) * 30.4375);

            let displayMonths = correctedMonthsInt;
            let suffix = "";

            if (remainingDays >= 16) {
                displayMonths += 1;
                suffix = " (Aprox)";
            }

            const result = {
                weeks: Math.round(correctedWeeks * 10) / 10,
                months: Math.round(correctedAgeMonthsFloat * 10) / 10,
                text: `${displayMonths} meses${suffix}`
            };

            console.log('✅ Result:', result);
            setCorrectedAgeData(result);

        }, [gestationalWeeks, birthWeight, patientBirthDate]);

        // Calculate Stevenson Height
        const calculateStevensonHeight = useCallback(() => {
            let estTibia = 0;
            let estKnee = 0;

            // Talla = (3.26 x Tibia) + 30.8
            if (tibiaLength) {
                estTibia = (3.26 * parseFloat(tibiaLength)) + 30.8;
            }

            // Talla = (2.69 x Altura Rodilla) + 24.2
            if (kneeHeight) {
                estKnee = (2.69 * parseFloat(kneeHeight)) + 24.2;
            }

            if (estTibia > 0) {
                setEstimatedHeightCP(Math.round(estTibia * 10) / 10);
            } else if (estKnee > 0) {
                setEstimatedHeightCP(Math.round(estKnee * 10) / 10);
            } else {
                setEstimatedHeightCP(null);
            }
        }, [tibiaLength, kneeHeight]);

        // Auto-recalc effects removed for manual calculation
        // useEffect(() => {
        //     calculateCorrectedAge();
        // }, [gestationalWeeks, birthWeight, calculateCorrectedAge]);

        // useEffect(() => {
        //     calculateStevensonHeight();
        // }, [tibiaLength, kneeHeight, calculateStevensonHeight]);

        const {
            register,
            handleSubmit,
            watch,
            setValue,
            reset,
            formState: { errors, isSubmitting, isDirty },
        } = useForm<MeasurementFormValues>({
            resolver: zodResolver(measurementSchema),
            defaultValues: {
                dateRecorded: new Date().toISOString().split('T')[0],
                weightKg: initialWeight || 0,
                heightCm: initialHeight || 0,
                headCircumferenceCm: initialHeadCircumference || undefined,
            },
        });

        // Sync initial values when they change (e.g. patient selection changes)
        useEffect(() => {
            if (initialWeight !== undefined) setValue('weightKg', initialWeight);
            if (initialHeight !== undefined) setValue('heightCm', initialHeight);
            if (initialHeadCircumference !== undefined) setValue('headCircumferenceCm', initialHeadCircumference);
        }, [initialWeight, initialHeight, initialHeadCircumference, setValue]);

        const watchedValues = watch();

        // Sync dirty state to parent
        useEffect(() => {
            if (onDirtyChange) {
                onDirtyChange(isDirty);
            }
        }, [isDirty, onDirtyChange]);

        // Sync live values to parent for real-time chart preview
        useEffect(() => {
            if (onLiveDataChange && isEditMode) {
                onLiveDataChange({
                    weightKg: watchedValues.weightKg,
                    heightCm: watchedValues.heightCm,
                    headCircumferenceCm: watchedValues.headCircumferenceCm,
                });
            }
        }, [watchedValues.weightKg, watchedValues.heightCm, watchedValues.headCircumferenceCm, onLiveDataChange, isEditMode]);

        // Calculate assessment on value change
        const calculateAssessment = useCallback(() => {
            const weight = parseFloat(String(watchedValues.weightKg)) || 0;
            const height = parseFloat(String(watchedValues.heightCm)) || 0;
            const headCirc = watchedValues.headCircumferenceCm
                ? parseFloat(String(watchedValues.headCircumferenceCm))
                : undefined;

            if (weight > 0 && height > 0) {
                const result = calculateGrowthAssessment(
                    weight,
                    height,
                    headCirc,
                    ageInMonths,
                    patientSex
                );
                setAssessment(result);
            }
        }, [watchedValues, ageInMonths, patientSex]);

        // Auto-calculate Z-scores in real-time as user types
        useEffect(() => {
            const weight = parseFloat(String(watchedValues.weightKg)) || 0;
            const height = parseFloat(String(watchedValues.heightCm)) || 0;
            const headCirc = watchedValues.headCircumferenceCm
                ? parseFloat(String(watchedValues.headCircumferenceCm))
                : undefined;

            if (weight > 0 && height > 0) {
                const result = calculateGrowthAssessment(
                    weight,
                    height,
                    headCirc,
                    ageInMonths,
                    patientSex
                );
                setAssessment(result);
            }
        }, [watchedValues.weightKg, watchedValues.heightCm, watchedValues.headCircumferenceCm, ageInMonths, patientSex]);

        // Handle form submission
        const onSubmit = (data: MeasurementFormValues) => {
            const result = calculateGrowthAssessment(
                data.weightKg,
                data.heightCm,
                data.headCircumferenceCm,
                ageInMonths,
                patientSex
            );

            onSave({
                patientId,
                dateRecorded: data.dateRecorded ? new Date(data.dateRecorded) : new Date(),
                ageInDays,
                ageInMonths,
                weightKg: data.weightKg,
                heightCm: data.heightCm,
                headCircumferenceCm: data.headCircumferenceCm,
                measurementType,
                zScores: result,
            });

            // Reset form with current data to clear isDirty state
            reset(data);

            // Exit edit mode after saving - REMOVED for single step UX
            // setIsEditMode(false);
        };

        return (
            <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className={cn('space-y-6', className)}>
                {/* Patient Info Header */}
                <Card className="border-none shadow-sm bg-gradient-to-r from-pink-50 to-blue-50 dark:from-pink-900/10 dark:to-blue-900/10">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Baby className="w-5 h-5 text-pink-500" />
                                Evaluación Pediátrica OMS
                            </CardTitle>
                            <Badge className="bg-blue-100 text-blue-700">
                                {patientSex === 'male' ? '👦 Niño' : '👧 Niña'}
                            </Badge>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    onClick={() => setShowPrematurity(!showPrematurity)}
                                    className={cn("text-xs h-8", showPrematurity && "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-300")}
                                >
                                    <Baby className="w-3.5 h-3.5 mr-1.5" />
                                    {showPrematurity ? "Ocultar Prematuro" : "Edad Corregida"}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    onClick={() => setShowCPEstimation(!showCPEstimation)}
                                    className={cn("text-xs h-8", showCPEstimation && "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300")}
                                >
                                    <Ruler className="w-3.5 h-3.5 mr-1.5" />
                                    {showCPEstimation ? "Ocultar Est. Talla" : "Est. Talla (PC)"}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs text-slate-500">Paciente</p>
                                <p className="font-semibold text-slate-800 dark:text-white">{patientName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Edad</p>
                                <p className="font-semibold text-slate-800 dark:text-white">
                                    {formatClinicalAge(patientBirthDate)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Tipo de Medición</p>
                                <p className="font-semibold text-slate-800 dark:text-white">
                                    {measurementType === 'recumbent' ? '📏 Longitud (acostado)' : '📐 Talla (de pie)'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Fecha de Nacimiento</p>
                                <p className="font-semibold text-slate-800 dark:text-white">
                                    {birthDate.toLocaleDateString('es-PE')}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ADVANCED SECTION */}
                {/* PREMATURITY SECTION */}
                {showPrematurity && (
                    <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800 animate-in slide-in-from-top-2 mb-4">
                        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 mb-3">
                            <Baby className="w-4 h-4" />
                            <h4 className="text-sm font-bold">Edad Corregida (Prematuros)</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Sem. Gestación</Label>
                                <Input
                                    type="number"
                                    placeholder="ej. 32"
                                    value={gestationalWeeks}
                                    onChange={(e) => setGestationalWeeks(e.target.value)}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Peso Nacimiento (kg)</Label>
                                <Input
                                    type="number"
                                    placeholder="ej. 1.8"
                                    value={birthWeight}
                                    onChange={(e) => setBirthWeight(e.target.value)}
                                    className="h-9"
                                />
                            </div>
                            {correctedAgeData && (
                                <div className="p-2 bg-white dark:bg-slate-900 rounded border border-indigo-200 dark:border-indigo-700 flex items-center justify-center h-9">
                                    <span className="text-sm text-indigo-700 dark:text-indigo-300 font-bold">
                                        {correctedAgeData.text}
                                    </span>
                                </div>
                            )}
                            <div className="flex items-end">
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={calculateCorrectedAge}
                                    className="h-9 w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    Calcular
                                </Button>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 italic mt-2">
                            * Aplica si &lt;37 semanas. Validez según peso: &lt;1kg (36m), 1-1.5kg (24m), &gt;1.5kg (12m).
                        </p>
                    </div>
                )}

                {/* CP ESTIMATION SECTION */}
                {showCPEstimation && (
                    <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800 animate-in slide-in-from-top-2 mb-4">
                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-3">
                            <Ruler className="w-4 h-4" />
                            <h4 className="text-sm font-bold">Estimación de Talla (Stevenson - PC)</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Longitud Tibia (cm)</Label>
                                <Input
                                    type="number"
                                    placeholder="cm"
                                    value={tibiaLength}
                                    onChange={(e) => setTibiaLength(e.target.value)}
                                    className="h-9"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Altura Rodilla (cm)</Label>
                                <Input
                                    type="number"
                                    placeholder="cm"
                                    value={kneeHeight}
                                    onChange={(e) => setKneeHeight(e.target.value)}
                                    className="h-9"
                                />
                            </div>
                            {estimatedHeightCP && (
                                <div className="flex items-center gap-2">
                                    <div className="p-2 flex-1 bg-white dark:bg-slate-900 rounded border border-emerald-200 dark:border-emerald-700 flex items-center justify-center h-9">
                                        <span className="text-sm text-emerald-700 dark:text-emerald-300 font-bold">
                                            {estimatedHeightCP} cm
                                        </span>
                                    </div>
                                    <Button
                                        size="sm"
                                        type="button"
                                        className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                                        onClick={() => setValue('heightCm', estimatedHeightCP ?? 0, { shouldValidate: true, shouldDirty: true })}
                                    >
                                        Usar
                                    </Button>
                                </div>
                            )}
                            <div className="flex items-end">
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={calculateStevensonHeight}
                                    className="h-9 w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    Calcular
                                </Button>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 italic mt-2">
                            * Stevenson: Talla = (3.26 x Tibia) + 30.8 &nbsp;|&nbsp; Talla = (2.69 x Altura Rodilla) + 24.2
                        </p>
                    </div>
                )}


                {/* Measurement Inputs */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Scale className="w-4 h-4 text-green-600" />
                                Medidas Antropométricas
                            </CardTitle>
                            <Button
                                type="button"
                                variant={isEditMode ? "default" : "outline"}
                                size="sm"
                                onClick={() => setIsEditMode(!isEditMode)}
                                className={cn(
                                    "h-8 transition-all",
                                    isEditMode
                                        ? "bg-pink-600 hover:bg-pink-700 text-white"
                                        : "border-pink-200 text-pink-600 hover:bg-pink-50"
                                )}
                            >
                                {isEditMode ? (
                                    <>
                                        <X className="w-3.5 h-3.5 mr-1.5" />
                                        Cancelar
                                    </>
                                ) : (
                                    <>
                                        <Pencil className="w-3.5 h-3.5 mr-1.5" />
                                        Editar
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Weight */}
                            <div className="space-y-2">
                                <Label htmlFor="weightKg" className="flex items-center gap-1">
                                    Peso <span className="text-red-500">*</span>
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="weightKg"
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        disabled={!isEditMode}
                                        {...register('weightKg', { valueAsNumber: true })}
                                        onBlur={calculateAssessment}
                                        className={cn(
                                            'pr-10',
                                            errors.weightKg && 'border-red-500',
                                            !isEditMode && 'bg-slate-50 cursor-not-allowed'
                                        )}
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">kg</span>
                                </div>
                                {errors.weightKg && (
                                    <p className="text-xs text-red-500">{errors.weightKg.message}</p>
                                )}
                            </div>

                            {/* Height/Length */}
                            <div className="space-y-2">
                                <Label htmlFor="heightCm" className="flex items-center gap-1">
                                    {measurementType === 'recumbent' ? 'Longitud' : 'Talla'}
                                    <span className="text-red-500">*</span>
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="heightCm"
                                        type="number"
                                        step="0.1"
                                        placeholder="0.0"
                                        disabled={!isEditMode}
                                        {...register('heightCm', { valueAsNumber: true })}
                                        onBlur={calculateAssessment}
                                        className={cn(
                                            'pr-10',
                                            errors.heightCm && 'border-red-500',
                                            !isEditMode && 'bg-slate-50 cursor-not-allowed'
                                        )}
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">cm</span>
                                </div>
                                {errors.heightCm && (
                                    <p className="text-xs text-red-500">{errors.heightCm.message}</p>
                                )}
                            </div>

                            {/* Head Circumference */}
                            <div className="space-y-2">
                                <Label htmlFor="headCircumferenceCm">Perímetro Cefálico</Label>
                                <div className="relative">
                                    <Input
                                        id="headCircumferenceCm"
                                        type="number"
                                        step="0.1"
                                        placeholder="0.0"
                                        disabled={!isEditMode}
                                        {...register('headCircumferenceCm', { valueAsNumber: true })}
                                        onBlur={calculateAssessment}
                                        className={cn(
                                            'pr-10',
                                            !isEditMode && 'bg-slate-50 cursor-not-allowed'
                                        )}
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">cm</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Real-time Assessment Results */}
                {
                    assessment && (
                        <Card className="border-green-200 bg-gradient-to-r from-green-50/50 to-blue-50/50 dark:from-green-900/10 dark:to-blue-900/10">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    Resultados de la Evaluación
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {/* Nutritional Status Banner */}
                                <div className={cn(
                                    'p-3 rounded-lg border mb-4 flex items-center gap-2',
                                    assessment.nutritionalStatus === 'Normal'
                                        ? 'bg-green-50 border-green-200 text-green-700'
                                        : assessment.nutritionalStatus.includes('Obesidad') || assessment.nutritionalStatus.includes('severa')
                                            ? 'bg-red-50 border-red-200 text-red-700'
                                            : 'bg-amber-50 border-amber-200 text-amber-700'
                                )}>
                                    {assessment.nutritionalStatus === 'Normal'
                                        ? <CheckCircle2 className="w-5 h-5" />
                                        : <AlertTriangle className="w-5 h-5" />
                                    }
                                    <span className="font-semibold">Estado Nutricional: {assessment.nutritionalStatus}</span>
                                </div>

                                {/* Z-Score Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {/* Weight-for-Age */}
                                    {assessment.wfa && (
                                        <div className={cn('p-3 rounded-lg border', getSeverityColor(assessment.wfa.severityLevel))}>
                                            <p className="text-xs opacity-70">Peso/Edad</p>
                                            <p className="text-lg font-bold">Z: {assessment.wfa.zScore.toFixed(2)}</p>
                                            <div className="flex items-center gap-1 mt-1">
                                                {getSeverityIcon(assessment.wfa.severityLevel)}
                                                <span className="text-xs">{assessment.wfa.diagnosis}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Length/Height-for-Age */}
                                    {assessment.lhfa && (
                                        <div className={cn('p-3 rounded-lg border', getSeverityColor(assessment.lhfa.severityLevel))}>
                                            <p className="text-xs opacity-70">Longitud/Edad</p>
                                            <p className="text-lg font-bold">Z: {assessment.lhfa.zScore.toFixed(2)}</p>
                                            <div className="flex items-center gap-1 mt-1">
                                                {getSeverityIcon(assessment.lhfa.severityLevel)}
                                                <span className="text-xs">{assessment.lhfa.diagnosis}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Weight-for-Length (Infants Only) */}
                                    {ageInMonths < 24 && assessment.wflh && (
                                        <div className={cn('p-3 rounded-lg border', getSeverityColor(assessment.wflh.severityLevel))}>
                                            <p className="text-xs opacity-70">Peso/Longitud</p>
                                            <p className="text-lg font-bold">Z: {assessment.wflh.zScore.toFixed(2)}</p>
                                            <div className="flex items-center gap-1 mt-1">
                                                {getSeverityIcon(assessment.wflh.severityLevel)}
                                                <span className="text-xs">{assessment.wflh.diagnosis}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* BMI-for-Age (Only for >= 2 years) */}
                                    {ageInMonths >= 24 && assessment.bfa && (
                                        <div className={cn('p-3 rounded-lg border', getSeverityColor(assessment.bfa.severityLevel))}>
                                            <p className="text-xs opacity-70">IMC/Edad</p>
                                            <p className="text-lg font-bold">Z: {assessment.bfa.zScore.toFixed(2)}</p>
                                            <div className="flex items-center gap-1 mt-1">
                                                {getSeverityIcon(assessment.bfa.severityLevel)}
                                                <span className="text-xs">{assessment.bfa.diagnosis}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Head Circumference */}
                                    {assessment.hcfa && (
                                        <div className={cn('p-3 rounded-lg border', getSeverityColor(assessment.hcfa.severityLevel))}>
                                            <p className="text-xs opacity-70">P. Cefálico/Edad</p>
                                            <p className="text-lg font-bold">Z: {assessment.hcfa.zScore.toFixed(2)}</p>
                                            <div className="flex items-center gap-1 mt-1">
                                                {getSeverityIcon(assessment.hcfa.severityLevel)}
                                                <span className="text-xs">{assessment.hcfa.diagnosis}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Flags */}
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {assessment.stunting && (
                                        <Badge className="bg-amber-100 text-amber-700">
                                            ⚠️ Retardo del crecimiento
                                        </Badge>
                                    )}
                                    {assessment.wasting && (
                                        <Badge className="bg-red-100 text-red-700">
                                            🚨 Emaciación
                                        </Badge>
                                    )}
                                    {assessment.overweight && (
                                        <Badge className="bg-orange-100 text-orange-700">
                                            ⚠️ Sobrepeso/Obesidad
                                        </Badge>
                                    )}
                                    {!assessment.stunting && !assessment.wasting && !assessment.overweight && (
                                        <Badge className="bg-green-100 text-green-700">
                                            ✅ Sin alertas nutricionales
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )
                }


                {/* STICKY ACTION BAR for unsaved changes */}
                {isEditMode && isDirty && !hideSubmitButton && (
                    <div className="sticky bottom-4 left-0 right-0 z-[100] mt-8 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-pink-200 dark:border-pink-900/30 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 max-w-2xl mx-auto ring-1 ring-black/5">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <AlertTriangle className="w-3 h-3" />
                                    Cambios sin guardar
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium">Hay datos de la evaluación pendientes de registro</span>
                            </div>
                            <div className="flex gap-3">
                                {onCancel && (
                                    <Button variant="outline" type="button" onClick={onCancel} className="gap-2 rounded-xl h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-all text-xs font-bold">
                                        Descartar
                                    </Button>
                                )}
                                <Button type="submit" disabled={isSubmitting} className="gap-2 rounded-xl h-10 px-6 bg-pink-600 hover:bg-pink-700 text-white font-bold shadow-lg shadow-pink-500/20 transition-all hover:scale-[1.02] text-xs">
                                    <Save className="w-3.5 h-3.5" /> {isSubmitting ? 'Guardando...' : 'Guardar Ahora'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </form>
        );
    });
