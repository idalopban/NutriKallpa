"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface PortalTooltipProps {
    children: React.ReactNode;
    triggerRef: React.RefObject<HTMLElement | null>;
    isOpen: boolean;
}

export function PortalTooltip({ children, triggerRef, isOpen }: PortalTooltipProps) {
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const updatePosition = () => {
                const rect = triggerRef.current!.getBoundingClientRect();
                const scrollY = window.scrollY;
                const scrollX = window.scrollX;

                // Position: Bottom Left aligned (default) or adjust as needed
                // Adding gap of 8px
                const top = rect.bottom + scrollY + 8;
                let left = rect.left + scrollX;

                // Screen boundary checks could be added here
                // For now, simple positioning
                setPosition({ top, left });
            };

            updatePosition();
            window.addEventListener("resize", updatePosition);
            window.addEventListener("scroll", updatePosition, true); // true for capture to listen to parent scrolls

            return () => {
                window.removeEventListener("resize", updatePosition);
                window.removeEventListener("scroll", updatePosition, true);
            };
        }
    }, [isOpen, triggerRef]);

    if (!isOpen || typeof document === "undefined") return null;

    return createPortal(
        <div
            ref={tooltipRef}
            style={{
                position: "absolute",
                top: position.top,
                left: position.left,
                zIndex: 9999, // Ensure it's on top of everything
                pointerEvents: "none" // Let clicks pass through if needed, though for tooltip usually okay
            }}
        >
            {children}
        </div>,
        document.body
    );
}
