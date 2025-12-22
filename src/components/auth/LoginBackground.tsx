"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// Configuración del efecto de píxeles
const PIXEL_CONFIG = {
    gridSize: 20,        // Tamaño de cada cuadrado en px
    maxDistance: 200,    // Radio de influencia del cursor
    baseOpacity: 0.03,   // Opacidad base de la rejilla
    activeOpacity: 0.4,  // Opacidad máxima cuando el cursor está cerca
    colors: ['#6cba00', '#ff8508', '#4a9d00', '#e67600', '#ffd700'],
    transitionSpeed: 0.08, // Velocidad de transición
};

interface Pixel {
    x: number;
    y: number;
    size: number;
    color: string;
    currentOpacity: number;
    targetOpacity: number;
    scale: number;
    targetScale: number;
}

export function LoginBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const lightCanvasRef = useRef<HTMLCanvasElement>(null);
    const appRef = useRef<any>(null);
    const pixelsRef = useRef<Pixel[]>([]);
    const mouseRef = useRef({ x: -1000, y: -1000 });
    const animationFrameRef = useRef<number>(0);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [mounted, setMounted] = useState(false);

    // Detectar modo oscuro/claro
    useEffect(() => {
        setMounted(true);

        const checkTheme = () => {
            const isDark = document.documentElement.classList.contains('dark');
            setIsDarkMode(isDark);
        };

        checkTheme();

        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => observer.disconnect();
    }, []);

    // Cleanup para modo oscuro (Three.js)
    const cleanupDarkMode = useCallback(() => {
        if (appRef.current && typeof appRef.current.dispose === "function") {
            try {
                appRef.current.dispose();
            } catch (e) {
                console.warn("Error disposing TubesCursor:", e);
            }
            appRef.current = null;
        }
    }, []);

    // Inicializar píxeles para modo claro
    const initPixels = useCallback((canvas: HTMLCanvasElement) => {
        const pixels: Pixel[] = [];
        const cols = Math.ceil(canvas.width / PIXEL_CONFIG.gridSize) + 1;
        const rows = Math.ceil(canvas.height / PIXEL_CONFIG.gridSize) + 1;

        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                pixels.push({
                    x: i * PIXEL_CONFIG.gridSize,
                    y: j * PIXEL_CONFIG.gridSize,
                    size: PIXEL_CONFIG.gridSize - 2,
                    color: PIXEL_CONFIG.colors[Math.floor(Math.random() * PIXEL_CONFIG.colors.length)],
                    currentOpacity: PIXEL_CONFIG.baseOpacity,
                    targetOpacity: PIXEL_CONFIG.baseOpacity,
                    scale: 1,
                    targetScale: 1,
                });
            }
        }
        return pixels;
    }, []);

    // Animar píxeles en modo claro
    const animatePixels = useCallback(() => {
        const canvas = lightCanvasRef.current;
        if (!canvas || isDarkMode) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Limpiar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const mouse = mouseRef.current;

        // Actualizar y dibujar cada píxel
        pixelsRef.current.forEach((pixel) => {
            // Calcular distancia al cursor
            const dx = mouse.x - (pixel.x + pixel.size / 2);
            const dy = mouse.y - (pixel.y + pixel.size / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Calcular opacidad y escala objetivo basado en distancia
            if (distance < PIXEL_CONFIG.maxDistance) {
                const intensity = 1 - (distance / PIXEL_CONFIG.maxDistance);
                pixel.targetOpacity = PIXEL_CONFIG.baseOpacity + (PIXEL_CONFIG.activeOpacity - PIXEL_CONFIG.baseOpacity) * intensity;
                pixel.targetScale = 1 + intensity * 0.3;
            } else {
                pixel.targetOpacity = PIXEL_CONFIG.baseOpacity;
                pixel.targetScale = 1;
            }

            // Transición suave
            pixel.currentOpacity += (pixel.targetOpacity - pixel.currentOpacity) * PIXEL_CONFIG.transitionSpeed;
            pixel.scale += (pixel.targetScale - pixel.scale) * PIXEL_CONFIG.transitionSpeed;

            // Dibujar píxel
            ctx.save();
            ctx.globalAlpha = pixel.currentOpacity;
            ctx.fillStyle = pixel.color;

            const centerX = pixel.x + pixel.size / 2;
            const centerY = pixel.y + pixel.size / 2;
            const scaledSize = pixel.size * pixel.scale;

            ctx.fillRect(
                centerX - scaledSize / 2,
                centerY - scaledSize / 2,
                scaledSize,
                scaledSize
            );
            ctx.restore();
        });

        animationFrameRef.current = requestAnimationFrame(animatePixels);
    }, [isDarkMode]);

    // Handler de movimiento del mouse
    const handleMouseMove = useCallback((e: MouseEvent) => {
        mouseRef.current = { x: e.clientX, y: e.clientY };
    }, []);

    // Handler de salida del mouse
    const handleMouseLeave = useCallback(() => {
        mouseRef.current = { x: -1000, y: -1000 };
    }, []);

    // Efecto para modo claro (Canvas con píxeles)
    useEffect(() => {
        if (!mounted || isDarkMode) {
            cancelAnimationFrame(animationFrameRef.current);
            return;
        }

        const canvas = lightCanvasRef.current;
        if (!canvas) return;

        // Configurar tamaño del canvas
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            pixelsRef.current = initPixels(canvas);
        };

        resize();
        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);

        // Iniciar animación
        animatePixels();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isDarkMode, mounted, initPixels, animatePixels, handleMouseMove, handleMouseLeave]);

    // Efecto para modo oscuro (Three.js)
    useEffect(() => {
        if (!mounted || !isDarkMode) {
            cleanupDarkMode();
            return;
        }

        const initEffect = async () => {
            if (!canvasRef.current) return;

            try {
                // Use Function constructor to create dynamic import - bypasses TypeScript module resolution
                const cdnUrl = "https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js";
                const dynamicImport = new Function('url', 'return import(url)');
                const module = await dynamicImport(cdnUrl) as { default: (canvas: HTMLCanvasElement, config: unknown) => { dispose?: () => void } };
                const TubesCursor = module.default;

                const config = {
                    tubes: {
                        colors: ["#6cba00", "#ff8508", "#39ff14", "#ffd700", "#00ff00"],
                        lights: {
                            intensity: 200,
                            colors: ["#83f36e", "#fe8a2e", "#6cba00", "#ff8508"],
                        },
                    },
                };

                appRef.current = TubesCursor(canvasRef.current, config);
            } catch (error) {
                console.error("Error al cargar TubesCursor:", error);
            }
        };

        initEffect();

        return cleanupDarkMode;
    }, [isDarkMode, mounted, cleanupDarkMode]);

    if (!mounted) {
        return <div className="fixed inset-0 -z-20 bg-black dark:bg-black" />;
    }

    return (
        <>
            {isDarkMode ? (
                <>
                    {/* Modo Oscuro: Efecto de tubos neón */}
                    <div
                        className="fixed inset-0 -z-20"
                        style={{ backgroundColor: '#0a0a0a' }}
                    />
                    <canvas
                        ref={canvasRef}
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            pointerEvents: "none",
                            zIndex: -1,
                        }}
                    />
                </>
            ) : (
                <>
                    {/* Modo Claro: Fondo blanco con píxeles interactivos */}
                    <div
                        className="fixed inset-0 -z-20"
                        style={{
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8faf5 50%, #fff8f0 100%)',
                        }}
                    />
                    <canvas
                        ref={lightCanvasRef}
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            pointerEvents: "none",
                            zIndex: -1,
                        }}
                    />
                </>
            )}
        </>
    );
}

export default LoginBackground;
