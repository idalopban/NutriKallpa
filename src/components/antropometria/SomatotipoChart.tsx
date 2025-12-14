"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity } from "lucide-react";

interface SomatotipoChartProps {
    endo: number;
    meso: number;
    ecto: number;
}

// SVG dimensions and coordinate system
const SVG_WIDTH = 500;
const SVG_HEIGHT = 550;
const CENTER_X = 250;
const CENTER_Y = 280;

// Triangle vertices (Reuleaux-like curved triangle)
const TOP_VERTEX = { x: 250, y: 60 };      // Mesomorfo (top)
const LEFT_VERTEX = { x: 60, y: 480 };      // Endomorfo (bottom-left)
const RIGHT_VERTEX = { x: 440, y: 480 };    // Ectomorfo (bottom-right)

// Scale factor for coordinate conversion
const SCALE_X = 22; // pixels per unit on X axis
const SCALE_Y = 22; // pixels per unit on Y axis

// Colors matching the reference image
const COLORS = {
    mesomorfo: "#4ade80",      // Green
    mesomorfoLight: "#86efac",
    endomorfo: "#60a5fa",      // Blue
    endomorfoLight: "#93c5fd",
    ectomorfo: "#fbbf24",      // Yellow/Orange
    ectomorfoLight: "#fcd34d",
    center: "#ffffff",
    grid: "#94a3b8",
    axis: "#334155",
};

// Person icon as SVG path
const PersonIcon = ({ x, y, color }: { x: number; y: number; color: string }) => (
    <g transform={`translate(${x - 12}, ${y - 16})`}>
        {/* Head */}
        <circle cx="12" cy="6" r="5" fill={color} />
        {/* Body */}
        <path
            d="M12 12 L12 20 M8 16 L16 16 M8 26 L12 20 L16 26"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />
    </g>
);

export function SomatotipoChart({ endo, meso, ecto }: SomatotipoChartProps) {
    const [isHovered, setIsHovered] = useState(false);

    // Cálculo de coordenadas X, Y para la somatocarta (Heath-Carter)
    // X = Ectomorfia - Endomorfia (rango típico: -8 a +8)
    // Y = 2 * Mesomorfia - (Endomorfia + Ectomorfia) (rango típico: -10 a +16)
    const x = Number((ecto - endo).toFixed(2));
    const y = Number((2 * meso - (endo + ecto)).toFixed(2));

    // Convert to SVG coordinates
    const pointX = CENTER_X + (x * SCALE_X);
    const pointY = CENTER_Y - (y * SCALE_Y);

    // Determinar clasificación
    let clasificacion = "Balanceado";
    let colorClasificacion = "#16a34a";

    if (endo > meso && endo > ecto) {
        if (meso > ecto) clasificacion = "Endo-Mesomórfico";
        else if (ecto > meso) clasificacion = "Endo-Ectomórfico";
        else clasificacion = "Endomorfo Balanceado";
        colorClasificacion = "#3b82f6";
    }
    else if (meso > endo && meso > ecto) {
        if (endo > ecto) clasificacion = "Meso-Endomórfico";
        else if (ecto > endo) clasificacion = "Meso-Ectomórfico";
        else clasificacion = "Mesomorfo Balanceado";
        colorClasificacion = "#22c55e";
    }
    else if (ecto > endo && ecto > meso) {
        if (endo > meso) clasificacion = "Ecto-Endomórfico";
        else if (meso > endo) clasificacion = "Ecto-Mesomórfico";
        else clasificacion = "Ectomorfo Balanceado";
        colorClasificacion = "#eab308";
    }
    if (endo < 3 && meso < 3 && ecto < 3) {
        clasificacion = "Central";
        colorClasificacion = "#64748b";
    }

    // Verificar si hay datos válidos
    const hasValidData = endo > 0 || meso > 0 || ecto > 0;

    // Generate grid lines
    const gridLines = [];
    for (let i = -8; i <= 8; i += 2) {
        // Vertical lines
        gridLines.push(
            <line
                key={`v${i}`}
                x1={CENTER_X + i * SCALE_X}
                y1={80}
                x2={CENTER_X + i * SCALE_X}
                y2={520}
                stroke={COLORS.grid}
                strokeWidth="0.5"
                strokeOpacity="0.3"
            />
        );
    }
    for (let i = -8; i <= 14; i += 2) {
        // Horizontal lines
        gridLines.push(
            <line
                key={`h${i}`}
                x1={50}
                y1={CENTER_Y - i * SCALE_Y}
                x2={450}
                y2={CENTER_Y - i * SCALE_Y}
                stroke={COLORS.grid}
                strokeWidth="0.5"
                strokeOpacity="0.3"
            />
        );
    }

    return (
        <Card className="shadow-lg border-none h-full bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
            {/* Header */}
            <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-lg font-bold text-slate-800 dark:text-white">
                    Somatocarta
                </CardTitle>
                <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
                    Distribución del tipo corporal actual
                </CardDescription>
            </CardHeader>

            {/* Sub-header with icon and classification */}
            <div className="px-6 py-3 flex items-center justify-between border-b border-slate-50 dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-500" />
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Somatocarta</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                    <span className="text-xs text-slate-500">Tu somatotipo es:</span>
                    <span className="text-sm font-bold" style={{ color: colorClasificacion }}>
                        {clasificacion}
                    </span>
                </div>
            </div>

            {/* SVG Chart */}
            <CardContent className="p-4 flex-1 flex flex-col justify-center items-center bg-white dark:bg-slate-900">
                <div className="relative w-full max-w-lg mx-auto">
                    <svg
                        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                        className="w-full h-auto"
                        style={{ maxHeight: '450px' }}
                    >
                        <defs>
                            {/* Gradients for each zone */}
                            <linearGradient id="mesoGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                                <stop offset="0%" stopColor={COLORS.mesomorfoLight} />
                                <stop offset="100%" stopColor={COLORS.mesomorfo} />
                            </linearGradient>
                            <linearGradient id="endoGradient" x1="100%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor={COLORS.endomorfoLight} />
                                <stop offset="100%" stopColor={COLORS.endomorfo} />
                            </linearGradient>
                            <linearGradient id="ectoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={COLORS.ectomorfoLight} />
                                <stop offset="100%" stopColor={COLORS.ectomorfo} />
                            </linearGradient>
                        </defs>

                        {/* Grid lines (behind everything) */}
                        <g opacity="0.4">
                            {gridLines}
                        </g>

                        {/* Triangle zones - Curved Reuleaux-style triangle */}
                        {/* Mesomorfo zone (top - green) */}
                        <path
                            d={`
                                M ${TOP_VERTEX.x} ${TOP_VERTEX.y}
                                Q ${CENTER_X} ${CENTER_Y - 50} ${CENTER_X + 80} ${CENTER_Y - 20}
                                L ${CENTER_X} ${CENTER_Y}
                                L ${CENTER_X - 80} ${CENTER_Y - 20}
                                Q ${CENTER_X} ${CENTER_Y - 50} ${TOP_VERTEX.x} ${TOP_VERTEX.y}
                            `}
                            fill="url(#mesoGradient)"
                            opacity="0.7"
                        />

                        {/* Endomorfo zone (bottom-left - blue) */}
                        <path
                            d={`
                                M ${LEFT_VERTEX.x} ${LEFT_VERTEX.y}
                                Q ${CENTER_X - 100} ${CENTER_Y + 50} ${CENTER_X - 80} ${CENTER_Y - 20}
                                L ${CENTER_X} ${CENTER_Y}
                                L ${CENTER_X - 40} ${CENTER_Y + 80}
                                Q ${CENTER_X - 100} ${CENTER_Y + 100} ${LEFT_VERTEX.x} ${LEFT_VERTEX.y}
                            `}
                            fill="url(#endoGradient)"
                            opacity="0.7"
                        />

                        {/* Ectomorfo zone (bottom-right - yellow) */}
                        <path
                            d={`
                                M ${RIGHT_VERTEX.x} ${RIGHT_VERTEX.y}
                                Q ${CENTER_X + 100} ${CENTER_Y + 100} ${CENTER_X + 40} ${CENTER_Y + 80}
                                L ${CENTER_X} ${CENTER_Y}
                                L ${CENTER_X + 80} ${CENTER_Y - 20}
                                Q ${CENTER_X + 100} ${CENTER_Y + 50} ${RIGHT_VERTEX.x} ${RIGHT_VERTEX.y}
                            `}
                            fill="url(#ectoGradient)"
                            opacity="0.7"
                        />

                        {/* Full triangle outline */}
                        <path
                            d={`
                                M ${TOP_VERTEX.x} ${TOP_VERTEX.y}
                                C ${TOP_VERTEX.x + 120} ${TOP_VERTEX.y + 100} ${RIGHT_VERTEX.x} ${RIGHT_VERTEX.y - 120} ${RIGHT_VERTEX.x} ${RIGHT_VERTEX.y}
                                C ${RIGHT_VERTEX.x - 80} ${RIGHT_VERTEX.y + 20} ${LEFT_VERTEX.x + 80} ${LEFT_VERTEX.y + 20} ${LEFT_VERTEX.x} ${LEFT_VERTEX.y}
                                C ${LEFT_VERTEX.x} ${LEFT_VERTEX.y - 120} ${TOP_VERTEX.x - 120} ${TOP_VERTEX.y + 100} ${TOP_VERTEX.x} ${TOP_VERTEX.y}
                            `}
                            fill="none"
                            stroke={COLORS.grid}
                            strokeWidth="2"
                            opacity="0.5"
                        />

                        {/* Central hexagon (white area) */}
                        <polygon
                            points={`
                                ${CENTER_X} ${CENTER_Y - 45},
                                ${CENTER_X + 40} ${CENTER_Y - 22},
                                ${CENTER_X + 40} ${CENTER_Y + 22},
                                ${CENTER_X} ${CENTER_Y + 45},
                                ${CENTER_X - 40} ${CENTER_Y + 22},
                                ${CENTER_X - 40} ${CENTER_Y - 22}
                            `}
                            fill={COLORS.center}
                            stroke={COLORS.grid}
                            strokeWidth="1.5"
                            opacity="0.9"
                        />

                        {/* Main axes */}
                        <line
                            x1={50}
                            y1={CENTER_Y}
                            x2={450}
                            y2={CENTER_Y}
                            stroke={COLORS.axis}
                            strokeWidth="1"
                        />
                        <line
                            x1={CENTER_X}
                            y1={60}
                            x2={CENTER_X}
                            y2={520}
                            stroke={COLORS.axis}
                            strokeWidth="1"
                        />

                        {/* Y-axis labels */}
                        {[14, 12, 10, 8, 6, 4, 2, 0, -2, -4, -6].map((val) => (
                            <text
                                key={`y${val}`}
                                x={35}
                                y={CENTER_Y - val * SCALE_Y + 4}
                                fontSize="10"
                                fill={COLORS.axis}
                                textAnchor="end"
                            >
                                {val}
                            </text>
                        ))}

                        {/* X-axis labels */}
                        {[-8, -6, -4, -2, 0, 2, 4, 6, 8].map((val) => (
                            <text
                                key={`x${val}`}
                                x={CENTER_X + val * SCALE_X}
                                y={535}
                                fontSize="10"
                                fill={COLORS.axis}
                                textAnchor="middle"
                            >
                                {val}
                            </text>
                        ))}

                        {/* Vertex labels */}
                        <text
                            x={TOP_VERTEX.x}
                            y={TOP_VERTEX.y - 35}
                            fontSize="12"
                            fontWeight="bold"
                            fill={COLORS.mesomorfo}
                            textAnchor="middle"
                        >
                            MESOMORFO
                        </text>
                        <text
                            x={LEFT_VERTEX.x + 50}
                            y={LEFT_VERTEX.y + 30}
                            fontSize="12"
                            fontWeight="bold"
                            fill={COLORS.endomorfo}
                            textAnchor="middle"
                        >
                            ENDOMORFO
                        </text>
                        <text
                            x={RIGHT_VERTEX.x - 50}
                            y={RIGHT_VERTEX.y + 30}
                            fontSize="12"
                            fontWeight="bold"
                            fill={COLORS.ectomorfo}
                            textAnchor="middle"
                        >
                            ECTOMORFO
                        </text>

                        {/* Person icons at vertices */}
                        <PersonIcon x={TOP_VERTEX.x} y={TOP_VERTEX.y - 10} color={COLORS.mesomorfo} />
                        <PersonIcon x={LEFT_VERTEX.x + 20} y={LEFT_VERTEX.y - 15} color={COLORS.endomorfo} />
                        <PersonIcon x={RIGHT_VERTEX.x - 20} y={RIGHT_VERTEX.y - 15} color={COLORS.ectomorfo} />

                        {/* Center coordinate label */}
                        <text
                            x={CENTER_X + 30}
                            y={CENTER_Y + 5}
                            fontSize="11"
                            fill={COLORS.axis}
                            opacity="0.7"
                        >
                            0, 0
                        </text>

                        {/* Patient point */}
                        {hasValidData && (
                            <g
                                onMouseEnter={() => setIsHovered(true)}
                                onMouseLeave={() => setIsHovered(false)}
                                style={{ cursor: 'pointer' }}
                            >
                                {/* Outer glow */}
                                <circle
                                    cx={pointX}
                                    cy={pointY}
                                    r="18"
                                    fill="#ef4444"
                                    opacity="0.2"
                                />
                                {/* Main point */}
                                <circle
                                    cx={pointX}
                                    cy={pointY}
                                    r="10"
                                    fill="#ef4444"
                                    stroke="#ffffff"
                                    strokeWidth="3"
                                />
                                {/* Center highlight */}
                                <circle
                                    cx={pointX}
                                    cy={pointY}
                                    r="3"
                                    fill="#ffffff"
                                    opacity="0.8"
                                />
                            </g>
                        )}

                        {/* Tooltip */}
                        {hasValidData && isHovered && (
                            <g transform={`translate(${pointX + 20}, ${pointY - 60})`}>
                                <rect
                                    x="0"
                                    y="0"
                                    width="120"
                                    height="70"
                                    rx="6"
                                    fill="#1e293b"
                                    opacity="0.95"
                                />
                                <text x="10" y="20" fontSize="11" fill="#94a3b8">Endomorfia:</text>
                                <text x="85" y="20" fontSize="11" fill="#ef4444" fontWeight="bold">{endo.toFixed(1)}</text>
                                <text x="10" y="38" fontSize="11" fill="#94a3b8">Mesomorfia:</text>
                                <text x="85" y="38" fontSize="11" fill="#22c55e" fontWeight="bold">{meso.toFixed(1)}</text>
                                <text x="10" y="56" fontSize="11" fill="#94a3b8">Ectomorfia:</text>
                                <text x="85" y="56" fontSize="11" fill="#eab308" fontWeight="bold">{ecto.toFixed(1)}</text>
                            </g>
                        )}

                        {/* No data indicator */}
                        {!hasValidData && (
                            <text
                                x={CENTER_X}
                                y={CENTER_Y}
                                fontSize="12"
                                fill={COLORS.axis}
                                textAnchor="middle"
                                opacity="0.6"
                            >
                                Ingresa datos
                            </text>
                        )}
                    </svg>
                </div>
            </CardContent>

            {/* Footer legend */}
            <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-400" />
                            <span className="text-slate-600 dark:text-slate-300">Adiposidad</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-400" />
                            <span className="text-slate-600 dark:text-slate-300">Muscularidad</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-400" />
                            <span className="text-slate-600 dark:text-slate-300">Linealidad</span>
                        </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">ISAK L3 Protocol</span>
                </div>
            </div>
        </Card>
    );
}
