'use client';

/**
 * AdolescentEvaluation.tsx
 * 
 * Specialized module for adolescent patients (10-19 years):
 * - Tanner Stage visual selector (Sexual Maturation Rating)
 * - Skinfold measurements input
 * - Body Fat % calculation and classification
 * 
 * This component is INVISIBLE if age < 10 or age > 19.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
    useAdolescentMetrics,
    type TannerStage,
    type TannerRating,
    type SkinfoldMeasurements,
    type Gender,
    type BodyFatClassification,
} from '@/hooks/useAdolescentMetrics';
import {
    AlertTriangle,
    Activity,
    User,
    TrendingUp,
    Info,
    CheckCircle2,
    XCircle,
    Calculator,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface AdolescentEvaluationProps {
    age: number;
    gender: Gender;
    className?: string;
    /** Callback when biological age should be used instead of chronological */
    onBiologicalAgeChange?: (biologicalAge: number | null, shouldUse: boolean) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TANNER_DESCRIPTIONS = {
    masculino: {
        primary: {
            label: 'Desarrollo Genital (G)',
            stages: [
                { stage: 1, description: 'Prepuberal', detail: 'Testículos, escroto y pene de tamaño infantil' },
                { stage: 2, description: 'Inicio', detail: 'Agrandamiento de escroto y testículos' },
                { stage: 3, description: 'Progresión', detail: 'Alargamiento del pene, crecimiento testicular' },
                { stage: 4, description: 'Avanzado', detail: 'Aumento del diámetro del pene, pigmentación escrotal' },
                { stage: 5, description: 'Adulto', detail: 'Genitales de tamaño y forma adulta' },
            ]
        },
        pubicHair: {
            label: 'Vello Pubiano (VP)',
            stages: [
                { stage: 1, description: 'Ausente', detail: 'Sin vello pubiano' },
                { stage: 2, description: 'Escaso', detail: 'Vello largo, liso, escaso en base del pene' },
                { stage: 3, description: 'Moderado', detail: 'Vello más oscuro, rizado, sobre pubis' },
                { stage: 4, description: 'Abundante', detail: 'Vello tipo adulto, área reducida' },
                { stage: 5, description: 'Adulto', detail: 'Distribución adulta, extensión a muslos' },
            ]
        }
    },
    femenino: {
        primary: {
            label: 'Desarrollo Mamario (M)',
            stages: [
                { stage: 1, description: 'Prepuberal', detail: 'Elevación del pezón únicamente' },
                { stage: 2, description: 'Botón mamario', detail: 'Elevación de mama y pezón, areola aumentada' },
                { stage: 3, description: 'Crecimiento', detail: 'Mayor elevación, sin contorno separado' },
                { stage: 4, description: 'Proyección', detail: 'Areola y pezón forman montículo secundario' },
                { stage: 5, description: 'Adulto', detail: 'Mama adulta, pezón proyectado' },
            ]
        },
        pubicHair: {
            label: 'Vello Pubiano (VP)',
            stages: [
                { stage: 1, description: 'Ausente', detail: 'Sin vello pubiano' },
                { stage: 2, description: 'Escaso', detail: 'Vello largo, liso, a lo largo de labios' },
                { stage: 3, description: 'Moderado', detail: 'Vello más oscuro, rizado, sobre pubis' },
                { stage: 4, description: 'Abundante', detail: 'Vello tipo adulto, área reducida' },
                { stage: 5, description: 'Adulto', detail: 'Distribución adulta triangular' },
            ]
        }
    }
};

const CLASSIFICATION_COLORS: Record<BodyFatClassification, string> = {
    muy_bajo: 'bg-red-100 text-red-800 border-red-300',
    bajo: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    normal: 'bg-green-100 text-green-800 border-green-300',
    moderadamente_elevado: 'bg-orange-100 text-orange-800 border-orange-300',
    alto: 'bg-red-100 text-red-800 border-red-300',
};

const RISK_ICONS: Record<string, React.ReactNode> = {
    bajo: <CheckCircle2 className="w-4 h-4 text-blue-500" />,
    normal: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    elevado: <AlertTriangle className="w-4 h-4 text-orange-500" />,
    alto: <XCircle className="w-4 h-4 text-red-500" />,
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface TannerStageSelectorProps {
    gender: Gender;
    type: 'primary' | 'pubicHair';
    value: TannerStage;
    onChange: (stage: TannerStage) => void;
}

function TannerStageSelector({ gender, type, value, onChange }: TannerStageSelectorProps) {
    const config = TANNER_DESCRIPTIONS[gender][type];

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                {type === 'primary' ? <User className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                {config.label}
            </label>
            <div className="grid grid-cols-5 gap-2">
                {config.stages.map(({ stage, description, detail }) => (
                    <TooltipProvider key={stage}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    onClick={() => onChange(stage as TannerStage)}
                                    className={cn(
                                        'p-3 rounded-lg border-2 transition-all duration-200 text-center',
                                        'hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20',
                                        'focus:outline-none focus:ring-2 focus:ring-purple-500',
                                        value === stage
                                            ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/30 shadow-md'
                                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                                    )}
                                >
                                    <div className="text-lg font-bold text-slate-800 dark:text-white">{stage}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{description}</div>
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs">
                                <p className="font-medium">Estadío {stage}: {description}</p>
                                <p className="text-xs text-slate-400 mt-1">{detail}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AdolescentEvaluation({
    age,
    gender,
    className,
    onBiologicalAgeChange,
}: AdolescentEvaluationProps) {
    // Tanner state
    const [tannerRating, setTannerRating] = useState<TannerRating>({
        primary: 1,
        pubicHair: 1,
    });

    // Skinfold measurements state
    const [skinfolds, setSkinfolds] = useState<SkinfoldMeasurements>({
        biceps: 0,
        triceps: 0,
        subscapular: 0,
        suprailiac: 0,
    });

    // Calculate metrics
    const metrics = useAdolescentMetrics({
        age,
        gender,
        tannerRating,
        skinfolds,
    });

    // Notify parent when biological age should be used
    useEffect(() => {
        if (onBiologicalAgeChange && metrics.isAdolescent) {
            onBiologicalAgeChange(
                metrics.tanner.biologicalAge,
                metrics.tanner.shouldUseBiologicalAge
            );
        }
    }, [metrics.tanner.biologicalAge, metrics.tanner.shouldUseBiologicalAge, onBiologicalAgeChange, metrics.isAdolescent]);

    // Visibility guard: Only show for adolescents (10-19 years)
    if (!metrics.isAdolescent) {
        return null;
    }

    const handleTannerChange = (type: 'primary' | 'pubicHair', stage: TannerStage) => {
        setTannerRating(prev => ({
            ...prev,
            [type]: stage,
        }));
    };

    const handleSkinfoldChange = (field: keyof SkinfoldMeasurements, value: string) => {
        const numValue = parseFloat(value) || 0;
        setSkinfolds(prev => ({
            ...prev,
            [field]: numValue,
        }));
    };

    const hasAllSkinfolds = skinfolds.biceps > 0 && skinfolds.triceps > 0 &&
        skinfolds.subscapular > 0 && skinfolds.suprailiac > 0;

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header Badge */}
            <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Módulo Adolescente (10-19 años)
                </Badge>
            </div>

            {/* Tanner Stage Alert (if discrepancy detected) */}
            {metrics.tanner.alert && (
                <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800 dark:text-amber-300">Discrepancia de Edad Detectada</AlertTitle>
                    <AlertDescription className="text-amber-700 dark:text-amber-400">
                        {metrics.tanner.alert}
                    </AlertDescription>
                </Alert>
            )}

            {/* Tanner Stage Selector Card */}
            <Card className="border-purple-200 dark:border-purple-800 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-purple-800 dark:text-purple-300">
                        <Activity className="w-4 h-4" />
                        Estadío de Tanner (Maduración Sexual)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <TannerStageSelector
                        gender={gender}
                        type="primary"
                        value={tannerRating.primary}
                        onChange={(stage) => handleTannerChange('primary', stage)}
                    />
                    <TannerStageSelector
                        gender={gender}
                        type="pubicHair"
                        value={tannerRating.pubicHair}
                        onChange={(stage) => handleTannerChange('pubicHair', stage)}
                    />

                    {/* Biological Age Result */}
                    {metrics.tanner.biologicalAge && (
                        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Edad Biológica Estimada</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Basada en promedio de estadíos Tanner</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                                        {metrics.tanner.biologicalAge.toFixed(1)} <span className="text-sm font-normal">años</span>
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        vs {age.toFixed(1)} años cronológicos
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    );
}

export default AdolescentEvaluation;
