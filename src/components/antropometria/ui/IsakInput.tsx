import React, { useState, useRef, useMemo } from "react";
import { Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PortalTooltip } from "../PortalTooltip";
import { processMeasurement } from "@/lib/anthropometry-utils";
import { ISAK_RANGES } from "@/lib/fiveComponentMath";
import { MeasurementTooltip } from "@/lib/measurementsData";

// ISAK Range Mapping
export const SKINFOLD_FIELD_MAP: Record<string, keyof typeof ISAK_RANGES.skinfolds | null> = {
    'Tríceps': 'triceps',
    'Bíceps': 'biceps',
    'Subescapular': 'subscapular',
    'Cresta Ilíaca': 'suprailiac',
    'Supraespinal': 'suprailiac',
    'Abdominal': 'abdominal',
    'Muslo Anterior': 'thigh',
    'Pantorrilla': 'calf',
};

export const GIRTH_FIELD_MAP: Record<string, keyof typeof ISAK_RANGES.girths | null> = {
    'Brazo Relajado': 'armRelaxed',
    'Brazo Flexionado': 'armFlexed',
    'Cintura': 'waist',
    'Muslo Medio': 'thigh',
    'Pantorrilla': 'calf',
};

export const BREADTH_FIELD_MAP: Record<string, keyof typeof ISAK_RANGES.breadths | null> = {
    'Húmero (codo)': 'humerus',
    'Fémur (rodilla)': 'femur',
    'Biacromial': 'biacromial',
    'Biiliocristal': 'biiliocristal',
    'Diámetro Muñeca': 'wrist',
};

export interface IsakInputProps {
    label: string;
    value: number;
    onChange: (v: number) => void;
    unit: string;
    placeholder?: string;
    description?: string;
    isakTooltip?: MeasurementTooltip;
    foldType?: string;
    totalHeight?: number; // Para validación de Cormic
}

export const IsakInput = React.memo(({
    label,
    value,
    onChange,
    unit,
    placeholder = "0",
    description,
    isakTooltip,
    foldType,
    totalHeight
}: IsakInputProps) => {
    const [isakMode, setIsakMode] = useState(false);
    const [series, setSeries] = useState<[string, string, string]>(["", "", ""]);
    const [isHovering, setIsHovering] = useState(false);
    const infoIconRef = useRef<HTMLDivElement>(null);

    // Detección de Rango ISAK (🧬 Dr. Science)
    const isakRange = useMemo(() => {
        const skinfoldKey = SKINFOLD_FIELD_MAP[label];
        const girthKey = GIRTH_FIELD_MAP[label];
        const breadthKey = BREADTH_FIELD_MAP[label];

        if (skinfoldKey && unit === 'mm') return ISAK_RANGES.skinfolds[skinfoldKey];
        if (girthKey && unit === 'cm') return ISAK_RANGES.girths[girthKey];
        if (breadthKey && unit === 'cm') return ISAK_RANGES.breadths[breadthKey];

        // Validación de Talla Sentado (Cormic Index)
        if (label === 'Talla Sentado' && unit === 'cm') {
            return { min: 40, max: 130, warn: 110 };
        }
        return null;
    }, [label, unit]);

    // Validación Fisiológica Dinámica
    const cormicError = useMemo(() => {
        if (label === 'Talla Sentado' && totalHeight && value > 0) {
            const ratio = value / totalHeight;
            // Un humano normal está entre 0.45 y 0.65 (lactantes más alto)
            if (ratio < 0.45 || ratio > 0.70) return "Relación talla sentado/total fuera de límites biológicos.";
            if (value >= totalHeight) return "La talla sentado no puede ser mayor o igual a la talla total.";
        }
        return null;
    }, [label, value, totalHeight]);

    // Estados de Validación
    const isError = cormicError || (isakRange && value > 0 && (value < isakRange.min || value > isakRange.max));
    const isWarning = isakRange && value > isakRange.warn && value <= isakRange.max;
    const hasValue = value > 0;

    const handleSeriesChange = (index: 0 | 1 | 2, val: string) => {
        const newSeries = [...series] as [string, string, string];
        newSeries[index] = val;
        setSeries(newSeries);

        const numbers = newSeries.map(s => parseFloat(s)).filter(n => !isNaN(n));
        if (numbers.length > 0) {
            onChange(processMeasurement(numbers));
        } else {
            onChange(0);
        }
    };

    const getInputClassName = () => {
        const base = "w-full text-sm font-bold text-center py-2.5 px-3 rounded-xl border-2 transition-all outline-none shadow-sm";
        if (isError) return `${base} bg-red-50 dark:bg-red-950/20 border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 ring-red-200 dark:ring-red-900/50`;
        if (isWarning) return `${base} bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300`;
        if (hasValue) return `${base} bg-emerald-50 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300`;
        return `${base} bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:border-[#6cba00] focus:ring-4 focus:ring-[#6cba00]/10`;
    };

    return (
        <div className="space-y-1.5 group/field">
            <div className="flex items-center justify-between px-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider truncate">
                        {label}
                    </label>
                    <div
                        ref={infoIconRef}
                        onMouseEnter={() => setIsHovering(true)}
                        onMouseLeave={() => setIsHovering(false)}
                        className="cursor-help flex-shrink-0"
                    >
                        <Info className={`w-3 h-3 transition-colors ${isHovering ? 'text-[#6cba00]' : 'text-slate-300 dark:text-slate-600'}`} />
                    </div>
                    {/* Tooltip Portal */}
                    <PortalTooltip triggerRef={infoIconRef} isOpen={isHovering}>
                        <div className="w-72 p-4 bg-slate-900/95 backdrop-blur-md text-white text-[10px] rounded-xl shadow-2xl border border-white/10">
                            <div className="font-bold text-[#6cba00] mb-2 flex justify-between items-center">
                                <span>{foldType || isakTooltip?.label || label}</span>
                                <span className="text-[8px] bg-white/10 px-1.5 py-0.5 rounded uppercase">{isakTooltip?.category || 'Medida'}</span>
                            </div>
                            <div className="space-y-2.5">
                                <p className="text-slate-300 leading-relaxed"><span className="text-white font-semibold">Definición:</span> {isakTooltip?.definition || description}</p>
                                {isakTooltip?.technique && (
                                    <ul className="space-y-1">
                                        {isakTooltip.technique.map((step, i) => (
                                            <li key={i} className="flex gap-2 text-slate-400"><span className="text-[#6cba00]">•</span> {step}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </PortalTooltip>
                </div>

                <button
                    onClick={() => setIsakMode(!isakMode)}
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full transition-all border ${isakMode
                        ? 'bg-[#6cba00]/10 text-[#6cba00] border-[#6cba00]/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                >
                    {isakMode ? 'SERIE' : 'SIMPLE'}
                </button>
            </div>

            <div className="relative">
                <input
                    type="number"
                    inputMode="decimal"
                    value={value || ""}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        onChange(isNaN(val) ? 0 : Math.max(0, val));
                    }}
                    placeholder={placeholder}
                    readOnly={isakMode}
                    className={getInputClassName()}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{unit}</span>
                    <AnimatePresence mode="popLayout">
                        {isError && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                            </motion.div>
                        )}
                        {isWarning && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                            </motion.div>
                        )}
                        {hasValue && !isError && !isWarning && isakRange && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ISAK Series View */}
            <AnimatePresence>
                {isakMode && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="grid grid-cols-3 gap-1.5 pt-1"
                    >
                        {[0, 1, 2].map((i) => (
                            <input
                                key={i}
                                type="number"
                                inputMode="decimal"
                                placeholder={`T${i + 1}`}
                                value={series[i]}
                                onChange={(e) => handleSeriesChange(i as 0 | 1 | 2, e.target.value)}
                                className="w-full text-[10px] font-bold text-center py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-[#6cba00] outline-none shadow-sm"
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error Messages */}
            {isError && (
                <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[9px] text-red-600 dark:text-red-400 font-bold px-1"
                >
                    {cormicError || `Fuera de rango ISAK (${isakRange?.min}-${isakRange?.max} ${unit})`}
                </motion.p>
            )}
        </div>
    );
});

IsakInput.displayName = "IsakInput";
