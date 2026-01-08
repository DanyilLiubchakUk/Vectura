import {
    ApiGatewayManagementApiClient,
    PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { runBacktestCore } from "@/backtest/core/engine";
import { DEFAULT_AWS_REGION } from "@/constants/runtime";
import type {
    APIGatewayProxyWebsocketHandlerV2,
    APIGatewayProxyWebsocketEventV2,
    Context,
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
        if (abortController.signal.aborted || !activeConnections.has(connectionId)) {
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
            await sendToConnection(connectionId, { type: "cancelled" }, endpoint);
            activeBacktests.delete(connectionId);
            return;
        }

        if (!activeConnections.has(connectionId)) {
            console.error(`[Lambda] Connection ${connectionId} closed, cannot send result`);
            activeBacktests.delete(connectionId);
            return;
        }

        const resultData = { type: "result", ...result };
        const resultSize = JSON.stringify(resultData).length;
        const hasChartData = result.chartData && typeof result.chartData === 'object';
        const MAX_MESSAGE_SIZE = 100 * 1024; // 100KB to be safe

        if (hasChartData || resultSize > MAX_MESSAGE_SIZE) {
            // Send base result without chartData
            const { chartData, ...resultWithoutChart } = result;
            const baseResult = { type: "result", ...resultWithoutChart };

            const baseSent = await sendToConnection(connectionId, baseResult, endpoint);
            if (!baseSent) {
                console.error(`[Lambda] Failed to send base result`);
                activeBacktests.delete(connectionId);
                return;
            }

            // Send chartData in chunks if it exists
            if (chartData && typeof chartData === 'object') {
                const chartDataObj = chartData as { priceData?: any[], executions?: any[] };
                const priceData = chartDataObj.priceData || [];
                const executions = chartDataObj.executions || [];

                // Send priceData in chunks of 800
                if (priceData.length > 0) {
                    const CHUNK_SIZE = 800;
                    const totalChunks = Math.ceil(priceData.length / CHUNK_SIZE);

                    for (let i = 0; i < priceData.length; i += CHUNK_SIZE) {
                        const chunk = priceData.slice(i, i + CHUNK_SIZE);
                        const chunkIndex = Math.floor(i / CHUNK_SIZE);
                        const chunkSent = await sendToConnection(connectionId, {
                            type: "result_chunk",
                            dataType: "priceData",
                            chunkIndex,
                            totalChunks,
                            chartData: { priceData: chunk },
                        }, endpoint);
                        if (!chunkSent) {
                            console.error(`[Lambda] Failed to send priceData chunk`);
                            activeBacktests.delete(connectionId);
                            return;
                        }
                    }
                }

                // Send executions in chunks of 200
                if (executions.length > 0) {
                    const MAX_CHUNK_SIZE_BYTES = 100 * 1024;
                    const CHUNK_SIZE = 200;
                    const totalChunks = Math.ceil(executions.length / CHUNK_SIZE);

                    for (let i = 0; i < executions.length; i += CHUNK_SIZE) {
                        const chunk = executions.slice(i, i + CHUNK_SIZE);
                        const chunkIndex = Math.floor(i / CHUNK_SIZE);
                        const chunkData = {
                            type: "result_chunk",
                            dataType: "executions",
                            chunkIndex,
                            totalChunks,
                            chartData: { executions: chunk },
                        };

                        // Safety check for chunk size
                        if (JSON.stringify(chunkData).length > MAX_CHUNK_SIZE_BYTES) {
                            const safeChunkSize = 50;
                            const safeChunk = executions.slice(i, i + safeChunkSize);
                            const safeTotalChunks = Math.ceil(executions.length / safeChunkSize);
                            const safeChunkSent = await sendToConnection(connectionId, {
                                type: "result_chunk",
                                dataType: "executions",
                                chunkIndex: Math.floor(i / safeChunkSize),
                                totalChunks: safeTotalChunks,
                                chartData: { executions: safeChunk },
                            }, endpoint);
                            if (!safeChunkSent) {
                                console.error(`[Lambda] Failed to send executions chunk`);
                                activeBacktests.delete(connectionId);
                                return;
                            }
                            i += safeChunkSize - CHUNK_SIZE;
                            continue;
                        }

                        const chunkSent = await sendToConnection(connectionId, chunkData, endpoint);
                        if (!chunkSent) {
                            console.error(`[Lambda] Failed to send executions chunk`);
                            activeBacktests.delete(connectionId);
                            return;
                        }
                    }
                }

                // Send completion message - this tells the frontend to close the connection
                await sendToConnection(connectionId, { type: "result_complete" }, endpoint);
            }
        } else {
            const resultSent = await sendToConnection(connectionId, resultData, endpoint);
            if (!resultSent) {
                console.error(`[Lambda] Failed to send result`);
            }
        }

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

        console.error(`[Lambda] Backtest error: ${error instanceof Error ? error.message : String(error)}`);
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
        console.error(`[Lambda] Missing connectionId`);
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
                // This handles the case where $connect happened in a different Lambda invocation
                if (!activeConnections.has(connectionId)) {
                    activeConnections.add(connectionId);
                }

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
