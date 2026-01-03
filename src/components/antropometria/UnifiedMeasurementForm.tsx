"use client";

import React, { useState, useRef, useMemo } from "react";
import {
    ChevronDown, User as UserIcon, Layers, Circle,
    Maximize2, Info, UserRound, AlertTriangle,
    CheckCircle2, Ruler, Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { estimateWeightChumlea, estimateHeightFromKnee } from "@/lib/clinical-calculations";
import { getIsakTooltip } from "@/lib/measurementsData";

import { LoadLastMeasurementButton } from "./LoadLastMeasurementButton";
import { IsakInput, SKINFOLD_FIELD_MAP, IsakInputProps } from "./ui/IsakInput";

// ==========================================
// TYPES & SCHEMAS (🛡️ El Paranoico)
// ==========================================

export const bioDataSchema = z.object({
    peso: z.number().min(0),
    talla: z.number().min(0),
    edad: z.number().min(0),
    genero: z.enum(['masculino', 'femenino']),
    sittingHeight: z.number().optional(),
    usarEstimacion: z.boolean().optional(),
    alturaRodilla: z.number().optional(),
    circunferenciaPantorrilla: z.number().optional(),
    circunferenciaBrazo: z.number().optional(),
    pliegueSubescapular: z.number().optional(),
});

export interface BioData extends z.infer<typeof bioDataSchema> { }

export interface SkinfoldData {
    triceps: number;
    subscapular: number;
    biceps: number;
    iliac_crest: number;
    supraspinale: number;
    abdominal: number;
    thigh: number;
    calf: number;
}

export interface GirthData {
    brazoRelajado: number;
    brazoFlexionado: number;
    cintura: number;
    musloMedio: number;
    pantorrilla: number;
}

export interface BreadthData {
    humero: number;
    femur: number;
    biacromial: number;
    biiliocristal: number;
    biestiloideo: number;
}

export interface FullMeasurementData {
    bioData: BioData;
    skinfolds: SkinfoldData;
    girths: GirthData;
    breadths: BreadthData;
}

interface UnifiedFormProps {
    data: FullMeasurementData;
    onUpdate: (data: Partial<FullMeasurementData>) => void;
    patientId?: string | null;
    evaluationLevel?: 'basic' | 'intermediate' | 'advanced';
}

// ==========================================
// SHARED COMPONENTS (🏗️ El Arquitecto)
// ==========================================

/**
 * Accordion Section (v2.0)
 * Replaces old useEffect/setTimeout with Framer Motion.
 */
const AccordionSection = React.memo(({
    title,
    icon: Icon,
    color,
    isOpen,
    onToggle,
    children,
    badge
}: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    badge?: string;
}) => {
    return (
        <div className="border-b border-slate-100 dark:border-slate-800 last:border-b-0 overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                        <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex flex-col items-start">
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{title}</span>
                        {badge && (
                            <span className="text-[10px] text-[#6cba00] font-bold animate-in fade-in slide-in-from-left-1">
                                {badge}
                            </span>
                        )}
                    </div>
                </div>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                </motion.div>
            </button>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                        className="overflow-hidden"
                    >
                        <div className="p-5 pt-0">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

AccordionSection.displayName = "AccordionSection";

// ==========================================
// FORM COMPONENTS (🎨 El Esteta & 🛡️ El Paranoico)
// ==========================================

// InputField has been extracted to ./ui/IsakInput.tsx

export function UnifiedMeasurementForm({
    data,
    onUpdate,
    patientId,
    evaluationLevel = 'advanced'
}: UnifiedFormProps) {
    const [openSection, setOpenSection] = useState<string>('bioData');
    const [lastLoadedDate, setLastLoadedDate] = useState<Date | null>(null);

    const toggleSection = (section: string) => {
        setOpenSection(openSection === section ? '' : section);
    };

    // Cálculos Derivados (🧬 Dr. Science)
    const skinfoldSum = useMemo(() => Object.values(data.skinfolds).reduce((a, b) => a + b, 0), [data.skinfolds]);
    const skinfoldCount = useMemo(() => Object.values(data.skinfolds).filter(v => v > 0).length, [data.skinfolds]);

    const handleMeasurementLoaded = (values: Record<string, number | undefined>, record: any) => {
        // Saneamiento y Mapeo Seguro (🛡️ El Paranoico)
        const newData: FullMeasurementData = {
            bioData: {
                ...data.bioData,
                sittingHeight: values.sittingHeight || 0
            },
            skinfolds: {
                triceps: values.triceps || 0,
                subscapular: values.subescapular || 0,
                biceps: values.biceps || 0,
                iliac_crest: values.crestaIliaca || 0,
                supraspinale: values.supraespinal || 0,
                abdominal: values.abdominal || 0,
                thigh: values.musloFrontal || 0,
                calf: values.pantorrillaMedial || 0
            },
            girths: {
                brazoRelajado: values.brazoRelajado || 0,
                brazoFlexionado: values.brazoFlexionado || 0,
                cintura: values.cintura || 0,
                musloMedio: values.musloMedio || 0,
                pantorrilla: values.pantorrillaMaxima || 0
            },
            breadths: {
                humero: values.humero || 0,
                femur: values.femur || 0,
                biacromial: values.biacromial || 0,
                biiliocristal: values.biiliocristal || 0,
                biestiloideo: values.biestiloideo || 0
            }
        };

        if (record.created_at) setLastLoadedDate(new Date(record.created_at));
        onUpdate(newData);
    };

    return (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-white dark:border-slate-800 overflow-hidden">
            {/* Header Modernizado (🎨 El Esteta) */}
            <div className="px-4 md:px-6 py-5 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6cba00] to-[#80dd00] flex items-center justify-center shadow-lg shadow-[#6cba00]/20 shrink-0">
                            <Ruler className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-slate-800 dark:text-white text-base leading-tight">Evaluación Antropométrica</h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Protocolo unificado ISAK / OMS</p>
                        </div>
                    </div>
                </div>

                {patientId && (
                    <div className="flex flex-col xs:flex-row items-center justify-between bg-white dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-700/50 gap-3 xs:gap-0">
                        <div className="flex items-center gap-2 pl-1 w-full xs:w-auto">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
                                {lastLoadedDate
                                    ? `HISTORIAL: ${format(lastLoadedDate, "dd MMM, yyyy", { locale: es })}`
                                    : "SIN REGISTROS PREVIOS"}
                            </span>
                        </div>
                        <div className="w-full xs:w-auto">
                            <LoadLastMeasurementButton
                                patientId={patientId}
                                onMeasurementLoaded={handleMeasurementLoaded}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Accordion Sections */}
            <div className="max-h-[calc(100vh-400px)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">


                {/* 1. Datos Básicos (Always Visible) */}
                <AccordionSection
                    title="Datos Básicos"
                    icon={UserIcon}
                    color="bg-blue-600 shadow-blue-500/20"
                    isOpen={openSection === 'bioData'}
                    onToggle={() => toggleSection('bioData')}
                >
                    <div className="space-y-6">
                        {/* Selector de Género Premium */}
                        <div className="space-y-2">
                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest px-1">Identidad Biológica</label>
                            <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                                {[
                                    { id: 'masculino', label: 'Masculino', icon: '♂', color: 'bg-blue-500 shadow-blue-500/30' },
                                    { id: 'femenino', label: 'Femenino', icon: '♀', color: 'bg-rose-500 shadow-rose-500/30' }
                                ].map((g) => (
                                    <button
                                        key={g.id}
                                        onClick={() => onUpdate({ bioData: { ...data.bioData, genero: g.id as any } })}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all relative ${data.bioData.genero === g.id
                                            ? `${g.color} text-white shadow-lg`
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                            }`}
                                    >
                                        <span className="text-sm">{g.icon}</span>
                                        {g.label}
                                        {data.bioData.genero === g.id && (
                                            <motion.div layoutId="gender-tab" className="absolute inset-0 z-[-1]" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Estimación Geriátrica (Chumlea) */}
                        <div className={`p-4 rounded-2xl border transition-all ${data.bioData.usarEstimacion
                            ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/10 dark:border-amber-800'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 opacity-80'
                            }`}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className={`p-1.5 rounded-lg ${data.bioData.usarEstimacion ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-400'}`}>
                                        <UserRound className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">Estimación de Chumlea</span>
                                        <span className="text-[9px] text-slate-500 font-medium">Protocolo geriátrico / postrados</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onUpdate({ bioData: { ...data.bioData, usarEstimacion: !data.bioData.usarEstimacion } })}
                                    className={`relative w-12 h-6 rounded-full transition-all border ${data.bioData.usarEstimacion ? 'bg-amber-500 border-amber-600' : 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600'
                                        }`}
                                >
                                    <motion.div
                                        animate={{ x: data.bioData.usarEstimacion ? 24 : 2 }}
                                        className="w-5 h-5 bg-white rounded-full shadow-md"
                                    />
                                </button>
                            </div>

                            <AnimatePresence>
                                {data.bioData.usarEstimacion && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="grid grid-cols-2 gap-3 pt-2"
                                    >
                                        <IsakInput
                                            label="Alt. Rodilla"
                                            value={data.bioData.alturaRodilla || 0}
                                            onChange={(v) => {
                                                const newBioData = { ...data.bioData, alturaRodilla: v };
                                                if (v > 0 && newBioData.edad > 0) {
                                                    const estH = estimateHeightFromKnee(v, newBioData.edad, newBioData.genero);
                                                    newBioData.talla = Math.round(estH * 10) / 10;
                                                }
                                                onUpdate({ bioData: newBioData });
                                            }}
                                            unit="cm"
                                        />
                                        <IsakInput label="Circ. Pantorrilla" value={data.bioData.circunferenciaPantorrilla || 0} onChange={(v) => onUpdate({ bioData: { ...data.bioData, circunferenciaPantorrilla: v } })} unit="cm" />
                                        <IsakInput label="Circ. Brazo" value={data.bioData.circunferenciaBrazo || 0} onChange={(v) => onUpdate({ bioData: { ...data.bioData, circunferenciaBrazo: v } })} unit="cm" />
                                        <IsakInput label="Pliegue Subesc." value={data.bioData.pliegueSubescapular || 0} onChange={(v) => onUpdate({ bioData: { ...data.bioData, pliegueSubescapular: v } })} unit="mm" />

                                        <button
                                            onClick={() => {
                                                const { alturaRodilla, circunferenciaPantorrilla, circunferenciaBrazo, pliegueSubescapular, edad, genero } = data.bioData;
                                                const estW = estimateWeightChumlea({
                                                    circunferenciaPantorrilla: circunferenciaPantorrilla || 0,
                                                    alturaRodilla: alturaRodilla || 0,
                                                    circunferenciaBrazo: circunferenciaBrazo || 0,
                                                    pliegueSubescapular: pliegueSubescapular || 0,
                                                    edad, sexo: genero
                                                });
                                                onUpdate({ bioData: { ...data.bioData, peso: Math.round(estW * 10) / 10 } });
                                            }}
                                            className="col-span-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                                        >
                                            Generar Peso Estimado
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Campos Principales */}
                        <div className="grid grid-cols-2 gap-4">
                            <IsakInput
                                label={data.bioData.usarEstimacion ? "Peso Estimado" : "Peso Corporal"}
                                value={data.bioData.peso}
                                onChange={(v) => onUpdate({ bioData: { ...data.bioData, peso: v } })}
                                unit="kg"
                                isakTooltip={getIsakTooltip('weight')}
                            />
                            <IsakInput
                                label={data.bioData.usarEstimacion ? "Talla Estimada" : "Talla (Estatura)"}
                                value={data.bioData.talla}
                                onChange={(v) => onUpdate({ bioData: { ...data.bioData, talla: v } })}
                                unit="cm"
                                isakTooltip={getIsakTooltip('height')}
                            />
                            <IsakInput
                                label="Talla Sentado"
                                value={data.bioData.sittingHeight || 0}
                                onChange={(v) => onUpdate({ bioData: { ...data.bioData, sittingHeight: v } })}
                                unit="cm"
                                isakTooltip={getIsakTooltip('sitting_height')}
                                totalHeight={data.bioData.talla}
                            />
                            <IsakInput
                                label="Edad del Paciente"
                                value={data.bioData.edad}
                                onChange={(v) => onUpdate({ bioData: { ...data.bioData, edad: v } })}
                                unit="años"
                            />
                        </div>
                    </div>
                </AccordionSection>

                {/* 2. Pliegues Cutáneos (Intermediate +) */}
                {evaluationLevel !== 'basic' && (
                    <AccordionSection
                        title="Pliegues Cutáneos"
                        icon={Layers}
                        color="bg-[#6cba00] shadow-[#6cba00]/20"
                        isOpen={openSection === 'skinfolds'}
                        onToggle={() => toggleSection('skinfolds')}
                        badge={skinfoldCount > 0 ? `Σ ${skinfoldSum.toFixed(1)} mm • ${skinfoldCount} pliegues` : undefined}
                    >
                        <div className="grid grid-cols-2 gap-4">
                            {/* 4 Pliegues Básicos (Durnin/Yuhasz) */}
                            <IsakInput label="Tríceps" value={data.skinfolds.triceps} onChange={(v) => onUpdate({ skinfolds: { ...data.skinfolds, triceps: v } })} unit="mm" isakTooltip={getIsakTooltip('skinfold_triceps')} foldType="Tríceps" />
                            <IsakInput label="Bíceps" value={data.skinfolds.biceps} onChange={(v) => onUpdate({ skinfolds: { ...data.skinfolds, biceps: v } })} unit="mm" isakTooltip={getIsakTooltip('skinfold_biceps')} foldType="Bíceps" />
                            <IsakInput label="Subescapular" value={data.skinfolds.subscapular} onChange={(v) => onUpdate({ skinfolds: { ...data.skinfolds, subscapular: v } })} unit="mm" isakTooltip={getIsakTooltip('skinfold_subscapular')} foldType="Subescapular" />
                            <IsakInput label="Cresta Ilíaca" value={data.skinfolds.iliac_crest} onChange={(v) => onUpdate({ skinfolds: { ...data.skinfolds, iliac_crest: v } })} unit="mm" isakTooltip={getIsakTooltip('skinfold_iliac_crest')} foldType="Cresta Ilíaca" />

                            {/* Avanzados (Solo modo completo) */}
                            {evaluationLevel === 'advanced' && (
                                <>
                                    <IsakInput label="Supraespinal" value={data.skinfolds.supraspinale} onChange={(v) => onUpdate({ skinfolds: { ...data.skinfolds, supraspinale: v } })} unit="mm" isakTooltip={getIsakTooltip('skinfold_supraspinale')} foldType="Supraespinal" />
                                    <IsakInput label="Abdominal" value={data.skinfolds.abdominal} onChange={(v) => onUpdate({ skinfolds: { ...data.skinfolds, abdominal: v } })} unit="mm" isakTooltip={getIsakTooltip('skinfold_abdominal')} foldType="Abdominal" />
                                    <IsakInput label="Muslo Anterior" value={data.skinfolds.thigh} onChange={(v) => onUpdate({ skinfolds: { ...data.skinfolds, thigh: v } })} unit="mm" isakTooltip={getIsakTooltip('skinfold_thigh')} foldType="Muslo Anterior" />
                                    <IsakInput label="Pantorrilla" value={data.skinfolds.calf} onChange={(v) => onUpdate({ skinfolds: { ...data.skinfolds, calf: v } })} unit="mm" isakTooltip={getIsakTooltip('skinfold_calf')} foldType="Pantorrilla" />
                                </>
                            )}
                        </div>
                    </AccordionSection>
                )}

                {/* 3. Perímetros (Basic: Cintura/Cadera? No, here we stick to ISAK logic, so Intermediate +) */}
                {evaluationLevel !== 'basic' && (
                    <AccordionSection
                        title="Perímetros"
                        icon={Circle}
                        color="bg-purple-600 shadow-purple-500/20"
                        isOpen={openSection === 'girths'}
                        onToggle={() => toggleSection('girths')}
                    >
                        <div className="grid grid-cols-2 gap-4">
                            {/* Cintura es vital para riesgo CV, debería ser Basic? A veces. Dejémoslo en Intermediate. */}
                            <IsakInput label="Cintura" value={data.girths.cintura} onChange={(v) => onUpdate({ girths: { ...data.girths, cintura: v } })} unit="cm" isakTooltip={getIsakTooltip('girth_waist')} />

                            {/* Avanzados */}
                            {evaluationLevel === 'advanced' && (
                                <>
                                    <IsakInput label="Brazo Relajado" value={data.girths.brazoRelajado} onChange={(v) => onUpdate({ girths: { ...data.girths, brazoRelajado: v } })} unit="cm" isakTooltip={getIsakTooltip('girth_arm_relaxed')} />
                                    <IsakInput label="Brazo Flexionado" value={data.girths.brazoFlexionado} onChange={(v) => onUpdate({ girths: { ...data.girths, brazoFlexionado: v } })} unit="cm" isakTooltip={getIsakTooltip('girth_arm_flexed')} />
                                    <IsakInput label="Muslo Medio" value={data.girths.musloMedio} onChange={(v) => onUpdate({ girths: { ...data.girths, musloMedio: v } })} unit="cm" isakTooltip={getIsakTooltip('girth_thigh_mid')} />
                                    <IsakInput label="Pantorrilla" value={data.girths.pantorrilla} onChange={(v) => onUpdate({ girths: { ...data.girths, pantorrilla: v } })} unit="cm" isakTooltip={getIsakTooltip('girth_calf')} />
                                </>
                            )}
                        </div>
                    </AccordionSection>
                )}

                {/* 4. Diámetros Óseos (Advanced Only) */}
                {evaluationLevel === 'advanced' && (
                    <AccordionSection
                        title="Diámetros Óseos"
                        icon={Maximize2}
                        color="bg-indigo-600 shadow-indigo-500/20"
                        isOpen={openSection === 'breadths'}
                        onToggle={() => toggleSection('breadths')}
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <IsakInput label="Húmero (codo)" value={data.breadths.humero} onChange={(v) => onUpdate({ breadths: { ...data.breadths, humero: v } })} unit="cm" isakTooltip={getIsakTooltip('breadth_humerus')} />
                            <IsakInput label="Fémur (rodilla)" value={data.breadths.femur} onChange={(v) => onUpdate({ breadths: { ...data.breadths, femur: v } })} unit="cm" isakTooltip={getIsakTooltip('breadth_femur')} />
                            <IsakInput label="Biacromial" value={data.breadths.biacromial} onChange={(v) => onUpdate({ breadths: { ...data.breadths, biacromial: v } })} unit="cm" isakTooltip={getIsakTooltip('breadth_biacromial')} />
                            <IsakInput label="Biiliocristal" value={data.breadths.biiliocristal} onChange={(v) => onUpdate({ breadths: { ...data.breadths, biiliocristal: v } })} unit="cm" isakTooltip={getIsakTooltip('breadth_biiliocristal')} />
                            <IsakInput label="Diámetro Muñeca" value={data.breadths.biestiloideo} onChange={(v) => onUpdate({ breadths: { ...data.breadths, biestiloideo: v } })} unit="cm" isakTooltip={getIsakTooltip('breadth_wrist_bistyloid')} />
                        </div>
                    </AccordionSection>
                )}
            </div>
        </div >
    );
}
