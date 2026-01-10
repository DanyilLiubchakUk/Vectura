import { useState, useEffect, RefObject, useMemo } from "react";
import { cn } from "@/lib/utils";

export interface BreakpointRule {
    operator: "<" | ">=";
    size: number;
    classes: string;
}

export function useElementSize(
    elementRef: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
    breakpoints: BreakpointRule[]
): string {
    const [classes, setClasses] = useState<string>("");

    const refsArray = useMemo(() => {
        return Array.isArray(elementRef) ? elementRef : [elementRef];
    }, [elementRef]);

    // Memoize breakpoints to avoid unnecessary re-renders
    const breakpointsKey = useMemo(
        () => JSON.stringify(breakpoints),
        [breakpoints]
    );

    useEffect(() => {
        const element = refsArray.find((ref) => ref.current)?.current;

        if (!element) {
            setClasses("");
            return;
        }

        const updateClasses = () => {
            // Use the first available element's width
            const activeElement = refsArray.find((ref) => ref.current)?.current;
            if (!activeElement) {
                setClasses("");
                return;
            }
            const width = activeElement.offsetWidth;
            const activeClasses: string[] = [];

            for (const rule of breakpoints) {
                if (
                    (rule.operator === "<" && width < rule.size) ||
                    (rule.operator === ">=" && width >= rule.size)
                ) {
                    activeClasses.push(rule.classes);
                }
            }

            setClasses(cn(...activeClasses));
        };

        const timeoutId = setTimeout(() => {
            updateClasses();
        }, 0);

        // Use ResizeObserver to watch for size changes on all elements
        const resizeObserver = new ResizeObserver(() => {
            updateClasses();
        });

        // Observe all refs that have current elements
        refsArray.forEach((ref) => {
            if (ref.current) {
                resizeObserver.observe(ref.current);
            }
        });

        return () => {
            clearTimeout(timeoutId);
            resizeObserver.disconnect();
        };
    }, [refsArray, breakpointsKey, breakpoints]);

    return classes;
}
