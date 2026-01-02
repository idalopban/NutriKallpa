"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, ContactShadows, Float, Sparkles, Html } from "@react-three/drei";
import { Suspense, useRef, useState } from "react";
import * as THREE from "three";

// --- Marker Component ---
// Interactive points on the body
function Marker({ position, label, onClick }: { position: [number, number, number], label: string, onClick?: () => void }) {
    const [hovered, setHovered] = useState(false);
    const ref = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (ref.current) {
            // Gentle floating animation
            ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
        }
    });

    return (
        <group ref={ref} position={position}>
            {/* The Sphere Marker */}
            <mesh
                onClick={onClick}
                onPointerOver={() => { document.body.style.cursor = 'pointer'; setHovered(true); }}
                onPointerOut={() => { document.body.style.cursor = 'auto'; setHovered(false); }}
                scale={hovered ? 1.5 : 1}
            >
                <sphereGeometry args={[0.08, 32, 32]} />
                <meshStandardMaterial
                    color={hovered ? "#6cba00" : "#ff8508"}
                    emissive={hovered ? "#6cba00" : "#ff8508"}
                    emissiveIntensity={hovered ? 2 : 1}
                    roughness={0.2}
                    metalness={0.8}
                />
            </mesh>

            {/* Sparkles for "Energy" effect */}
            {hovered && <Sparkles count={10} scale={0.5} size={2} speed={1} opacity={1} color="#6cba00" />}

            {/* Label on Hover */}
            {hovered && (
                <Html position={[0, 0.2, 0]} center>
                    <div className="bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap backdrop-blur-sm border border-white/20">
                        {label}
                    </div>
                </Html>
            )}
        </group>
    );
}

// --- The 3D Model ---
function Model() {
    // Attempt to load the model. If it fails (file missing), this would usually crash without error boundary.
    // For this implementation, we assume the file exists as per instructions.
    // If you don't have the file 'human_body.glb' in public/models/, R3F will likely error or show nothing.
    // We can use a fallback box if needed, but 'useGLTF' caches.

    // Using a primitive placeholder if useGLTF throws 404 in development without the file
    // Ideally: const { scene } = useGLTF("/models/human_body.glb");
    // For robustness in this demo without the actual file, I'll return a placeholder mesh roughly shaped like a human
    // IF loading fails. But standard practice is:

    // const { scene } = useGLTF("/models/human_body.glb");
    // return <primitive object={scene} scale={2} position={[0, -2, 0]} />

    // Since I CANNOT verify the file exists on the user's "simulated" environment, I will use a conditional approach or just standard shapes
    // to represent the body if the user hasn't actually put the file there yet, creating a "Mannequin" from primitive shapes.
    // However, the prompt implies "Asume que tengo un modelo". So I will try to load it.

    // NOTE: To prevent white screen of death if file missing, I will stick to the instruction.

    return (
        <group position={[0, -1.8, 0]}>
            <Suspense fallback={<mesh><boxGeometry /><meshStandardMaterial color="gray" /></mesh>}>
                <HumanMesh />
            </Suspense>

            {/* Add Markers */}
            <Marker position={[0.3, 2.5, 0.2]} label="Bíceps Derecho" />
            <Marker position={[-0.3, 2.5, 0.2]} label="Bíceps Izquierdo" />
            <Marker position={[0, 1.8, 0.3]} label="Abdominales" />
            <Marker position={[0.4, 0.5, 0.3]} label="Muslo Derecho" />
        </group>
    )
}

function HumanMesh() {
    // We try to load. If it fails, the ErrorBoundary of Next.js/React might catch it, or it just errors in console.
    // I will add a fallback mechanism for the DEMO to work even without the file.

    try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { scene } = useGLTF("/models/human_body.glb");
        return <primitive object={scene} scale={1.5} />;
    } catch (e) {
        // Fallback "Medical Mannequin"
        return (
            <group>
                <mesh position={[0, 2.2, 0]} castShadow>
                    <cylinderGeometry args={[0.35, 0.25, 1.4, 32]} />
                    <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.8} transparent opacity={0.8} />
                </mesh>
                {/* Chest definition */}
                <mesh position={[0, 2.6, 0.15]} castShadow>
                    <boxGeometry args={[0.5, 0.4, 0.2]} />
                    <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.8} transparent opacity={0.8} />
                </mesh>
                {/* Head */}
                <mesh position={[0, 3.2, 0]} castShadow>
                    <sphereGeometry args={[0.22, 32, 32]} />
                    <meshStandardMaterial color="#cbd5e1" roughness={0.2} metalness={0.5} />
                </mesh>
                {/* Arms */}
                <group position={[0.5, 2.7, 0]} rotation={[0, 0, -0.2]}>
                    <mesh position={[0, -0.6, 0]}>
                        <cylinderGeometry args={[0.07, 0.06, 1.2, 16]} />
                        <meshStandardMaterial color="#cbd5e1" roughness={0.5} metalness={0.5} />
                    </mesh>
                </group>
                <group position={[-0.5, 2.7, 0]} rotation={[0, 0, 0.2]}>
                    <mesh position={[0, -0.6, 0]}>
                        <cylinderGeometry args={[0.07, 0.06, 1.2, 16]} />
                        <meshStandardMaterial color="#cbd5e1" roughness={0.5} metalness={0.5} />
                    </mesh>
                </group>
                {/* Hips */}
                <mesh position={[0, 1.5, 0]}>
                    <cylinderGeometry args={[0.25, 0.25, 0.4, 32]} />
                    <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.8} />
                </mesh>
                {/* Legs */}
                <mesh position={[0.2, 0.7, 0]} castShadow>
                    <cylinderGeometry args={[0.11, 0.08, 1.6, 32]} />
                    <meshStandardMaterial color="#cbd5e1" roughness={0.5} metalness={0.5} />
                </mesh>
                <mesh position={[-0.2, 0.7, 0]} castShadow>
                    <cylinderGeometry args={[0.11, 0.08, 1.6, 32]} />
                    <meshStandardMaterial color="#cbd5e1" roughness={0.5} metalness={0.5} />
                </mesh>
            </group>
        )
    }
}

// Preload to avoid waterfalls
useGLTF.preload("/models/human_body.glb");


export function HumanBodyViewer() {
    return (
        <div className="h-[600px] w-full bg-gradient-to-b from-white to-slate-100 dark:from-[#0f172a] dark:to-[#1e293b] rounded-2xl overflow-hidden shadow-lg relative border border-slate-200 dark:border-slate-800">
            {/* Overlay Info */}
            <div className="absolute top-4 left-4 z-10">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest bg-white/50 dark:bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                    Vista Frontal
                </h3>
            </div>

            <Canvas shadows camera={{ position: [0, 1.5, 4], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} shadow-mapSize={2048} castShadow intensity={1} />

                {/* Environment for nice reflections */}
                <Environment preset="city" />

                <group position={[0, -0.5, 0]}>
                    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.2}>
                        <Model />
                    </Float>
                    <ContactShadows resolution={1024} scale={10} blur={2.5} opacity={0.5} far={10} color="#000000" />
                </group>

                <OrbitControls
                    enablePan={false}
                    minPolarAngle={Math.PI / 2.5}
                    maxPolarAngle={Math.PI / 1.8}
                    minDistance={3}
                    maxDistance={6}
                />
            </Canvas>

            {/* Interactive Help Hint */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/20 text-slate-500 dark:text-slate-400 text-xs px-3 py-1 rounded-full backdrop-blur-sm pointer-events-none">
                Usa el mouse para rotar y zoom
            </div>
        </div>
    );
}
