'use client';

import { useState, useCallback, useMemo } from 'react';
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
} from 'lucide-react';
import {
    calculateGrowthAssessment,
    getMeasurementType,
    type Sex,
    type GrowthAssessment,
} from '@/lib/growth-standards';
import { calculateChronologicalAge, calculateExactAgeInDays } from '@/lib/clinical-calculations';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface NewPediatricMeasurementFormProps {
    patientId: string;
    patientName: string;
    patientBirthDate: Date | string;
    patientSex: Sex;
    onSave: (data: PediatricMeasurementData) => void;
    onCancel?: () => void;
    className?: string;
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
        .max(50, 'Peso máximo 50 kg para niños 0-5 años'),
    heightCm: z.number()
        .min(30, 'Longitud/Talla mínima 30 cm')
        .max(130, 'Longitud/Talla máxima 130 cm'),
    headCircumferenceCm: z.number()
        .min(25, 'Perímetro cefálico mínimo 25 cm')
        .max(60, 'Perímetro cefálico máximo 60 cm')
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

export function NewPediatricMeasurementForm({
    patientId,
    patientName,
    patientBirthDate,
    patientSex,
    onSave,
    onCancel,
    className,
}: NewPediatricMeasurementFormProps) {
    const [assessment, setAssessment] = useState<GrowthAssessment | null>(null);

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

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<MeasurementFormValues>({
        resolver: zodResolver(measurementSchema),
        defaultValues: {
            dateRecorded: new Date().toISOString().split('T')[0],
        },
    });

    const watchedValues = watch();

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
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className={cn('space-y-6', className)}>
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
                                {Math.floor(ageInMonths)} meses
                                {ageInMonths < 24 && <span className="text-xs text-slate-400 ml-1">({ageInDays} días)</span>}
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

            {/* Measurement Inputs */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Scale className="w-4 h-4 text-green-600" />
                        Medidas Antropométricas
                    </CardTitle>
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
                                    {...register('weightKg', { valueAsNumber: true })}
                                    onBlur={calculateAssessment}
                                    className={cn(
                                        'pr-10',
                                        errors.weightKg && 'border-red-500'
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
                                    {...register('heightCm', { valueAsNumber: true })}
                                    onBlur={calculateAssessment}
                                    className={cn(
                                        'pr-10',
                                        errors.heightCm && 'border-red-500'
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
                                    {...register('headCircumferenceCm', { valueAsNumber: true })}
                                    onBlur={calculateAssessment}
                                    className="pr-10"
                                />
                                <span className="absolute right-3 top-2.5 text-xs text-slate-400">cm</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Real-time Assessment Results */}
            {assessment && (
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

                            {/* BMI-for-Age */}
                            {assessment.bfa && (
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
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        className="flex-1"
                    >
                        Cancelar
                    </Button>
                )}
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Guardando...' : 'Guardar Evaluación'}
                </Button>
            </div>
        </form>
    );
}
