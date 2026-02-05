/// <reference types="@cloudflare/workers-types" />
import { AwsClient } from "aws4fetch";

const AWS_REGION = "us-east-1";

export { BacktestJob } from "./BacktestJob";

interface Env {
    AWS_ACCESS_KEY_ID: string;
    AWS_SECRET_ACCESS_KEY: string;
    CALLBACK_SECRET: string;
    BACKTEST_JOB: DurableObjectNamespace;
}

function createAwsClient(env: Env): AwsClient {
    return new AwsClient({
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    });
}

async function invokeLambda(env: Env, payload: unknown): Promise<boolean> {
    const aws = createAwsClient(env);
    const url = `https://lambda.${AWS_REGION}.amazonaws.com/2015-03-31/functions/backtest-handler/invocations`;
    try {
        const res = await aws.fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Amz-Invocation-Type": "Event",
            },
            body: JSON.stringify(payload),
        });
        return res.ok || res.status === 202;
    } catch {
        return false;
    }
}

function uuid(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Lambda-Secret",
    "Access-Control-Max-Age": "86400",
};

export default {
    async fetch(
        request: Request,
        env: Env,
        _ctx: ExecutionContext
    ): Promise<Response> {
        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        const url = new URL(request.url);
        const origin = url.origin;
        const callbackUrl = `${origin}/callback`;
        const cancelCheckUrl = `${origin}/cancel-check`;

        if (url.pathname === "/start-backtest" && request.method === "POST") {
            try {
                const body = (await request.json().catch(() => ({}))) as { config?: Record<string, unknown> };
                const config = body.config;
                if (!config) {
                    return Response.json({ error: "Missing config" }, { status: 400, headers: corsHeaders });
                }
                const jobId = `bt-${uuid()}`;
                const invokePayload = {
                    jobId,
                    config: { ...config, executionMode: "cloud" },
                    callbackUrl,
                    cancelCheckUrl,
                };
                const invoked = await invokeLambda(env, invokePayload);
                if (!invoked) {
                    return Response.json({ error: "Failed to start Lambda" }, { status: 500, headers: corsHeaders });
                }
                return Response.json({ jobId }, { headers: corsHeaders });
            } catch (e) {
                console.error("[Worker] start-backtest error:", e);
                return Response.json({ error: "Internal error" }, { status: 500, headers: corsHeaders });
            }
        }

        if (url.pathname === "/cancel" && request.method === "POST") {
            const jobId = url.searchParams.get("jobId") || (await request.json().catch(() => ({})) as { jobId?: string }).jobId;
            if (!jobId) {
                return Response.json({ error: "Missing jobId" }, { status: 400, headers: corsHeaders });
            }
            try {
                const stub = env.BACKTEST_JOB.get(env.BACKTEST_JOB.idFromName(jobId));
                await stub.fetch(
                    new Request(origin + "/do", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ type: "set_cancel" }),
                    })
                );
            } catch { }
            return Response.json({ ok: true }, { headers: corsHeaders });
        }

        if (url.pathname === "/cancel-check" && request.method === "GET") {
            const jobId = url.searchParams.get("jobId");
            const secret = request.headers.get("X-Lambda-Secret");
            if (secret !== env.CALLBACK_SECRET || !jobId) {
                return new Response("Unauthorized", { status: 401 });
            }
            try {
                const stub = env.BACKTEST_JOB.get(env.BACKTEST_JOB.idFromName(jobId));
                const res = await stub.fetch(
                    new Request(origin + "/do", { method: "GET" })
                );
                return res;
            } catch {
                return Response.json({ cancelRequested: false }, { headers: { "Content-Type": "application/json" } });
            }
        }

        if (url.pathname === "/callback" && request.method === "POST") {
            const secret = request.headers.get("X-Lambda-Secret");
            if (secret !== env.CALLBACK_SECRET) {
                return new Response("Unauthorized", { status: 401 });
            }
            try {
                const payload = (await request.json()) as Record<string, unknown>;
                const jobId = payload.jobId as string | undefined;
                if (!jobId) {
                    return new Response("Missing jobId", { status: 400 });
                }
                const stub = env.BACKTEST_JOB.get(env.BACKTEST_JOB.idFromName(jobId));
                const res = await stub.fetch(
                    new Request(url.toString(), {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    })
                );
                return new Response(res.body, { status: res.status });
            } catch {
                return new Response(null, { status: 204 });
            }
        }

        if (request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
            const jobId = url.searchParams.get("jobId") || undefined;
            if (!jobId) {
                return new Response("Missing jobId in query", { status: 400 });
            }
            const stub = env.BACKTEST_JOB.get(env.BACKTEST_JOB.idFromName(jobId));
            const doRes = await stub.fetch(request);
            return doRes;
        }

        return new Response("Not Found", { status: 404 });
    },
};
