import React, { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FoodQuantityStepperProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    className?: string;
}

export function FoodQuantityStepper({
    value,
    onChange,
    min = 0,
    max = 9999,
    step = 1,
    className
}: FoodQuantityStepperProps) {
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const stopAdjustment = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };

    const adjust = (amount: number) => {
        onChange(Math.min(max, Math.max(min, value + amount)));
    };

    // Since 'value' is stale inside the interval closure if we just use it directly,
    // we need a functional update pattern or a ref for the current value.
    // However, since we are calling 'onChange' which usually updates the parent state,
    // and the parent re-renders this component with the NEW value,
    // we need to be careful. The problem with setInterval in React components
    // relying on props is that the closure captures the old prop.

    // A robust way to handle "continuous press" that works with React state updates:
    // We can use a ref to hold the latest "onChange" function and "value" to avoid closure staleness,
    // OR we can rely on the fact that if this component re-renders, the interval keeps running?
    // Actually, if the component re-renders, the ref persists.
    // BUT the function inside setInterval captures the scope from when it was created.

    // Solution: The Ref Pattern for latest state.
    const latestValue = useRef(value);
    const latestOnChange = useRef(onChange);

    useEffect(() => {
        latestValue.current = value;
        latestOnChange.current = onChange;
    }, [value, onChange]);

    const startAdjustment = (amount: number) => {
        // Immediate action
        const current = latestValue.current;
        const next = Math.min(max, Math.max(min, current + amount));
        latestOnChange.current(next);

        // Delay before rapid fire
        timeoutRef.current = setTimeout(() => {
            intervalRef.current = setInterval(() => {
                const curr = latestValue.current;
                const rapidNext = Math.min(max, Math.max(min, curr + amount));
                latestOnChange.current(rapidNext);
            }, 100); // 100ms rapid fire speed
        }, 400); // 400ms delay before rapid fire starts
    };

    // Clean up on unmount
    useEffect(() => {
        return () => stopAdjustment();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val)) {
            onChange(Math.min(max, Math.max(min, val)));
        } else if (e.target.value === "") {
            // Allow empty temporarily? Or force 0? Usually handled by parent, but let's pass 0 for safety or handle empty
            onChange(0);
        }
    };

    return (
        <div className={cn("flex items-center justify-center gap-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full w-[110px] h-8 shadow-sm px-1 select-none", className)}>
            <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer active:scale-90"
                onMouseDown={() => startAdjustment(-step)}
                onMouseUp={stopAdjustment}
                onMouseLeave={stopAdjustment}
                onTouchStart={() => startAdjustment(-step)}
                onTouchEnd={stopAdjustment}
                onClick={(e) => e.stopPropagation()} // Prevent row click
                tabIndex={-1} // Skip focusing buttons
            >
                <Minus className="h-3.5 w-3.5" />
            </Button>

            <Input
                type="number"
                value={value}
                onChange={handleChange}
                className="flex-1 w-full h-7 text-center text-sm font-bold text-slate-700 dark:text-slate-200 border-none bg-transparent p-0 focus-visible:ring-0 shadow-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text"
                onClick={(e) => e.stopPropagation()}
            />

            <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer active:scale-90"
                onMouseDown={() => startAdjustment(step)}
                onMouseUp={stopAdjustment}
                onMouseLeave={stopAdjustment}
                onTouchStart={() => startAdjustment(step)}
                onTouchEnd={stopAdjustment}
                onClick={(e) => e.stopPropagation()}
                tabIndex={-1}
            >
                <Plus className="h-3.5 w-3.5" />
            </Button>
        </div>
    );
}
