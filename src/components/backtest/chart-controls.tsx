"use client";

import {
    ButtonGroup,
    ButtonGroupSeparator,
} from "@/components/ui/button-group";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export interface ChartControlsState {
    executedBuy: boolean;
    executedSell: boolean;
    unexecutedBuy: boolean;
    unexecutedSell: boolean;
}

export function ChartControls({ state, onStateChange }: {
    state: ChartControlsState;
    onStateChange: (state: ChartControlsState) => void;
}) {

    const executedAllActive = state.executedBuy && state.executedSell;
    const unexecutedAllActive = state.unexecutedBuy && state.unexecutedSell;

    const handleExecutedAll = () => {
        const newValue = !executedAllActive;
        onStateChange({
            ...state,
            executedBuy: newValue,
            executedSell: newValue,
        });
    };

    const handleUnexecutedAll = () => {
        const newValue = !unexecutedAllActive;
        onStateChange({
            ...state,
            unexecutedBuy: newValue,
            unexecutedSell: newValue,
        });
    };

    const handleExecutedBuy = () => {
        onStateChange({
            ...state,
            executedBuy: !state.executedBuy,
        });
    };

    const handleExecutedSell = () => {
        onStateChange({
            ...state,
            executedSell: !state.executedSell,
        });
    };

    const handleUnexecutedBuy = () => {
        onStateChange({
            ...state,
            unexecutedBuy: !state.unexecutedBuy,
        });
    };

    const handleUnexecutedSell = () => {
        onStateChange({
            ...state,
            unexecutedSell: !state.unexecutedSell,
        });
    };

    return (
        <div className="flex items-center gap-2 flex-wrap">

            <div className="flex flex-col gap-1">
                <Label
                    className="text-muted-foreground px-1 cursor-pointer hover:text-foreground transition-colors"
                    onClick={handleExecutedAll}
                >
                    Executed
                </Label>
                <ButtonGroup>
                    <Button
                        variant={state.executedBuy ? "default" : "outline"}
                        size="sm"
                        onClick={handleExecutedBuy}
                    >
                        Buy
                    </Button>
                    <ButtonGroupSeparator />
                    <Button
                        variant={executedAllActive ? "default" : "outline"}
                        size="sm"
                        onClick={handleExecutedAll}
                    >
                        All
                    </Button>
                    <ButtonGroupSeparator />
                    <Button
                        variant={state.executedSell ? "default" : "outline"}
                        size="sm"
                        onClick={handleExecutedSell}
                    >
                        Sell
                    </Button>
                </ButtonGroup>
            </div>

            <div className="flex flex-col gap-1">
                <Label
                    className="text-muted-foreground px-1 cursor-pointer hover:text-foreground transition-colors"
                    onClick={handleUnexecutedAll}
                >
                    Unexecuted
                </Label>
                <ButtonGroup>
                    <Button
                        variant={state.unexecutedBuy ? "default" : "outline"}
                        size="sm"
                        onClick={handleUnexecutedBuy}
                    >
                        Buy
                    </Button>
                    <ButtonGroupSeparator />
                    <Button
                        variant={unexecutedAllActive ? "default" : "outline"}
                        size="sm"
                        onClick={handleUnexecutedAll}
                    >
                        All
                    </Button>
                    <ButtonGroupSeparator />
                    <Button
                        variant={state.unexecutedSell ? "default" : "outline"}
                        size="sm"
                        onClick={handleUnexecutedSell}
                    >
                        Sell
                    </Button>
                </ButtonGroup>
            </div>
        </div>
    );
}
