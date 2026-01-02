'use client';

/**
 * PediatricBodyCompositionPanel.tsx
 * 
 * Panel de composición corporal para pacientes pediátricos (10-19 años).
 * Diseño IDENTICO al de adultos con los mismos colores y estilos.
 * 
 * Solo visible para pacientes >= 10 años.
 */

import { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
    calculateDensity,
    calculateAdolescentBodyFat,
    classifyBodyFat,
    getTannerBiologicalAge,
    type TannerStage,
    type TannerRating,
    type SkinfoldMeasurements,
    type Gender,
} from '@/hooks/useAdolescentMetrics';
import {
    User,
    ChevronDown,
    Layers,
    Activity,
    Scale,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Info
} from 'lucide-react';
import { Pediatric3DViewer } from './Pediatric3DViewerLazy';

// ============================================================================
// TYPES
// ============================================================================

interface PediatricBodyCompositionPanelProps {
    patientName: string;
    patientAge: number; // in years
    patientGender: Gender;
    patientWeight?: number; // kg
    patientHeight?: number; // cm
    className?: string;
    onBiologicalAgeChange?: (biologicalAge: number | null, shouldUse: boolean) => void;
}

// ============================================================================
// ACCORDION SECTION (Exact copy from UnifiedMeasurementForm)
// ============================================================================

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
    const [overflow, setOverflow] = useState("hidden");

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => setOverflow("visible"), 300);
            return () => clearTimeout(timer);
        } else {
            setOverflow("hidden");
        }
    }, [isOpen]);

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
            <div
                className={`transition-all duration-300 ${isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}
                style={{ overflow }}
            >
                <div className="p-4 pt-0">
                    {children}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// INPUT FIELD (Exact style from UnifiedMeasurementForm)
// ============================================================================

function InputField({
    label,
    value,
    onChange,
    unit,
    placeholder = "0",
    readOnly = false
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    unit: string;
    placeholder?: string;
    readOnly?: boolean;
}) {
    const hasValue = value > 0;

    const getInputClassName = () => {
        const base = "w-full text-sm font-semibold text-center py-2.5 px-3 rounded-lg border-2 transition-all outline-none";
        if (hasValue) {
            return `${base} bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300`;
        }
        return `${base} bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[#6cba00]/30 focus:border-[#6cba00]`;
    };

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <label className="text-[11px] text-slate-500 font-medium">{label}</label>
                <span className="text-[10px] text-slate-400">Simple</span>
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
                    readOnly={readOnly}
                    className={`${getInputClassName()} ${readOnly ? 'opacity-80 cursor-not-allowed' : ''}`}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">{unit}</span>
                    {hasValue && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PediatricBodyCompositionPanel({
    patientName,
    patientAge,
    patientGender,
    patientWeight = 0,
    patientHeight = 0,
    className,
    onBiologicalAgeChange,
}: PediatricBodyCompositionPanelProps) {
    // ===== VISIBILITY GUARD: Only show for age >= 10 =====
    if (patientAge < 10) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
                <Info className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Composición Corporal no disponible</p>
                <p className="text-sm">Disponible para pacientes de 10 años o más</p>
            </div>
        );
    }

    // State
    const [openSection, setOpenSection] = useState<string>('bioData');
    const [peso, setPeso] = useState(patientWeight);
    const [talla, setTalla] = useState(patientHeight);

    const toggleSection = (section: string) => {
        setOpenSection(openSection === section ? '' : section);
    };

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

    // Sync external weight/height changes
    useEffect(() => {
        if (patientWeight > 0) setPeso(patientWeight);
        if (patientHeight > 0) setTalla(patientHeight);
    }, [patientWeight, patientHeight]);

    // Calculate biological age
    const biologicalAge = useMemo(() => {
        if (tannerRating.primary > 1 || tannerRating.pubicHair > 1) {
            return getTannerBiologicalAge(tannerRating, patientGender);
        }
        return null;
    }, [tannerRating, patientGender]);

    // Calculate body composition
    const skinfoldSum = skinfolds.biceps + skinfolds.triceps + skinfolds.subscapular + skinfolds.suprailiac;
    const skinfoldCount = [skinfolds.biceps, skinfolds.triceps, skinfolds.subscapular, skinfolds.suprailiac].filter(v => v > 0).length;
    const hasAllSkinfolds = skinfoldCount === 4;

    const bodyComposition = useMemo(() => {
        if (!hasAllSkinfolds) return null;

        const effectiveAge = biologicalAge ?? patientAge;
        const density = calculateDensity(skinfolds, effectiveAge, patientGender);
        const bodyFatPercent = calculateAdolescentBodyFat(effectiveAge, patientGender, density);
        const { classification, label, riskLevel } = classifyBodyFat(bodyFatPercent, patientGender);

        const fatMass = peso > 0 ? (bodyFatPercent / 100) * peso : 0;
        const leanMass = peso > 0 ? peso - fatMass : 0;

        return {
            density,
            bodyFatPercent,
            classification,
            label,
            riskLevel,
            fatMass,
            leanMass,
        };
    }, [skinfolds, hasAllSkinfolds, biologicalAge, patientAge, patientGender, peso]);

    // Notify parent of biological age change
    useEffect(() => {
        if (onBiologicalAgeChange) {
            const shouldUse = biologicalAge !== null;
            onBiologicalAgeChange(biologicalAge, shouldUse);
        }
    }, [biologicalAge, onBiologicalAgeChange]);

    const handleTannerChange = (type: 'primary' | 'pubicHair', stage: TannerStage) => {
        setTannerRating(prev => ({ ...prev, [type]: stage }));
    };

    const handleSkinfoldChange = (field: keyof SkinfoldMeasurements, value: number) => {
        setSkinfolds(prev => ({ ...prev, [field]: value }));
    };

    const missingLabels = ['Bíceps', 'Tríceps', 'Subescapular', 'Suprailiaco'].filter((_, i) => {
        const vals = [skinfolds.biceps, skinfolds.triceps, skinfolds.subscapular, skinfolds.suprailiac];
        return vals[i] <= 0;
    });

    return (
        <div className={cn('grid grid-cols-1 lg:grid-cols-12 gap-6', className)}>
            {/* ========== LEFT: FORM (8 cols like adult) ========== */}
            <div className="lg:col-span-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Form Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800 overflow-hidden">
                        {/* Header - Same orange gradient as adult */}
                        <div className="px-5 py-4 bg-gradient-to-r from-[#ff8508]/10 to-transparent border-b border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Datos de Evaluación</h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Ingresa las medidas antropométricas</p>
                        </div>

                        <div className="max-h-[calc(100vh-350px)] overflow-y-auto">
                            {/* Datos Básicos */}
                            <AccordionSection
                                title="Datos Básicos"
                                icon={User}
                                color="bg-blue-500"
                                isOpen={openSection === 'bioData'}
                                onToggle={() => toggleSection('bioData')}
                            >
                                <div className="grid grid-cols-2 gap-3">
                                    <InputField label="Peso" value={peso} onChange={setPeso} unit="kg" />
                                    <InputField label="Talla" value={talla} onChange={setTalla} unit="cm" />
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[11px] text-slate-500 font-medium">Edad</label>
                                            {biologicalAge && (
                                                <span className="text-[10px] text-purple-500 font-medium">Biológica</span>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                readOnly
                                                value={(biologicalAge ?? patientAge).toFixed(1)}
                                                className={`w-full text-sm font-semibold text-center py-2.5 px-3 rounded-lg border-2 transition-all outline-none cursor-not-allowed ${biologicalAge
                                                    ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                                                    : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                                                    }`}
                                            />
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                <span className="text-[10px] text-slate-400">años</span>
                                                <CheckCircle2 className={`w-3.5 h-3.5 ${biologicalAge ? 'text-purple-500' : 'text-emerald-500'}`} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[11px] text-slate-500 font-medium">Género</label>
                                        <div className="grid grid-cols-2 gap-1">
                                            <button
                                                className={`py-2 rounded-lg text-xs font-bold transition-all ${patientGender === 'masculino'
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                                    }`}
                                            >
                                                ♂ M
                                            </button>
                                            <button
                                                className={`py-2 rounded-lg text-xs font-bold transition-all ${patientGender === 'femenino'
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

                            {/* Estadío de Tanner */}
                            <AccordionSection
                                title="Estadío de Tanner"
                                icon={Activity}
                                color="bg-purple-500"
                                isOpen={openSection === 'tanner'}
                                onToggle={() => toggleSection('tanner')}
                                badge={biologicalAge ? `Bio: ${biologicalAge.toFixed(1)}a` : undefined}
                            >
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <label className="text-[11px] text-slate-500 font-medium">
                                            {patientGender === 'masculino' ? 'Desarrollo Genital (G)' : 'Desarrollo Mamario (M)'}
                                        </label>
                                        <div className="grid grid-cols-5 gap-1">
                                            {[1, 2, 3, 4, 5].map((stage) => (
                                                <button
                                                    key={`primary-${stage}`}
                                                    type="button"
                                                    onClick={() => handleTannerChange('primary', stage as TannerStage)}
                                                    className={`py-2 rounded-lg text-sm font-bold transition-all ${tannerRating.primary === stage
                                                        ? 'bg-purple-500 text-white shadow-md'
                                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-purple-100'
                                                        }`}
                                                >
                                                    {stage}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] text-slate-500 font-medium">Vello Pubiano (VP)</label>
                                        <div className="grid grid-cols-5 gap-1">
                                            {[1, 2, 3, 4, 5].map((stage) => (
                                                <button
                                                    key={`pubic-${stage}`}
                                                    type="button"
                                                    onClick={() => handleTannerChange('pubicHair', stage as TannerStage)}
                                                    className={`py-2 rounded-lg text-sm font-bold transition-all ${tannerRating.pubicHair === stage
                                                        ? 'bg-purple-500 text-white shadow-md'
                                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-purple-100'
                                                        }`}
                                                >
                                                    {stage}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {biologicalAge && (
                                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                                            <div className="text-xs text-purple-600 dark:text-purple-400">
                                                Edad Biológica Estimada: <span className="font-bold text-purple-800 dark:text-purple-200">{biologicalAge.toFixed(1)} años</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </AccordionSection>

                            {/* Pliegues Cutáneos */}
                            <AccordionSection
                                title="Pliegues Cutáneos"
                                icon={Layers}
                                color="bg-[#6cba00]"
                                isOpen={openSection === 'skinfolds'}
                                onToggle={() => toggleSection('skinfolds')}
                                badge={skinfoldCount > 0 ? `Σ ${skinfoldSum.toFixed(1)}mm` : undefined}
                            >
                                <div className="grid grid-cols-2 gap-3">
                                    <InputField label="Bíceps" value={skinfolds.biceps} onChange={(v) => handleSkinfoldChange('biceps', v)} unit="mm" />
                                    <InputField label="Tríceps" value={skinfolds.triceps} onChange={(v) => handleSkinfoldChange('triceps', v)} unit="mm" />
                                    <InputField label="Subescapular" value={skinfolds.subscapular} onChange={(v) => handleSkinfoldChange('subscapular', v)} unit="mm" />
                                    <InputField label="Suprailiaco" value={skinfolds.suprailiac} onChange={(v) => handleSkinfoldChange('suprailiac', v)} unit="mm" />
                                </div>
                            </AccordionSection>
                        </div>
                    </div>

                    {/* 3D Viewer */}
                    <div className="min-h-[400px]">
                        <Pediatric3DViewer
                            gender={patientGender}
                            bodyFatPercent={bodyComposition?.bodyFatPercent ?? null}
                            riskLevel={bodyComposition?.riskLevel}
                        />
                    </div>
                </div>
            </div>

            {/* ========== RIGHT: RESULTS (4 cols like adult) ========== */}
            <div className="lg:col-span-4 space-y-4">
                {/* Formula Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-3">
                        <Activity className="w-4 h-4 text-[#ff8508]" />
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm">Seleccionar Fórmula</h4>
                    </div>

                    <div className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 h-12 rounded-lg flex items-center px-3">
                        <span className="font-semibold text-sm">Pediátrica (Weststrate/Deurenberg)</span>
                    </div>

                    {/* Pliegues requeridos */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="text-[10px] text-slate-400 font-medium">Requiere:</span>
                        {['Bíceps', 'Tríceps', 'Subescapular', 'Suprailiaco'].map((label) => (
                            <span
                                key={label}
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${missingLabels.includes(label)
                                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                    : 'bg-[#6cba00]/10 text-[#6cba00]'
                                    }`}
                            >
                                {label}
                            </span>
                        ))}
                    </div>

                    {/* Descripción */}
                    <div className="mt-3 flex items-start gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Ecuación validada para niños y adolescentes de 10-18 años (Weststrate & Deurenberg, 1989).
                        </p>
                    </div>
                </div>

                {/* Missing Skinfolds Alert */}
                {missingLabels.length > 0 && (
                    <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 animate-in fade-in duration-300">
                        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        <div>
                            <div className="font-semibold text-amber-700 dark:text-amber-300 text-sm">
                                Faltan pliegues requeridos
                            </div>
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                Ingresa: {missingLabels.join(', ')} para usar esta fórmula.
                            </p>
                        </div>
                    </div>
                )}

                {/* Results - Same orange gradient as adult */}
                {bodyComposition && (
                    <div className="space-y-3 animate-in fade-in duration-500">
                        {/* Main Card: % Fat */}
                        <div className="bg-gradient-to-br from-[#ff8508] to-[#e67607] rounded-2xl p-6 text-white shadow-xl shadow-[#ff8508]/30">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-medium text-white/80">% Grasa Corporal</div>
                                    <div className="text-xs text-white/60 mt-0.5">
                                        Fórmula: Weststrate/Deurenberg
                                    </div>
                                </div>
                                <CheckCircle2 className="w-6 h-6 text-white/70" />
                            </div>
                            <div className="mt-4">
                                <span className="text-5xl font-black">{bodyComposition.bodyFatPercent.toFixed(1)}</span>
                                <span className="text-2xl font-bold ml-1">%</span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-white/20 text-xs text-white/70">
                                Densidad Corporal: {bodyComposition.density.toFixed(4)} g/cm³
                            </div>
                        </div>

                        {/* Secondary Cards: Masses */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Fat Mass */}
                            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                        <Scale className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                </div>
                                <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                                    {bodyComposition.fatMass.toFixed(1)}
                                    <span className="text-sm font-medium text-amber-500/70 ml-1">kg</span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">Masa Grasa</div>
                            </div>

                            {/* Lean Mass */}
                            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-[#6cba00]/10 flex items-center justify-center">
                                        <TrendingUp className="w-4 h-4 text-[#6cba00]" />
                                    </div>
                                </div>
                                <div className="text-2xl font-black text-[#6cba00]">
                                    {bodyComposition.leanMass.toFixed(1)}
                                    <span className="text-sm font-medium text-[#6cba00]/70 ml-1">kg</span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">Masa Libre de Grasa</div>
                            </div>
                        </div>

                        {/* Classification */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Clasificación</span>
                                <span className={`font-bold ${bodyComposition.riskLevel === 'bajo' ? 'text-blue-500' :
                                    bodyComposition.riskLevel === 'normal' ? 'text-[#6cba00]' :
                                        bodyComposition.riskLevel === 'elevado' ? 'text-amber-500' :
                                            'text-red-500'
                                    }`}>
                                    {bodyComposition.label}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {peso <= 0 && (
                    <div className="text-center py-6 text-slate-400 text-sm">
                        Ingresa el peso corporal para calcular
                    </div>
                )}
            </div>
        </div>
    );
}

export default PediatricBodyCompositionPanel;
