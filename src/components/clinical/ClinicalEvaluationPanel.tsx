"use client";

/**
 * ClinicalEvaluationPanel
 * 
 * Panel integrado de evaluaciones clínicas especiales:
 * - Embarazo (Atalah + IOM)
 * - Parálisis Cerebral (Stevenson + GMFCS)
 * - Riesgo Cardiometabólico (ICT, WHR, Obesidad Abdominal)
 * - Selector de Grasa Corporal (Slaughter vs Durnin)
 */

import { useState, useMemo } from "react";
import {
    Baby, Accessibility, Heart, Scale,
    AlertTriangle, CheckCircle2, Info, Calculator
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Clinical Formulas
import {
    classifyAtalah,
    getIOMWeightGainGoals,
    evaluatePregnancyWeightGain,
    estimateHeightStevenson,
    isNutritionalRiskPC,
    getGMFCSDescription,
    calculateCardiometabolicRisk,
    calculateBodyFatSmart,
    type AtalahClassification,
    type GMFCSLevel,
    type TannerMaturationStage,
} from "@/utils/clinical-formulas";

import { PregnancyChart } from "./PregnancyChart";
import { RiskCard } from "./RiskCard";

interface ClinicalEvaluationPanelProps {
    patientData: {
        sex: 'masculino' | 'femenino';
        age: number;
        weight: number;
        height: number;
        waist?: number;
        hip?: number;
        triceps?: number;
        subscapular?: number;
        biceps?: number;
        suprailiac?: number;
    };
    onSave?: (data: ClinicalEvaluationResult) => void;
}

export interface ClinicalEvaluationResult {
    pregnancy?: {
        isPregnant: boolean;
        gestationalWeeks: number;
        prePregnancyWeight: number;
        classification: AtalahClassification;
    };
    cerebralPalsy?: {
        gmfcsLevel: GMFCSLevel;
        tibiaLength: number;
        estimatedHeight: number;
        isNutritionalRisk: boolean;
    };
    cardiometabolic?: {
        waistToHeightRatio: number;
        hasAbdominalObesity: boolean;
        waistHipRatio: number;
        overallRisk: string;
    };
    bodyFat?: {
        percentage: number;
        method: string;
    };
}

export function ClinicalEvaluationPanel({ patientData, onSave }: ClinicalEvaluationPanelProps) {
    const [activeTab, setActiveTab] = useState("embarazo");

    // ============ EMBARAZO STATE ============
    const [isPregnant, setIsPregnant] = useState(false);
    const [gestationalWeeks, setGestationalWeeks] = useState<number>(20);
    const [prePregnancyWeight, setPrePregnancyWeight] = useState<number>(patientData.weight - 5);
    const [isMultiple, setIsMultiple] = useState(false);

    // ============ PARÁLISIS CEREBRAL STATE ============
    const [gmfcsLevel, setGmfcsLevel] = useState<GMFCSLevel>('I');
    const [tibiaLength, setTibiaLength] = useState<number>(35);
    const [weightPercentile, setWeightPercentile] = useState<number>(50);

    // ============ BODY FAT STATE ============
    const [tannerStage, setTannerStage] = useState<TannerMaturationStage>('post-puber');

    // ============ CALCULATIONS ============

    // Pregnancy
    const pregnancyData = useMemo(() => {
        if (!isPregnant || patientData.sex !== 'femenino') return null;

        const currentIMC = patientData.weight / Math.pow(patientData.height / 100, 2);
        const prePregnancyBMI = prePregnancyWeight / Math.pow(patientData.height / 100, 2);
        const classification = classifyAtalah(currentIMC, gestationalWeeks);
        const iomGoals = getIOMWeightGainGoals(prePregnancyBMI, isMultiple);
        const evaluation = evaluatePregnancyWeightGain(
            patientData.weight,
            prePregnancyWeight,
            gestationalWeeks,
            prePregnancyBMI,
            isMultiple
        );

        return {
            currentIMC,
            prePregnancyBMI,
            classification,
            iomGoals,
            evaluation
        };
    }, [isPregnant, patientData, prePregnancyWeight, gestationalWeeks, isMultiple]);

    // Cerebral Palsy
    const cpData = useMemo(() => {
        const estimatedHeight = estimateHeightStevenson(tibiaLength);
        const isRisk = isNutritionalRiskPC(gmfcsLevel, weightPercentile);
        const description = getGMFCSDescription(gmfcsLevel);

        return {
            estimatedHeight,
            isRisk,
            description
        };
    }, [tibiaLength, gmfcsLevel, weightPercentile]);

    // Cardiometabolic Risk
    const cardiometabolicData = useMemo(() => {
        if (!patientData.waist || !patientData.hip) return null;

        return calculateCardiometabolicRisk(
            patientData.waist,
            patientData.hip,
            patientData.height,
            patientData.age,
            patientData.sex
        );
    }, [patientData]);

    // Body Fat
    const bodyFatData = useMemo(() => {
        if (!patientData.triceps || !patientData.subscapular) return null;

        return calculateBodyFatSmart(
            patientData.age,
            patientData.age <= 18 ? tannerStage : null,
            {
                triceps: patientData.triceps,
                subscapular: patientData.subscapular,
                biceps: patientData.biceps,
                suprailiac: patientData.suprailiac
            },
            patientData.sex
        );
    }, [patientData, tannerStage]);

    // Handle save
    const handleSave = () => {
        const result: ClinicalEvaluationResult = {};

        if (isPregnant && pregnancyData) {
            result.pregnancy = {
                isPregnant: true,
                gestationalWeeks,
                prePregnancyWeight,
                classification: pregnancyData.classification
            };
        }

        result.cerebralPalsy = {
            gmfcsLevel,
            tibiaLength,
            estimatedHeight: cpData.estimatedHeight,
            isNutritionalRisk: cpData.isRisk
        };

        if (cardiometabolicData) {
            result.cardiometabolic = {
                waistToHeightRatio: cardiometabolicData.waistToHeight.ratio,
                hasAbdominalObesity: cardiometabolicData.abdominalObesity,
                waistHipRatio: cardiometabolicData.waistHipRatio.ratio,
                overallRisk: cardiometabolicData.overallRisk
            };
        }

        if (bodyFatData) {
            result.bodyFat = {
                percentage: bodyFatData.percentage,
                method: bodyFatData.method
            };
        }

        onSave?.(result);
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-purple-500" />
                    Evaluación Clínica Avanzada
                </CardTitle>
                <CardDescription>
                    Herramientas especializadas para poblaciones especiales
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 mb-6">
                        <TabsTrigger value="embarazo" className="gap-1">
                            <Baby className="w-4 h-4" />
                            <span className="hidden sm:inline">Embarazo</span>
                        </TabsTrigger>
                        <TabsTrigger value="pc" className="gap-1">
                            <Accessibility className="w-4 h-4" />
                            <span className="hidden sm:inline">P. Cerebral</span>
                        </TabsTrigger>
                        <TabsTrigger value="cardio" className="gap-1">
                            <Heart className="w-4 h-4" />
                            <span className="hidden sm:inline">Cardiometab.</span>
                        </TabsTrigger>
                        <TabsTrigger value="grasa" className="gap-1">
                            <Scale className="w-4 h-4" />
                            <span className="hidden sm:inline">% Grasa</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* ============ TAB: EMBARAZO ============ */}
                    <TabsContent value="embarazo" className="space-y-4">
                        {patientData.sex !== 'femenino' ? (
                            <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
                                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>Esta evaluación solo aplica para pacientes femeninas.</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-4 p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                                    <input
                                        type="checkbox"
                                        id="isPregnant"
                                        checked={isPregnant}
                                        onChange={(e) => setIsPregnant(e.target.checked)}
                                        className="w-5 h-5 rounded text-pink-500"
                                    />
                                    <Label htmlFor="isPregnant" className="text-sm font-medium">
                                        La paciente está embarazada
                                    </Label>
                                </div>

                                {isPregnant && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="gestationalWeeks">Semanas de Gestación</Label>
                                                <Input
                                                    id="gestationalWeeks"
                                                    type="number"
                                                    min={6}
                                                    max={42}
                                                    value={gestationalWeeks}
                                                    onChange={(e) => setGestationalWeeks(Number(e.target.value))}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="prePregnancyWeight">Peso Pregestacional (kg)</Label>
                                                <Input
                                                    id="prePregnancyWeight"
                                                    type="number"
                                                    step="0.1"
                                                    value={prePregnancyWeight}
                                                    onChange={(e) => setPrePregnancyWeight(Number(e.target.value))}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <input
                                                type="checkbox"
                                                id="isMultiple"
                                                checked={isMultiple}
                                                onChange={(e) => setIsMultiple(e.target.checked)}
                                                className="w-4 h-4 rounded"
                                            />
                                            <Label htmlFor="isMultiple" className="text-sm">
                                                Embarazo gemelar/múltiple
                                            </Label>
                                        </div>

                                        {pregnancyData && (
                                            <div className="mt-4">
                                                <PregnancyChart
                                                    currentIMC={pregnancyData.currentIMC}
                                                    gestationalWeeks={gestationalWeeks}
                                                    prePregnancyWeight={prePregnancyWeight}
                                                    currentWeight={patientData.weight}
                                                    height={patientData.height}
                                                    isMultiple={isMultiple}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </TabsContent>

                    {/* ============ TAB: PARÁLISIS CEREBRAL ============ */}
                    <TabsContent value="pc" className="space-y-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="flex items-start gap-3">
                                <Accessibility className="h-5 w-5 text-blue-500 mt-0.5" />
                                <div>
                                    <h4 className="font-medium text-blue-800 dark:text-blue-300">
                                        Evaluación para Parálisis Cerebral
                                    </h4>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                        Usa la fórmula de Stevenson para estimar talla y evalúa riesgo nutricional según GMFCS.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="gmfcsLevel">Nivel GMFCS</Label>
                                <Select
                                    value={gmfcsLevel}
                                    onValueChange={(v) => setGmfcsLevel(v as GMFCSLevel)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(['I', 'II', 'III', 'IV', 'V'] as GMFCSLevel[]).map(level => (
                                            <SelectItem key={level} value={level}>
                                                Nivel {level}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    {cpData.description}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tibiaLength">Longitud de Tibia (cm)</Label>
                                <Input
                                    id="tibiaLength"
                                    type="number"
                                    step="0.1"
                                    min={15}
                                    max={50}
                                    value={tibiaLength}
                                    onChange={(e) => setTibiaLength(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="weightPercentile">Percentil Peso/Edad (curvas Brooks)</Label>
                            <Input
                                id="weightPercentile"
                                type="number"
                                min={0}
                                max={100}
                                value={weightPercentile}
                                onChange={(e) => setWeightPercentile(Number(e.target.value))}
                            />
                        </div>

                        {/* Results */}
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="p-4 bg-muted rounded-lg">
                                <p className="text-xs text-muted-foreground">Talla Estimada (Stevenson)</p>
                                <p className="text-2xl font-bold">{cpData.estimatedHeight.toFixed(1)} cm</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Fórmula: (3.26 × {tibiaLength}) + 30.8
                                </p>
                            </div>
                            <div className={`p-4 rounded-lg ${cpData.isRisk ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                                <p className="text-xs text-muted-foreground">Riesgo Nutricional</p>
                                <div className="flex items-center gap-2 mt-1">
                                    {cpData.isRisk ? (
                                        <>
                                            <AlertTriangle className="h-5 w-5 text-red-500" />
                                            <span className="text-lg font-bold text-red-700 dark:text-red-400">EN RIESGO</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                                            <span className="text-lg font-bold text-green-700 dark:text-green-400">Normal</span>
                                        </>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Umbral: {['I', 'II'].includes(gmfcsLevel) ? 'p5' : 'p20'}
                                </p>
                            </div>
                        </div>
                    </TabsContent>

                    {/* ============ TAB: CARDIOMETABÓLICO ============ */}
                    <TabsContent value="cardio" className="space-y-4">
                        {!patientData.waist || !patientData.hip ? (
                            <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
                                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>Se requieren medidas de cintura y cadera.</p>
                                <p className="text-xs mt-2">
                                    Registra los perímetros en la evaluación antropométrica.
                                </p>
                            </div>
                        ) : cardiometabolicData && (
                            <RiskCard
                                waist={patientData.waist}
                                hip={patientData.hip}
                                height={patientData.height}
                                age={patientData.age}
                                sex={patientData.sex}
                            />
                        )}
                    </TabsContent>

                    {/* ============ TAB: % GRASA ============ */}
                    <TabsContent value="grasa" className="space-y-4">
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <div className="flex items-start gap-3">
                                <Scale className="h-5 w-5 text-orange-500 mt-0.5" />
                                <div>
                                    <h4 className="font-medium text-orange-800 dark:text-orange-300">
                                        Selector Inteligente de Grasa Corporal
                                    </h4>
                                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                        {patientData.age <= 18
                                            ? 'Usa ecuaciones de Slaughter (8-18 años)'
                                            : 'Usa Durnin & Womersley + Siri (adultos)'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {patientData.age <= 18 && (
                            <div className="space-y-2">
                                <Label>Estadío de Tanner</Label>
                                <Select
                                    value={tannerStage}
                                    onValueChange={(v) => setTannerStage(v as TannerMaturationStage)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pre-puber">Pre-púber (Tanner I)</SelectItem>
                                        <SelectItem value="puber">Púber (Tanner II-IV)</SelectItem>
                                        <SelectItem value="post-puber">Post-púber (Tanner V)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {!patientData.triceps || !patientData.subscapular ? (
                            <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
                                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>Se requieren pliegues tricipital y subescapular.</p>
                                <p className="text-xs mt-2">
                                    Registra los pliegues en la evaluación antropométrica.
                                </p>
                            </div>
                        ) : bodyFatData && (
                            <div className="p-4 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 rounded-lg">
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Porcentaje de Grasa Corporal</p>
                                    <p className="text-4xl font-bold text-orange-600">
                                        {bodyFatData.percentage.toFixed(1)}%
                                    </p>
                                    <Badge variant="outline" className="mt-2">
                                        {bodyFatData.formula}
                                    </Badge>
                                </div>
                                <div className="mt-4 text-xs text-muted-foreground text-center">
                                    <p>Método: {bodyFatData.method === 'slaughter' ? 'Slaughter (1988)' : 'Durnin & Womersley + Siri'}</p>
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                {/* Save Button */}
                {onSave && (
                    <div className="mt-6 pt-4 border-t">
                        <Button onClick={handleSave} className="w-full">
                            Guardar Evaluación Clínica
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default ClinicalEvaluationPanel;
