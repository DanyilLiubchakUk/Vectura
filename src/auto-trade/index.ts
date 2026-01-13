import {
    checkScheduleTime,
    getIsAllowedToStart,
} from "@/auto-trade/utils/date";
import { checkAndRefreshSplits } from "@/auto-trade/utils/splitManager";
import { getFilteredSnapshot } from "@/utils/alpaca/getTradingData";
import gridTrade from "@/utils/trading/algorithms/gridTrade";
import { TRADE_SYMBOL } from "@/auto-trade/constants";

export default async function AutoTrade(now: string): Promise<{
    message: string;
    success: boolean;
}> {
    const isWithinSchedule = checkScheduleTime(now);
    if (!isWithinSchedule) {
        return {
            message: "Not within schedule",
            success: true,
        };
    }

    const {
        splitCheck,
        message: splitMessage,
        success: splitSuccess,
    } = await checkAndRefreshSplits(now);
    if (splitCheck) {
        return { message: splitMessage, success: splitSuccess };
    }

    const { canStart, message } = await getIsAllowedToStart();
    if (!canStart) {
        return { message, success: true };
    }

    const { data, success, error } = await getFilteredSnapshot(TRADE_SYMBOL);

    if (!success || !data) {
        console.error("Failed to get filtered snapshot:", error);
        return {
            message: "Could not fetch market data for trading.",
            success: false,
        };
    }

    const algorithmMessage = await gridTrade(
        TRADE_SYMBOL,
        false,
        data.price,
        now
    );

    return {
        message: algorithmMessage,
        success: true,
    };
}
