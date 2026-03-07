import { defineConfig } from "@trigger.dev/sdk";
import { syncEnvVars } from "@trigger.dev/build/extensions/core";

export default defineConfig({
    project: process.env.TRIGGER_PROJECT_REF!,
    runtime: "node",
    logLevel: "log",
    // The max compute seconds a task is allowed to run. If the task run exceeds this duration, it will be stopped.
    // You can override this on an individual task.
    // See https://trigger.dev/docs/runs/max-duration
    maxDuration: 3600,
    retries: {
        enabledInDev: true,
        default: {
            maxAttempts: 3,
            minTimeoutInMs: 1000,
            maxTimeoutInMs: 10000,
            factor: 2,
            randomize: true,
        },
    },
    // Directory where your Trigger.dev tasks are located
    dirs: ["./src/trigger"],
    build: {
        extensions: [
            // Sync environment variables from your local .env to Trigger.dev
            // This ensures your tasks have access to the same env vars
            syncEnvVars(() => {
                return [
                    {
                        name: "COCKROACH_DATABASE_URL",
                        value: process.env.COCKROACH_DATABASE_URL!,
                    },
                    {
                        name: "APCA_API_BASE_URL",
                        value: process.env.APCA_API_BASE_URL!,
                    },
                    {
                        name: "APCA_API_KEY_ID",
                        value: process.env.APCA_API_KEY_ID!,
                    },
                    {
                        name: "APCA_API_SECRET_KEY",
                        value: process.env.APCA_API_SECRET_KEY!,
                    },
                    {
                        name: "ALPHA_VANTAGE_API_KEY",
                        value: process.env.ALPHA_VANTAGE_API_KEY!,
                    },
                    {
                        name: "INFISICAL_ENVIRONMENT",
                        value: process.env.INFISICAL_ENVIRONMENT!,
                    },
                    {
                        name: "INFISICAL_PROJECT_ID",
                        value: process.env.INFISICAL_PROJECT_ID!,
                    },
                    {
                        name: "INFISICAL_ALPACA_MASTER_KEY_NAME",
                        value: process.env.INFISICAL_ALPACA_MASTER_KEY_NAME ?? "ALPACA_ENCRYPTION_MASTER_KEY",
                    },
                    {
                        name: "INFISICAL_CLIENT_ID",
                        value: process.env.INFISICAL_CLIENT_ID!,
                    },
                    {
                        name: "INFISICAL_CLIENT_SECRET",
                        value: process.env.INFISICAL_CLIENT_SECRET!,
                    },
                ];
            }),
        ],
    },
});
