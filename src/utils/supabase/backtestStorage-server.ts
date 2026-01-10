import { previousDay, nextDay } from "@/backtest/storage/dateUtils";
import { checkDaysExist } from "@/utils/supabase/backtestStorage";

export async function findNearestTradingDaysInRange(
    symbol: string,
    centerDay: string,
    daysBefore: number = 10,
    daysAfter: number = 10
): Promise<{ previous: string | null; next: string | null }> {
    const daysToCheck: string[] = [];

    const beforeDays: string[] = [];
    let currentDay = centerDay;
    for (let i = 0; i < daysBefore; i++) {
        currentDay = previousDay(currentDay);
        beforeDays.unshift(currentDay);
    }
    daysToCheck.push(...beforeDays);

    daysToCheck.push(centerDay);

    currentDay = centerDay;
    for (let i = 0; i < daysAfter; i++) {
        currentDay = nextDay(currentDay);
        daysToCheck.push(currentDay);
    }

    const dbResults = await checkDaysExist(symbol, daysToCheck);

    const centerIndex = daysBefore;
    let previous: string | null = null;
    let next: string | null = null;

    for (let i = centerIndex - 1; i >= 0; i--) {
        const day = daysToCheck[i];
        const exists = dbResults[day];
        if (exists) {
            previous = day;
            break;
        }
    }

    for (let i = centerIndex + 1; i < daysToCheck.length; i++) {
        const day = daysToCheck[i];
        const exists = dbResults[day];
        if (exists) {
            next = day;
            break;
        }
    }

    if (dbResults[centerDay]) {
        return { previous, next };
    }

    const missingDays = daysToCheck.filter((day) => !dbResults[day]);

    const { serverAdapter } = await import("@/utils/backtest/server-adapter");

    const priorityDays: string[] = [];

    if (!dbResults[centerDay]) {
        priorityDays.push(centerDay);
    }

    for (
        let i = centerIndex + 1;
        i < daysToCheck.length && priorityDays.length < 8;
        i++
    ) {
        const day = daysToCheck[i];
        if (!dbResults[day] && !priorityDays.includes(day)) {
            priorityDays.push(day);
        }
    }

    for (let i = centerIndex - 1; i >= 0 && priorityDays.length < 15; i--) {
        const day = daysToCheck[i];
        if (!dbResults[day] && !priorityDays.includes(day)) {
            priorityDays.push(day);
        }
    }

    for (const day of missingDays) {
        if (priorityDays.length >= 15) break;
        if (!priorityDays.includes(day)) {
            priorityDays.push(day);
        }
    }

    const daysToCheckAlpaca = priorityDays.slice(0, 15);

    const alpacaChecks = await Promise.all(
        daysToCheckAlpaca.map(async (day) => {
            try {
                const blob = await serverAdapter.fetchDayBars(symbol, day);
                const exists = blob !== null;
                return { day, exists };
            } catch {
                return { day, exists: false };
            }
        })
    );

    const allResults = { ...dbResults };
    alpacaChecks.forEach(({ day, exists }) => {
        allResults[day] = exists;
    });

    previous = null;
    next = null;

    for (let i = centerIndex - 1; i >= 0; i--) {
        const day = daysToCheck[i];
        if (allResults[day]) {
            previous = day;
            break;
        }
    }

    for (let i = centerIndex + 1; i < daysToCheck.length; i++) {
        const day = daysToCheck[i];
        if (allResults[day]) {
            next = day;
            break;
        }
    }

    if (!next && daysToCheck.length > centerIndex + 1) {
        const remainingDays = daysToCheck.slice(centerIndex + 1 + 10);
        const additionalDaysToCheck = remainingDays.slice(0, 10);

        if (additionalDaysToCheck.length > 0) {
            const additionalChecks = await Promise.all(
                additionalDaysToCheck.map(async (day) => {
                    try {
                        const blob = await serverAdapter.fetchDayBars(
                            symbol,
                            day
                        );
                        return { day, exists: blob !== null };
                    } catch {
                        return { day, exists: false };
                    }
                })
            );

            additionalChecks.forEach(({ day, exists }) => {
                allResults[day] = exists;
                if (exists && !next) {
                    next = day;
                }
            });
        }
    }

    if (!previous && centerIndex > 0) {
        const remainingDays = daysToCheck
            .slice(0, Math.max(0, centerIndex - 10))
            .reverse();
        const additionalDaysToCheck = remainingDays.slice(0, 10);

        if (additionalDaysToCheck.length > 0) {
            const additionalChecks = await Promise.all(
                additionalDaysToCheck.map(async (day) => {
                    try {
                        const blob = await serverAdapter.fetchDayBars(
                            symbol,
                            day
                        );
                        return { day, exists: blob !== null };
                    } catch {
                        return { day, exists: false };
                    }
                })
            );

            additionalChecks.forEach(({ day, exists }) => {
                allResults[day] = exists;
                if (exists && !previous) {
                    previous = day;
                }
            });
        }
    }

    return { previous, next };
}
