import "server-only";

import { CronExpressionParser } from "cron-parser";

export type CronValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export function validateCronExpression(expr: string): CronValidationResult {
  try {
    CronExpressionParser.parse(expr);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error:
        error instanceof Error ? error.message : "Invalid cron expression.",
    };
  }
}

export function computeNextRunAt(expr: string, timezone = "UTC"): Date {
  return CronExpressionParser.parse(expr, {
    currentDate: new Date(),
    tz: timezone,
  })
    .next()
    .toDate();
}
