import { auth } from "@/app/(auth)/auth";
import { deleteCronJob } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

type ScheduleRouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: ScheduleRouteContext) {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:auth").toResponse();
  }

  if (session.user.type === "guest") {
    return new ChatbotError("forbidden:auth").toResponse();
  }

  const { id } = await context.params;
  const deletedJob = await deleteCronJob({ id, userId: session.user.id });

  if (!deletedJob) {
    return new ChatbotError(
      "not_found:database",
      "Schedule not found"
    ).toResponse();
  }

  return Response.json(deletedJob);
}
