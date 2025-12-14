"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
} from "@dnd-kit/sortable";

const STORAGE_KEY = "dashboard-widget-order";

interface DraggableDashboardProps {
    /** Default order of widget IDs */
    defaultOrder: string[];
    /**https://www.msn.com/es-pe/noticias/other/elefantes-y-leones-de-botsuana-delta-del-okavango-en-4k/vi-AA1MyBxL Children must be SortableWidget components */
    children: React.ReactNode;
    className?: string;
}

export function DraggableDashboard({
    defaultOrder,
    children,
    className = "grid grid-cols-1 md:grid-cols-3 gap-6",
}: DraggableDashboardProps) {
    const [items, setItems] = useState<string[]>(defaultOrder);
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Detect mobile on mount
    useEffect(() => {
        setMounted(true);

        // Detect mobile device
        const checkMobile = () => {
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isSmallScreen = window.innerWidth < 768;
            setIsMobile(isTouchDevice && isSmallScreen);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        // Load saved order from localStorage
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved) as string[];
                const allExist = defaultOrder.every((id) => parsed.includes(id));
                const noExtras = parsed.every((id) => defaultOrder.includes(id));
                if (allExist && noExtras && parsed.length === defaultOrder.length) {
                    setItems(parsed);
                }
            }
        } catch (e) {
            console.warn("Failed to load dashboard order from localStorage", e);
        }

        return () => window.removeEventListener('resize', checkMobile);
    }, [defaultOrder]);

    // Save order to localStorage when it changes
    useEffect(() => {
        if (mounted && !isMobile) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
            } catch (e) {
                console.warn("Failed to save dashboard order to localStorage", e);
            }
        }
    }, [items, mounted, isMobile]);

    // Only use PointerSensor and KeyboardSensor (no TouchSensor to avoid mobile issues)
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setItems((currentItems) => {
                const oldIndex = currentItems.indexOf(active.id as string);
                const newIndex = currentItems.indexOf(over.id as string);
                return arrayMove(currentItems, oldIndex, newIndex);
            });
        }
    }

    // Map children by their id prop - always compute this to avoid hydration mismatch
    const childrenArray = React.Children.toArray(children);
    const childrenById = new Map<string, React.ReactNode>();

    childrenArray.forEach((child) => {
        if (React.isValidElement<{ id: string }>(child) && child.props.id) {
            childrenById.set(child.props.id, child);
        }
    });

    // Get ordered children based on current items order
    const getOrderedChildren = () => {
        return items
            .map((id) => childrenById.get(id))
            .filter(Boolean);
    };

    // Always render the same wrapper structure to avoid hydration issues
    // Use suppressHydrationWarning on the container to handle client-only ordering
    const content = mounted ? getOrderedChildren() : childrenArray;

    // Before mount or on mobile: render without DnD to avoid errors
    if (!mounted || isMobile) {
        return (
            <div
                ref={containerRef}
                className={className}
                suppressHydrationWarning
            >
                {content}
            </div>
        );
    }

    // Desktop: render with full DnD support
    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={items} strategy={rectSortingStrategy}>
                <div
                    ref={containerRef}
                    className={className}
                    suppressHydrationWarning
                >
                    {getOrderedChildren()}
                </div>
            </SortableContext>
        </DndContext>
    );
}
