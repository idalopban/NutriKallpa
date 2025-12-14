"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableWidgetProps {
    id: string;
    children: React.ReactNode;
    className?: string;
    /** Grid column span: 1, 2, or 3 */
    colSpan?: 1 | 2 | 3;
}

export function SortableWidget({ id, children, className, colSpan = 1 }: SortableWidgetProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
    };

    const colSpanClass = {
        1: "col-span-1",
        2: "md:col-span-2",
        3: "md:col-span-3",
    }[colSpan];

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "relative group rounded-2xl",
                colSpanClass,
                isDragging && "shadow-2xl ring-2 ring-[#6cba00] opacity-90 scale-[1.02]",
                "transition-all duration-200",
                className
            )}
        >
            {/* Drag Handle - Top Left Corner */}
            <button
                {...attributes}
                {...listeners}
                className={cn(
                    "absolute top-3 left-3 z-20 p-1.5 rounded-lg",
                    "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
                    "opacity-0 group-hover:opacity-100 transition-all duration-200",
                    "cursor-grab active:cursor-grabbing",
                    "backdrop-blur-sm border border-border/50",
                    isDragging && "opacity-100 cursor-grabbing"
                )}
                aria-label="Drag to reorder"
            >
                <GripVertical className="w-4 h-4" />
            </button>

            {/* Widget Content */}
            {children}
        </div>
    );
}
