import {
    getSplits,
    fetchTradeHistoryBatch,
    updateTradeHistoryBatch,
    getTradeHistoryCount,
    fetchToBuyBatch,
    updateToBuyBatch,
    getToSellCount,
    fetchToSellBatch,
    updateToSellBatch,
    getToBuyCount,
    updateSplitsInDatabase,
} from "@/utils/supabase/autoTradeStorage";
import {
    SSplitInfo,
    STradeHistory,
    SToBuy,
    SToSell,
} from "@/utils/supabase/autoTradeTypes";
import { fetchSplitsFromAlphaVantage } from "@/utils/alphavantage/splits";
import { oneDayHasPassed } from "@/auto-trade/utils/date";
import { TRADE_SYMBOL } from "@/auto-trade/constants";
import { roundDown } from "@/auto-trade/utils/helpers";

export async function checkAndRefreshSplits(now: string): Promise<{
    splitCheck: boolean;
    message: string;
    success: boolean;
}> {
    const nowDate = new Date(now);
    const premarketBefore = new Date(nowDate);
    premarketBefore.setUTCHours(14, 24, 30, 0);
    const premarketAfter = new Date(nowDate);
    premarketAfter.setUTCHours(14, 25, 30, 0);

    // Checks is it in range before market opens (14:25)
    if (!(premarketBefore <= nowDate && premarketAfter >= nowDate)) {
        return {
            splitCheck: false,
            message: "Not the time for split check",
            success: true,
        };
    }

    const { lastSplitCheck, lastSplits } = await getSplits(now);

    const lastTime = new Date(lastSplitCheck);
    if (!oneDayHasPassed(lastTime, nowDate)) {
        return {
            splitCheck: true,
            message: `A day has not passed since the previous split check for ${TRADE_SYMBOL}`,
            success: true,
        };
    }

    let newSplits = await fetchSplitsFromAlphaVantage(TRADE_SYMBOL);

    if (newSplits === null) {
        // Only updates splits_last_updated_at field
        await updateSplitsInDatabase(TRADE_SYMBOL, lastSplits, now);
        return {
            splitCheck: true,
            message: `Error fetching splits from AlphaVantage for ${TRADE_SYMBOL}`,
            success: false,
        };
    }

    // The AlphaVantage may return future splits - we filter them out
    newSplits = newSplits.filter((split) => {
        const splitDate = new Date(split.effective_date);
        splitDate.setUTCHours(0, 0, 0, 0);

        return nowDate >= splitDate;
    });

    const splitsChanged = !areSplitsEqual(lastSplits, newSplits);

    if (splitsChanged) {
        // Applies new splits to the system, and update splits, and splits_last_updated_at fields
        await applyNewSplits(lastSplits, newSplits);
        await updateSplitsInDatabase(TRADE_SYMBOL, newSplits, now);
        return {
            splitCheck: true,
            message: `Updated data to all new splits for ${TRADE_SYMBOL}`,
            success: true,
        };
    }
    // By default only updates splits_last_updated_at field
    await updateSplitsInDatabase(TRADE_SYMBOL, lastSplits, now);
    return {
        splitCheck: true,
        message: `The same splits today for ${TRADE_SYMBOL} as before`,
        success: true,
    };
}

function areSplitsEqual(splits1: SSplitInfo[], splits2: SSplitInfo[]): boolean {
    if (splits1.length !== splits2.length) {
        return false;
    }

    const sorted1 = [...splits1].sort(
        (a, b) =>
            new Date(a.effective_date).getTime() -
            new Date(b.effective_date).getTime()
    );
    const sorted2 = [...splits2].sort(
        (a, b) =>
            new Date(a.effective_date).getTime() -
            new Date(b.effective_date).getTime()
    );

    for (let i = 0; i < sorted1.length; i++) {
        if (
            sorted1[i].effective_date !== sorted2[i].effective_date ||
            sorted1[i].split_factor !== sorted2[i].split_factor
        ) {
            return false;
        }
    }

    return true;
}
async function applyNewSplits(
    lastSplits: SSplitInfo[],
    newSplits: SSplitInfo[]
): Promise<void> {
    const multiplier = calculateSplitMultiplier(lastSplits, newSplits);

    await updateTradeHistory(multiplier);
    await updateActions(multiplier);
}
function calculateSplitMultiplier(
    lastSplits: SSplitInfo[],
    newSplits: SSplitInfo[]
): number {
    const numberOfSplitsToApply = newSplits.length - lastSplits.length;
    let multiplier = 1;
    for (let i = 0; i < numberOfSplitsToApply; i++) {
        const split = newSplits[i];
        multiplier *= split.split_factor;
    }
    return multiplier;
}
async function updateTradeHistory(multiplier: number): Promise<void> {
    if (multiplier === 1) {
        return;
    }

    try {
        // Get how many to update
        const totalCount = await getTradeHistoryCount();
        let offset = 0;

        // Update them in batches
        while (offset < totalCount) {
            const batch = await fetchTradeHistoryBatch(offset);

            if (batch.length === 0) {
                break;
            }
            // Update price, and round down
            const updatedBatch: STradeHistory[] = batch.map((record) => ({
                ...record,
                price:
                    record.price !== null
                        ? roundDown(record.price / multiplier)
                        : null,
            }));

            await updateTradeHistoryBatch(updatedBatch);
            offset += batch.length;
        }
    } catch (error) {
        console.error("[splitManager] Error updating trade history", {
            multiplier,
            error,
        });
        throw error;
    }
}
async function updateActions(multiplier: number): Promise<void> {
    if (multiplier === 1) {
        return;
    }

    try {
        // Get how many to buy orders to update
        const toBuyCount = await getToBuyCount();
        let offset = 0;

        // Update them in batches
        while (offset < toBuyCount) {
            const batch = await fetchToBuyBatch(offset);

            if (batch.length === 0) {
                break;
            }

            // Update price, and round down
            const updatedBatch: SToBuy[] = batch.map((record) => ({
                ...record,
                at_price:
                    record.at_price !== null
                        ? roundDown(record.at_price / multiplier)
                        : null,
            }));

            await updateToBuyBatch(updatedBatch);
            offset += batch.length;
        }

        // Get how many to sell orders to update
        const toSellCount = await getToSellCount();
        offset = 0;

        // Update them in batches
        while (offset < toSellCount) {
            const batch = await fetchToSellBatch(offset);

            if (batch.length === 0) {
                break;
            }

            // Update price, and round down
            const updatedBatch: SToSell[] = batch.map((record) => ({
                ...record,
                at_price:
                    record.at_price !== null
                        ? roundDown(record.at_price / multiplier)
                        : null,
            }));

            await updateToSellBatch(updatedBatch);
            offset += batch.length;
        }
    } catch (error) {
        console.error("[splitManager] Error updating actions", {
            multiplier,
            error,
        });
        throw error;
    }
}
