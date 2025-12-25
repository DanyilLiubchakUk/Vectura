import type { ProgressCallback, BacktestProgressEvent } from "@/backtest/types";

const PROGRESS_UPDATE_INTERVAL = 0.01; // 1%
const MIN_UPDATE_INTERVAL_MS = 10000; // 10 seconds
const SIGNIFICANT_PROGRESS_THRESHOLD = 0.2; // 20% move

interface ProgressState {
    lastUpdateValue: number;
    total: number;
    stage: string;
    lastUpdateTime: number;
}

class SimpleProgressManager {
    private state: ProgressState | null = null;

    shouldUpdate(current: number, total: number, stage: string): boolean {
        if (
            !this.state ||
            this.state.stage !== stage ||
            this.state.total !== total
        ) {
            // New stage or total changed - always send first update
            this.state = {
                lastUpdateValue: current,
                total,
                stage,
                lastUpdateTime: Date.now(),
            };
            return true;
        }

        const progress = current / total;
        const lastProgress = this.state.lastUpdateValue / this.state.total;
        const progressDelta = progress - lastProgress;

        // Check if there was a significant progress move (20% or more)
        const hasSignificantMove =
            progressDelta >= SIGNIFICANT_PROGRESS_THRESHOLD;

        // Check if at least MIN_UPDATE_INTERVAL_MS have passed since last update
        const timeSinceLastUpdate = Date.now() - this.state.lastUpdateTime;
        const hasMinTimePassed = timeSinceLastUpdate >= MIN_UPDATE_INTERVAL_MS;

        // Check if progress reached 100%
        const isComplete = progress >= 1.0;

        // Update if: significant move (immediate) OR (min time passed AND interval threshold met) OR complete
        const interval = PROGRESS_UPDATE_INTERVAL * total;
        const valueDelta = current - this.state.lastUpdateValue;
        const meetsIntervalThreshold = valueDelta >= interval;

        if (
            hasSignificantMove ||
            (hasMinTimePassed && meetsIntervalThreshold) ||
            isComplete
        ) {
            this.state.lastUpdateValue = current;
            this.state.lastUpdateTime = Date.now();
            return true;
        }

        return false;
    }

    reset(): void {
        this.state = null;
    }
}

export const progressManager = new SimpleProgressManager();

export async function emitProgressIfNeeded(
    onProgress: ProgressCallback | undefined,
    stage: string,
    current: number,
    total: number,
    message: string,
    additionalData: Record<string, unknown> = {}
): Promise<void> {
    if (!onProgress) return;

    if (progressManager.shouldUpdate(current, total, stage)) {
        const progress =
            total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

        const event: BacktestProgressEvent = {
            stage: stage as any,
            message,
            data: {
                current,
                total,
                progress,
                ...additionalData,
            },
            timestamp: new Date().toISOString(),
        };
        onProgress(event);
    }
}
