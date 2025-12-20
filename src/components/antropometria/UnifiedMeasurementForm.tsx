"use client";

import { useState } from "react";
import { ChevronDown, User, Layers, Circle, Maximize2, Info } from "lucide-react";
import { SKINFOLD_MAP } from "@/lib/skinfold-map";

// Tipos de datos
export interface BioData {
    peso: number;
    talla: number;
    edad: number;
    genero: 'masculino' | 'femenino';
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

// Input Field Component with ISAK Support
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

    const handleSeriesChange = (index: 0 | 1 | 2, val: string) => {
        const newSeries = [...series] as [string, string, string];
        newSeries[index] = val;
        setSeries(newSeries);

        // Process Series
        const numbers = newSeries.map(s => parseFloat(s)).filter(n => !isNaN(n));
        if (numbers.length > 0) {
            const result = processMeasurement(numbers);
            onChange(result); // Update parent with calculated value
        } else {
            onChange(0);
        }
    };

    const hasValue = value > 0;

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
                    step="0.1"
                    min="0"
                    value={value || ""}
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                    placeholder={placeholder}
                    readOnly={isakMode} // Read-only in ISAK mode (calculated)
                    className={`w-full text-sm font-semibold text-center py-2.5 px-3 rounded-lg border-2 transition-all outline-none ${hasValue
                        ? 'bg-[#6cba00]/5 border-[#6cba00]/30 text-[#6cba00]'
                        : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                        } focus:ring-2 focus:ring-[#6cba00]/30 focus:border-[#6cba00] ${isakMode ? 'opacity-80 cursor-not-allowed' : ''}`}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">{unit}</span>
            </div>

            {/* ISAK Series Input */}
            {isakMode && (
                <div className="grid grid-cols-3 gap-1 mt-1 animate-in slide-in-from-top-1 duration-200">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="relative">
                            <input
                                type="number"
                                placeholder={`#${i + 1}`}
                                value={series[i]}
                                onChange={(e) => handleSeriesChange(i as 0 | 1 | 2, e.target.value)}
                                className="w-full text-[10px] text-center py-1 rounded border border-slate-200 focus:border-indigo-400 outline-none bg-slate-50 focus:bg-white"
                            />
                        </div>
                    ))}
                </div>
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
                    <div className="grid grid-cols-2 gap-3">
                        <InputField
                            label="Peso"
                            value={data.bioData.peso}
                            onChange={(v) => onUpdate({ bioData: { ...data.bioData, peso: v } })}
                            unit="kg"
                        />
                        <InputField
                            label="Talla"
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
                        <InputField label="Brazo Relajado" value={data.girths.brazoRelajado} onChange={(v) => onUpdate({ girths: { ...data.girths, brazoRelajado: v } })} unit="cm" />
                        <InputField label="Brazo Flexionado" value={data.girths.brazoFlexionado} onChange={(v) => onUpdate({ girths: { ...data.girths, brazoFlexionado: v } })} unit="cm" />
                        <InputField label="Cintura" value={data.girths.cintura} onChange={(v) => onUpdate({ girths: { ...data.girths, cintura: v } })} unit="cm" />
                        <InputField label="Pantorrilla" value={data.girths.pantorrilla} onChange={(v) => onUpdate({ girths: { ...data.girths, pantorrilla: v } })} unit="cm" />
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
