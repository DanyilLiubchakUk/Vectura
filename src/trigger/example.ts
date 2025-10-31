import { logger, schedules, task } from "@trigger.dev/sdk";

/**
 * Hello World - Simple Scheduled Task
 * This task runs every 5 minutes to verify Trigger.dev is working correctly
 */
export const helloWorldScheduled = schedules.task({
  id: "hello-world-scheduled",
  // Run every 5 minutes for easy testing
  cron: "*/5 * * * *",
  maxDuration: 60, // Stop after 60 seconds
  run: async (payload) => {
    logger.log("🌍 Hello World from Trigger.dev!", {
      timestamp: payload.timestamp.toISOString(),
      timezone: payload.timezone,
      lastRun: payload.lastTimestamp?.toISOString() ?? "First run",
    });

    // Simple success message
    logger.log("✅ Trigger.dev is configured correctly!");
    
    return {
      success: true,
      message: "Hello World executed successfully",
      timestamp: payload.timestamp.toISOString(),
    };
  },
});

/**
 * Hello World - Manual Trigger Task
 * This task can be triggered manually from the Trigger.dev dashboard
 * Useful for immediate testing without waiting for the schedule
 */
export const helloWorldManual = task({
  id: "hello-world-manual",
  run: async (payload: { name?: string }) => {
    const name = payload.name || "World";
    
    logger.log(`👋 Hello ${name}!`, {
      receivedPayload: payload,
      executionTime: new Date().toISOString(),
    });

    return {
      success: true,
      message: `Hello ${name}!`,
      timestamp: new Date().toISOString(),
    };
  },
});