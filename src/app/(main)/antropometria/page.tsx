"use client";

import { useState, useEffect, Suspense, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getPacientes, getPacientesAsync, getMedidasByPaciente, getMedidasByPacienteAsync, deleteMedida, saveMedidas } from "@/lib/storage";
import { saveEvaluation } from "@/actions/anthropometry-actions";
import { createPatient } from "@/actions/patient-actions";
import { calculateBodyComposition } from "@/lib/bodyCompositionMath";
import { useToast } from "@/hooks/use-toast";
import { FullMeasurementData } from "@/components/antropometria/UnifiedMeasurementForm";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Users, ArrowRight, BookOpen, Activity, RotateCcw } from "lucide-react";
import type { Paciente, MedidasAntropometricas } from "@/types";
import { useAuthStore } from "@/store/useAuthStore";
import { usePatientStore } from "@/store/usePatientStore";
import { PatientAgeBadge } from "@/components/patient/PatientAgeBadge";
import { PatientAvatar } from "@/components/patient/PatientAvatar";
import { getClinicalContextByAge } from "@/lib/clinical-calculations";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// New Hooks & Layouts
import { useLifeStage } from "@/hooks/useLifeStage";
import { InfantAnthropometryLayout } from "@/components/antropometria/layouts/InfantAnthropometryLayout";
import { PreschoolAnthropometryLayout } from "@/components/antropometria/layouts/PreschoolAnthropometryLayout";
import { SchoolAnthropometryLayout } from "@/components/antropometria/layouts/SchoolAnthropometryLayout";
import { AdultAnthropometryLayout } from "@/components/antropometria/layouts/AdultAnthropometryLayout";
import { ElderlyAnthropometryLayout } from "@/components/antropometria/layouts/ElderlyAnthropometryLayout";
import type { PediatricMeasurementData } from "@/components/pediatrics/NewPediatricMeasurementForm";

function AntropometriaContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuthStore();
    const { toast } = useToast();

    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [selectedPacienteId, setSelectedPacienteId] = useState<string | null>(null);
    const [medidas, setMedidas] = useState<MedidasAntropometricas[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [patientSearch, setPatientSearch] = useState("");
    const [ageRangeFilter, setAgeRangeFilter] = useState("all");
    const [isPending, startTransition] = useTransition();
    const isSubmitting = isPending; // Alias for backward compatibility

    // Filter and sort patients
    const processedPatients = pacientes
        .filter((p: Paciente) => {
            // Search filter
            const fullName = `${p.datosPersonales.nombre} ${p.datosPersonales.apellido}`.toLowerCase();
            const matchesSearch = !patientSearch || fullName.includes(patientSearch.toLowerCase());

            // Age range filter
            let matchesAge = true;
            if (ageRangeFilter !== "all") {
                const { context } = getClinicalContextByAge(p.datosPersonales.fechaNacimiento);
                matchesAge = context === ageRangeFilter;
            }

            return matchesSearch && matchesAge;
        })
        .sort((a: Paciente, b: Paciente) => {
            // Sort by createdAt descending (most recent first)
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });

    useEffect(() => {
        async function loadData() {
            // Wait for user authentication before loading data
            if (!user?.id) {
                // Still waiting for AuthGuard to restore session
                return;
            }

            setIsLoading(true);
            try {
                const data = await getPacientesAsync(user.id);
                setPacientes(data);

                const paramId = searchParams.get("id");
                if (paramId) setSelectedPacienteId(paramId);
            } catch (error) {
                console.error("Error loading patients in Antropometria:", error);
                // Fallback to local storage
                setPacientes(getPacientes(user.id));
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [user?.id, searchParams]);


    useEffect(() => {
        async function loadMedidas() {
            if (selectedPacienteId) {
                const data = await getMedidasByPacienteAsync(selectedPacienteId);
                setMedidas(data);
            } else {
                setMedidas([]);
            }
        }
        loadMedidas();
    }, [selectedPacienteId]);

    const handlePacienteChange = (id: string) => {
        setSelectedPacienteId(id);
        window.history.pushState({}, "", `?id=${id}`);
    };

    const selectedPaciente = pacientes.find(p => p.id === selectedPacienteId);

    // Life Stage Hook
    const birthDateStr = selectedPaciente?.datosPersonales.fechaNacimiento
        ? (typeof selectedPaciente.datosPersonales.fechaNacimiento === 'string'
            ? selectedPaciente.datosPersonales.fechaNacimiento
            : new Date(selectedPaciente.datosPersonales.fechaNacimiento).toISOString())
        : undefined;

    const { stage, isTeenager } = useLifeStage(selectedPaciente?.datosPersonales.fechaNacimiento);

    // --- HANDLERS ---

    // 1. Handle Save for Adult/Elderly (FullMeasurementData)
    // Now accepts 'result' from the child form to ensure WYSIWYG
    // 1. Handle Save for Adult/Elderly (FullMeasurementData)
    // Now accepts 'result' from the child form to ensure WYSIWYG
    const handleSaveFull = (data: FullMeasurementData, formula?: string, result?: any) => {
        console.log("DEBUG: handleSaveFull called", { formula, resultHasValue: !!result, resultFat: result?.fatPercent });

        if (!selectedPacienteId || !user || !selectedPaciente || isSubmitting) return;

        startTransition(async () => {
            try {
                // --- STRICT VALIDATION LAYER (ZOD) ---
                const { anthropometrySchema } = await import("@/lib/schemas/anthropometry-validation");
                const validation = anthropometrySchema.safeParse(data);

                if (!validation.success) {
                    const firstIssue = validation.error.issues[0];
                    const errorMsg = firstIssue?.message || "Datos inválidos";
                    const field = firstIssue?.path.join(".") || "Medición";

                    toast({
                        title: "Error en " + field,
                        description: errorMsg,
                        variant: "destructive"
                    });
                    return;
                }

                const skinfoldData = {
                    triceps: data.skinfolds.triceps,
                    subscapular: data.skinfolds.subscapular,
                    biceps: data.skinfolds.biceps,
                    iliac_crest: data.skinfolds.iliac_crest,
                    supraspinale: data.skinfolds.supraspinale,
                    abdominal: data.skinfolds.abdominal,
                    thigh: data.skinfolds.thigh,
                    calf: data.skinfolds.calf
                };

                // Calculate fallback composition ONLY if no result passed from UI
                // This preserves the "What You See Is What You Get" principle
                let composition;
                if (!result || !result.isValid) {
                    const { calculateBodyComposition } = await import("@/lib/bodyCompositionMath");
                    composition = calculateBodyComposition((formula as any) || 'general', data.bioData.genero === 'masculino' ? 'male' : 'female', skinfoldData, data.bioData.peso);
                }

                const tallaMetros = data.bioData.talla / 100;
                const imc = tallaMetros > 0 ? data.bioData.peso / (tallaMetros * tallaMetros) : 0;

                // Determine final values (Priority: Result from UI > Calculated Fallback)
                const finalFatPercent = result?.isValid ? result.fatPercent : (composition?.isValid ? composition?.fatPercent : undefined);
                const finalMuscleKg = result?.isValid ? result.leanMassKg : (composition?.isValid ? composition?.leanMassKg : undefined);

                const nuevaMedida: MedidasAntropometricas = {
                    id: crypto.randomUUID(),
                    pacienteId: selectedPacienteId,
                    fecha: new Date().toISOString(),
                    tipoPaciente: (formula as any) || (stage === 'elderly' ? 'adulto_mayor' : 'adulto'),
                    peso: data.bioData.peso,
                    talla: data.bioData.talla,
                    tallaSentado: data.bioData.sittingHeight,
                    edad: data.bioData.edad,
                    sexo: data.bioData.genero,
                    imc: Math.round(imc * 100) / 100,
                    porcentajeGrasa: finalFatPercent,
                    pliegues: { ...skinfoldData },
                    perimetros: {
                        brazoRelajado: data.girths.brazoRelajado,
                        brazoFlex: data.girths.brazoFlexionado,
                        cintura: data.girths.cintura,
                        pantorrilla: data.girths.pantorrilla,
                    },
                    diametros: {
                        humero: data.breadths.humero,
                        femur: data.breadths.femur,
                        biacromial: data.breadths.biacromial,
                        biiliocristal: data.breadths.biiliocristal,
                        biestiloideo: data.breadths.biestiloideo
                    }
                };

                // ATOMIC SYNC STRATEGY: Supabase First
                // First ensure patient exists
                if (selectedPaciente) await createPatient(selectedPaciente);

                // Save to Remote
                const remoteResult = await saveEvaluation(nuevaMedida, {
                    bodyFatPercent: finalFatPercent,
                    muscleMassKg: finalMuscleKg
                });

                if (!remoteResult.success) {
                    throw new Error(remoteResult.error || "Error al sincronizar con el servidor");
                }

                // If remote success, persist locally (Source of Truth)
                saveMedidas(nuevaMedida);
                usePatientStore.getState().addMedidas(nuevaMedida);
                setMedidas(prev => [nuevaMedida, ...prev]);

                toast({ title: "Evaluación Guardada", description: `Datos registrados correctamente. (Grasa: ${finalFatPercent}%)`, className: "bg-green-500 text-white border-none" });
            } catch (error: any) {
                console.error("[handleSaveFull] FAILED:", error);
                toast({ title: "Error de Persistencia", description: error.message || "No se pudo guardar la evaluación.", variant: "destructive" });
            }
        });
    };

    // 2. Handle Save for Pediatric/Infant
    const handleSavePediatric = (data: PediatricMeasurementData) => {
        // Note: Removed !user check - RLS validates ownership at database level
        if (!selectedPacienteId || !selectedPaciente || isSubmitting) return;

        startTransition(async () => {
            try {
                const newMedida: MedidasAntropometricas = {
                    id: crypto.randomUUID(),
                    pacienteId: selectedPacienteId,
                    fecha: data.dateRecorded.toISOString(),
                    peso: data.weightKg,
                    talla: data.heightCm,
                    edad: Math.floor(data.ageInMonths / 12),
                    sexo: selectedPaciente.datosPersonales.sexo || 'masculino',
                    imc: data.weightKg / Math.pow(data.heightCm / 100, 2),
                    headCircumference: data.headCircumferenceCm || undefined,
                    tipoPaciente: 'pediatrico',
                    pliegues: { triceps: 0, subscapular: 0, biceps: 0, iliac_crest: 0, supraspinale: 0, abdominal: 0, thigh: 0, calf: 0 },
                    perimetros: {
                        brazoRelajado: 0,
                        brazoFlex: 0,
                        cintura: 0,
                        musloMedio: 0,
                        pantorrilla: 0,
                        headCircumference: data.headCircumferenceCm || undefined
                    },
                    diametros: { humero: 0, femur: 0, biacromial: 0, biiliocristal: 0 }
                };

                // Supabase first
                if (selectedPaciente) await createPatient(selectedPaciente);
                const remoteResult = await saveEvaluation(newMedida);

                if (!remoteResult.success) {
                    throw new Error(remoteResult.error || "Error al sincronizar con el servidor");
                }

                saveMedidas(newMedida);
                setMedidas(prev => [newMedida, ...prev]);
                toast({ title: "Evaluación Pediátrica Guardada", description: "Datos registrados correctamente.", className: "bg-green-500 text-white border-none" });
            } catch (error: any) {
                console.error("[handleSavePediatric] FAILED:", error);
                toast({ title: "Error de Persistencia", description: error.message || "No se pudo guardar la evaluación pediátrica.", variant: "destructive" });
            }
        });
    };

    const handleDeleteMedida = (id: string) => {
        deleteMedida(id);
        if (selectedPacienteId) {
            setMedidas(getMedidasByPaciente(selectedPacienteId));
        }
    };

    const ultimaMedida = medidas.length > 0 ? medidas[0] : null;

    if (isLoading && !pacientes.length) {
        return <div className="flex items-center justify-center h-screen"><Activity className="w-10 h-10 text-[#ff8508] animate-pulse" /></div>;
    }

    return (
        <div className="min-h-screen bg-background pb-20 md:pb-0">
            {/* HEADER */}
            <div className="border-b border-slate-100 dark:border-slate-800 bg-background sticky top-0 z-30">
                <div className="container mx-auto px-4 md:px-6 py-4 md:py-0 md:h-20 flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-[1600px]">
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Evaluación <span className="text-[#ff8508]">Antropométrica</span>
                        </h1>
                        <p className="text-sm text-slate-400">Evaluación paso a paso</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
                        {!selectedPaciente ? (
                            <>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-500 whitespace-nowrap hidden lg:inline">Rango Etario:</span>
                                    <Select value={ageRangeFilter} onValueChange={setAgeRangeFilter}>
                                        <SelectTrigger className="w-[160px] h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm focus:ring-[#ff8508] focus:border-[#ff8508]">
                                            <SelectValue placeholder="Todos los rangos" />
                                        </SelectTrigger>
                                        <SelectContent align="end" className="rounded-xl border-slate-200 dark:border-slate-700">
                                            <SelectItem value="all">Todos los rangos</SelectItem>
                                            <SelectItem value="lactante">Lactantes</SelectItem>
                                            <SelectItem value="pediatrico">Pediátricos</SelectItem>
                                            <SelectItem value="adulto">Adultos</SelectItem>
                                            <SelectItem value="adulto_mayor">Adultos Mayores</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-full md:w-[300px] relative">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Buscar paciente..."
                                        className="w-full h-11 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:border-[#ff8508] transition-colors focus:ring-[#ff8508] focus:border-[#ff8508] pl-10 pr-4 text-slate-600 dark:text-slate-300 outline-none"
                                        value={patientSearch}
                                        onChange={(e) => setPatientSearch(e.target.value)}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                <PatientAvatar
                                    patient={selectedPaciente}
                                    className="h-8 w-8"
                                />
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                    {selectedPaciente.datosPersonales.nombre} {selectedPaciente.datosPersonales.apellido}
                                </span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 ml-2 text-slate-400 hover:text-red-500" onClick={() => setSelectedPacienteId(null)}>
                                    <RotateCcw className="w-3 h-3" />
                                </Button>
                            </div>
                        )}
                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2" />
                        <Button variant="outline" className="h-11 rounded-xl" onClick={() => router.push('/antropometria/formulas')}>
                            <BookOpen className="w-4 h-4 mr-2" /> Formulas
                        </Button>
                        <Button variant="secondary" size="icon" className="h-11 w-11 rounded-xl" onClick={() => router.push('/pacientes/nuevo')}>
                            <PlusCircle className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto p-4 md:p-6 max-w-[1600px]">
                {!selectedPaciente ? (
                    // DIRECTORY
                    <div className="animate-in fade-in duration-300">
                        {pacientes.length > 0 ? (
                            <div className="grid gap-3">
                                {processedPatients.map(p => (
                                    <div key={p.id} className="group flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-[#ff8508]/50 hover:shadow-md transition-all cursor-pointer" onClick={() => handlePacienteChange(p.id)}>
                                        <div className="flex items-center gap-4">
                                            <PatientAvatar
                                                patient={p}
                                                className="h-12 w-12 group-hover:border-[#ff8508]/20"
                                            />
                                            <div>
                                                <h3 className="font-semibold text-slate-800 dark:text-white group-hover:text-[#ff8508] transition-colors">
                                                    {p.datosPersonales.nombre} {p.datosPersonales.apellido}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <PatientAgeBadge birthDate={p.datosPersonales.fechaNacimiento} className="text-[10px] px-1.5 py-0" />
                                                </div>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#ff8508]" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                                <h3 className="text-xl font-medium text-slate-900 dark:text-white">No hay pacientes</h3>
                                <Button className="mt-4" onClick={() => router.push('/pacientes/nuevo')}>Agregar Paciente</Button>
                            </div>
                        )}
                    </div>
                ) : (
                    // SELECTED PATIENT CONTENT
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {stage === 'infant' && (
                            <InfantAnthropometryLayout
                                patientId={selectedPacienteId!}
                                patientName={`${selectedPaciente.datosPersonales.nombre} ${selectedPaciente.datosPersonales.apellido}`}
                                patientBirthDate={birthDateStr || ''}
                                patientSex={selectedPaciente.datosPersonales.sexo === 'femenino' ? 'femenino' : 'masculino'}
                                initialWeight={ultimaMedida?.peso || selectedPaciente.datosPersonales.peso}
                                initialHeight={ultimaMedida?.talla || selectedPaciente.datosPersonales.talla}
                                initialHeadCircumference={ultimaMedida?.headCircumference}
                                medidas={medidas}
                                onSave={handleSavePediatric}
                                onDeleteMedida={handleDeleteMedida}
                            />
                        )}
                        {stage === 'preschool' && (
                            <PreschoolAnthropometryLayout
                                patientId={selectedPacienteId!}
                                patientName={`${selectedPaciente.datosPersonales.nombre} ${selectedPaciente.datosPersonales.apellido}`}
                                patientBirthDate={birthDateStr || ''}
                                patientSex={selectedPaciente.datosPersonales.sexo === 'femenino' ? 'femenino' : 'masculino'}
                                medidas={medidas}
                                onSavePediatric={(data) => handleSavePediatric(data)}
                                onSaveAdult={handleSaveFull}
                                onDeleteMedida={handleDeleteMedida}
                                initialWeight={selectedPaciente?.datosPersonales.peso || 0}
                                initialHeight={selectedPaciente?.datosPersonales.talla || 0}
                            />
                        )}
                        {stage === 'school' && (
                            <SchoolAnthropometryLayout
                                patientId={selectedPacienteId!}
                                patientName={`${selectedPaciente.datosPersonales.nombre} ${selectedPaciente.datosPersonales.apellido}`}
                                patientBirthDate={birthDateStr || ''}
                                patientSex={selectedPaciente.datosPersonales.sexo === 'femenino' ? 'femenino' : 'masculino'}
                                medidas={medidas}
                                onSavePediatric={(data) => handleSavePediatric(data)}
                                onSaveAdult={handleSaveFull}
                                onDeleteMedida={handleDeleteMedida}
                                isTeenager={isTeenager}
                                initialWeight={selectedPaciente?.datosPersonales.peso || 0}
                                initialHeight={selectedPaciente?.datosPersonales.talla || 0}
                            />
                        )}
                        {stage === 'adult' && (
                            <AdultAnthropometryLayout
                                patientName={`${selectedPaciente.datosPersonales.nombre} ${selectedPaciente.datosPersonales.apellido}`}
                                patientGender={selectedPaciente.datosPersonales.sexo === 'femenino' ? 'femenino' : 'masculino'}
                                patientBirthDate={birthDateStr}
                                initialWeight={selectedPaciente?.datosPersonales.peso || 0}
                                initialHeight={selectedPaciente?.datosPersonales.talla || 0}
                                medidas={medidas}
                                onSave={handleSaveFull}
                                onDeleteMedida={handleDeleteMedida}
                                patientId={selectedPacienteId!}
                            />
                        )}
                        {stage === 'elderly' && (
                            <ElderlyAnthropometryLayout
                                patientId={selectedPacienteId!}
                                patientName={`${selectedPaciente.datosPersonales.nombre} ${selectedPaciente.datosPersonales.apellido}`}
                                patientBirthDate={birthDateStr || ''}
                                patientSex={selectedPaciente.datosPersonales.sexo === 'femenino' ? 'femenino' : 'masculino'}
                                initialWeight={selectedPaciente.datosPersonales.peso}
                                initialHeight={selectedPaciente.datosPersonales.talla}
                                medidas={medidas}
                                onSave={handleSaveFull}
                                onDeleteMedida={handleDeleteMedida}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AntropometriaPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen"><Activity className="w-8 h-8 text-[#ff8508] animate-spin" /></div>}>
            <AntropometriaContent />
        </Suspense>
    );
}