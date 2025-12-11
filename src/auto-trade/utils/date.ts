import { getMarketClock } from "@/utils/alpaca/getTradingData";

export async function getIsAllowedToStart(): Promise<{
    message: string;
    canStart: boolean;
}> {
    const clock = await getMarketClock();
    if (!clock.data?.is_open) {
        return { message: "Market is not open", canStart: false };
    }
    return { message: "Market is open", canStart: true };
}

export function checkScheduleTime(now: string): boolean {
    const nowDate = new Date(now);
    const start = new Date(nowDate);
    start.setUTCHours(14, 24, 30, 0);
    const finish = new Date(nowDate);
    finish.setUTCHours(20, 59, 30, 0);

    // Checks the compute range (14:25 - 20:59)
    if (start <= nowDate && finish >= nowDate) {
        return true;
    }

    return false;
}

export function oneDayHasPassed(lastTime: Date | null, now: Date): boolean {
    if (!lastTime) {
        return true;
    }
    now.setUTCHours(0, 0, 0, 0);
    lastTime.setUTCHours(0, 0, 0, 0);

    return lastTime.getTime() < now.getTime();
}
