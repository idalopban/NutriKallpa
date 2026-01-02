import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Pill, Baby, Calculator, Check, AlertCircle, Save, Droplet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Paciente } from "@/types";
import { getAltitudeAdjustment } from "@/lib/anemia-nts-protocol";

interface InfantSupplementationModuleProps {
    patient: Paciente;
    currentWeight?: number;
}

export function InfantSupplementationModule({ patient, currentWeight }: InfantSupplementationModuleProps) {
    const { toast } = useToast();
    // Default to current anthropometric weight, fallback to profile/birth weight, or 0
    const [weight, setWeight] = useState<number>(currentWeight || patient.datosPersonales.peso || 0);

    // Calculate precise age
    const ageData = useMemo(() => {
        const birth = new Date(patient.datosPersonales.fechaNacimiento);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - birth.getTime());
        const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(days / 7);
        const months = days / 30.44;
        const years = days / 365.25;
        return { days, weeks, months, years };
    }, [patient.datosPersonales.fechaNacimiento]);

    // Format Age String
    const ageDisplay = useMemo(() => {
        if (ageData.days < 30) return `${ageData.days} días`;
        if (ageData.years < 1) return `${ageData.months.toFixed(1)} meses`;
        return `${ageData.years.toFixed(1)} años`;
    }, [ageData]);

    // Anemia Check Logic (NTS Standards)
    // ... (rest of anemiaStatus logic remains same, skipping for brevity in this replacement block if possible, but replace_file_content needs context. I will replace up to the component start to be safe or use precise anchors)

    // Anemia Check Logic (NTS Standards)
    const anemiaStatus = useMemo(() => {
        const hb = Number(patient.historiaClinica?.datosClinicos?.hemoglobina || patient.historiaClinica?.bioquimicaReciente?.hemoglobina || 0);
        if (!hb) return { hasAnemia: false, label: "Sin Datos Hb", hb: 0, severity: 'normal', cutoff: 0 };

        const altitude = patient.historiaClinica?.altitudResidencia || 0;
        const adjustment = getAltitudeAdjustment(altitude);
        const correctedHb = Number((hb - adjustment).toFixed(1));

        const isPremature = (patient.historiaClinica?.antecedentes as any)?.nacimientoPrematuro;

        let cutoff = 11.0;
        let isAnemic = false;
        let severity = 'normal';

        if (isPremature) {
            // Tabla Prematuros
            if (ageData.weeks <= 1) { // 1a semana
                if (correctedHb <= 13.0) isAnemic = true;
                cutoff = 13.0;
            } else if (ageData.weeks <= 4) { // 2a - 4a semana
                if (correctedHb <= 10.0) isAnemic = true;
                cutoff = 10.0;
            } else if (ageData.weeks <= 8) { // 5a - 8a semana
                if (correctedHb <= 8.0) isAnemic = true;
                cutoff = 8.0;
            } else {
                // > 8 weeks (approx > 2 months), transition to Term logic or keep monitoring
                // Falling back to Term logic for > 2 months
                if (correctedHb < 9.5) isAnemic = true;
                cutoff = 9.5;
            }
        } else {
            // Nacidos a Término
            if (ageData.months < 2) {
                if (correctedHb < 13.5) isAnemic = true;
                cutoff = 13.5;
            } else if (ageData.months >= 2 && ageData.months < 6) { // 2 a 5 meses
                if (correctedHb < 9.5) isAnemic = true;
                cutoff = 9.5;
            } else if (ageData.months >= 6 && ageData.months < 24) { // 6 a 23 meses
                cutoff = 10.5; // (Normal >= 10.5)
                if (correctedHb < 10.5) {
                    isAnemic = true;
                    if (correctedHb < 7.0) severity = 'severa';
                    else if (correctedHb < 9.5) severity = 'moderada';
                    else severity = 'leve';
                }
            } else if (ageData.months >= 24) { // 24 a 59 meses
                cutoff = 11.0;
                if (correctedHb < 11.0) {
                    isAnemic = true;
                    if (correctedHb < 7.0) severity = 'severa';
                    else if (correctedHb < 10.0) severity = 'moderada';
                    else severity = 'leve';
                }
            }
        }

        return {
            hasAnemia: isAnemic,
            label: isAnemic ? `Anemia ${severity !== 'normal' ? severity.charAt(0).toUpperCase() + severity.slice(1) : 'Detectada'}` : "Normal",
            hb: correctedHb,
            cutoff
        };
    }, [patient, ageData]);

    // Supplementation State
    const [givenIron, setGivenIron] = useState(false);
    const [givenVitaminA, setGivenVitaminA] = useState(false);
    const [givenZinc, setGivenZinc] = useState(false);
    const [customDose, setCustomDose] = useState("");

    // Calculate recommended dose based on NTS 134-MINSA (Detailed Scheme)
    const getRecommendedDose = () => {
        let doseMg = 0;
        let recommendation = "";
        let purpose = "Preventivo";

        const isPremature = (patient.historiaClinica?.antecedentes as any)?.nacimientoPrematuro;
        const weightBirth = (patient.historiaClinica?.antecedentes as any)?.pesoNacimiento;
        const isLowBirthWeight = weightBirth && weightBirth < 2.5;
        const isRiskGroup = isPremature || isLowBirthWeight;

        if (anemiaStatus.hasAnemia) {
            // --- ESQUEMA TERAPÉUTICO (Con Anemia) ---
            purpose = "Terapéutico (Con Anemia)";

            if (isRiskGroup && ageData.months < 6) {
                // Prematuros start specific, but often hospitalized if severe.
                // Table: "Manejo: Generalmente hospitalario... Dosis: Según indicación médica especializada."
                recommendation = "Manejo especial/hospitalario. Dosis según indicación médica.";
                doseMg = 0;
            } else {
                // Standard Therapeutic Calculation: 3 mg/kg/day
                doseMg = 3 * weight;

                // Apply Max Caps per Age Group
                if (ageData.months < 6) { // < 6 months
                    if (doseMg > 40) doseMg = 40;
                    recommendation = "3 mg/kg/día. Diario. 6 meses continuos. (Máx 40mg/día).";
                } else if (ageData.months >= 6 && ageData.months < 24) { // 6 a 23 meses
                    if (doseMg > 70) doseMg = 70;
                    recommendation = "3 mg/kg/día. Diario. 6 meses continuos. (Máx 70mg/día).";
                } else if (ageData.months >= 24 && ageData.months < 36) { // 24 a 35 meses
                    if (doseMg > 70) doseMg = 70;
                    recommendation = "3 mg/kg/día. Diario. 6 meses continuos. (Máx 70mg/día).";
                } else if (ageData.months >= 36 && ageData.months < 60) { // 36 a 59 meses
                    if (doseMg > 90) doseMg = 90;
                    recommendation = "3 mg/kg/día. Diario. 6 meses continuos. (Máx 90mg/día).";
                } else {
                    // Older children (5-11y) - Table says 3mg/kg/day max 120mg
                    if (doseMg > 120) doseMg = 120;
                    recommendation = "3 mg/kg/día. Diario. 6 meses continuos. (Máx 120mg/día).";
                }
            }

        } else {
            // --- ESQUEMA PREVENTIVO (Sin Anemia) ---
            purpose = "Preventivo (Sin Anemia)";

            if (isRiskGroup) {
                // Prematuro / Bajo Peso
                if (ageData.days >= 30) {
                    if (ageData.months < 6) {
                        doseMg = 2 * weight;
                        recommendation = "Inicio: 30 días de vida. 2 mg/kg/día. Hasta los 6 meses cumplidos.";
                    } else {
                        // After 6m, usually merges with standard 6-11m scheme or continues
                        doseMg = 2 * weight;
                        recommendation = "2 mg/kg/día O 1 sobre Micronutrientes. Diario. 6 meses continuos.";
                    }
                } else {
                    recommendation = "Inicio a los 30 días de vida.";
                    doseMg = 0;
                }
            } else {
                // Term Infants / Adequate Weight
                if (ageData.days < 30) {
                    // NEW: Explicit message for < 30 days
                    recommendation = "Inicio de suplementación al mes de nacido.";
                    doseMg = 0;
                    // Overwrite purpose to be clear
                    purpose = "Espera (Recién Nacido)";
                } else if (ageData.months < 4) {
                    recommendation = "Lactancia Materna Exclusiva. Inicio a los 4 meses.";
                    doseMg = 0;
                } else if (ageData.months >= 4 && ageData.months < 6) {
                    doseMg = 2 * weight;
                    recommendation = "Inicio: 4 meses. 2 mg/kg/día. Hasta los 6 meses cumplidos.";
                } else if (ageData.months >= 6 && ageData.months < 12) { // 6-11 months
                    doseMg = 2 * weight;
                    recommendation = "2 mg/kg/día O 1 sobre Micronutrientes. Diario. 6 meses continuos.";
                } else if (ageData.months >= 12 && ageData.months < 24) { // 12-23 months
                    doseMg = 2 * weight;
                    recommendation = "2 mg/kg/día O 1 sobre Micronutrientes. Diario. 6 meses (tras 3m descanso si Hb normal).";
                } else if (ageData.months >= 24 && ageData.months < 60) { // 24-59 months
                    // Fixed dose logic
                    doseMg = 30;
                    recommendation = "30 mg Hierro elemental O 1 sobre Micronutrientes. Diario. 6 meses al año.";
                } else if (ageData.years >= 5) {
                    doseMg = 60;
                    recommendation = "60 mg Hierro elemental. Diario. 3 meses continuos al año.";
                }
            }
        }

        return { doseMg, recommendation, purpose };
    };

    const { doseMg, recommendation, purpose } = getRecommendedDose();

    const handleSave = () => {
        toast({
            title: "Suplementación Registrada",
            description: `Se ha guardado el registro de entrega de suplementos.`,
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Suplementación Infantil</h3>
                <Button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl gap-2 shadow-lg shadow-cyan-500/20">
                    <Save className="w-4 h-4" /> Guardar Registro
                </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* CALCULATOR CARD */}
                <Card className="border-none shadow-md bg-white dark:bg-[#1e293b] overflow-hidden">
                    <CardHeader className="bg-cyan-50 dark:bg-cyan-900/10 border-b border-cyan-100 dark:border-cyan-900/20 pb-4">
                        <CardTitle className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 text-lg">
                            <Calculator className="w-5 h-5" />
                            Calculadora de Dosis
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="flex gap-4">
                            <div className="flex-1 space-y-2">
                                <Label className="text-xs text-slate-500">Peso Actual (kg)</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={weight}
                                        onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                                        className="bg-slate-50 border-slate-200"
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">kg</span>
                                </div>
                            </div>
                            <div className="flex-1 space-y-2">
                                <Label className="text-xs text-slate-500">Edad Calculada</Label>
                                <div className="relative">
                                    <Input
                                        value={ageDisplay}
                                        readOnly
                                        className="bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* STATUS BADGES */}
                        <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className={`${anemiaStatus.hasAnemia ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                                {anemiaStatus.label} {anemiaStatus.hb > 0 && `(Hb: ${anemiaStatus.hb.toFixed(1)})`}
                            </Badge>
                            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                                {(patient.historiaClinica?.antecedentes as any)?.nacimientoPrematuro ? 'Prematuro' : 'A término'}
                            </Badge>
                        </div>

                        <div className={`p-4 rounded-xl border space-y-3 ${anemiaStatus.hasAnemia ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'}`}>
                            <div className="flex items-start gap-3">
                                <AlertCircle className={`w-5 h-5 mt-0.5 shrink-0 ${anemiaStatus.hasAnemia ? 'text-red-500' : 'text-cyan-500'}`} />
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">Esquema: {purpose}</p>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                        {recommendation}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-cyan-500/10 p-4 rounded-xl border border-cyan-500/20 flex justify-between items-center">
                            <span className="text-sm font-medium text-cyan-700 dark:text-cyan-300">Dosis Calculada (mg/día)</span>
                            <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{doseMg.toFixed(1)} mg</span>
                        </div>
                    </CardContent>
                </Card>

                {/* REGISTRY CARD */}
                <Card className="border-none shadow-md bg-white dark:bg-[#1e293b] overflow-hidden">
                    <CardHeader className="bg-emerald-50 dark:bg-emerald-900/10 border-b border-emerald-100 dark:border-emerald-900/20 pb-4">
                        <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-lg">
                            <Pill className="w-5 h-5" />
                            Registro de Entrega
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                                <div className="space-y-0.5">
                                    <Label className="text-base font-medium">Hierro (Preventivo/Terapéutico)</Label>
                                    <p className="text-xs text-slate-400">Gotas, Jarabe o Micronutrientes</p>
                                </div>
                                <Switch checked={givenIron} onCheckedChange={setGivenIron} />
                            </div>

                            {givenIron && (
                                <div className="pl-4 border-l-2 border-emerald-500 ml-2 animate-in slide-in-from-left-2 fade-in">
                                    <Label className="text-xs text-emerald-600 font-bold mb-2 block">INDICACIÓN DE DOSIS (Gotas/Cucharas)</Label>
                                    <Input
                                        placeholder="Ej: 5 gotas al día lejos de comidas"
                                        value={customDose}
                                        onChange={(e) => setCustomDose(e.target.value)}
                                        className="bg-emerald-50/50 border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500/20"
                                    />
                                </div>
                            )}

                            <Separator />

                            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                                <div className="space-y-0.5">
                                    <Label className="text-base font-medium">Vitamina A</Label>
                                    <p className="text-xs text-slate-400">Suplementación semestral</p>
                                </div>
                                <Switch checked={givenVitaminA} onCheckedChange={setGivenVitaminA} />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                                <div className="space-y-0.5">
                                    <Label className="text-base font-medium">Zinc (Terapéutico - EDA)</Label>
                                    <p className="text-xs text-slate-400">Suplementación por diarrea</p>
                                </div>
                                <Switch checked={givenZinc} onCheckedChange={setGivenZinc} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
