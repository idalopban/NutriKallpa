'use client';

import { useEffect, useMemo, useCallback, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    useAnthropometryConfig,
    useFieldVisibility,
    type PatientContext,
    type FieldConfig,
} from '@/hooks/useAnthropometryConfig';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { evaluateNutritionalStatus, calculateAmputeeBMI } from '@/lib/clinical-calculations';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Scale,
    Ruler,
    Baby,
    Heart,
    User,
    Brain,
    AlertTriangle,
    CheckCircle2,
    Info,
    Activity,
    Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface AdaptiveAnthropometryFormProps {
    patientId: string;
    patientContext: PatientContext;
    onSave?: (data: Record<string, unknown>) => void;
    className?: string;
}

// Icon mapping for sections
const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    geriatric: User,
    pregnancy: Heart,
    amputation: Activity,
    neurological: Brain,
    infant: Baby,
};

const CONTEXT_LABELS: Record<string, { label: string; color: string }> = {
    general: { label: 'General', color: 'bg-slate-100 text-slate-700' },
    lactante: { label: 'Lactante', color: 'bg-pink-100 text-pink-700' },
    pediatrico: { label: 'Pediátrico', color: 'bg-blue-100 text-blue-700' },
    adulto: { label: 'Adulto', color: 'bg-green-100 text-green-700' },
    adulto_mayor: { label: 'Adulto Mayor', color: 'bg-purple-100 text-purple-700' },
    gestante: { label: 'Gestante', color: 'bg-pink-100 text-pink-700' },
    amputado: { label: 'Amputado', color: 'bg-orange-100 text-orange-700' },
    neuro: { label: 'Neurológico', color: 'bg-indigo-100 text-indigo-700' },
};

// ============================================================================
// COMPONENTS
// ============================================================================

function ContextToggle({
    label,
    checked,
    onChange,
    helperText,
}: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    helperText?: string;
}) {
    return (
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
                <Label className="text-sm font-medium">{label}</Label>
                {helperText && (
                    <p className="text-xs text-muted-foreground">{helperText}</p>
                )}
            </div>
            <Switch checked={checked} onCheckedChange={onChange} />
        </div>
    );
}

function MeasurementInput({
    field,
    value,
    onChange,
    error,
    isRequired,
}: {
    field: FieldConfig;
    value: number | undefined;
    onChange: (value: number) => void;
    error?: string;
    isRequired: boolean;
}) {
    return (
        <div className="space-y-1.5">
            <Label
                htmlFor={field.id}
                className={cn(
                    'text-xs font-medium flex items-center gap-1',
                    isRequired ? 'text-blue-700' : 'text-slate-600'
                )}
            >
                {field.label}
                {isRequired && <span className="text-blue-500">*</span>}
            </Label>
            <div className="relative">
                <Input
                    id={field.id}
                    type="number"
                    step={field.step || 0.1}
                    min={field.min}
                    max={field.max}
                    placeholder={field.placeholder || '0'}
                    value={value ?? ''}
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                    className={cn(
                        'h-10 pr-10',
                        error && 'border-red-500 focus:ring-red-500',
                        isRequired && !value && 'bg-blue-50/50 border-blue-200'
                    )}
                />
                {field.unit && (
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">
                        {field.unit}
                    </span>
                )}
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            {field.helperText && !error && (
                <p className="text-xs text-muted-foreground">{field.helperText}</p>
            )}
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AdaptiveAnthropometryForm({
    patientId,
    patientContext,
    onSave,
    className,
}: AdaptiveAnthropometryFormProps) {
    // Get configuration based on patient context
    const config = useAnthropometryConfig(patientContext);
    const fieldVisibility = useFieldVisibility(config);

    // Zustand store
    const { measures, setMeasure, setContext, setResults, context: storeContext } = useAssessmentStore();

    // Form
    const {
        control,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(config.validationSchema),
        defaultValues: measures,
    });

    const watchedValues = watch();

    // Real-time assessment calculation
    const [dynamicWarnings, setDynamicWarnings] = useState<string[]>([]);

    useEffect(() => {
        if (!watchedValues.peso) return;

        const assessment = evaluateNutritionalStatus({
            peso: watchedValues.peso || 0,
            talla: watchedValues.talla || watchedValues.longitud || 0,
            edad: config.age,
            sexo: patientContext.sexo,
            type: config.clinicalContext === 'adulto_mayor' ? 'adulto_mayor'
                : config.clinicalContext === 'gestante' ? 'gestante'
                    : config.clinicalContext === 'neuro' ? 'neuro'
                        : config.clinicalContext === 'amputado' ? 'amputado'
                            : 'general',
            gestationalWeeks: watchedValues.semanasGestacion,
            prePregnancyWeight: watchedValues.pesoPregestacional,
            amputations: storeContext.amputations,
            gmfcsLevel: storeContext.gmfcsLevel,
            tibiaLength: watchedValues.longitudTibia,
            alturaRodilla: watchedValues.alturaRodilla,
        });

        setResults({
            bmi: assessment.bmi,
            bmiClassification: assessment.bmiClassification,
        });

        // Update dynamic warnings from clinical calculation
        setDynamicWarnings(assessment.warnings);

    }, [watchedValues, config.age, config.clinicalContext, patientContext.sexo]);

    // Handle form submission
    const onSubmit = useCallback((data: any) => {
        onSave?.(data as Record<string, unknown>);
    }, [onSave]);

    const contextInfo = CONTEXT_LABELS[config.clinicalContext] || CONTEXT_LABELS.general;

    // Merge static and dynamic warnings for display
    const allWarnings = [...config.warnings, ...dynamicWarnings];

    return (
        <form onSubmit={handleSubmit(onSubmit)} className={cn('space-y-6', className)}>
            {/* Context Header */}
            <Card className="border-none shadow-sm bg-gradient-to-r from-slate-50 to-slate-100/50">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Activity className="w-5 h-5 text-green-600" />
                            Antropometría Adaptativa
                        </CardTitle>
                        <Badge className={cn('text-xs font-medium', contextInfo.color)}>
                            {contextInfo.label} • {config.age.toFixed(1)} años
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Context Toggles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <ContextToggle
                            label="¿Embarazada?"
                            checked={storeContext.isPregnant || false}
                            onChange={(v) => setContext({ isPregnant: v })}
                        />
                        <ContextToggle
                            label="¿Tiene amputaciones?"
                            checked={storeContext.hasAmputations || false}
                            onChange={(v) => setContext({ hasAmputations: v })}
                        />
                        {config.clinicalContext === 'adulto_mayor' && (
                            <ContextToggle
                                label="¿Puede mantenerse de pie?"
                                checked={storeContext.canStand !== false}
                                onChange={(v) => setContext({ canStand: v })}
                                helperText="Si no, se usará altura de rodilla"
                            />
                        )}
                        <ContextToggle
                            label="¿Condición neurológica?"
                            checked={storeContext.isNeurological || false}
                            onChange={(v) => setContext({ isNeurological: v })}
                            helperText="PC, Down, etc."
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Warnings & Recommendations */}
            {(allWarnings.length > 0 || config.recommendations.length > 0) && (
                <div className="space-y-2">
                    {allWarnings.map((warning, i) => (
                        <div
                            key={`warn-${i}`}
                            className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800"
                        >
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            {warning}
                        </div>
                    ))}
                    {config.recommendations.map((rec, i) => (
                        <div
                            key={`rec-${i}`}
                            className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800"
                        >
                            <Info className="w-4 h-4 flex-shrink-0" />
                            {rec}
                        </div>
                    ))}
                </div>
            )}

            {/* Basic Measurements */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Scale className="w-4 h-4 text-green-600" />
                        Medidas Básicas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {/* Peso - Always visible */}
                        <Controller
                            name="peso"
                            control={control}
                            render={({ field }) => (
                                <MeasurementInput
                                    field={{ id: 'peso', label: 'Peso', type: 'number', unit: 'kg', min: 0.5, max: 300, step: 0.1 }}
                                    value={field.value}
                                    onChange={field.onChange}
                                    error={errors.peso?.message as string}
                                    isRequired={true}
                                />
                            )}
                        />

                        {/* Talla - Conditional */}
                        {fieldVisibility.isVisible('talla') && (
                            <Controller
                                name="talla"
                                control={control}
                                render={({ field }) => (
                                    <MeasurementInput
                                        field={{ id: 'talla', label: 'Talla', type: 'number', unit: 'cm', min: 30, max: 250, step: 0.1 }}
                                        value={field.value}
                                        onChange={field.onChange}
                                        error={errors.talla?.message as string}
                                        isRequired={fieldVisibility.isRequired('talla')}
                                    />
                                )}
                            />
                        )}

                        {/* Longitud - For infants */}
                        {fieldVisibility.isVisible('longitud') && (
                            <Controller
                                name="longitud"
                                control={control}
                                render={({ field }) => (
                                    <MeasurementInput
                                        field={{ id: 'longitud', label: 'Longitud (acostado)', type: 'number', unit: 'cm', min: 30, max: 120, step: 0.1 }}
                                        value={field.value}
                                        onChange={field.onChange}
                                        error={errors.longitud?.message as string}
                                        isRequired={fieldVisibility.isRequired('longitud')}
                                    />
                                )}
                            />
                        )}

                        {/* Perimetro Cefalico - For infants */}
                        {fieldVisibility.isVisible('perimetroCefalico') && (
                            <Controller
                                name="perimetroCefalico"
                                control={control}
                                render={({ field }) => (
                                    <MeasurementInput
                                        field={{ id: 'perimetroCefalico', label: 'Perímetro Cefálico', type: 'number', unit: 'cm', min: 25, max: 60, step: 0.1 }}
                                        value={field.value}
                                        onChange={field.onChange}
                                        error={errors.perimetroCefalico?.message as string}
                                        isRequired={fieldVisibility.isRequired('perimetroCefalico')}
                                    />
                                )}
                            />
                        )}

                        {/* Altura Rodilla - For elderly who can't stand */}
                        {fieldVisibility.isVisible('alturaRodilla') && (
                            <Controller
                                name="alturaRodilla"
                                control={control}
                                render={({ field }) => (
                                    <MeasurementInput
                                        field={{ id: 'alturaRodilla', label: 'Altura de Rodilla', type: 'number', unit: 'cm', min: 30, max: 65, step: 0.1, helperText: 'Para estimar talla (Chumlea)' }}
                                        value={field.value}
                                        onChange={field.onChange}
                                        error={errors.alturaRodilla?.message as string}
                                        isRequired={fieldVisibility.isRequired('alturaRodilla')}
                                    />
                                )}
                            />
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Special Sections - Rendered dynamically */}
            {config.specialSections.map((section) => {
                const SectionIcon = SECTION_ICONS[section.id] || Activity;
                return (
                    <Card key={section.id}>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <SectionIcon className="w-4 h-4" />
                                {section.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {section.fields.map((field) => (
                                    <Controller
                                        key={field.id}
                                        name={field.id as any}
                                        control={control}
                                        render={({ field: rhfField }) => {
                                            if (field.type === 'select' && field.options) {
                                                return (
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-medium">{field.label}</Label>
                                                        <Select
                                                            value={rhfField.value as string}
                                                            onValueChange={rhfField.onChange}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Seleccionar..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {field.options.map((opt) => (
                                                                    <SelectItem key={opt.value} value={opt.value}>
                                                                        {opt.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <MeasurementInput
                                                    field={field}
                                                    value={rhfField.value as number}
                                                    onChange={rhfField.onChange}
                                                    error={(errors as any)[field.id]?.message}
                                                    isRequired={field.required || false}
                                                />
                                            );
                                        }}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}

            {/* Submit Button */}
            <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg h-12"
            >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Guardando...' : 'Guardar Evaluación'}
            </Button>
        </form>
    );
}
