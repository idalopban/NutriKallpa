"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical, Check, AlertCircle, Clock, Utensils, Coffee, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { MealMomentConfig } from "@/types";

// DnD Kit imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
    moments: MealMomentConfig[];
    totalCalories: number;
    onUpdate: (moments: MealMomentConfig[]) => void;
    isEditing?: boolean;
}

export function MealMomentsManager({ moments, totalCalories, onUpdate, isEditing = false }: Props) {
    const [localMoments, setLocalMoments] = useState<MealMomentConfig[]>(moments);

    // Sync local state if props change (e.g., from reset or parent update)
    useEffect(() => {
        setLocalMoments(moments);
    }, [moments]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const totalRatio = localMoments
        .filter(m => m.enabled)
        .reduce((val, m) => val + m.ratio, 0);

    const isRatiosValid = Math.abs(totalRatio - 1.0) < 0.001;

    // Rebalance ratios to sum exactly 1.0 (100%)
    const rebalanceRatios = (momentsList: MealMomentConfig[]): MealMomentConfig[] => {
        const enabledMoments = momentsList.filter(m => m.enabled);
        const enabledCount = enabledMoments.length;
        if (enabledCount === 0) return momentsList;

        const currentTotal = enabledMoments.reduce((sum, m) => sum + m.ratio, 0);

        // If currentTotal is 0 (e.g., all enabled moments had 0 ratio), distribute evenly
        if (currentTotal === 0) {
            const newRatio = 1.0 / enabledCount;
            return momentsList.map(m => {
                if (!m.enabled) return m;
                return { ...m, ratio: newRatio };
            });
        }

        // Normalize enabled ratios
        return momentsList.map(m => {
            if (!m.enabled) return m;
            return { ...m, ratio: m.ratio / currentTotal };
        });
    };

    const handleToggle = (id: string) => {
        if (!isEditing) return;
        let updated = localMoments.map(m =>
            m.id === id ? { ...m, enabled: !m.enabled } : m
        );

        // Auto-rebalance on toggle
        updated = rebalanceRatios(updated);

        setLocalMoments(updated);
        onUpdate(updated);
    };

    const handleRatioChange = (id: string, value: string) => {
        if (!isEditing) return;
        let numValue = parseFloat(value);
        if (isNaN(numValue)) return;

        // Clamp between 0 and 100
        if (numValue < 0) numValue = 0;
        if (numValue > 100) numValue = 100;

        const newRatio = numValue / 100;
        const targetId = id;

        // 1. Identify other enabled moments
        const otherEnabledMoments = localMoments.filter(m => m.enabled && m.id !== targetId);

        let updated = localMoments.map(m => {
            if (m.id === targetId) {
                return { ...m, ratio: newRatio };
            }
            return m;
        });

        // 2. Distribute the difference proportionally
        const remainingRatio = 1.0 - newRatio;

        if (otherEnabledMoments.length > 0) {
            const currentOtherSum = otherEnabledMoments.reduce((sum, m) => sum + m.ratio, 0);

            if (currentOtherSum <= 0.001) {
                // If others sum to 0, distribute evenly
                const splitRatio = remainingRatio / otherEnabledMoments.length;
                updated = updated.map(m => {
                    if (m.enabled && m.id !== targetId) {
                        return { ...m, ratio: splitRatio };
                    }
                    return m;
                });
            } else {
                // Proportional distribution
                const scale = remainingRatio / currentOtherSum;
                updated = updated.map(m => {
                    if (m.enabled && m.id !== targetId) {
                        let nextRatio = m.ratio * scale;
                        if (nextRatio < 0) nextRatio = 0;
                        return { ...m, ratio: nextRatio };
                    }
                    return m;
                });
            }
        }

        setLocalMoments(updated);
        onUpdate(updated);
    };

    const handleNameChange = (id: string, name: string) => {
        if (!isEditing) return;
        const updated = localMoments.map(m =>
            m.id === id ? { ...m, name } : m
        );
        setLocalMoments(updated);
        onUpdate(updated);
    };

    const handleAddSnack = () => {
        if (!isEditing) return;

        const newSnack: MealMomentConfig = {
            id: `m-${Date.now()}`,
            name: 'Nueva Colación',
            type: 'snack',
            ratio: 0.1, // Start with 10%
            enabled: true
        };

        let updated = [...localMoments, newSnack];
        updated = rebalanceRatios(updated);

        setLocalMoments(updated);
        onUpdate(updated);
    };

    const handleRemove = (id: string) => {
        if (!isEditing) return;
        let updated = localMoments.filter(m => m.id !== id);
        updated = rebalanceRatios(updated);
        setLocalMoments(updated);
        onUpdate(updated);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = localMoments.findIndex((i) => i.id === active.id);
            const newIndex = localMoments.findIndex((i) => i.id === over.id);
            const updated = arrayMove(localMoments, oldIndex, newIndex);

            setLocalMoments(updated);
            onUpdate(updated);
        }
    };

    return (
        <div className="space-y-2">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={localMoments.map(m => m.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-3">
                        {localMoments.map((moment) => (
                            <SortableItem
                                key={moment.id}
                                moment={moment}
                                isEditing={isEditing}
                                totalCalories={totalCalories}
                                onNameChange={handleNameChange}
                                onRatioChange={handleRatioChange}
                                onToggle={handleToggle}
                                onRemove={handleRemove}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {isEditing && (
                <Button
                    variant="outline"
                    className="w-full border-dashed border-2 py-6 rounded-2xl gap-2 text-slate-500 hover:text-[#ff8508] hover:border-[#ff8508] transition-all"
                    onClick={handleAddSnack}
                >
                    <Plus className="w-4 h-4" />
                    AÑADIR COLACIÓN O SNACK
                </Button>
            )}

            {isEditing && !isRatiosValid && (
                <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 rounded-2xl">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <AlertDescription className="text-xs text-amber-700 dark:text-amber-300 font-medium ml-2">
                        La suma de porcentajes es <strong>{Math.round(totalRatio * 100)}%</strong>.
                        Pulsa en cualquier interruptor para auto-ajustar al 100%.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}

// Inner Component for Sortable Items
interface SortableItemProps {
    moment: MealMomentConfig;
    isEditing: boolean;
    totalCalories: number;
    onNameChange: (id: string, name: string) => void;
    onRatioChange: (id: string, value: string) => void;
    onToggle: (id: string) => void;
    onRemove: (id: string) => void;
}

function SortableItem({ moment, isEditing, totalCalories, onNameChange, onRatioChange, onToggle, onRemove }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: moment.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'desayuno': return <Coffee className="w-4 h-4 text-amber-500" />;
            case 'almuerzo': return <Sun className="w-4 h-4 text-sky-500" />;
            case 'cena': return <Moon className="w-4 h-4 text-indigo-500" />;
            default: return <Utensils className="w-4 h-4 text-[#ff8508]" />;
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all
        ${isDragging ? 'border-[#ff8508] shadow-xl ring-2 ring-[#ff8508]/20 opacity-90' : ''}
        ${moment.enabled
                    ? 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'
                    : 'border-transparent bg-slate-50 dark:bg-slate-800/20 opacity-60'}
      `}
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="h-full px-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-[#ff8508] transition-colors"
            >
                <GripVertical className="w-4 h-4" />
            </div>

            {/* Icon & Type */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center
        ${moment.enabled ? 'bg-slate-100 dark:bg-slate-800 shadow-inner' : 'bg-slate-200/50 dark:bg-slate-700/50'}
      `}>
                {getTypeIcon(moment.type)}
            </div>

            {/* Name Input */}
            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <Input
                        value={moment.name}
                        onChange={(e) => onNameChange(moment.id, e.target.value)}
                        className="h-9 font-medium bg-transparent border-none p-0 focus-visible:ring-0 text-slate-800 dark:text-white text-base"
                        placeholder="Nombre del momento"
                    />
                ) : (
                    <p className="font-medium text-slate-800 dark:text-white truncate text-base">{moment.name}</p>
                )}
                <p className="text-[10px] font-medium text-[#ff8508] uppercase tracking-normal">
                    {Math.round(moment.ratio * totalCalories)} kcal base
                </p>
            </div>

            {/* Ratio Adjustment */}
            <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                    {isEditing ? (
                        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-1 rounded-lg px-2 border border-slate-100 dark:border-slate-700">
                            <Input
                                type="number"
                                value={Math.round(moment.ratio * 100)}
                                onChange={(e) => onRatioChange(moment.id, e.target.value)}
                                className="w-12 h-7 text-center font-black text-xs p-0 border-none bg-transparent focus-visible:ring-0 shadow-none"
                            />
                            <span className="text-[10px] font-black text-slate-400 uppercase">%</span>
                        </div>
                    ) : (
                        <span className="text-lg font-black text-slate-700 dark:text-slate-200">
                            {Math.round(moment.ratio * 100)}%
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2 border-l border-slate-100 dark:border-slate-800 pl-4 ml-2">
                    <Switch
                        checked={moment.enabled}
                        onCheckedChange={() => onToggle(moment.id)}
                        disabled={!isEditing}
                        className="data-[state=checked]:bg-[#6cba00]"
                    />

                    {isEditing && moment.type === 'snack' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemove(moment.id)}
                            className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
