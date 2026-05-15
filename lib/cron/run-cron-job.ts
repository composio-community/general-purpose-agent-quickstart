import "server-only";

import { generateText, stepCountIs } from "ai";
import { getComposioToolsForUser } from "@/lib/ai/composio";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import {
  buildSoulPrompt,
  composioPrompt,
  memoryPrompt,
} from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { getSupermemoryToolsForUser } from "@/lib/ai/supermemory";
import {
  getCronJobById,
  getUserSoul,
  updateCronJobAfterRun,
} from "@/lib/db/queries";
import type { CronJob } from "@/lib/db/schema";
import { computeNextRunAt } from "./cron-utils";

const scheduledTaskPrompt = `
You are executing a scheduled task for the user.
Complete the task using the user's connected tools and memory when useful.
Return only the final result the user should see.`;

function errorToMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unknown scheduled task error.";
}

export async function runCronJob(jobId: string): Promise<CronJob | null> {
  const job = await getCronJobById({ id: jobId });

  if (!job) {
    return null;
  }

  const lastRunAt = new Date();

  try {
    const [composioTools, memoryTools, soul] = await Promise.all([
      getComposioToolsForUser(job.userId),
      getSupermemoryToolsForUser(job.userId),
      getUserSoul({ userId: job.userId }),
    ]);

    const hasComposioTools = Object.keys(composioTools).length > 0;
    const hasMemoryTools = Object.keys(memoryTools).length > 0;
    const system = [
      buildSoulPrompt(soul),
      scheduledTaskPrompt,
      hasMemoryTools ? memoryPrompt : "",
      hasComposioTools ? composioPrompt : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const result = await generateText({
      model: getLanguageModel(DEFAULT_CHAT_MODEL),
      system,
      prompt: job.prompt,
      stopWhen: stepCountIs(5),
      tools: {
        ...composioTools,
        ...memoryTools,
      },
    });

    return await updateCronJobAfterRun({
      id: job.id,
      lastRunAt,
      lastOutput: result.text.trim() || "Task completed without text output.",
      lastError: null,
      nextRunAt: computeNextRunAt(job.cronExpression, job.timezone),
    });
  } catch (error) {
    return await updateCronJobAfterRun({
      id: job.id,
      lastRunAt,
      lastOutput: null,
      lastError: errorToMessage(error),
      nextRunAt: computeNextRunAt(job.cronExpression, job.timezone),
    });
  }
}
