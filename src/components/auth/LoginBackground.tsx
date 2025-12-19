'use client';

import React from 'react';
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';

export function LoginBackground() {
    return (
        <div className="fixed inset-0 -z-10 w-full h-full overflow-hidden pointer-events-none">
            {/* Background Layer with Shader - Increased opacity for punchy colors */}
            <div className="absolute inset-0 w-full h-full opacity-100">
                <ShaderGradientCanvas
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                    }}
                >
                    <ShaderGradient
                        {...({
                            animate: "on",
                            axesHelper: "off",
                            brightness: 1.2,
                            cAzimuthAngle: 180,
                            cDistance: 1.81,
                            cPolarAngle: 90,
                            cameraZoom: 1,
                            color1: "#ff8508",
                            color2: "#051000", // Much darker green base for contrast
                            color3: "#ff8508",
                            destination: "onCanvas",
                            embedMode: "off",
                            envPreset: "lobby",
                            format: "gif",
                            fov: 60,
                            frameRate: 10,
                            gizmoHelper: "hide",
                            grain: "on",
                            lightType: "env",
                            pixelDensity: 1,
                            positionX: -1.4,
                            positionY: 0,
                            positionZ: 0,
                            range: "disabled",
                            rangeEnd: 40,
                            rangeStart: 8,
                            reflection: 0.1,
                            rotationX: 0,
                            rotationY: 10,
                            rotationZ: 50,
                            shader: "defaults",
                            type: "plane",
                            uAmplitude: 1,
                            uDensity: 1.3,
                            uFrequency: 5.5,
                            uSpeed: 0.2,
                            uStrength: 4,
                            uTime: 8,
                            wireframe: false
                        } as any)}
                    />
                </ShaderGradientCanvas>
            </div>
            {/* Theme-aware overlays */}
            {/* Light mode: softer, brighter pastel feel */}
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[3px] dark:bg-transparent dark:backdrop-blur-0" />

            {/* Dark mode: high-contrast Halo look */}
            <div className="absolute inset-0 bg-transparent dark:bg-black/40 dark:backdrop-blur-[2px]" />

            {/* Vignettes - lighter for light mode, darker for dark mode */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(255,255,255,0.3)_100%)] dark:bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.6)_100%)]" />
        </div>
    );
}
