import { z } from "zod";
import { getTodayMinusDays } from "@/backtest/storage/dateUtils";
import { DAYS_BEFORE_TODAY } from "@/backtest/constants";
import Ealgorighms from "@/utils/trading/algorithms/dictionary";

export const backtestFormSchema = z
    .object({
        executionMode: z.enum(["local", "cloud"]),
        stock: z
            .string()
            .min(1, "Stock symbol is required")
            .max(10, "Stock symbol is too long"),
        algorithm: z
            .string()
            .min(1, "Please select an algorithm")
            .refine(
                (val) =>
                    Object.values(Ealgorighms).includes(val as Ealgorighms),
                { message: "Invalid algorithm selected" }
            ),
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
        orderGapPct: z.coerce
            .number()
            .min(-1, "Order gap percentage must be at least -1")
            .max(100, "Order gap percentage cannot exceed 100%"),
    })
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
