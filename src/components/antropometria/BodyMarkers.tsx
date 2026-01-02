"use client";

import { useState } from "react";
import { Html, Sphere } from "@react-three/drei";
import { getSkinfoldSite, SkinfoldMeasurement, Gender } from "@/lib/skinfold-map";
import { getIsakTooltip } from "@/lib/measurementsData";
import { AlertTriangle, Info } from "lucide-react";
import * as THREE from "three";

// --- ICONOS PARA TIPO DE PLIEGUE ---
const getFoldIcon = (type: string) => {
    switch (type) {
        case 'Vertical': return '↕️';
        case 'Diagonal': return '↗️';
        case 'Oblicuo': return '↘️';
        default: return '📍';
    }
};

// --- MARCADOR INDIVIDUAL ---
interface SingleMarkerProps {
    measurement: SkinfoldMeasurement;
    isHighlighted: boolean;
    gender: Gender;
}

function SingleMarker({ measurement, isHighlighted, gender }: SingleMarkerProps) {
    const [hovered, setHovered] = useState(false);
    const [selected, setSelected] = useState(false);
    const site = getSkinfoldSite(measurement.siteKey, gender);
    const isakTooltip = getIsakTooltip(`skinfold_${measurement.siteKey}`);

    const active = isHighlighted || hovered || selected;
    const hasValue = measurement.value > 0;

    return (
        <group position={site.position}>
            {/* Esfera principal */}
            <Sphere
                args={[0.025, 32, 32]}
                onClick={(e) => { e.stopPropagation(); setSelected(!selected); }}
                onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
                onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
                scale={active ? 1.5 : 1}
            >
                <meshStandardMaterial
                    color={active ? "#6cba00" : (hasValue ? "#ff8508" : "#cbd5e1")} // Green (active) / Orange (has value) / Grey (empty)
                    emissive={active ? "#6cba00" : (hasValue ? "#ff8508" : "#94a3b8")}
                    emissiveIntensity={active ? 2.5 : (hasValue ? 1.2 : 0.5)}
                    toneMapped={false}
                />
            </Sphere>

            {/* Anillo pulsante */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} scale={active ? 2.2 : 1.4}>
                <ringGeometry args={[0.028, 0.035, 32]} />
                <meshBasicMaterial
                    color={active ? "#6cba00" : (hasValue ? "#ff8508" : "#cbd5e1")}
                    transparent
                    opacity={active ? 0.8 : 0.4}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Tooltip (visible on click or highlighted) */}
            <Html
                position={[0, 0.1, 0]}
                center
                distanceFactor={4}
                style={{
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    opacity: selected || isHighlighted ? 1 : 0,
                    transform: `scale(${selected || isHighlighted ? 1 : 0.85}) translateY(${selected || isHighlighted ? 0 : 8}px)`,
                    pointerEvents: 'none',
                    zIndex: 1000,
                }}
            >
                <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/50 px-4 py-3.5 border border-slate-700 w-[280px] text-white">
                        {/* Header: Title & Value */}
                        <div className="flex items-start justify-between border-b border-slate-700 pb-2 mb-2">
                            <div>
                                <div className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
                                    {isakTooltip?.label || site.name}
                                    {getFoldIcon(site.type) && <span title={site.type} className="text-xs cursor-help">{getFoldIcon(site.type)}</span>}
                                </div>
                                <div className="text-[10px] text-[#6cba00] font-medium mt-0.5 uppercase tracking-wider opacity-80">
                                    {isakTooltip?.category || "Skinfold"}
                                </div>
                            </div>
                            {hasValue ? (
                                <div className="text-right">
                                    <div className="text-2xl font-black text-[#6cba00] leading-none">{measurement.value}</div>
                                    <div className="text-[9px] text-slate-400 font-bold uppercase">mm</div>
                                </div>
                            ) : (
                                <div className="bg-slate-800 px-2 py-1 rounded text-[10px] text-slate-400 italic font-medium">
                                    Sin dato
                                </div>
                            )}
                        </div>

                        {/* ISAK Content */}
                        {isakTooltip ? (
                            <div className="space-y-2.5">
                                <div className="text-[11px] leading-relaxed text-slate-300">
                                    <span className="text-[#6cba00] font-bold">Definición:</span> {isakTooltip.definition}
                                </div>

                                <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50">
                                    <span className="text-[10px] text-white font-bold block mb-1 opacity-90">Técnica:</span>
                                    <ul className="list-disc list-inside space-y-1 text-[10px] text-slate-300 marker:text-[#6cba00]">
                                        {isakTooltip.technique.slice(0, 3).map((step, i) => (
                                            <li key={i} className="leading-snug">{step}</li>
                                        ))}
                                    </ul>
                                </div>

                                {isakTooltip.safetyNote && (
                                    <div className="flex gap-2 items-start bg-red-950/30 border border-red-900/50 p-2 rounded-lg">
                                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-red-200 leading-snug font-medium">
                                            {isakTooltip.safetyNote}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-[11px] text-slate-400 leading-tight">{site.description}</p>
                        )}
                    </div>

                    {/* Arrow */}
                    <div className="w-0 h-0 border-l-[10px] border-l-transparent border-t-[10px] border-t-slate-900/95 border-r-[10px] border-r-transparent drop-shadow-lg -mt-[1px]"></div>
                </div>
            </Html>
        </group>
    );
}

// --- COMPONENTE PRINCIPAL ---
interface BodyMarkersProps {
    measurements: SkinfoldMeasurement[];
    hoveredId: string | null;
    gender?: Gender;
}

export function BodyMarkers({ measurements, hoveredId, gender = 'masculino' }: BodyMarkersProps) {
    // Mod: Renderizar todos los marcadores, incluso con valor 0
    const validMeasurements = measurements;

    return (
        <group>
            {validMeasurements.map((measurement) => (
                <SingleMarker
                    key={measurement.id}
                    measurement={measurement}
                    isHighlighted={hoveredId === measurement.id}
                    gender={gender}
                />
            ))}
        </group>
    );
}

export default BodyMarkers;
