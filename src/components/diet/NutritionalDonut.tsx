"use client";

import React, { useState, useMemo } from 'react';
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface NutritionalDonutProps {
    data: {
        protein: { grams: number; percent: number };
        carbs: { grams: number; percent: number };
        fat: { grams: number; percent: number };
    };
    totalCalories: number;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export const NutritionalDonut: React.FC<NutritionalDonutProps> = ({
    data,
    totalCalories,
    className,
    size = 'md'
}) => {
    const [activeComp, setActiveComp] = useState<any>(null);

    const totalGrams = data.protein.grams + data.carbs.grams + data.fat.grams;

    const components = useMemo(() => [
        {
            key: 'protein',
            label: 'Proteína',
            color: '#3b82f6', // Blue 500
            value: data.protein.percent || Math.round((data.protein.grams * 4 / totalCalories) * 100) || 0,
            grams: Math.round(data.protein.grams),
            kcal: Math.round(data.protein.grams * 4)
        },
        {
            key: 'carbs',
            label: 'Carbohidratos',
            color: '#10b981', // Emerald 500
            value: data.carbs.percent || Math.round((data.carbs.grams * 4 / totalCalories) * 100) || 0,
            grams: Math.round(data.carbs.grams),
            kcal: Math.round(data.carbs.grams * 4)
        },
        {
            key: 'fat',
            label: 'Grasas',
            color: '#f59e0b', // Orange 500
            value: data.fat.percent || Math.round((data.fat.grams * 9 / totalCalories) * 100) || 0,
            grams: Math.round(data.fat.grams),
            kcal: Math.round(data.fat.grams * 9)
        }
    ], [data, totalCalories]);

    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    let currentOffset = 0;

    const sizeClasses = {
        sm: "w-48 h-48",
        md: "w-64 h-64",
        lg: "w-80 h-80"
    };

    const strokeWidthBase = size === 'sm' ? 12 : 14;
    const strokeWidthActive = size === 'sm' ? 16 : 20;

    return (
        <div className={cn("relative flex flex-col items-center", className)}>
            <div className={cn("relative", sizeClasses[size])}>
                <svg viewBox="0 0 200 200" className="transform -rotate-90 w-full h-full">
                    {/* Background track track exactly like 5-comp */}
                    <circle
                        cx="100"
                        cy="100"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth={strokeWidthBase - 2}
                        className="text-slate-100 dark:text-slate-800/50"
                        fill="transparent"
                    />

                    {components.map((comp) => {
                        const dashArray = (comp.value / 100) * circumference;
                        const dashOffset = -currentOffset;
                        currentOffset += dashArray;
                        const isActive = activeComp?.key === comp.key;

                        return (
                            <motion.circle
                                key={comp.key}
                                cx="100"
                                cy="100"
                                r={radius}
                                stroke={comp.color}
                                strokeWidth={isActive ? strokeWidthActive : strokeWidthBase}
                                strokeDasharray={`${dashArray} ${circumference}`}
                                initial={{ strokeDashoffset: circumference }}
                                animate={{
                                    strokeDashoffset: dashOffset,
                                    strokeWidth: isActive ? strokeWidthActive : strokeWidthBase,
                                    opacity: activeComp ? (isActive ? 1 : 0.4) : 0.9
                                }}
                                transition={{
                                    duration: 1,
                                    ease: "easeOut",
                                    strokeWidth: { duration: 0.3 }
                                }}
                                strokeLinecap="butt"
                                fill="transparent"
                                onMouseEnter={() => setActiveComp(comp)}
                                onMouseLeave={() => setActiveComp(null)}
                                onClick={() => setActiveComp(comp)}
                                className="cursor-pointer transition-opacity duration-300"
                            />
                        );
                    })}
                </svg>

                {/* Texto Central Dinamico - Match 5-comp exact style */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="w-full max-w-[140px] flex flex-col items-center justify-center">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeComp ? activeComp.key : 'total'}
                                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col items-center text-center w-full"
                            >
                                <div className={cn(
                                    "font-black tracking-tight flex items-baseline justify-center",
                                    size === 'sm' ? "text-2xl" : "text-4xl",
                                    activeComp ? "" : "text-slate-800 dark:text-white"
                                )} style={{ color: activeComp?.color }}>
                                    <span>{activeComp ? activeComp.value : totalCalories}</span>
                                    <span className={cn(
                                        "font-bold ml-1 opacity-70",
                                        size === 'sm' ? "text-xs" : "text-base"
                                    )}>
                                        {activeComp ? "%" : "kcal"}
                                    </span>
                                </div>

                                <div className={cn(
                                    "text-[9px] uppercase font-black mt-3 tracking-widest px-3 py-1.5 rounded-full border transition-all duration-300",
                                    activeComp
                                        ? "bg-white dark:bg-slate-900 shadow-sm"
                                        : "bg-slate-50/10 dark:bg-slate-800/50 border-slate-100/50 dark:border-slate-700/50 text-slate-400"
                                )} style={{
                                    borderColor: activeComp ? `${activeComp.color}44` : undefined,
                                    color: activeComp ? activeComp.color : undefined
                                }}>
                                    {activeComp ? activeComp.label : "Total Dieta"}
                                </div>

                                <div className="h-10 flex flex-col items-center justify-center mt-2 overflow-hidden">
                                    {activeComp ? (
                                        <div className="flex flex-col items-center animate-in slide-in-from-top-1 duration-300">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-lg font-black text-slate-700 dark:text-slate-200">{activeComp.grams}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">g</span>
                                            </div>
                                            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter -mt-0.5 opacity-80">
                                                {activeComp.kcal} kcal
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-[8px] font-bold text-slate-300 dark:text-slate-500 uppercase tracking-tight italic leading-tight max-w-[80px]">
                                            Explora los macronutrientes
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Premium Legend exactly like 5-comp buttons */}
            <div className={cn(
                "flex flex-wrap gap-2 justify-center",
                size === 'sm' ? "mt-4 gap-1.5" : "mt-8 gap-3"
            )}>
                {components.map((comp) => (
                    <button
                        key={comp.key}
                        onMouseEnter={() => setActiveComp(comp)}
                        onMouseLeave={() => setActiveComp(null)}
                        onClick={() => setActiveComp(comp)}
                        className={cn(
                            "flex items-center gap-2 rounded-xl border transition-all duration-300",
                            size === 'sm' ? "px-2 py-1" : "px-3 py-1.5",
                            activeComp?.key === comp.key
                                ? "bg-white dark:bg-slate-800 shadow-md scale-105 border-slate-200 dark:border-slate-700"
                                : "bg-transparent border-transparent grayscale opacity-50 hover:grayscale-0 hover:opacity-100"
                        )}
                        style={{
                            borderColor: activeComp?.key === comp.key ? `${comp.color}66` : undefined,
                            boxShadow: activeComp?.key === comp.key ? `0 4px 12px ${comp.color}15` : 'none'
                        }}
                    >
                        <div className={cn("rounded-full shadow-sm", size === 'sm' ? "w-2 h-2" : "w-2.5 h-2.5")} style={{ backgroundColor: comp.color }} />
                        <span className={cn(
                            "font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest",
                            size === 'sm' ? "text-[7px]" : "text-[9px]"
                        )}>
                            {comp.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};
