import { SliderField } from "@/components/backtest/fields/slider-field";
import type { BacktestFormValues } from "@/components/backtest/schema";
import type { Control } from "react-hook-form";

interface StrategyFieldsProps {
    control: Control<BacktestFormValues>;
}

export function StrategyFields({ control }: StrategyFieldsProps) {
    return (
        <>
            {/* Capital Percentage */}
            <SliderField
                name="capitalPct"
                control={control}
                label="Capital % per Buy"
                description="Percentage of capital to use per buy"
                min={0.1}
                max={100}
                step={0.1}
                className="lg:col-span-2 max-sm:col-span-2"
            />

            {/* Buy Below Percentage */}
            <SliderField
                name="buyBelowPct"
                control={control}
                label="Buy Below % (trigger)"
                description="Percentage below current price to set NextBuyOn"
                min={0.1}
                max={100}
                step={0.1}
                className="lg:col-span-2 max-sm:col-span-2"
            />

            {/* Sell Above Percentage */}
            <SliderField
                name="sellAbovePct"
                control={control}
                label="Sell Above % (trigger)"
                description="Percentage above buy price to set SellOn"
                min={0.1}
                max={100}
                step={0.1}
                className="lg:col-span-2 max-sm:col-span-2"
            />

            {/* Buy After Sell Percentage */}
            <SliderField
                name="buyAfterSellPct"
                control={control}
                label="Buy After Sell % (rebuy)"
                description="Percentage higher to buy more after each sell"
                min={0.1}
                max={100}
                step={0.1}
                className="lg:col-span-2 max-sm:col-span-2"
            />

            {/* Order Gap Percentage */}
            <SliderField
                name="orderGapPct"
                control={control}
                label="Order Gap % (-1 to disable)"
                description="Percent gap to join orders. Use -1 to disable filtering"
                min={-1}
                max={100}
                step={0.1}
                className="lg:col-span-2 max-sm:col-span-2"
            />
        </>
    );
}
