import { auth } from "@/app/(auth)/auth";
import { runCronJob } from "@/lib/cron/run-cron-job";
import { getCronJobById } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

type ScheduleRunRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  _request: Request,
  context: ScheduleRunRouteContext
) {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:auth").toResponse();
  }

  if (session.user.type === "guest") {
    return new ChatbotError("forbidden:auth").toResponse();
  }

  const { id } = await context.params;
  const job = await getCronJobById({ id });

  if (!job || job.userId !== session.user.id) {
    return new ChatbotError(
      "not_found:database",
      "Schedule not found"
    ).toResponse();
  }

  const updatedJob = await runCronJob(id);

  if (!updatedJob) {
    return new ChatbotError(
      "not_found:database",
      "Schedule not found"
    ).toResponse();
  }

  return Response.json(updatedJob);
}
