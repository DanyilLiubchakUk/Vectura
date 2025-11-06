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
                        name: "NEXT_PUBLIC_SUPABASE_URL",
                        value: process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    },
                    {
                        name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
                        value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
                ];
            }),
        ],
    },
});
