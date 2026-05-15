import { tool } from "ai";
import { z } from "zod";
import { deleteCronJob } from "@/lib/db/queries";

type CancelScheduleProps = {
  userId: string;
};

export const cancelSchedule = ({ userId }: CancelScheduleProps) =>
  tool({
    description:
      "Cancel one of the signed-in user's scheduled tasks by deleting it. Only use schedule IDs returned by scheduleTask or listMySchedules.",
    inputSchema: z.object({
      id: z.string().uuid().describe("The schedule id to cancel."),
    }),
    execute: async ({ id }) => {
      const deletedJob = await deleteCronJob({ id, userId });

      return {
        canceled: Boolean(deletedJob),
        schedule: deletedJob
          ? {
              ...deletedJob,
              createdAt: deletedJob.createdAt.toISOString(),
              nextRunAt: deletedJob.nextRunAt.toISOString(),
              lastRunAt: deletedJob.lastRunAt?.toISOString() ?? null,
            }
          : null,
      };
    },
  });
