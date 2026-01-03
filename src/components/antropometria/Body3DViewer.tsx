"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Html, Stage, Center } from "@react-three/drei";
import { Suspense, useEffect, useCallback, useMemo } from "react";
import { BodyMarkers } from "./BodyMarkers";
import { SkinfoldMeasurement } from "@/lib/skinfold-map";
import { FullMeasurementData } from "./UnifiedMeasurementForm";

// Model paths
const MALE_MODEL_PATH = "/models/cuerpo_humano.glb";
const FEMALE_MODEL_PATH = "/models/cuerpo_humano.glb"; // TE: Debugging - Swap to verify code works

// Configuración de transformaciones para cada modelo
const MODEL_CONFIG = {
    masculino: {
        scale: 1,
        position: [0, 0, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
    },
    femenino: {
        scale: 1,  // Probar con escala 1
        position: [0, 0, 0] as [number, number, number],  // Sin offset
        rotation: [0, Math.PI, 0] as [number, number, number],  // Rotar 180°
    }
};

// --- MODELO 3D ---
function Model({ onLoaded, gender }: { onLoaded: () => void; gender: 'masculino' | 'femenino' }) {
    const modelPath = gender === 'femenino' ? FEMALE_MODEL_PATH : MALE_MODEL_PATH;
    const { scene } = useGLTF(modelPath);
    const config = MODEL_CONFIG[gender];

    useEffect(() => {
        if (scene) onLoaded();
    }, [scene, onLoaded]);

    return (
        <primitive
            object={scene}
            scale={config.scale}
            position={config.position}
            rotation={config.rotation}
        />
    );
}

// Preload both models
useGLTF.preload(MALE_MODEL_PATH);
useGLTF.preload(FEMALE_MODEL_PATH);

function Loader() {
    return (
        <Html center>
            <div className="flex flex-col items-center gap-4 p-6 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl">
                <div className="relative">
                    <div className="w-14 h-14 border-4 border-[#ff8508]/20 rounded-full"></div>
                    <div className="w-14 h-14 border-4 border-[#ff8508] border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                </div>
                <div className="text-center">
                    <div className="text-[#ff8508] font-bold text-sm">Cargando Modelo 3D</div>
                    <div className="text-slate-400 text-xs mt-1">Preparando visualización...</div>
                </div>
            </div>
        </Html>
    );
}

// Convertir FullMeasurementData a SkinfoldMeasurement[] para marcadores
function dataToMeasurements(data: FullMeasurementData): SkinfoldMeasurement[] {
    const measurements: SkinfoldMeasurement[] = [];
    const skinfoldKeys = ['triceps', 'subscapular', 'biceps', 'iliac_crest', 'supraspinale', 'abdominal', 'thigh', 'calf'] as const;

    skinfoldKeys.forEach(key => {
        const value = data.skinfolds[key] || 0;
        measurements.push({
            id: key,
            siteKey: key,
            value,
            date: new Date().toISOString()
        });
    });

    return measurements;
}

// --- COMPONENTE PRINCIPAL ---
interface Body3DViewerProps {
    data?: FullMeasurementData;
    measurements?: SkinfoldMeasurement[];
    hoveredId?: string | null;
    onLoaded?: () => void;
}

export function Body3DViewer({ data, measurements, hoveredId, onLoaded }: Body3DViewerProps) {
    const handleLoaded = useCallback(() => {
        onLoaded?.();
    }, [onLoaded]);

    // Determinar género del paciente (por defecto masculino)
    const patientGender = useMemo(() => {
        return data?.bioData?.genero || 'masculino';
    }, [data?.bioData?.genero]);

    // Usar measurements directamente o convertir desde data
    const finalMeasurements = measurements || (data ? dataToMeasurements(data) : []);
    // Contar solo los pliegues con valor > 0
    const filledMeasurementCount = finalMeasurements.filter(m => m.value > 0).length;

    return (
        <div className="relative w-full h-full min-h-[500px] rounded-2xl shadow-xl shadow-slate-300/50 dark:shadow-slate-900/50 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-slate-200/50 dark:border-slate-700/50">

            {/* Header overlay */}
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">
                    ANÁLISIS <span className="text-[#ff8508]">CORPORAL</span>
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Modelo Interactivo
                </p>
            </div>

            {/* Badge contador */}
            {filledMeasurementCount > 0 && (
                <div className="absolute top-4 right-4 z-10">
                    <div className="flex items-center gap-1.5 bg-[#6cba00] text-white text-xs font-bold pl-2 pr-3 py-1.5 rounded-full shadow-lg shadow-[#6cba00]/30">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                        {filledMeasurementCount} punto{filledMeasurementCount !== 1 ? 's' : ''}
                    </div>
                </div>
            )}

            {/* CANVAS 3D */}
            <Canvas
                shadows
                camera={{ position: [0, 0.3, 3.5], fov: 40 }}
                gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
                style={{ background: 'transparent' }}
            >
                <ambientLight intensity={0.8} />
                <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
                <directionalLight position={[-3, 3, -3]} intensity={0.4} />
                <spotLight position={[0, 10, 0]} intensity={0.3} angle={0.5} />

                <Suspense fallback={<Loader />}>
                    <Stage
                        intensity={0.3}
                        environment="city"
                        adjustCamera={1.3}
                        shadows={{ type: 'contact', opacity: 0.3, blur: 2 }}
                    >
                        <Center>
                            <Model onLoaded={handleLoaded} gender={patientGender} />
                        </Center>
                    </Stage>
                </Suspense>

                <BodyMarkers measurements={finalMeasurements} hoveredId={hoveredId || null} gender={patientGender} />

                <OrbitControls
                    enablePan={false}
                    enableZoom={true}
                    enableRotate={true}
                    minDistance={2}
                    maxDistance={8}
                    minPolarAngle={Math.PI / 5}
                    maxPolarAngle={Math.PI / 1.4}
                    rotateSpeed={0.5}
                    zoomSpeed={0.8}
                />
            </Canvas>

            {/* Footer */}
            <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                <div className="inline-flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg text-slate-600 dark:text-slate-300 text-[10px] px-4 py-2 rounded-full font-medium shadow-lg border border-slate-200/50 dark:border-slate-700/50">
                    <span>🖱️ Rotar</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span>🔍 Zoom</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span>👆 Clic marcador</span>
                </div>
            </div>
        </div>
    );
}
