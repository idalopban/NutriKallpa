"use client";

/**
 * Load Last Measurement Button
 * 
 * Button that fetches and pre-fills the last measurement data
 * for faster follow-up appointments.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    ClipboardCopy,
    Loader2,
    CheckCircle2,
    AlertCircle,
    History
} from 'lucide-react';
import { useLastMeasurement, mapRecordToFormValues, type LastMeasurementData } from '@/hooks/useLastMeasurement';
import { cn } from '@/lib/utils';

interface LoadLastMeasurementButtonProps {
    patientId: string | null;
    onMeasurementLoaded: (values: Record<string, number | undefined>, record: LastMeasurementData) => void;
    className?: string;
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function LoadLastMeasurementButton({
    patientId,
    onMeasurementLoaded,
    className,
    variant = 'outline',
    size = 'sm'
}: LoadLastMeasurementButtonProps) {
    const { isLoading, error, fetchLastMeasurement } = useLastMeasurement(patientId);
    const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'empty'>('idle');

    const handleClick = async () => {
        if (!patientId) {
            setStatus('error');
            return;
        }

        const record = await fetchLastMeasurement();

        if (record) {
            const formValues = mapRecordToFormValues(record);
            onMeasurementLoaded(formValues, record);
            setStatus('success');

            // Reset status after 3 seconds
            setTimeout(() => setStatus('idle'), 3000);
        } else {
            setStatus('empty');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    const getIcon = () => {
        if (isLoading) return <Loader2 className="w-4 h-4 animate-spin" />;
        if (status === 'success') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
        if (status === 'error') return <AlertCircle className="w-4 h-4 text-red-500" />;
        if (status === 'empty') return <History className="w-4 h-4 text-amber-500" />;
        return <ClipboardCopy className="w-4 h-4" />;
    };

    const getText = () => {
        if (isLoading) return 'Cargando...';
        if (status === 'success') return '¡Cargado!';
        if (status === 'error') return 'Error';
        if (status === 'empty') return 'Sin historial';
        return 'Cargar última medición';
    };

    const getTooltipText = () => {
        if (status === 'success') return 'Datos cargados correctamente';
        if (status === 'error') return error || 'Error al cargar';
        if (status === 'empty') return 'No hay mediciones anteriores para este paciente';
        return 'Pre-llenar con la última evaluación del paciente';
    };

    return (
        <Button
            type="button"
            variant={variant}
            size={size}
            onClick={handleClick}
            disabled={isLoading || !patientId}
            title={getTooltipText()}
            className={cn(
                'gap-2 transition-all',
                status === 'success' && 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100',
                status === 'error' && 'border-red-300 bg-red-50 text-red-700',
                status === 'empty' && 'border-amber-300 bg-amber-50 text-amber-700',
                className
            )}
        >
            {getIcon()}
            <span className="hidden sm:inline">{getText()}</span>
        </Button>
    );
}

export default LoadLastMeasurementButton;
