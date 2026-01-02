import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Plus, TestTube, Activity, AlertTriangle, Save, AlertCircle, CheckCircle, TrendingDown, TrendingUp, Link2 } from "lucide-react";
import { usePatientStore } from "@/store/usePatientStore";
import type { Paciente } from "@/types";
import { getAltitudeAdjustment } from "@/lib/anemia-nts-protocol";

interface ClinicalHistoryTabProps {
    patient: Paciente;
}

const COMMON_PATHOLOGIES = [
    "Diabetes Tipo 1",
    "Diabetes Tipo 2",
    "Hipertensión Arterial",
    "Dislipidemia",
    "Obesidad",
    "Celiaquía",
    "Enfermedad Renal Crónica",
    "Hipotiroidismo",
    "Hipertiroidismo",
    "Gastritis",
    "Reflujo GE",
    "SOP",
    "Anemia"
];

// ============================================================================
// LAB DIAGNOSTIC FUNCTIONS
// ============================================================================
type DiagnosticSeverity = 'normal' | 'precaucion' | 'alto' | 'bajo' | 'critico';

interface LabDiagnostic {
    severity: DiagnosticSeverity;
    label: string;
    message: string;
    suggestedPathology?: string; // Auto-link to pathology
}

// Glucosa Basal (en ayunas) - mg/dL
function getDiagnosticoGlucosa(value: number | undefined): LabDiagnostic | null {
    if (!value || value <= 0) return null;

    if (value < 70) {
        return { severity: 'bajo', label: 'Hipoglicemia', message: 'Valor bajo. Evaluar síntomas.' };
    } else if (value >= 70 && value < 100) {
        return { severity: 'normal', label: 'Normal', message: 'Glucemia en ayunas normal.' };
    } else if (value >= 100 && value < 126) {
        return { severity: 'precaucion', label: 'Prediabetes', message: 'Glucemia alterada en ayunas. Riesgo de diabetes.', suggestedPathology: 'Diabetes Tipo 2' };
    } else {
        return { severity: 'critico', label: 'Diabetes', message: 'Compatible con diabetes mellitus. Confirmar con HbA1c.', suggestedPathology: 'Diabetes Tipo 2' };
    }
}

// Hemoglobina - g/dL (valores varían por sexo y altitud)
function getDiagnosticoHemoglobina(value: number | undefined, sexo?: string, altitude: number = 0): LabDiagnostic | null {
    if (!value || value <= 0) return null;

    // Ajuste por altitud NTS 213-2024
    const adjustment = getAltitudeAdjustment(altitude);
    const correctedValue = value - adjustment;

    const isMale = sexo === 'masculino';
    const normalMin = isMale ? 13.0 : 12.0;

    let diag: LabDiagnostic;
    if (correctedValue < normalMin - 2) {
        diag = { severity: 'critico', label: 'Anemia Severa', message: `Hb corregida: ${correctedValue.toFixed(1)}. Valor muy bajo (<${normalMin - 2} g/dL).`, suggestedPathology: 'Anemia' };
    } else if (correctedValue < normalMin) {
        diag = { severity: 'bajo', label: 'Anemia', message: `Hb corregida: ${correctedValue.toFixed(1)}. Rango normal: >= ${normalMin} g/dL.`, suggestedPathology: 'Anemia' };
    } else if (correctedValue >= normalMin && correctedValue <= (normalMin + 5)) { // Simple range for normal
        diag = { severity: 'normal', label: 'Normal', message: `Hb corregida: ${correctedValue.toFixed(1)}. Dentro del rango normal.` };
    } else {
        diag = { severity: 'precaucion', label: 'Elevada', message: `Hb corregida: ${correctedValue.toFixed(1)}. Evaluar policitemia.` };
    }

    if (adjustment > 0) {
        diag.message += ` (Ajuste por altitud de -${adjustment} g/dL aplicado).`;
    }
    return diag;
}

// Colesterol Total - mg/dL
function getDiagnosticoColesterol(value: number | undefined): LabDiagnostic | null {
    if (!value || value <= 0) return null;

    if (value < 200) {
        return { severity: 'normal', label: 'Deseable', message: 'Colesterol total deseable (<200 mg/dL).' };
    } else if (value >= 200 && value < 240) {
        return { severity: 'precaucion', label: 'Limítrofe Alto', message: 'Riesgo cardiovascular moderado. Modificar dieta.', suggestedPathology: 'Dislipidemia' };
    } else {
        return { severity: 'alto', label: 'Alto', message: 'Riesgo cardiovascular aumentado. Evaluar tratamiento.', suggestedPathology: 'Dislipidemia' };
    }
}

// Triglicéridos - mg/dL
function getDiagnosticoTrigliceridos(value: number | undefined): LabDiagnostic | null {
    if (!value || value <= 0) return null;

    if (value < 150) {
        return { severity: 'normal', label: 'Normal', message: 'Triglicéridos normales (<150 mg/dL).' };
    } else if (value >= 150 && value < 200) {
        return { severity: 'precaucion', label: 'Limítrofe', message: 'Ligeramente elevados. Ajustar dieta y ejercicio.', suggestedPathology: 'Dislipidemia' };
    } else if (value >= 200 && value < 500) {
        return { severity: 'alto', label: 'Alto', message: 'Hipertrigliceridemia. Riesgo cardiovascular.', suggestedPathology: 'Dislipidemia' };
    } else {
        return { severity: 'critico', label: 'Muy Alto', message: 'Riesgo de pancreatitis. Tratamiento urgente.', suggestedPathology: 'Dislipidemia' };
    }
}

// HDL Colesterol - mg/dL (valores varían por sexo)
function getDiagnosticoHDL(value: number | undefined, sexo?: string): LabDiagnostic | null {
    if (!value || value <= 0) return null;

    const isMale = sexo === 'masculino';
    const lowThreshold = isMale ? 40 : 50;
    const optimalThreshold = 60;

    if (value < lowThreshold) {
        return { severity: 'bajo', label: 'Bajo', message: `HDL bajo (<${lowThreshold} mg/dL). Factor de riesgo CV.`, suggestedPathology: 'Dislipidemia' };
    } else if (value >= lowThreshold && value < optimalThreshold) {
        return { severity: 'precaucion', label: 'Aceptable', message: 'HDL aceptable pero no óptimo.' };
    } else {
        return { severity: 'normal', label: 'Óptimo', message: 'HDL óptimo (≥60 mg/dL). Efecto protector CV.' };
    }
}

// LDL Colesterol - mg/dL
function getDiagnosticoLDL(value: number | undefined): LabDiagnostic | null {
    if (!value || value <= 0) return null;

    if (value < 100) {
        return { severity: 'normal', label: 'Óptimo', message: 'LDL óptimo (<100 mg/dL).' };
    } else if (value >= 100 && value < 130) {
        return { severity: 'normal', label: 'Casi Óptimo', message: 'LDL aceptable (100-129 mg/dL).' };
    } else if (value >= 130 && value < 160) {
        return { severity: 'precaucion', label: 'Limítrofe', message: 'LDL limítrofe alto. Evaluar riesgo CV.', suggestedPathology: 'Dislipidemia' };
    } else if (value >= 160 && value < 190) {
        return { severity: 'alto', label: 'Alto', message: 'LDL alto. Modificación dietética y tratamiento.', suggestedPathology: 'Dislipidemia' };
    } else {
        return { severity: 'critico', label: 'Muy Alto', message: 'LDL muy alto (≥190 mg/dL). Alto riesgo CV.', suggestedPathology: 'Dislipidemia' };
    }
}

// Diagnostic Badge Component
function DiagnosticBadge({ diagnostic }: { diagnostic: LabDiagnostic | null }) {
    if (!diagnostic) return null;

    const severityStyles: Record<DiagnosticSeverity, { bg: string; text: string; icon: React.ReactNode }> = {
        normal: {
            bg: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
            text: 'text-green-700 dark:text-green-400',
            icon: <CheckCircle className="w-3 h-3" />
        },
        precaucion: {
            bg: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
            text: 'text-amber-700 dark:text-amber-400',
            icon: <AlertCircle className="w-3 h-3" />
        },
        alto: {
            bg: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800',
            text: 'text-orange-700 dark:text-orange-400',
            icon: <TrendingUp className="w-3 h-3" />
        },
        bajo: {
            bg: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
            text: 'text-blue-700 dark:text-blue-400',
            icon: <TrendingDown className="w-3 h-3" />
        },
        critico: {
            bg: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
            text: 'text-red-700 dark:text-red-400',
            icon: <AlertTriangle className="w-3 h-3" />
        }
    };

    const style = severityStyles[diagnostic.severity];

    return (
        <div className={`mt-2 p-2 rounded-lg border ${style.bg} ${style.text}`}>
            <div className="flex items-center gap-1.5 mb-1">
                {style.icon}
                <span className="text-xs font-semibold">{diagnostic.label}</span>
                {diagnostic.suggestedPathology && (
                    <Link2 className="w-3 h-3 ml-auto opacity-60" />
                )}
            </div>
            <p className="text-[10px] leading-tight opacity-90">{diagnostic.message}</p>
        </div>
    );
}

export function ClinicalHistoryTab({ patient }: ClinicalHistoryTabProps) {
    const { updatePatient } = usePatientStore();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Local state for editing - Access via historiaClinica
    const [pathologies, setPathologies] = useState<string[]>(patient.historiaClinica?.patologias || []);
    const [newPathology, setNewPathology] = useState("");
    const [biochem, setBiochem] = useState(patient.historiaClinica?.bioquimicaReciente || {});
    const [altitude, setAltitude] = useState<number>(patient.historiaClinica?.altitudResidencia || 0);

    // Get patient sex for sex-dependent diagnostics
    const patientSex = patient.datosPersonales?.sexo;

    // Auto-suggest pathologies based on lab values
    useEffect(() => {
        if (!isEditing) return; // Only auto-suggest when editing

        const suggestedPathologies: string[] = [];

        // Check each diagnostic for suggested pathologies
        const diagnostics = [
            getDiagnosticoGlucosa(biochem.glucosa),
            getDiagnosticoHemoglobina(biochem.hemoglobina, patientSex, altitude),
            getDiagnosticoColesterol(biochem.colesterolTotal),
            getDiagnosticoTrigliceridos(biochem.trigliceridos),
            getDiagnosticoHDL(biochem.hdl, patientSex),
            getDiagnosticoLDL(biochem.ldl)
        ];

        diagnostics.forEach(diag => {
            if (diag?.suggestedPathology && !suggestedPathologies.includes(diag.suggestedPathology)) {
                suggestedPathologies.push(diag.suggestedPathology);
            }
        });

        // Auto-add suggested pathologies that aren't already selected
        suggestedPathologies.forEach(suggested => {
            if (!pathologies.includes(suggested)) {
                setPathologies(prev => [...prev, suggested]);
            }
        });

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [biochem.glucosa, biochem.hemoglobina, biochem.colesterolTotal, biochem.trigliceridos, biochem.hdl, biochem.ldl, isEditing]);

    const togglePathology = (pathodology: string) => {
        if (pathologies.includes(pathodology)) {
            setPathologies(pathologies.filter(p => p !== pathodology));
        } else {
            setPathologies([...pathologies, pathodology]);
        }
    };

    const handlesave = async () => {
        setLoading(true);
        try {
            await updatePatient({
                historiaClinica: {
                    alergias: [],
                    medicamentos: [],
                    antecedentesFamiliares: [],
                    ...patient.historiaClinica,
                    patologias: pathologies,
                    bioquimicaReciente: biochem,
                    altitudResidencia: altitude
                }
            });
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save clinical data", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Historia Clínica & Bioquímica</h3>
                    <p className="text-sm text-slate-500">Gestión de patologías y marcadores bioquímicos</p>
                </div>
                <Button
                    onClick={() => isEditing ? handlesave() : setIsEditing(true)}
                    className={isEditing ? "bg-green-600 hover:bg-green-700" : ""}
                    disabled={loading}
                >
                    {isEditing ? (loading ? "Guardando..." : <><Save className="w-4 h-4 mr-2" /> Guardar Cambios</>) : <><Activity className="w-4 h-4 mr-2" /> Editar Datos</>}
                </Button>
            </div>

            <div className="grid md:grid-cols-12 gap-6">
                {/* Patologías - 5/12 del espacio */}
                <Card className="md:col-span-5 border-red-100 dark:border-red-900/20 bg-white dark:bg-slate-800 overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 border-b border-red-100 dark:border-red-900/20">
                        <CardTitle className="flex items-center gap-2 text-red-600">
                            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            Patologías y Condiciones
                        </CardTitle>
                        <CardDescription>
                            Condiciones que afectan la prescripción dietética.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {isEditing ? (
                            <div className="space-y-4">
                                {/* Grid de patologías comunes */}
                                <div className="grid grid-cols-2 gap-2">
                                    {COMMON_PATHOLOGIES.map(patho => {
                                        const isSelected = pathologies.includes(patho);
                                        return (
                                            <button
                                                key={patho}
                                                type="button"
                                                onClick={() => togglePathology(patho)}
                                                className={`flex items-center gap-2 p-3 rounded-lg border text-left text-sm font-medium transition-all ${isSelected
                                                    ? 'bg-red-500 border-red-500 text-white shadow-sm'
                                                    : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-white bg-white' : 'border-slate-300 dark:border-slate-500'
                                                    }`}>
                                                    {isSelected && <Check className="w-3 h-3 text-red-500" />}
                                                </div>
                                                <span className="truncate">{patho}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Input para patología personalizada */}
                                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <Label className="text-xs text-slate-500 mb-2 block">Agregar otra condición:</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Escribe y presiona Enter..."
                                            value={newPathology}
                                            onChange={(e) => setNewPathology(e.target.value)}
                                            className="flex-1"
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter' && newPathology.trim()) {
                                                    togglePathology(newPathology.trim());
                                                    setNewPathology("");
                                                }
                                            }}
                                        />
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="shrink-0"
                                            onClick={() => {
                                                if (newPathology.trim()) {
                                                    togglePathology(newPathology.trim());
                                                    setNewPathology("");
                                                }
                                            }}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="min-h-[200px] flex flex-col">
                                {pathologies.length > 0 ? (
                                    <div className="space-y-4">
                                        {/* Contador */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                                Condiciones registradas
                                            </span>
                                            <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                {pathologies.length} {pathologies.length === 1 ? 'patología' : 'patologías'}
                                            </Badge>
                                        </div>

                                        {/* Lista de patologías */}
                                        <div className="space-y-2">
                                            {pathologies.map((p, idx) => (
                                                <div
                                                    key={p}
                                                    className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-100 dark:border-red-900/30"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                                                        <AlertTriangle className="w-4 h-4 text-white" />
                                                    </div>
                                                    <span className="font-medium text-slate-800 dark:text-slate-200">{p}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Nota de advertencia */}
                                        <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                            <p className="text-xs text-amber-700 dark:text-amber-400">
                                                <strong>Nota:</strong> Considerar estas condiciones al elaborar el plan dietético.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                                        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                                            <CheckCircle className="w-8 h-8 text-green-500" />
                                        </div>
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                                            Sin patologías registradas
                                        </h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[200px]">
                                            El paciente aparentemente se encuentra sano
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Bioquímica - 7/12 del espacio */}
                <Card className="md:col-span-7 border-blue-100 dark:border-blue-900/20 bg-white dark:bg-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-600">
                            <TestTube className="w-5 h-5" />
                            Bioquímica Sanguínea
                        </CardTitle>
                        <CardDescription>
                            Marcadores clave para monitoreo metabólico.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Glucosa */}
                                <div className="space-y-2">
                                    <Label>Glucosa Basal (mg/dL)</Label>
                                    <Input
                                        type="number"
                                        disabled={!isEditing}
                                        value={biochem.glucosa || ''}
                                        onChange={(e) => setBiochem({ ...biochem, glucosa: Number(e.target.value) })}
                                    />
                                    <DiagnosticBadge diagnostic={getDiagnosticoGlucosa(biochem.glucosa)} />
                                </div>

                                {/* Hemoglobina */}
                                <div className="space-y-2">
                                    <Label>Hemoglobina (g/dL)</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        disabled={!isEditing}
                                        value={biochem.hemoglobina || ''}
                                        onChange={(e) => setBiochem({ ...biochem, hemoglobina: Number(e.target.value) })}
                                    />
                                    <DiagnosticBadge diagnostic={getDiagnosticoHemoglobina(biochem.hemoglobina, patientSex, altitude)} />
                                </div>

                                {/* Altitud */}
                                <div className="space-y-2">
                                    <Label>Altitud Residencia (m.s.n.m.)</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            disabled={!isEditing}
                                            placeholder="0"
                                            value={altitude || ''}
                                            onChange={(e) => setAltitude(Number(e.target.value))}
                                            className="pr-10"
                                        />
                                        <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium italic">msnm</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 italic">Determina el ajuste de hemoglobina.</p>
                                </div>

                                {/* Colesterol Total */}
                                <div className="space-y-2">
                                    <Label>Colesterol Total (mg/dL)</Label>
                                    <Input
                                        type="number"
                                        disabled={!isEditing}
                                        value={biochem.colesterolTotal || ''}
                                        onChange={(e) => setBiochem({ ...biochem, colesterolTotal: Number(e.target.value) })}
                                    />
                                    <DiagnosticBadge diagnostic={getDiagnosticoColesterol(biochem.colesterolTotal)} />
                                </div>

                                {/* Triglicéridos */}
                                <div className="space-y-2">
                                    <Label>Triglicéridos (mg/dL)</Label>
                                    <Input
                                        type="number"
                                        disabled={!isEditing}
                                        value={biochem.trigliceridos || ''}
                                        onChange={(e) => setBiochem({ ...biochem, trigliceridos: Number(e.target.value) })}
                                    />
                                    <DiagnosticBadge diagnostic={getDiagnosticoTrigliceridos(biochem.trigliceridos)} />
                                </div>

                                {/* HDL */}
                                <div className="space-y-2">
                                    <Label>HDL (mg/dL)</Label>
                                    <Input
                                        type="number"
                                        disabled={!isEditing}
                                        value={biochem.hdl || ''}
                                        onChange={(e) => setBiochem({ ...biochem, hdl: Number(e.target.value) })}
                                    />
                                    <DiagnosticBadge diagnostic={getDiagnosticoHDL(biochem.hdl, patientSex)} />
                                </div>

                                {/* LDL */}
                                <div className="space-y-2">
                                    <Label>LDL (mg/dL)</Label>
                                    <Input
                                        type="number"
                                        disabled={!isEditing}
                                        value={biochem.ldl || ''}
                                        onChange={(e) => setBiochem({ ...biochem, ldl: Number(e.target.value) })}
                                    />
                                    <DiagnosticBadge diagnostic={getDiagnosticoLDL(biochem.ldl)} />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

