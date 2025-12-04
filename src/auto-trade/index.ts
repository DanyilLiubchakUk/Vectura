import {
    checkScheduleTime,
    getIsAllowedToStart,
} from "@/auto-trade/utils/date";
import { checkAndRefreshSplits } from "@/auto-trade/utils/splitManager";
import Ealgorighms from "@/utils/trading/algorithms/dictionary";
import gridTradeV0 from "@/utils/trading/algorithms/gridTradeV0";
import { TRADE_SYMBOL, TRADING_ALGORITHM } from "@/auto-trade/constants";
import { getFilteredSnapshot } from "@/utils/alpaca/getTradingData";

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
    let algorithmMessage = "";
    switch (TRADING_ALGORITHM) {
        case Ealgorighms.GridV0:
            algorithmMessage = await gridTradeV0(
                TRADE_SYMBOL,
                false,
                data.price,
                now
            );
            break;

        default:
            console.log("Passed unknown algorithm name");
            break;
    }

    return {
        message: algorithmMessage,
        success: true,
    };
}
