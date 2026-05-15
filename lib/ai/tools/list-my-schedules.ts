import { tool } from "ai";
import { z } from "zod";
import { getCronJobsByUserId } from "@/lib/db/queries";

type ListMySchedulesProps = {
  userId: string;
};

export const listMySchedules = ({ userId }: ListMySchedulesProps) =>
  tool({
    description:
      "List the signed-in user's scheduled tasks, including next run time, last run time, last output, and last error.",
    inputSchema: z.object({}),
    execute: async () => {
      const schedules = await getCronJobsByUserId({ userId });

      return {
        schedules: schedules.map((schedule) => ({
          ...schedule,
          createdAt: schedule.createdAt.toISOString(),
          nextRunAt: schedule.nextRunAt.toISOString(),
          lastRunAt: schedule.lastRunAt?.toISOString() ?? null,
        })),
      };
    },
  });
