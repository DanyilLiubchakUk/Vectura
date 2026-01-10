import type { IorderAction, IsellAction } from "@/utils/zustand/backtestStore";
import type { ExecutionLine } from "../types";

export interface TrackedOrder extends ExecutionLine {
    originalOrder: IorderAction | IsellAction;
}

export class OrderTracker {
    private orders: Map<string, TrackedOrder> = new Map();

    trackBuyOrder(order: IorderAction, timestamp: string): void {
        this.orders.set(order.id, {
            id: order.id,
            type: 'buy',
            triggerPrice: order.atPrice,
            startTime: timestamp,
            executed: false,
            originalOrder: order,
        });
    }

    trackSellOrder(order: IsellAction, timestamp: string): void {
        this.orders.set(order.id, {
            id: order.id,
            type: 'sell',
            triggerPrice: order.atPrice,
            startTime: timestamp,
            executed: false,
            originalOrder: order,
        });
    }

    markExecuted(orderId: string, executionTime: string): void {
        const order = this.orders.get(orderId);
        if (order) {
            order.executed = true;
            order.executionTime = executionTime;
        }
    }

    removeOrder(orderId: string): void {
        this.orders.delete(orderId);
    }

    generateExecutionLines(): ExecutionLine[] {
        const lines: ExecutionLine[] = [];

        for (const order of this.orders.values()) {
            lines.push({
                id: order.id,
                type: order.type,
                triggerPrice: order.triggerPrice,
                startTime: order.startTime,
                executionTime: order.executionTime,
                executed: order.executed,
            });
        }

        return lines;
    }
}
