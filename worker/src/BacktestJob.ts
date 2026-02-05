/// <reference types="@cloudflare/workers-types" />
import { DurableObject } from "cloudflare:workers";

const MAX_BUFFER_SIZE = 50;
const JOB_TIMEOUT_MS = 16 * 60 * 1000; // 16 min — Lambda max is 15 min

type LambdaPayload =
    | { type: "progress"; jobId: string;[k: string]: unknown }
    | { type: "result"; jobId: string;[k: string]: unknown }
    | { type: "result_chunk"; jobId: string;[k: string]: unknown }
    | { type: "result_complete"; jobId: string }
    | { type: "done"; jobId: string }
    | { type: "error"; jobId: string; error?: string }
    | { type: "cancelled"; jobId: string };

interface Env {
    // Durable Object env - may be empty
}

export class BacktestJob extends DurableObject {
    private ws: WebSocket | null = null;
    private messageQueue: unknown[] = [];
    private finished = false;

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
    }

    /** Always queue; drain in order for strict chronology. */
    private enqueueAndDrain(data: unknown): void {
        if (this.messageQueue.length >= MAX_BUFFER_SIZE) return;
        this.messageQueue.push(data);
        this.drainQueue();
    }

    private drainQueue(): void {
        while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
            const item = this.messageQueue.shift();
            if (item == null) continue;
            try {
                this.ws.send(JSON.stringify(item));
            } catch {
                this.messageQueue.unshift(item);
                break;
            }
        }
    }

    async fetch(request: Request): Promise<Response> {
        const upgrade = request.headers.get("Upgrade")?.toLowerCase();
        if (upgrade === "websocket") {
            const pair = new WebSocketPair();
            const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
            server.accept();
            this.ws = server;
            this.drainQueue();
            this.ctx.storage.setAlarm(Date.now() + JOB_TIMEOUT_MS);

            server.addEventListener("message", (event: MessageEvent) => {
                try {
                    const raw = typeof event.data === "string" ? event.data : new TextDecoder().decode(event.data);
                    const data = JSON.parse(raw) as Record<string, unknown>;
                    if (data.type === "cancel_backtest") {
                        this.ctx.storage.put("cancelRequested", true);
                        this.enqueueAndDrain({ type: "cancelled" });
                        this.ws?.close();
                        this.ws = null;
                    }
                } catch {
                    // Ignore parse errors
                }
            });

            server.addEventListener("close", () => {
                this.ws = null;
            });

            return new Response(null, { status: 101, webSocket: client });
        }

        if (request.method === "GET") {
            const cancelRequested = (await this.ctx.storage.get<boolean>("cancelRequested")) ?? false;
            return new Response(JSON.stringify({ cancelRequested }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        if (request.method === "POST") {
            try {
                const payload = (await request.json()) as Record<string, unknown>;
                if (payload.type === "set_cancel") {
                    await this.ctx.storage.put("cancelRequested", true);
                    return new Response(JSON.stringify({ ok: true }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    });
                }
                const t = payload.type as string;
                if (t === "done" || t === "error" || t === "cancelled") {
                    this.finished = true;
                }
                this.enqueueAndDrain(payload as LambdaPayload);
                return new Response(JSON.stringify({ ok: true }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            } catch {
                return new Response("Bad Request", { status: 400 });
            }
        }

        return new Response("Not Found", { status: 404 });
    }

    async alarm(): Promise<void> {
        if (this.finished) return;
        this.enqueueAndDrain({
            type: "error",
            error: "Backtest exceeded 15 minute limit. Please use a shorter date range.",
        });
        if (this.ws) {
            try {
                this.ws.close();
            } catch { }
            this.ws = null;
        }
        this.finished = true;
    }
}
