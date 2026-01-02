"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

interface SomatotipoChartProps {
    endo: number;
    meso: number;
    ecto: number;
}

export function PremiumSomatochart({ endo, meso, ecto }: SomatotipoChartProps) {
    const x = Number((ecto - endo).toFixed(2));
    const y = Number((2 * meso - (endo + ecto)).toFixed(2));

    let clasificacion = "Balanceado";
    if (endo > meso && endo > ecto) clasificacion = "Endomorfo";
    if (meso > endo && meso > ecto) clasificacion = "Mesomorfo";
    if (ecto > endo && ecto > meso) clasificacion = "Ectomorfo";

    const width = 500;
    const height = 520;
    const centerX = width / 2;
    const centerY = height / 2 + 15;
    const scale = 22;

    const getSvgCoords = (sx: number, sy: number) => ({
        x: centerX + sx * scale,
        y: centerY - sy * scale
    });

    const point = getSvgCoords(x, y);

    // Vértices del triángulo equilátero
    const top = { x: centerX, y: centerY - 190 };
    const left = { x: centerX - 165, y: centerY + 120 };
    const right = { x: centerX + 165, y: centerY + 120 };

    // Radio para los arcos (distancia entre vértices)
    const r = 330;

    return (
        <Card className="shadow-lg border-none h-full bg-white dark:bg-slate-900 flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" /> Somatocarta
                </CardTitle>
            </CardHeader>

            <CardContent className="p-4 flex justify-center items-center bg-white dark:bg-slate-900 flex-1">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[690px]">
                    {/* Fondo blanco para eliminar contraste con el Card */}
                    <rect x="0" y="0" width={width} height={height} fill="white" className="dark:fill-slate-900" />
                    <defs>
                        <linearGradient id="gradMeso" x1="50%" y1="0%" x2="50%" y2="100%">
                            <stop offset="0%" stopColor="#4ade80" />
                            <stop offset="100%" stopColor="#22c55e" />
                        </linearGradient>
                        <linearGradient id="gradEndo" x1="100%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#60a5fa" />
                            <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                        <linearGradient id="gradEcto" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fbbf24" />
                            <stop offset="100%" stopColor="#f59e0b" />
                        </linearGradient>
                        <clipPath id="reuleauxClip">
                            <path d={`
                                M ${top.x} ${top.y}
                                A ${r} ${r} 0 0 1 ${right.x} ${right.y}
                                A ${r} ${r} 0 0 1 ${left.x} ${left.y}
                                A ${r} ${r} 0 0 1 ${top.x} ${top.y}
                            `} />
                        </clipPath>
                    </defs>

                    {/* GRID */}
                    {[-8, -6, -4, -2, 0, 2, 4, 6, 8].map((val) => (
                        <g key={`x-${val}`}>
                            <line x1={centerX + val * scale} y1={30} x2={centerX + val * scale} y2={height - 30}
                                stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" className="dark:stroke-slate-700" />
                            <text x={centerX + val * scale} y={height - 12} textAnchor="middle" fontSize="9" fill="#94a3b8">{val}</text>
                        </g>
                    ))}
                    {[-8, -6, -4, -2, 0, 2, 4, 6, 8, 10, 12].map((val) => (
                        <g key={`y-${val}`}>
                            <line x1={25} y1={centerY - val * scale} x2={width - 25} y2={centerY - val * scale}
                                stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" className="dark:stroke-slate-700" />
                            <text x={18} y={centerY - val * scale + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{val}</text>
                        </g>
                    ))}

                    {/* TRIÁNGULO DE REULEAUX - FORMA COMPLETA */}
                    <path
                        d={`
                            M ${top.x} ${top.y}
                            A ${r} ${r} 0 0 1 ${right.x} ${right.y}
                            A ${r} ${r} 0 0 1 ${left.x} ${left.y}
                            A ${r} ${r} 0 0 1 ${top.x} ${top.y}
                        `}
                        fill="none"
                        stroke="#334155"
                        strokeWidth="2.5"
                    />

                    {/* SECTOR MESOMORFO (arriba - verde) */}
                    <path
                        d={`
                            M ${centerX} ${centerY}
                            L ${top.x} ${top.y}
                            A ${r} ${r} 0 0 1 ${right.x} ${right.y}
                            L ${centerX} ${centerY}
                        `}
                        fill="url(#gradMeso)"
                        fillOpacity="0.7"
                        stroke="#16a34a"
                        strokeWidth="1.5"
                    />

                    {/* SECTOR ENDOMORFO (izquierda - azul) */}
                    <path
                        d={`
                            M ${centerX} ${centerY}
                            L ${left.x} ${left.y}
                            A ${r} ${r} 0 0 1 ${top.x} ${top.y}
                            L ${centerX} ${centerY}
                        `}
                        fill="url(#gradEndo)"
                        fillOpacity="0.7"
                        stroke="#2563eb"
                        strokeWidth="1.5"
                    />

                    {/* SECTOR ECTOMORFO (derecha - amarillo) */}
                    <path
                        d={`
                            M ${centerX} ${centerY}
                            L ${right.x} ${right.y}
                            A ${r} ${r} 0 0 1 ${left.x} ${left.y}
                            L ${centerX} ${centerY}
                        `}
                        fill="url(#gradEcto)"
                        fillOpacity="0.7"
                        stroke="#d97706"
                        strokeWidth="1.5"
                    />

                    {/* HEXÁGONO CENTRAL */}
                    <polygon
                        points={`${centerX},${centerY - 20} ${centerX + 17},${centerY - 10} ${centerX + 17},${centerY + 10} ${centerX},${centerY + 20} ${centerX - 17},${centerY + 10} ${centerX - 17},${centerY - 10}`}
                        fill="white"
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                        className="dark:fill-slate-800"
                    />

                    {/* EJES */}
                    <line x1={centerX} y1={height - 30} x2={centerX} y2={30} stroke="#475569" strokeWidth="1.5" />
                    <line x1={25} y1={centerY} x2={width - 25} y2={centerY} stroke="#475569" strokeWidth="1.5" />

                    {/* ETIQUETAS */}
                    <text x={top.x} y={top.y - 12} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#16a34a">MESOMORFO</text>
                    <text x={left.x - 8} y={left.y + 18} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#2563eb">ENDOMORFO</text>
                    <text x={right.x + 8} y={right.y + 18} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#d97706">ECTOMORFO</text>

                    {/* PUNTO DEL PACIENTE */}
                    <circle cx={point.x} cy={point.y} r="10" fill="#ef4444" fillOpacity="0.2" />
                    <circle cx={point.x} cy={point.y} r="6" fill="#ef4444" stroke="white" strokeWidth="2.5" />

                    {/* COORDENADAS */}
                    <g transform={`translate(${point.x + 10}, ${point.y - 16})`}>
                        <rect width="50" height="16" rx="3" fill="#1e293b" />
                        <text x="25" y="11" textAnchor="middle" fontSize="9" fontWeight="600" fill="white">{x}, {y}</text>
                    </g>
                </svg>
            </CardContent>

            <div className="text-center text-xs py-3 text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700">
                Clasificación: <span className="font-bold text-indigo-600 dark:text-indigo-400">{clasificacion}</span>
            </div>
        </Card>
    );
}
