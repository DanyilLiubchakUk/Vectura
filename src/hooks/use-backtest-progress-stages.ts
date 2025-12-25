import { useMemo, useEffect, useState, useRef } from "react";
import type { BacktestProgressEvent } from "@/backtest/types";

interface ProgressStage {
    id: string;
    label: string;
    isActive: boolean;
    progress: number; // 0-100
    message?: string;
}

const stageLabels: Record<string, string> = {
    searching_first_available_day: "Searching for first available day",
    downloading_before_range: "Downloading stock data (before range)",
    downloading_after_range: "Downloading stock data (after range)",
    working_on_chunk: "Processing chunk",
};

export function useBacktestProgressStages(
    progress: BacktestProgressEvent | null
) {
    const [stagesMap, setStagesMap] = useState<Map<string, ProgressStage>>(
        new Map()
    );
    const previousStageRef = useRef<string | null>(null);

    useEffect(() => {
        if (!progress) {
            setStagesMap(new Map());
            previousStageRef.current = null;
            return;
        }

        const stage = progress.stage;
        const data = progress.data || {};
        const progressPercent = data.progress ?? 0;

        setStagesMap((prev) => {
            const newMap = new Map(prev);

            if (
                previousStageRef.current &&
                previousStageRef.current !== stage
            ) {
                const prevStage = newMap.get(previousStageRef.current);
                if (prevStage) {
                    newMap.set(previousStageRef.current, {
                        ...prevStage,
                        isActive: false,
                    });
                }
            }

            // Use switch-case for stage handling
            switch (stage) {
                case "searching_first_available_day": {
                    const progressPercent = progress.data?.progress ?? 0;

                    newMap.set("searching_first_available_day", {
                        id: "searching_first_available_day",
                        label: stageLabels.searching_first_available_day,
                        isActive: true,
                        progress: progressPercent,
                        message: progress.message,
                    });
                    break;
                }
                case "downloading_before_range": {
                    const progressPercent = progress.data?.progress ?? 0;

                    newMap.set("downloading_before_range", {
                        id: "downloading_before_range",
                        label: stageLabels.downloading_before_range,
                        isActive: true,
                        progress: progressPercent,
                        message: progress.message,
                    });
                    break;
                }
                case "downloading_after_range": {
                    const progressPercent = progress.data?.progress ?? 0;

                    newMap.set("downloading_after_range", {
                        id: "downloading_after_range",
                        label: stageLabels.downloading_after_range,
                        isActive: true,
                        progress: progressPercent,
                        message: progress.message,
                    });
                    break;
                }
                case "working_on_chunk": {
                    const progressPercent = progress.data?.progress ?? 0;

                    newMap.set("working_on_chunk", {
                        id: "working_on_chunk",
                        label: stageLabels.working_on_chunk,
                        isActive: true,
                        progress: progressPercent,
                        message: progress.message || "Processing...",
                    });
                    break;
                }
                default:
                    break;
            }

            // Mark stage as complete when progress reaches 100%
            const currentStage = newMap.get(stage);
            if (currentStage && progressPercent >= 100) {
                newMap.set(stage, {
                    ...currentStage,
                    isActive: false,
                    progress: 100,
                });
            }

            if (stage === "completed") {
                newMap.clear();
            }

            previousStageRef.current = stage;
            return newMap;
        });
    }, [progress]);

    const stages = useMemo(() => {
        return Array.from(stagesMap.values());
    }, [stagesMap]);

    return { stages, hasStages: stages.length > 0 };
}
