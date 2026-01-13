import { SliderField } from "@/components/backtest/fields/slider-field";
import { useFormContainer } from "@/contexts/form-container-context";
import { MEDIA_QUERY_BREAKPOINTS } from "@/constants/media-queries";
import { ToggleSliderField } from "../fields/toggle-slider-field";
import { useElementSize } from "@/hooks/use-element-size";
import { cn } from "@/lib/utils";
import type { BacktestFormValues } from "@/components/backtest/schema";
import type { Control } from "react-hook-form";

interface StrategyFieldsProps {
    control: Control<BacktestFormValues>;
}

export function StrategyFields({ control }: StrategyFieldsProps) {
    const containerRef = useFormContainer();

    const colSpanClasses = useElementSize(containerRef || { current: null }, [
        {
            operator: ">=",
            size: MEDIA_QUERY_BREAKPOINTS.MD,
            classes: "col-span-6",
        },
    ]);
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
                placeholder="60"
                className={cn("col-span-12", colSpanClasses)}
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
                placeholder="2"
                className={cn("col-span-12", colSpanClasses)}
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
                placeholder="18"
                className={cn("col-span-12", colSpanClasses)}
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
                placeholder="25"
                className={cn("col-span-12", colSpanClasses)}
            />

            {/* Order Gap Percentage */}
            <ToggleSliderField
                toggleName="orderGapFilterEnabled"
                name="orderGapPct"
                control={control}
                label="Order Gap Filtering"
                description="Percent gap to join orders"
                min={0}
                max={100}
                step={0.1}
                placeholder="1.5"
                className={cn("col-span-12", colSpanClasses)}
            />
        </>
    );
}
