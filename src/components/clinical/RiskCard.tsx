"use client";

/**
 * RiskCard
 * 
 * Dashboard component for displaying cardiometabolic risk indicators.
 * Shows ICT, Abdominal Obesity, and Waist-Hip Ratio with color-coded badges.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Heart,
    Activity,
    AlertTriangle,
    CheckCircle,
    AlertCircle,
    Ruler,
    Scale
} from "lucide-react";
import {
    calculateCardiometabolicRisk,
    type RiskLevel
} from '@/utils/clinical-formulas';

interface RiskCardProps {
    waist: number;
    hip: number;
    height: number;
    age: number;
    sex: 'masculino' | 'femenino';
    compact?: boolean;
}

const RISK_COLORS: Record<RiskLevel, string> = {
    'minimo': '#22c55e',     // Green
    'bajo': '#84cc16',       // Lime
    'moderado': '#f59e0b',   // Amber
    'alto': '#ef4444',       // Red
    'muy_alto': '#dc2626',   // Dark Red
};

const RISK_BG_COLORS: Record<RiskLevel, string> = {
    'minimo': 'bg-green-100 dark:bg-green-900/30',
    'bajo': 'bg-lime-100 dark:bg-lime-900/30',
    'moderado': 'bg-amber-100 dark:bg-amber-900/30',
    'alto': 'bg-red-100 dark:bg-red-900/30',
    'muy_alto': 'bg-red-200 dark:bg-red-900/50',
};

const RISK_TEXT_COLORS: Record<RiskLevel, string> = {
    'minimo': 'text-green-700 dark:text-green-400',
    'bajo': 'text-lime-700 dark:text-lime-400',
    'moderado': 'text-amber-700 dark:text-amber-400',
    'alto': 'text-red-700 dark:text-red-400',
    'muy_alto': 'text-red-800 dark:text-red-300',
};

const RISK_LABELS: Record<RiskLevel, string> = {
    'minimo': 'Mínimo',
    'bajo': 'Bajo',
    'moderado': 'Moderado',
    'alto': 'Alto',
    'muy_alto': 'Muy Alto',
};

const RISK_ICONS: Record<RiskLevel, React.ReactNode> = {
    'minimo': <CheckCircle className="h-4 w-4" />,
    'bajo': <CheckCircle className="h-4 w-4" />,
    'moderado': <AlertCircle className="h-4 w-4" />,
    'alto': <AlertTriangle className="h-4 w-4" />,
    'muy_alto': <AlertTriangle className="h-4 w-4" />,
};

// Progress value based on risk level (for visual representation)
const RISK_PROGRESS: Record<RiskLevel, number> = {
    'minimo': 20,
    'bajo': 40,
    'moderado': 60,
    'alto': 80,
    'muy_alto': 100,
};

export function RiskCard({
    waist,
    hip,
    height,
    age,
    sex,
    compact = false
}: RiskCardProps) {
    const riskData = useMemo(() =>
        calculateCardiometabolicRisk(waist, hip, height, age, sex),
        [waist, hip, height, age, sex]
    );

    if (compact) {
        return (
            <Card className="w-full">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-red-500" />
                        <CardTitle className="text-lg">Riesgo Cardiometabólico</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Riesgo Global</span>
                        <Badge
                            className="text-white"
                            style={{ backgroundColor: RISK_COLORS[riskData.overallRisk] }}
                        >
                            {RISK_ICONS[riskData.overallRisk]}
                            <span className="ml-1">{RISK_LABELS[riskData.overallRisk]}</span>
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-red-500" />
                        <CardTitle className="text-lg">Riesgo Cardiometabólico</CardTitle>
                    </div>
                    <Badge
                        className="text-white"
                        style={{ backgroundColor: RISK_COLORS[riskData.overallRisk] }}
                    >
                        {RISK_ICONS[riskData.overallRisk]}
                        <span className="ml-1">{RISK_LABELS[riskData.overallRisk]}</span>
                    </Badge>
                </div>
                <CardDescription>
                    Indicadores basados en cintura, cadera y talla
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* ICT - Waist to Height Ratio */}
                <div className={`rounded-lg p-3 ${RISK_BG_COLORS[riskData.waistToHeight.risk]}`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Ruler className="h-4 w-4" />
                            <span className="font-medium">Índice Cintura/Talla (ICT)</span>
                        </div>
                        <span className={`font-semibold ${RISK_TEXT_COLORS[riskData.waistToHeight.risk]}`}>
                            {riskData.waistToHeight.ratio.toFixed(2)}
                        </span>
                    </div>
                    <Progress
                        value={RISK_PROGRESS[riskData.waistToHeight.risk]}
                        className="h-2"
                        style={{
                            // @ts-expect-error CSS custom property
                            '--progress-foreground': RISK_COLORS[riskData.waistToHeight.risk]
                        }}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                        {riskData.waistToHeight.interpretation}
                    </p>
                </div>

                {/* Abdominal Obesity */}
                <div className={`rounded-lg p-3 ${riskData.abdominalObesity ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Scale className="h-4 w-4" />
                            <span className="font-medium">Obesidad Abdominal (Minsal)</span>
                        </div>
                        <Badge variant={riskData.abdominalObesity ? 'destructive' : 'default'}>
                            {riskData.abdominalObesity ? (
                                <>
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Presente
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    No
                                </>
                            )}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        Cintura: {waist} cm (Umbral {sex === 'masculino' ? '≥90' : '≥80'} cm)
                    </p>
                </div>

                {/* WHR - Waist Hip Ratio */}
                <div className={`rounded-lg p-3 ${RISK_BG_COLORS[riskData.waistHipRatio.risk]}`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            <span className="font-medium">Relación Cintura/Cadera (RCC)</span>
                        </div>
                        <span className={`font-semibold ${RISK_TEXT_COLORS[riskData.waistHipRatio.risk]}`}>
                            {riskData.waistHipRatio.ratio.toFixed(2)}
                        </span>
                    </div>
                    <Progress
                        value={RISK_PROGRESS[riskData.waistHipRatio.risk]}
                        className="h-2"
                        style={{
                            // @ts-expect-error CSS custom property
                            '--progress-foreground': RISK_COLORS[riskData.waistHipRatio.risk]
                        }}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                        {riskData.waistHipRatio.interpretation}
                    </p>
                </div>

                {/* Summary footer */}
                <div className="border-t pt-3 mt-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Medidas:</span>
                        <span>
                            Cintura: {waist} cm • Cadera: {hip} cm • Talla: {height} cm
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default RiskCard;
