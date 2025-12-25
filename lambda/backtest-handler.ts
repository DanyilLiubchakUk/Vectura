import {
    ApiGatewayManagementApiClient,
    PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { runBacktestCore } from "@/backtest/core/engine";
import { DEFAULT_AWS_REGION } from "@/constants/runtime";
import type {
    APIGatewayProxyWebsocketHandlerV2,
    APIGatewayProxyWebsocketEventV2,
} from "aws-lambda";
import type { BacktestConfig, BacktestProgressEvent } from "@/backtest/types";

const apiGatewayEndpoint = process.env.API_GATEWAY_ENDPOINT;
const awsRegion = DEFAULT_AWS_REGION;

const activeConnections = new Set<string>();
const activeBacktests = new Map<string, AbortController>();

const clientCache = new Map<string, ApiGatewayManagementApiClient>();

function getClient(endpoint: string): ApiGatewayManagementApiClient {
    let client = clientCache.get(endpoint);
    if (!client) {
        client = new ApiGatewayManagementApiClient({
            region: awsRegion,
            endpoint: endpoint,
        });
        clientCache.set(endpoint, client);
    }
    return client;
}

function getEndpoint(): string {
    if (apiGatewayEndpoint) return apiGatewayEndpoint;

    throw new Error("Cannot determine API Gateway endpoint");
}

async function sendToConnection(
    connectionId: string,
    data: any,
    endpoint: string
): Promise<boolean> {
    if (!activeConnections.has(connectionId)) {
        return false;
    }

    try {
        const client = getClient(endpoint);
        await client.send(
            new PostToConnectionCommand({
                ConnectionId: connectionId,
                Data: JSON.stringify(data),
            })
        );
        return true;
    } catch (error: any) {
        const statusCode = error?.$metadata?.httpStatusCode;
        if (statusCode === 410 || statusCode === 400) {
            // console.log(
            //     `[Lambda] Connection ${connectionId} gone (${statusCode})`
            // );
            activeConnections.delete(connectionId);
        } else {
            // console.error(
            //     `[Lambda] Failed to send to ${connectionId}:`,
            //     error.message
            // );
        }
        return false;
    }
}

async function runBacktest(
    connectionId: string,
    config: BacktestConfig,
    endpoint: string
): Promise<void> {
    // console.log(
    //     `[Lambda] Starting backtest for ${config.stock} from ${config.startDate} to ${config.endDate}`
    // );

    const abortController = new AbortController();
    activeBacktests.set(connectionId, abortController);

    const onProgress = async (event: BacktestProgressEvent) => {
        if (abortController.signal.aborted) {
            return;
        }
        await sendToConnection(
            connectionId,
            { type: "progress", ...event },
            endpoint
        );
    };

    try {
        const result = await runBacktestCore(
            config,
            onProgress,
            abortController.signal
        );

        if (abortController.signal.aborted) {
            await sendToConnection(
                connectionId,
                { type: "cancelled" },
                endpoint
            );
            activeBacktests.delete(connectionId);
            return;
        }

        // console.log(`[Lambda] Backtest completed successfully`);
        await sendToConnection(
            connectionId,
            { type: "result", ...result },
            endpoint
        );
        activeBacktests.delete(connectionId);
    } catch (error) {
        activeBacktests.delete(connectionId);

        if (
            abortController.signal.aborted ||
            (error instanceof Error && error.message === "Backtest cancelled")
        ) {
            await sendToConnection(
                connectionId,
                { type: "cancelled" },
                endpoint
            );
            return;
        }

        // console.error(
        //     `[Lambda] Backtest failed:`,
        //     error instanceof Error ? error.message : error
        // );
        await sendToConnection(
            connectionId,
            {
                type: "error",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            endpoint
        );
        throw error;
    }
}

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (
    event: APIGatewayProxyWebsocketEventV2
) => {
    const requestContext = event.requestContext;
    const connectionId = requestContext?.connectionId;
    const routeKey = requestContext?.routeKey || "$default";

    // console.log(`[Lambda] ${routeKey} from ${connectionId}`);

    if (!connectionId) {
        return { statusCode: 400, body: "Missing connectionId" };
    }

    try {
        const endpoint = getEndpoint();

        switch (routeKey) {
            case "$connect":
                activeConnections.add(connectionId);
                console.log(
                    `[Lambda] Connected: ${connectionId}, active: ${activeConnections.size}`
                );
                return { statusCode: 200, body: "Connected" };

            case "$disconnect":
                activeConnections.delete(connectionId);
                // Cancel any active backtest for this connection
                const abortController = activeBacktests.get(connectionId);
                if (abortController) {
                    abortController.abort();
                    activeBacktests.delete(connectionId);
                }
                console.log(
                    `[Lambda] Disconnected: ${connectionId}, active: ${activeConnections.size}`
                );
                return { statusCode: 200, body: "Disconnected" };

            case "$default": {
                const body = JSON.parse(event.body || "{}");

                if (body.type === "start_backtest" && body.mode === "cloud") {
                    console.log(
                        `[Lambda] Backtest request:`,
                        JSON.stringify(body.config)
                    );

                    await runBacktest(connectionId, body.config, endpoint);

                    return { statusCode: 200, body: "Backtest completed" };
                }

                if (body.type === "cancel_backtest") {
                    const abortController = activeBacktests.get(connectionId);
                    if (abortController) {
                        abortController.abort();
                        activeBacktests.delete(connectionId);
                        await sendToConnection(
                            connectionId,
                            { type: "cancelled" },
                            endpoint
                        );
                    }
                    return { statusCode: 200, body: "Cancellation requested" };
                }

                // console.log(`[Lambda] Unknown message type: ${body.type}`);
                return { statusCode: 400, body: "Unknown message type" };
            }

            default:
                return { statusCode: 200, body: "OK" };
        }
    } catch (error) {
        // console.error(
        //     `[Lambda] Handler error:`,
        //     error instanceof Error ? error.message : error
        // );
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error instanceof Error ? error.message : "Unknown error",
            }),
        };
    }
};
