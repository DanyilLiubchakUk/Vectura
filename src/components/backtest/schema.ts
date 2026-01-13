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
        startCapital: z.coerce
            .number()
            .min(0, "Starting capital  cannot be negative"),
        contributionFrequencyDays: z
            .union([
                z.number().min(0, "Frequency cannot be negative"),
                z.literal(""),
            ])
            .transform((val) => (val === "" ? undefined : val))
            .optional(),
        contributionAmount: z
            .union([
                z.number().min(0, "Amount cannot be negative"),
                z.literal(""),
            ])
            .transform((val) => (val === "" ? undefined : val))
            .optional(),
        capitalPct: z.coerce
            .number()
            .gt(0, "Capital percentage must be grater that 0%")
            .max(100, "Capital percentage cannot exceed 100%"),
        buyBelowPct: z.coerce
            .number()
            .gt(0, "Buy below percentage must be grater that 0%")
            .max(100, "Buy below percentage cannot exceed 100%"),
        sellAbovePct: z.coerce
            .number()
            .gt(0, "Sell above percentage must be grater that 0%")
            .max(100, "Sell above percentage cannot exceed 100%"),
        buyAfterSellPct: z.coerce
            .number()
            .gt(0, "Buy after sell percentage must be grater that 0%")
            .max(100, "Buy after sell percentage cannot exceed 100%"),
        cashFloor: z.coerce.number().min(0, "Cash floor cannot be negative"),
        orderGapFilterEnabled: z.boolean().default(true),
        orderGapPct: z.coerce.number(),
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
            const freq =
                typeof data.contributionFrequencyDays === "number"
                    ? data.contributionFrequencyDays
                    : 0;
            if (freq > 0) {
                const amount =
                    typeof data.contributionAmount === "number"
                        ? data.contributionAmount
                        : 0;
                return amount > 0;
            }
            return true;
        },
        {
            message: "Contribution amount is required when frequency is set",
            path: ["contributionAmount"],
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
