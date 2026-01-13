import { z } from "zod";
import { getTodayMinusDays } from "@/backtest/storage/dateUtils";
import { DAYS_BEFORE_TODAY } from "@/backtest/constants";

export const backtestFormSchema = z
    .object({
        name: z
            .string()
            .min(1, "Backtest name is required")
            .max(50, "Backtest name must be 50 characters or less"),
        executionMode: z.enum(["local", "cloud"]),
        stock: z
            .string()
            .min(1, "Stock symbol is required")
            .max(10, "Stock symbol is too long"),
        startDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in MM/DD/YYYY format"),
        endDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in MM/DD/YYYY format"),
        startCapital: z
            .union([z.number(), z.nan()])
            .refine((val) => !isNaN(val), "This field is required")
            .refine((val) => val >= 0, "Cannot be negative"),
        contributionFrequencyDays: z
            .union([z.number(), z.nan()])
            .refine((val) => !isNaN(val), "This field is required")
            .refine((val) => val >= 0, "Cannot be negative"),
        contributionAmount: z
            .union([z.number(), z.nan()])
            .refine((val) => !isNaN(val), "This field is required")
            .refine((val) => val >= 0, "Cannot be negative"),
        capitalPct: z
            .union([z.number(), z.nan()])
            .refine((val) => !isNaN(val), "This field is required")
            .refine((val) => val > 0, "Must be greater than 0%")
            .refine((val) => val <= 100, "Cannot exceed 100%"),
        buyBelowPct: z
            .union([z.number(), z.nan()])
            .refine((val) => !isNaN(val), "This field is required")
            .refine((val) => val > 0, "Must be greater than 0%")
            .refine((val) => val <= 100, "Cannot exceed 100%"),
        sellAbovePct: z
            .union([z.number(), z.nan()])
            .refine((val) => !isNaN(val), "This field is required")
            .refine((val) => val > 0, "Must be greater than 0%")
            .refine((val) => val <= 100, "Cannot exceed 100%"),
        buyAfterSellPct: z
            .union([z.number(), z.nan()])
            .refine((val) => !isNaN(val), "This field is required")
            .refine((val) => val > 0, "Must be greater than 0%")
            .refine((val) => val <= 100, "Cannot exceed 100%"),
        cashFloor: z
            .union([z.number(), z.nan()])
            .refine((val) => !isNaN(val), "This field is required")
            .refine((val) => val >= 0, "Cannot be negative"),
        orderGapFilterEnabled: z.boolean().default(true),
        orderGapPct: z
            .union([z.number(), z.nan()])
            .refine((val) => !isNaN(val), "This field is required")
            .refine((val) => val >= 0, "Must be 0% or greater")
            .refine((val) => val <= 100, "Cannot exceed 100%"),
    })
    .refine(
        (data) => {
            if (data.orderGapFilterEnabled) {
                return (
                    data.orderGapPct >= 0 &&
                    data.orderGapPct <= 100
                );
            }
            return true;
        },
        {
            message: "Order gap percentage must be between 0% and 100%",
            path: ["orderGapPct"],
        }
    )
    .refine(
        (data) => {
            const daysBefore = new Date(getTodayMinusDays(DAYS_BEFORE_TODAY));
            const end = new Date(data.endDate);
            return end <= daysBefore;
        },
        {
            message: `End date must be ${DAYS_BEFORE_TODAY} days before today (${getTodayMinusDays(
                DAYS_BEFORE_TODAY
            )})`,
            path: ["endDate"],
        }
    )
    .refine(
        (data) => {
            const start = new Date(data.startDate);
            const end = new Date(data.endDate);
            return end >= start;
        },
        {
            message: "End date must be after start date",
            path: ["endDate"],
        }
    );

export type BacktestFormValues = z.infer<typeof backtestFormSchema>;
