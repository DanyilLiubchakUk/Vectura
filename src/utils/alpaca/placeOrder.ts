import AlpacaSDk from "@/utils/alpaca";
import Order from "@alpacahq/alpaca-trade-api";
import { getOrderStatusById } from "@/utils/alpaca/getTradingData";
import { EtradeSide } from "@/types/alpaca";
import { wait } from "@trigger.dev/sdk";

export async function cancelOrder(uuid: string): Promise<{
    success: boolean;
    error?: any;
    message?: string;
}> {
    try {
        await AlpacaSDk.cancelOrder(uuid);
        return { success: true };
    } catch (error: any) {
        return {
            success: false,
            error,
            message: error?.response?.data?.message || "Failed to cancel order",
        };
    }
}
export default async function placeOrder(
    symbol: string,
    qty: number,
    side: EtradeSide
): Promise<{
    success: boolean;
    order?: Order;
    filled?: boolean;
    orderId?: string;
    filledPrice?: number;
    error?: any;
    message?: string;
}> {
    try {
        // Place the order
        const order = await AlpacaSDk.createOrder({
            side,
            symbol,
            type: "market",
            qty,
            time_in_force: "day",
        });

        const orderId = order.id;

        // Wait 1 second before checking status
        await wait.for({ seconds: 1 });

        // Check order status
        const statusResult = await getOrderStatusById(orderId);

        if (statusResult.success && statusResult.data?.successStatus) {
            // Order is filled
            const filledPrice = parseFloat(
                statusResult.data.order.filled_avg_price || "0"
            );
            return {
                order,
                success: true,
                filled: true,
                orderId,
                filledPrice,
            };
        }

        // Order not filled yet, wait 2 more seconds
        await wait.for({ seconds: 2 });

        // Check status again
        const secondStatusResult = await getOrderStatusById(orderId);

        if (
            secondStatusResult.success &&
            secondStatusResult.data?.successStatus
        ) {
            // Order is now filled
            const filledPrice = parseFloat(
                secondStatusResult.data.order.filled_avg_price || "0"
            );
            return {
                order,
                success: true,
                filled: true,
                orderId,
                filledPrice,
            };
        }

        // Still not filled, cancel the order
        const cancelResult = await cancelOrder(orderId);

        if (!cancelResult.success) {
            return {
                success: false,
                order,
                orderId,
                filled: false,
                error: cancelResult.error,
                message: `Order not filled and failed to cancel: ${cancelResult.message}`,
            };
        }
        return {
            success: false,
            order,
            orderId,
            filled: false,
            message:
                "Order was not filled within timeout and has been cancelled",
        };
    } catch (error: any) {
        let message: string = "";
        let isNotEnough =
            error?.response?.data?.message ===
            "account is not allowed to short";
        if (isNotEnough) {
            message = "There's not enough stocks in portfolio to sell";
        } else {
            message = error?.response?.data?.message || "Something went wrong";
        }
        return { success: false, error, message };
    }
}
