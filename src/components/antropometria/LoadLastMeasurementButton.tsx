"use client";

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getLastAnthropometryAction } from '@/actions/anthropometry-actions';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { mapRecordToFormValues } from '@/hooks/useLastMeasurement';

interface LoadLastMeasurementButtonProps {
    patientId: string | null;
    onMeasurementLoaded?: (values: Record<string, number | undefined>, record: any) => void;
    className?: string;
    variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
}

/**
 * LoadLastMeasurementButton
 * 
 * Fetches the most recent measurement from history and pre-fills
 * the form. Supports both RHF (via useFormContext) and standard
 * prop-based updates (via onMeasurementLoaded).
 * 
 * EXCLUDES Weight, Height, and Age as per requirements.
 */
export function LoadLastMeasurementButton({
    patientId,
    onMeasurementLoaded,
    className,
    variant = 'outline',
    size = 'sm'
}: LoadLastMeasurementButtonProps) {
    // Optional RHF context
    const rhfContext = useFormContext();
    const [isLoading, setIsLoading] = useState(false);

    const handleLoad = async () => {
        if (!patientId) {
            toast.error("Selecciona un paciente primero");
            return;
        }

        setIsLoading(true);
        try {
            const result = await getLastAnthropometryAction(patientId);
            const { data: lastRecord, diagnostic } = result || { data: null, diagnostic: null };

            if (diagnostic) {
                console.log("--- LOAD LAST MEASUREMENT DIAGNOSTIC ---");
                console.log(JSON.stringify(diagnostic, null, 2));
                console.log("----------------------------------------");
            }

            if (!lastRecord) {
                toast.error("No hay mediciones previas para este paciente");
                return;
            }

            // --- SMART PRE-FILL LOGIC ---

            // 1. Handle RHF Mode
            if (rhfContext) {
                const { setValue } = rhfContext;

                // Skinfolds
                const skinfolds = [
                    'triceps', 'subscapular', 'biceps', 'iliac_crest',
                    'supraspinale', 'abdominal', 'thigh', 'calf'
                ];

                skinfolds.forEach(site => {
                    if (lastRecord[site]) {
                        setValue(`pliegues.${site}.val1`, lastRecord[site], { shouldDirty: true });
                        setValue(`pliegues.${site}.val2`, lastRecord[site], { shouldDirty: true });
                    }
                });

                // Perimeters
                const perimetersMapping: Record<string, string> = {
                    'arm_flexed': 'brazoFlex',
                    'arm_relaxed': 'brazoRelax',
                    'waist': 'cintura',
                    'hip': 'cadera',
                    'thigh_mid': 'musloMedio',
                    'calf_max': 'pantorrilla'
                };
                Object.entries(perimetersMapping).forEach(([dbKey, formKey]) => {
                    if (lastRecord[dbKey]) {
                        setValue(`perimetros.${formKey}`, lastRecord[dbKey], { shouldDirty: true });
                        if (formKey === 'brazoRelax') {
                            setValue('perimetros.brazoRelajado', lastRecord[dbKey], { shouldDirty: true });
                        }
                    }
                });

                // Top level Head Circumference
                if (lastRecord.head_circumference) {
                    setValue('headCircumference', lastRecord.head_circumference, { shouldDirty: true });
                }

                // Diameters
                const diametersMapping: Record<string, string> = {
                    'humerus': 'humero',
                    'femur': 'femur',
                    'biacromial': 'biacromial',
                    'biiliocristal': 'biiliocristal',
                    'biestiloideo': 'biestiloideo' // Added biestiloideo
                };
                Object.entries(diametersMapping).forEach(([dbKey, formKey]) => {
                    if (lastRecord[dbKey]) setValue(`diametros.${formKey}`, lastRecord[dbKey], { shouldDirty: true });
                });
            }

            // 2. Handle Prop-based Mode (for UnifiedMeasurementForm)
            if (onMeasurementLoaded) {
                const values = mapRecordToFormValues(lastRecord);

                // EXCLUDE weight and height as per requirements for the pre-fill
                const filteredValues = { ...values };
                delete filteredValues.peso;
                delete filteredValues.talla;

                onMeasurementLoaded(filteredValues, lastRecord);
            }

            const formattedDate = format(new Date(lastRecord.created_at), "dd/MM/yyyy", { locale: es });
            toast.success(`Datos cargados de la fecha ${formattedDate}`);

        } catch (error) {
            console.error("Error loading last measurement:", error);
            toast.error("Error al conectar con el servidor");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleLoad}
            disabled={isLoading || !patientId}
            className={`
                group relative inline-flex items-center gap-3
                px-5 py-2.5
                bg-gradient-to-r from-amber-500 to-orange-500
                hover:from-amber-600 hover:to-orange-600
                text-white font-medium text-sm
                rounded-full
                shadow-lg shadow-orange-500/25
                hover:shadow-xl hover:shadow-orange-500/30
                transition-all duration-300 ease-out
                hover:scale-[1.02]
                active:scale-[0.98]
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                ${className}
            `}
        >
            {/* Animated icon */}
            <span className={`
                flex-shrink-0
                ${isLoading ? 'animate-spin' : 'group-hover:rotate-[-45deg]'}
                transition-transform duration-300
            `}>
                {isLoading ? (
                    <Loader2 className="w-5 h-5" />
                ) : (
                    <RefreshCw className="w-5 h-5" />
                )}
            </span>

            <span className="whitespace-nowrap">Cargar última medición</span>

            {/* Subtle shine effect on hover */}
            <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                <div className="absolute -inset-full top-0 block w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 group-hover:animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
        </button>
    );
}

export default LoadLastMeasurementButton;
