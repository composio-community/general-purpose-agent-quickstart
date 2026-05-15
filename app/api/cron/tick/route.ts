import { runCronJob } from "@/lib/cron/run-cron-job";
import { getDueCronJobs } from "@/lib/db/queries";

function isAuthorized(request: Request) {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  return Boolean(secret && authorization === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dueJobs = await getDueCronJobs();
  const results = await Promise.all(
    dueJobs.map(async (job) => {
      const updatedJob = await runCronJob(job.id);

      return {
        id: job.id,
        ran: Boolean(updatedJob),
        lastError: updatedJob?.lastError ?? null,
      };
    })
  );

  return Response.json({
    checked: dueJobs.length,
    results,
  });
}
