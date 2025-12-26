"use client";

import { useState, useEffect } from "react";
import { ChevronDown, User, Layers, Circle, Maximize2, Info, UserRound } from "lucide-react";
import { SKINFOLD_MAP } from "@/lib/skinfold-map";
import { estimateWeightChumlea, estimateHeightFromKnee } from "@/lib/clinical-calculations";

// Tipos de datos
export interface BioData {
    peso: number;
    talla: number;
    edad: number;
    genero: 'masculino' | 'femenino';
    // Geriatric Estimation Fields (Chumlea)
    usarEstimacion?: boolean;
    alturaRodilla?: number;
    circunferenciaPantorrilla?: number;
    circunferenciaBrazo?: number;
    pliegueSubescapular?: number;
}

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
    musloMedio: number;  // Perímetro muslo medio (crítico para modelo 5C)
    pantorrilla: number;
}

export interface BreadthData {
    humero: number;
    femur: number;
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
}

// Accordion Section Component
function AccordionSection({
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
}) {
    return (
        <div className="border-b border-slate-100 dark:border-slate-800 last:border-b-0">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
                        <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-white text-sm">{title}</span>
                    {badge && (
                        <span className="text-[10px] bg-[#6cba00]/10 text-[#6cba00] font-bold px-2 py-0.5 rounded-full">
                            {badge}
                        </span>
                    )}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-4 pt-0">
                    {children}
                </div>
            </div>
        </div>
    );
}

import { processMeasurement } from "@/lib/anthropometry-utils";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { ISAK_RANGES } from "@/lib/fiveComponentMath";

// ISAK Range lookup for skinfolds (maps label to fieldKey)
const SKINFOLD_FIELD_MAP: Record<string, keyof typeof ISAK_RANGES.skinfolds | null> = {
    'Tríceps': 'triceps',
    'Bíceps': 'biceps',
    'Subescapular': 'subscapular',
    'Cresta Ilíaca': 'suprailiac',
    'Supraespinal': 'suprailiac',
    'Abdominal': 'abdominal',
    'Muslo Anterior': 'thigh',
    'Pantorrilla': 'calf',
};

// Input Field Component with ISAK Validation
function InputField({
    label,
    value,
    onChange,
    unit,
    placeholder = "0",
    description,
    foldType
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    unit: string;
    placeholder?: string;
    description?: string;
    foldType?: string;
}) {
    const [isakMode, setIsakMode] = useState(false);
    const [series, setSeries] = useState<[string, string, string]>(["", "", ""]);

    // Get ISAK range for validation (if applicable)
    const skinfoldKey = SKINFOLD_FIELD_MAP[label];
    const isakRange = skinfoldKey && unit === 'mm' ? ISAK_RANGES.skinfolds[skinfoldKey] : null;

    // Validation states
    const isValid = !isakRange || value === 0 || (value >= isakRange.min && value <= isakRange.max);
    const isWarning = isakRange && value > isakRange.warn && value <= isakRange.max;
    const isError = isakRange && value > 0 && (value < isakRange.min || value > isakRange.max);

    const handleSeriesChange = (index: 0 | 1 | 2, val: string) => {
        const newSeries = [...series] as [string, string, string];
        newSeries[index] = val;
        setSeries(newSeries);

        // Process Series
        const numbers = newSeries.map(s => parseFloat(s)).filter(n => !isNaN(n));
        if (numbers.length > 0) {
            const result = processMeasurement(numbers);
            onChange(result);
        } else {
            onChange(0);
        }
    };

    const hasValue = value > 0;

    // Determine input styling based on validation
    const getInputClassName = () => {
        const base = "w-full text-sm font-semibold text-center py-2.5 px-3 rounded-lg border-2 transition-all outline-none";

        if (isError) {
            return `${base} bg-red-50 dark:bg-red-950/30 border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 animate-shake`;
        }
        if (isWarning) {
            return `${base} bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300`;
        }
        if (hasValue) {
            return `${base} bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300`;
        }
        return `${base} bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[#6cba00]/30 focus:border-[#6cba00]`;
    };

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <label className="text-[11px] text-slate-500 font-medium">{label}</label>
                    {description && (
                        <div className="group relative">
                            <Info className="w-3 h-3 text-slate-400 cursor-help" />
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                                <div className="font-bold text-[#6cba00] mb-0.5">{foldType}</div>
                                {description}
                                <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-slate-800"></div>
                            </div>
                        </div>
                    )}
                    {/* ISAK Range indicator */}
                    {isakRange && (
                        <span className="text-[9px] text-slate-400">({isakRange.min}-{isakRange.max})</span>
                    )}
                </div>
                {/* ISAK Toggle */}
                <button
                    onClick={() => setIsakMode(!isakMode)}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${isakMode ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'text-slate-400 border-transparent hover:bg-slate-50'}`}
                    title="Modo Serie (3 tomas)"
                >
                    {isakMode ? 'Serie' : 'Simple'}
                </button>
            </div>

            <div className="relative">
                <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    value={value || ""}
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                    placeholder={placeholder}
                    readOnly={isakMode}
                    className={`${getInputClassName()} ${isakMode ? 'opacity-80 cursor-not-allowed' : ''}`}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">{unit}</span>
                    {/* Validation icons */}
                    {hasValue && isValid && !isWarning && isakRange && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                    {isWarning && (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    {isError && (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    )}
                </div>
            </div>

            {/* ISAK Series Input */}
            {isakMode && (
                <div className="grid grid-cols-3 gap-1 mt-1 animate-in slide-in-from-top-1 duration-200">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="relative">
                            <input
                                type="number"
                                inputMode="decimal"
                                placeholder={`#${i + 1}`}
                                value={series[i]}
                                onChange={(e) => handleSeriesChange(i as 0 | 1 | 2, e.target.value)}
                                className="w-full text-[10px] text-center py-1 rounded border border-slate-200 focus:border-indigo-400 outline-none bg-slate-50 focus:bg-white"
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Error message */}
            {isError && isakRange && (
                <p className="text-[9px] text-red-600 dark:text-red-400 font-medium">
                    Fuera de rango ISAK ({isakRange.min}-{isakRange.max} {unit})
                </p>
            )}
        </div>
    );
}

export function UnifiedMeasurementForm({ data, onUpdate }: UnifiedFormProps) {
    const [openSection, setOpenSection] = useState<string>('bioData');

    const toggleSection = (section: string) => {
        setOpenSection(openSection === section ? '' : section);
    };

    const skinfoldSum = Object.values(data.skinfolds).reduce((a, b) => a + b, 0);
    const skinfoldCount = Object.values(data.skinfolds).filter(v => v > 0).length;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-[#ff8508]/10 to-transparent border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">Datos de Evaluación</h3>
                <p className="text-[11px] text-slate-500">Ingresa las medidas antropométricas</p>
            </div>

            {/* Accordion Sections */}
            <div className="max-h-[calc(100vh-350px)] overflow-y-auto">

                {/* 1. Datos Básicos */}
                <AccordionSection
                    title="Datos Básicos"
                    icon={User}
                    color="bg-blue-500"
                    isOpen={openSection === 'bioData'}
                    onToggle={() => toggleSection('bioData')}
                >
                    <div className="space-y-4">
                        {/* Geriatric Estimation Toggle */}
                        <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                            <div className="flex items-center gap-2">
                                <UserRound className="w-4 h-4 text-amber-600" />
                                <div>
                                    <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                                        Estimación Geriátrica (Chumlea)
                                    </span>
                                    <p className="text-[10px] text-amber-600 dark:text-amber-400">
                                        Para pacientes que no pueden pesarse/medirse
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => onUpdate({ bioData: { ...data.bioData, usarEstimacion: !data.bioData.usarEstimacion } })}
                                aria-label={data.bioData.usarEstimacion ? "Desactivar estimación geriátrica" : "Activar estimación geriátrica"}
                                className={`relative w-11 h-6 rounded-full transition-colors ${data.bioData.usarEstimacion
                                    ? 'bg-amber-500'
                                    : 'bg-slate-300 dark:bg-slate-600'
                                    }`}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${data.bioData.usarEstimacion ? 'translate-x-5' : ''
                                    }`} />
                            </button>
                        </div>

                        {/* Main Fields */}
                        <div className="grid grid-cols-2 gap-3">
                            <InputField
                                label={data.bioData.usarEstimacion ? "Peso Estimado" : "Peso"}
                                value={data.bioData.peso}
                                onChange={(v) => onUpdate({ bioData: { ...data.bioData, peso: v } })}
                                unit="kg"
                            />
                            <InputField
                                label={data.bioData.usarEstimacion ? "Talla Estimada" : "Talla"}
                                value={data.bioData.talla}
                                onChange={(v) => onUpdate({ bioData: { ...data.bioData, talla: v } })}
                                unit="cm"
                            />
                            <InputField
                                label="Edad"
                                value={data.bioData.edad}
                                onChange={(v) => onUpdate({ bioData: { ...data.bioData, edad: v } })}
                                unit="años"
                            />
                            <div className="space-y-1">
                                <label className="text-[11px] text-slate-500 font-medium">Género</label>
                                <div className="grid grid-cols-2 gap-1">
                                    <button
                                        onClick={() => onUpdate({ bioData: { ...data.bioData, genero: 'masculino' } })}
                                        className={`py-2 rounded-lg text-xs font-bold transition-all ${data.bioData.genero === 'masculino'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                            }`}
                                    >
                                        ♂ M
                                    </button>
                                    <button
                                        onClick={() => onUpdate({ bioData: { ...data.bioData, genero: 'femenino' } })}
                                        className={`py-2 rounded-lg text-xs font-bold transition-all ${data.bioData.genero === 'femenino'
                                            ? 'bg-rose-500 text-white'
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                            }`}
                                    >
                                        ♀ F
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Geriatric Estimation Fields (Chumlea) */}
                        {data.bioData.usarEstimacion && (
                            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2 duration-300">
                                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                                    <Info className="w-3.5 h-3.5 text-amber-500" />
                                    Medidas para Estimación
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <InputField
                                        label="Altura Rodilla"
                                        value={data.bioData.alturaRodilla || 0}
                                        onChange={(v) => {
                                            const newBioData = { ...data.bioData, alturaRodilla: v };
                                            // Auto-calculate height if we have knee height
                                            if (v > 0 && newBioData.edad > 0) {
                                                const estimatedHeight = estimateHeightFromKnee(v, newBioData.edad, newBioData.genero);
                                                newBioData.talla = Math.round(estimatedHeight * 10) / 10;
                                            }
                                            onUpdate({ bioData: newBioData });
                                        }}
                                        unit="cm"
                                    />
                                    <InputField
                                        label="Circ. Pantorrilla"
                                        value={data.bioData.circunferenciaPantorrilla || 0}
                                        onChange={(v) => onUpdate({ bioData: { ...data.bioData, circunferenciaPantorrilla: v } })}
                                        unit="cm"
                                    />
                                    <InputField
                                        label="Circ. Brazo"
                                        value={data.bioData.circunferenciaBrazo || 0}
                                        onChange={(v) => onUpdate({ bioData: { ...data.bioData, circunferenciaBrazo: v } })}
                                        unit="cm"
                                    />
                                    <InputField
                                        label="Pliegue Subescapular"
                                        value={data.bioData.pliegueSubescapular || 0}
                                        onChange={(v) => onUpdate({ bioData: { ...data.bioData, pliegueSubescapular: v } })}
                                        unit="mm"
                                    />
                                </div>

                                {/* Auto-calculate Weight Button */}
                                <button
                                    onClick={() => {
                                        const { alturaRodilla, circunferenciaPantorrilla, circunferenciaBrazo, pliegueSubescapular, edad, genero } = data.bioData;
                                        if (alturaRodilla && circunferenciaPantorrilla && circunferenciaBrazo && pliegueSubescapular && edad) {
                                            const estimatedWeight = estimateWeightChumlea({
                                                circunferenciaPantorrilla,
                                                alturaRodilla,
                                                circunferenciaBrazo,
                                                pliegueSubescapular,
                                                edad,
                                                sexo: genero
                                            });
                                            onUpdate({ bioData: { ...data.bioData, peso: Math.round(estimatedWeight * 10) / 10 } });
                                        }
                                    }}
                                    disabled={!(data.bioData.alturaRodilla && data.bioData.circunferenciaPantorrilla && data.bioData.circunferenciaBrazo && data.bioData.pliegueSubescapular && data.bioData.edad)}
                                    className="mt-3 w-full py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors"
                                >
                                    Calcular Peso Estimado (Chumlea)
                                </button>
                                <p className="text-[10px] text-slate-500 mt-2 text-center">
                                    Completa los 4 campos para estimar el peso
                                </p>
                            </div>
                        )}
                    </div>
                </AccordionSection>

                {/* 2. Pliegues Cutáneos */}
                <AccordionSection
                    title="Pliegues Cutáneos"
                    icon={Layers}
                    color="bg-[#6cba00]"
                    isOpen={openSection === 'skinfolds'}
                    onToggle={() => toggleSection('skinfolds')}
                    badge={skinfoldCount > 0 ? `Σ ${skinfoldSum.toFixed(1)}mm` : undefined}
                >
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label={SKINFOLD_MAP.triceps.name} value={data.skinfolds.triceps} onChange={(v) => onUpdate({ skinfolds: { ...data.skinfolds, triceps: v } })} unit="mm" description={SKINFOLD_MAP.triceps.description} foldType={SKINFOLD_MAP.triceps.type} />
                        <InputField label={SKINFOLD_MAP.biceps.name} value={data.skinfolds.biceps} onChange={(v) => onUpdate({ skinfolds: { ...data.skinfolds, biceps: v } })} unit="mm" description={SKINFOLD_MAP.biceps.description} foldType={SKINFOLD_MAP.biceps.type} />
                        <InputField label={SKINFOLD_MAP.subscapular.name} value={data.skinfolds.subscapular} onChange={(v) => onUpdate({ skinfolds: { ...data.skinfolds, subscapular: v } })} unit="mm" description={SKINFOLD_MAP.subscapular.description} foldType={SKINFOLD_MAP.subscapular.type} />
                        <InputField label={SKINFOLD_MAP.iliac_crest.name} value={data.skinfolds.iliac_crest} onChange={(v) => onUpdate({ skinfolds: { ...data.skinfolds, iliac_crest: v } })} unit="mm" description={SKINFOLD_MAP.iliac_crest.description} foldType={SKINFOLD_MAP.iliac_crest.type} />
                        <InputField label={SKINFOLD_MAP.supraspinale.name} value={data.skinfolds.supraspinale} onChange={(v) => onUpdate({ skinfolds: { ...data.skinfolds, supraspinale: v } })} unit="mm" description={SKINFOLD_MAP.supraspinale.description} foldType={SKINFOLD_MAP.supraspinale.type} />
                        <InputField label={SKINFOLD_MAP.abdominal.name} value={data.skinfolds.abdominal} onChange={(v) => onUpdate({ skinfolds: { ...data.skinfolds, abdominal: v } })} unit="mm" description={SKINFOLD_MAP.abdominal.description} foldType={SKINFOLD_MAP.abdominal.type} />
                        <InputField label={SKINFOLD_MAP.thigh.name} value={data.skinfolds.thigh} onChange={(v) => onUpdate({ skinfolds: { ...data.skinfolds, thigh: v } })} unit="mm" description={SKINFOLD_MAP.thigh.description} foldType={SKINFOLD_MAP.thigh.type} />
                        <InputField label={SKINFOLD_MAP.calf.name} value={data.skinfolds.calf} onChange={(v) => onUpdate({ skinfolds: { ...data.skinfolds, calf: v } })} unit="mm" description={SKINFOLD_MAP.calf.description} foldType={SKINFOLD_MAP.calf.type} />
                    </div>
                </AccordionSection>

                {/* 3. Perímetros */}
                <AccordionSection
                    title="Perímetros"
                    icon={Circle}
                    color="bg-purple-500"
                    isOpen={openSection === 'girths'}
                    onToggle={() => toggleSection('girths')}
                >
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="Brazo Relajado" value={data.girths.brazoRelajado} onChange={(v) => onUpdate({ girths: { ...data.girths, brazoRelajado: v } })} unit="cm" description="Perímetro del brazo en posición relajada" />
                        <InputField label="Brazo Flexionado" value={data.girths.brazoFlexionado} onChange={(v) => onUpdate({ girths: { ...data.girths, brazoFlexionado: v } })} unit="cm" description="Perímetro del brazo en contracción máxima" />
                        <InputField label="Cintura" value={data.girths.cintura} onChange={(v) => onUpdate({ girths: { ...data.girths, cintura: v } })} unit="cm" description="Punto más estrecho del tronco" />
                        <InputField label="Muslo Medio" value={data.girths.musloMedio} onChange={(v) => onUpdate({ girths: { ...data.girths, musloMedio: v } })} unit="cm" description="Punto medio entre trocánter y rodilla (crítico para modelo 5C)" />
                        <InputField label="Pantorrilla" value={data.girths.pantorrilla} onChange={(v) => onUpdate({ girths: { ...data.girths, pantorrilla: v } })} unit="cm" description="Perímetro máximo de la pantorrilla" />
                    </div>
                </AccordionSection>

                {/* 4. Diámetros Óseos */}
                <AccordionSection
                    title="Diámetros Óseos"
                    icon={Maximize2}
                    color="bg-indigo-500"
                    isOpen={openSection === 'breadths'}
                    onToggle={() => toggleSection('breadths')}
                >
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="Húmero (codo)" value={data.breadths.humero} onChange={(v) => onUpdate({ breadths: { ...data.breadths, humero: v } })} unit="cm" />
                        <InputField label="Fémur (rodilla)" value={data.breadths.femur} onChange={(v) => onUpdate({ breadths: { ...data.breadths, femur: v } })} unit="cm" />
                    </div>
                </AccordionSection>
            </div>
        </div>
    );
}
