import { filterExecutions, getFilterKey } from "@/utils/backtest/filter-executions";
import { useState, useMemo, useEffect } from "react";
import type { ChartControlsState } from "@/components/backtest/chart-controls";
import type { ExecutionLine } from "@/backtest/types";

/**
 * Hook that filters executions based on chart controls state with caching
 * Pre-computes all 16 filter combinations in the background for optimal performance
 */
export function useFilteredExecutions(
    executions: ExecutionLine[] | undefined,
    controlsState: ChartControlsState
): ExecutionLine[] {
    const [filterCache, setFilterCache] = useState<Map<string, ExecutionLine[]>>(new Map());

    useEffect(() => {
        if (!executions || executions.length === 0) {
            setFilterCache(new Map());
            return;
        }

        const currentKey = getFilterKey(controlsState);

        // Cache the current filter combination if not already cached
        setFilterCache((prevCache) => {
            if (prevCache.has(currentKey)) {
                return prevCache;
            }
            const current = filterExecutions(
                executions,
                controlsState.executedBuy,
                controlsState.executedSell,
                controlsState.unexecutedBuy,
                controlsState.unexecutedSell
            );
            return new Map(prevCache).set(currentKey, current);
        });

        // Pre-compute all 16 filter combinations in the background
        const computeAllCombinations = () => {
            setFilterCache((prevCache: Map<string, ExecutionLine[]>) => {
                const cache = new Map<string, ExecutionLine[]>();

                // Generate all 16 combinations of filters in background
                for (let eb = 0; eb <= 1; eb++) {
                    for (let es = 0; es <= 1; es++) {
                        for (let ub = 0; ub <= 1; ub++) {
                            for (let us = 0; us <= 1; us++) {
                                const key = `${eb},${es},${ub},${us}`;
                                const existing = prevCache.get(key);
                                if (existing) {
                                    cache.set(key, existing);
                                } else {
                                    cache.set(
                                        key,
                                        filterExecutions(executions, eb === 1, es === 1, ub === 1, us === 1)
                                    );
                                }
                            }
                        }
                    }
                }

                return cache;
            });
        };

        // Use requestIdleCallback for better performance, fallback to setTimeout
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            window.requestIdleCallback(computeAllCombinations, { timeout: 2000 });
        } else {
            setTimeout(computeAllCombinations, 0);
        }
    }, [executions, controlsState]);

    // Return cached result or compute on the fly if not cached
    return useMemo(() => {
        if (!executions || executions.length === 0) return [];

        const key = getFilterKey(controlsState);
        const cached = filterCache.get(key);

        if (!cached) {
            // Fallback: compute if not cached (shouldn't happen often)
            return filterExecutions(
                executions,
                controlsState.executedBuy,
                controlsState.executedSell,
                controlsState.unexecutedBuy,
                controlsState.unexecutedSell
            );
        }

        return cached;
    }, [executions, controlsState, filterCache]);
}
