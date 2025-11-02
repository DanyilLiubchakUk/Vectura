import { logger, schedules } from "@trigger.dev/sdk";
import AutoTrade from "@/utils/trading";

export const schedule = schedules.task({
    id: "trade-scheduled",
    cron: "* * * * *", // for testing purposes every minute
    maxDuration: 180, // 180 seconds
    run: async (payload) => {
        try {
            const { message, success } = await AutoTrade();

            if (success) {
                logger.log("Auto trade complete", { message });
            } else {
                logger.log("Auto trade failure", { message });
            }
            return {
                success,
                message,
                timestamp: payload.timestamp.toISOString(),
            };
        } catch (error) {
            logger.log("Failure running auto trade", { error });

            return {
                success: false,
                message: "Catch an erorr running AutoTrade function",
                timestamp: payload.timestamp.toISOString(),
            };
        }
    },
});
