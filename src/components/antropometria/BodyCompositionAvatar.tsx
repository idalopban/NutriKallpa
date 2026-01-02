"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface BodyCompositionAvatarProps {
    bodyFatPercent: number;      // % grasa corporal (0-50)
    muscleMassKg?: number;       // Masa muscular en kg
    gender?: 'masculino' | 'femenino';
    height?: number;             // cm - para calcular proporciones
    className?: string;
    showLabels?: boolean;
    somatotype?: {
        endo: number;
        meso: number;
        ecto: number;
    };
}

/**
 * BodyCompositionAvatar - Avatar SVG reactivo que refleja la composición corporal
 * Cambia proporciones según % grasa y somatotipo
 */
export function BodyCompositionAvatar({
    bodyFatPercent,
    muscleMassKg,
    gender = 'masculino',
    height = 170,
    className,
    showLabels = true,
    somatotype,
}: BodyCompositionAvatarProps) {

    // Calcular modificadores basados en composición corporal
    const modifiers = useMemo(() => {
        // Normalizar % grasa a un factor (0 = muy delgado, 1 = muy alto)
        const fatFactor = Math.min(1, Math.max(0, (bodyFatPercent - 8) / 35));

        // Modificadores para diferentes partes del cuerpo
        // Hombres tienden a acumular en abdomen, mujeres en caderas/muslos
        const isFemale = gender === 'femenino';

        return {
            // Expansión del torso (ancho)
            torsoWidth: 1 + (fatFactor * (isFemale ? 0.15 : 0.25)),
            // Expansión abdominal
            abdomenWidth: 1 + (fatFactor * (isFemale ? 0.2 : 0.4)),
            // Expansión de caderas
            hipWidth: 1 + (fatFactor * (isFemale ? 0.35 : 0.15)),
            // Expansión de muslos
            thighWidth: 1 + (fatFactor * (isFemale ? 0.3 : 0.15)),
            // Expansión de brazos
            armWidth: 1 + (fatFactor * 0.2),
            // Factor muscular (basado en somatotipo meso si está disponible)
            muscleFactor: somatotype ? Math.min(1, somatotype.meso / 7) : 0.5,
        };
    }, [bodyFatPercent, gender, somatotype]);

    // Colores según nivel de grasa
    const colors = useMemo(() => {
        if (bodyFatPercent < 12) {
            return { skin: '#E8D5C4', highlight: '#A8E6CF', status: 'Muy bajo' };
        } else if (bodyFatPercent < 20) {
            return { skin: '#E8D5C4', highlight: '#88D8B0', status: 'Saludable' };
        } else if (bodyFatPercent < 25) {
            return { skin: '#E0C8B8', highlight: '#FFD93D', status: 'Moderado' };
        } else if (bodyFatPercent < 32) {
            return { skin: '#D8BBA8', highlight: '#FF9F43', status: 'Alto' };
        } else {
            return { skin: '#D0A898', highlight: '#FF6B6B', status: 'Muy alto' };
        }
    }, [bodyFatPercent]);

    // Clasificación de somatotipo
    const somatotypeLabel = useMemo(() => {
        if (!somatotype) return null;
        const { endo, meso, ecto } = somatotype;

        if (endo > meso && endo > ecto) return 'Endomorfo';
        if (meso > endo && meso > ecto) return 'Mesomorfo';
        if (ecto > endo && ecto > meso) return 'Ectomorfo';
        return 'Equilibrado';
    }, [somatotype]);

    const m = modifiers;

    return (
        <div className={cn("relative flex flex-col items-center", className)}>
            {/* SVG del cuerpo */}
            <svg
                viewBox="0 0 200 400"
                className="w-full max-w-[200px] h-auto drop-shadow-md"
            >
                {/* Gradiente para efecto 3D */}
                <defs>
                    <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style={{ stopColor: colors.skin, stopOpacity: 0.9 }} />
                        <stop offset="50%" style={{ stopColor: colors.skin, stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: colors.skin, stopOpacity: 0.8 }} />
                    </linearGradient>
                    <radialGradient id="fatHighlight" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" style={{ stopColor: colors.highlight, stopOpacity: 0.3 }} />
                        <stop offset="100%" style={{ stopColor: colors.highlight, stopOpacity: 0 }} />
                    </radialGradient>
                </defs>

                {/* Cabeza */}
                <ellipse
                    cx="100"
                    cy="35"
                    rx="25"
                    ry="30"
                    fill="url(#bodyGradient)"
                    stroke="#C4A882"
                    strokeWidth="1"
                />

                {/* Cuello */}
                <rect
                    x="90"
                    y="60"
                    width="20"
                    height="15"
                    fill="url(#bodyGradient)"
                />

                {/* Torso - se expande con grasa */}
                <path
                    d={`
            M ${100 - 30 * m.torsoWidth} 75
            C ${100 - 35 * m.torsoWidth} 100, ${100 - 40 * m.abdomenWidth} 150, ${100 - 35 * m.hipWidth} 180
            L ${100 + 35 * m.hipWidth} 180
            C ${100 + 40 * m.abdomenWidth} 150, ${100 + 35 * m.torsoWidth} 100, ${100 + 30 * m.torsoWidth} 75
            Z
          `}
                    fill="url(#bodyGradient)"
                    stroke="#C4A882"
                    strokeWidth="1"
                />

                {/* Zona de acumulación de grasa (abdomen) - visible si grasa > 20% */}
                {bodyFatPercent > 20 && (
                    <ellipse
                        cx="100"
                        cy="140"
                        rx={25 * m.abdomenWidth}
                        ry={20 * m.abdomenWidth}
                        fill="url(#fatHighlight)"
                    />
                )}

                {/* Brazos izquierdo */}
                <path
                    d={`
            M ${100 - 30 * m.torsoWidth} 78
            C ${100 - 50 * m.armWidth} 85, ${100 - 55 * m.armWidth} 140, ${100 - 45 * m.armWidth} 170
            L ${100 - 40 * m.armWidth} 170
            C ${100 - 48 * m.armWidth} 145, ${100 - 42 * m.armWidth} 90, ${100 - 28 * m.torsoWidth} 85
            Z
          `}
                    fill="url(#bodyGradient)"
                    stroke="#C4A882"
                    strokeWidth="1"
                />

                {/* Brazo derecho */}
                <path
                    d={`
            M ${100 + 30 * m.torsoWidth} 78
            C ${100 + 50 * m.armWidth} 85, ${100 + 55 * m.armWidth} 140, ${100 + 45 * m.armWidth} 170
            L ${100 + 40 * m.armWidth} 170
            C ${100 + 48 * m.armWidth} 145, ${100 + 42 * m.armWidth} 90, ${100 + 28 * m.torsoWidth} 85
            Z
          `}
                    fill="url(#bodyGradient)"
                    stroke="#C4A882"
                    strokeWidth="1"
                />

                {/* Pierna izquierda */}
                <path
                    d={`
            M ${100 - 35 * m.hipWidth} 180
            C ${100 - 35 * m.thighWidth} 220, ${100 - 30 * m.thighWidth} 280, ${100 - 20} 350
            L ${100 - 10} 350
            C ${100 - 15} 280, ${100 - 10} 220, ${100 - 5} 180
            Z
          `}
                    fill="url(#bodyGradient)"
                    stroke="#C4A882"
                    strokeWidth="1"
                />

                {/* Pierna derecha */}
                <path
                    d={`
            M ${100 + 35 * m.hipWidth} 180
            C ${100 + 35 * m.thighWidth} 220, ${100 + 30 * m.thighWidth} 280, ${100 + 20} 350
            L ${100 + 10} 350
            C ${100 + 15} 280, ${100 + 10} 220, ${100 + 5} 180
            Z
          `}
                    fill="url(#bodyGradient)"
                    stroke="#C4A882"
                    strokeWidth="1"
                />

                {/* Pies */}
                <ellipse cx="85" cy="360" rx="15" ry="8" fill="url(#bodyGradient)" />
                <ellipse cx="115" cy="360" rx="15" ry="8" fill="url(#bodyGradient)" />
            </svg>

            {/* Etiquetas */}
            {showLabels && (
                <div className="mt-4 text-center space-y-2">
                    {/* % Grasa */}
                    <div className="flex items-center justify-center gap-2">
                        <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: colors.highlight }}
                        />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {bodyFatPercent.toFixed(1)}% Grasa
                        </span>
                        <span
                            className={cn(
                                "text-xs px-2 py-0.5 rounded-full font-medium",
                                bodyFatPercent < 20
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : bodyFatPercent < 28
                                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            )}
                        >
                            {colors.status}
                        </span>
                    </div>

                    {/* Somatotipo */}
                    {somatotypeLabel && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            Perfil: <span className="font-medium text-slate-700 dark:text-slate-300">{somatotypeLabel}</span>
                        </div>
                    )}

                    {/* Masa muscular */}
                    {muscleMassKg && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            Masa Muscular: <span className="font-medium text-blue-600 dark:text-blue-400">{muscleMassKg.toFixed(1)} kg</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * BodyCompositionComparison - Muestra antes/después lado a lado
 */
export function BodyCompositionComparison({
    before,
    after,
    className,
}: {
    before: { bodyFatPercent: number; label?: string };
    after: { bodyFatPercent: number; label?: string };
    className?: string;
}) {
    return (
        <div className={cn("flex items-end justify-center gap-8", className)}>
            <div className="flex flex-col items-center">
                <span className="text-xs font-medium text-slate-500 mb-2">
                    {before.label || 'Antes'}
                </span>
                <BodyCompositionAvatar
                    bodyFatPercent={before.bodyFatPercent}
                    showLabels={false}
                    className="opacity-60"
                />
                <span className="mt-2 text-sm font-semibold text-slate-600">
                    {before.bodyFatPercent.toFixed(1)}%
                </span>
            </div>

            <div className="flex flex-col items-center text-2xl text-slate-300">
                →
            </div>

            <div className="flex flex-col items-center">
                <span className="text-xs font-medium text-slate-500 mb-2">
                    {after.label || 'Actual'}
                </span>
                <BodyCompositionAvatar
                    bodyFatPercent={after.bodyFatPercent}
                    showLabels={false}
                />
                <span className="mt-2 text-sm font-semibold text-green-600">
                    {after.bodyFatPercent.toFixed(1)}%
                </span>
            </div>
        </div>
    );
}
