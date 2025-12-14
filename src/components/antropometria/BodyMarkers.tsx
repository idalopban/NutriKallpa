"use client";

import { useState } from "react";
import { Html, Sphere } from "@react-three/drei";
import { getSkinfoldSite, SkinfoldMeasurement, Gender } from "@/lib/skinfold-map";
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
                }}
            >
                <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-slate-900/20 px-4 py-3 border border-slate-100 min-w-[180px]">
                        {/* Nombre */}
                        <div className="text-sm font-bold text-slate-800 mb-1.5">{site.name}</div>

                        {/* Badge tipo */}
                        <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full mb-2">
                            <span>{getFoldIcon(site.type)}</span>
                            <span>{site.type}</span>
                        </div>

                        {/* Descripción */}
                        <p className="text-[11px] text-slate-500 leading-tight mb-3">{site.description}</p>

                        {/* Valor destacado */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Medición</span>
                            {hasValue ? (
                                <span className="text-2xl font-black text-[#6cba00]">{measurement.value}<span className="text-sm font-normal">mm</span></span>
                            ) : (
                                <span className="text-sm font-bold text-slate-400 italic">Sin medición</span>
                            )}
                        </div>
                    </div>

                    {/* Flecha */}
                    <div className="w-0 h-0 border-l-[10px] border-l-transparent border-t-[10px] border-t-white/95 border-r-[10px] border-r-transparent drop-shadow-lg -mt-[1px]"></div>
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
