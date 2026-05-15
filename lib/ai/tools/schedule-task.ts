import { tool } from "ai";
import { z } from "zod";
import {
  computeNextRunAt,
  validateCronExpression,
} from "@/lib/cron/cron-utils";
import { createCronJob } from "@/lib/db/queries";

type ScheduleTaskProps = {
  userId: string;
};

export const scheduleTask = ({ userId }: ScheduleTaskProps) =>
  tool({
    description:
      "Create a recurring scheduled task for the signed-in user. Use this when the user asks to schedule, remind, run, or repeat an agent task. The cron expression uses five-field cron syntax unless the user explicitly provides seconds.",
    inputSchema: z.object({
      cronExpression: z
        .string()
        .trim()
        .min(1)
        .max(64)
        .describe("Cron expression for when the task should run."),
      prompt: z
        .string()
        .trim()
        .min(1)
        .max(4000)
        .describe("The task prompt the agent should execute on schedule."),
      timezone: z
        .string()
        .trim()
        .min(1)
        .max(64)
        .default("UTC")
        .describe("IANA timezone for the cron expression, defaults to UTC."),
    }),
    execute: async ({ cronExpression, prompt, timezone }) => {
      const validation = validateCronExpression(cronExpression);

      if (!validation.valid) {
        return {
          created: false,
          error: validation.error,
        };
      }

      const nextRunAt = computeNextRunAt(cronExpression, timezone);
      const job = await createCronJob({
        userId,
        cronExpression,
        timezone,
        prompt,
        nextRunAt,
      });

      return {
        created: true,
        schedule: {
          ...job,
          createdAt: job.createdAt.toISOString(),
          nextRunAt: job.nextRunAt.toISOString(),
          lastRunAt: job.lastRunAt?.toISOString() ?? null,
        },
      };
    },
  });
