import { FormControl, FormField } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { SliderField } from "./slider-field";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

interface ToggleSliderFieldProps<T extends FieldValues> {
    toggleName: FieldPath<T>;
    name: FieldPath<T>;
    control: Control<T>;
    label: string;
    description?: string;
    min: number;
    max: number;
    step?: number;
    className?: string;
}

export function ToggleSliderField<T extends FieldValues>({
    toggleName,
    name,
    control,
    label,
    description,
    min,
    max,
    step = 0.1,
    className,
}: ToggleSliderFieldProps<T>) {
    return (
        <FormField
            control={control}
            name={toggleName}
            render={({ field: toggleField }) => (
                <FormField
                    control={control}
                    name={name}
                    render={() => {
                        const isEnabled = toggleField.value as boolean;

                        const handleToggleChange = (checked: boolean) => {
                            toggleField.onChange(checked);
                        };

                        const SwitchComponent = (
                            <FormControl>
                                <Switch
                                    checked={isEnabled}
                                    onCheckedChange={handleToggleChange}
                                />
                            </FormControl>
                        );

                        return (
                            <SliderField
                                name={name}
                                control={control}
                                label={label}
                                switchComponent={SwitchComponent}
                                description={description}
                                min={min}
                                max={max}
                                step={step}
                                disabled={!isEnabled}
                                className={className}
                            />
                        );
                    }}
                />
            )}
        />
    );
}
