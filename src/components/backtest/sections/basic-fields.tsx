import { TextInputField } from "@/components/backtest/fields/text-input-field";
import { SelectField } from "@/components/backtest/fields/select-field";
import { DateField } from "@/components/backtest/fields/date-field";
import Ealgorighms from "@/utils/trading/algorithms/dictionary";
import type { BacktestFormValues } from "@/components/backtest/schema";
import type { Control } from "react-hook-form";

interface BasicFieldsProps {
    control: Control<BacktestFormValues>;
}

const algorithmOptions = [
    { value: Ealgorighms.GridV0, label: "Grid Trading V0" },
];

export function BasicFields({ control }: BasicFieldsProps) {
    return (
        <>
            {/* Stock Symbol */}
            <TextInputField
                name="stock"
                control={control}
                label="Stock Symbol"
                description="Enter the stock ticker symbol to backtest"
                placeholder="TQQQ"
                inputClassName="uppercase"
                transformValue={(value) => value.toUpperCase()}
            />

            {/* Algorithm */}
            <SelectField
                name="algorithm"
                control={control}
                label="Trading Algorithm"
                description="Choose the trading strategy to use"
                placeholder="Select an algorithm"
                options={algorithmOptions}
            />

            {/* Start Date */}
            <DateField
                name="startDate"
                control={control}
                label="Start Date"
                description="Backtest start date (MM/DD/YYYY)"
                className="max-[525px]:col-span-2"
            />

            {/* End Date */}
            <DateField
                name="endDate"
                control={control}
                label="End Date"
                description="Backtest end date (MM/DD/YYYY)"
                className="max-[525px]:col-span-2"
            />
        </>
    );
}
