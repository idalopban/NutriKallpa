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
    const [isReady, setIsReady] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initial check for mobile and data loading - strictly client side
    useEffect(() => {
        // 1. Detect device type
        const checkMobile = () => {
            // Robust mobile check
            const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
            const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
            const isMobileDevice = mobileRegex.test(userAgent) || ('ontouchstart' in window) || (window.innerWidth < 768);

            setIsMobile(isMobileDevice);
            return isMobileDevice;
        };

        const mobile = checkMobile();

        // 2. Load saved order only if not mobile (mobile always uses default or specific view)
        if (!mobile) {
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
                console.warn("Failed to load dashboard order", e);
            }
        }

        // 3. Mark as ready to trigger re-render with client-specific structure
        setIsReady(true);

        const resizeHandler = () => checkMobile();
        window.addEventListener('resize', resizeHandler);
        return () => window.removeEventListener('resize', resizeHandler);
    }, [defaultOrder]); // Dependency stable

    // Save order effect
    useEffect(() => {
        if (isReady && !isMobile) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
            } catch (e) {
                console.warn("Failed to save order", e);
            }
        }
    }, [items, isReady, isMobile]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setItems((current) => {
                const oldIndex = current.indexOf(active.id as string);
                const newIndex = current.indexOf(over.id as string);
                return arrayMove(current, oldIndex, newIndex);
            });
        }
    }

    // Helper: Map children
    const childrenArray = React.Children.toArray(children);
    const childrenById = new Map<string, React.ReactNode>();
    childrenArray.forEach((child) => {
        if (React.isValidElement<{ id: string }>(child) && child.props.id) {
            childrenById.set(child.props.id, child);
        }
    });

    // Content logic
    const getOrderedChildren = () => items.map((id) => childrenById.get(id)).filter(Boolean);

    // SAFE RENDER STRATEGY:
    // 1. Server/Hydration phase: Render ONLY default children in default order.
    // This matches exactly what the server sends. No DndContext, no sorting.
    if (!isReady) {
        return (
            <div ref={containerRef} className={className}>
                {childrenArray}
            </div>
        );
    }

    // 2. Client Mobile phase: Render sorted (or default) children but NO Dnd wrappers.
    // The structure remains a simple div, preventing "node removal" conflicts with DndContext.
    if (isMobile) {
        return (
            <div ref={containerRef} className={className}>
                {getOrderedChildren()}
            </div>
        );
    }

    // 3. Client Desktop phase: Render full DndContext suite.
    // React handles the transition from plain div -> DndContext structure safely now that we are stable.
    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={items} strategy={rectSortingStrategy}>
                <div ref={containerRef} className={className}>
                    {getOrderedChildren()}
                </div>
            </SortableContext>
        </DndContext>
    );
}
