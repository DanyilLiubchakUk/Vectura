import AlpacaSDk from "@/utils/alpaca";
import Order from "@alpacahq/alpaca-trade-api";
import { EtradeSide } from "@/types/alpaca";

export type TplaceOrder = {
    success: boolean;
    order?: Order;
    error?: any;
    message?: string;
};

export default async function placeOrder(
    symbol: string,
    qty: number,
    side: EtradeSide
): Promise<TplaceOrder> {
    try {
        const order: Order = await AlpacaSDk.createOrder({
            side,
            symbol,
            type: "market",
            qty,
            time_in_force: "day",
        });
        return { order, success: true };
    } catch (error: any) {
        let message: string = "";
        let isNotEnough =
            error.response.data.code === 40310000 ||
            error.response.data.message === "account is not allowed to short";
        if (isNotEnough) {
            message = "There's not enough stocks in portfolio to sell";
        } else {
            message = "Something went wrong";
        }
        return { success: false, error, message };
    }
}
