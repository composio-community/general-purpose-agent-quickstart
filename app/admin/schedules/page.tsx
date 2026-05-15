import { connection } from "next/server";
import type { Session } from "next-auth";
import { type ReactNode, Suspense } from "react";
import { auth } from "@/app/(auth)/auth";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getCronJobsByUserId } from "@/lib/db/queries";
import type { CronJob } from "@/lib/db/schema";
import { ScheduleActions } from "./schedule-actions";

export const metadata = {
  title: "Schedules",
};

export default function SchedulesAdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight">Schedules</h1>
        <p className="text-muted-foreground text-sm">
          Locally test recurring tasks created from chat.
        </p>
      </header>
      <Separator />
      <Suspense fallback={<SchedulesAdminSkeleton />}>
        <SchedulesAdminContent />
      </Suspense>
    </main>
  );
}

async function SchedulesAdminContent() {
  await connection();
  const session = (await auth()) as Session | null;

  if (!session?.user) {
    return (
      <div className="rounded-md border border-border bg-card/40 p-4 text-sm">
        Not signed in.
      </div>
    );
  }

  if (session.user.type === "guest") {
    return (
      <div className="flex flex-col gap-3">
        <Row label="User ID" value={session.user.id} />
        <Row
          label="User type"
          value={<Badge variant="secondary">guest</Badge>}
        />
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium">Schedules are disabled for guests.</p>
          <p className="mt-1 text-muted-foreground">
            Sign in with a regular account to create scheduled tasks.
          </p>
        </div>
      </div>
    );
  }

  const schedules = await getCronJobsByUserId({ userId: session.user.id });

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <Row label="User ID" value={session.user.id} />
        <Row
          label="User type"
          value={<Badge variant="default">regular</Badge>}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-medium text-sm">Scheduled tasks</h2>
          <Badge variant="outline">{schedules.length}</Badge>
        </div>
        {schedules.length === 0 ? (
          <div className="rounded-md border border-border bg-card/40 p-4 text-muted-foreground text-sm">
            No schedules yet. Ask chat to schedule a recurring task.
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {schedules.map((schedule) => (
              <ScheduleRow key={schedule.id} schedule={schedule} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ScheduleRow({ schedule }: { schedule: CronJob }) {
  return (
    <li className="flex flex-col gap-4 rounded-md border border-border/60 bg-card/40 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={schedule.enabled ? "default" : "secondary"}>
              {schedule.enabled ? "Enabled" : "Disabled"}
            </Badge>
            <code className="rounded bg-muted px-2 py-1 text-xs">
              {schedule.cronExpression}
            </code>
            <span className="text-muted-foreground text-xs">
              {schedule.timezone}
            </span>
          </div>
          <p className="text-sm wrap-break-word">{schedule.prompt}</p>
          <div className="grid gap-1 text-muted-foreground text-xs">
            <span>ID: {schedule.id}</span>
            <span>Next run: {formatDate(schedule.nextRunAt)}</span>
            <span>Created: {formatDate(schedule.createdAt)}</span>
          </div>
        </div>
        <ScheduleActions id={schedule.id} />
      </div>

      <details className="rounded-md border border-border/60 bg-muted/20 p-3 text-sm">
        <summary className="cursor-pointer font-medium">Last output</summary>
        <div className="mt-3 flex flex-col gap-2">
          <Row
            label="Last run"
            value={
              schedule.lastRunAt ? formatDate(schedule.lastRunAt) : "Never"
            }
          />
          {schedule.lastError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
              <p className="font-medium text-destructive text-xs">Last error</p>
              <pre className="mt-2 whitespace-pre-wrap text-xs wrap-break-word">
                {schedule.lastError}
              </pre>
            </div>
          ) : null}
          <div className="rounded-md border border-border/60 bg-background/60 p-3">
            <p className="font-medium text-muted-foreground text-xs">
              Last output
            </p>
            <pre className="mt-2 whitespace-pre-wrap text-xs wrap-break-word">
              {schedule.lastOutput || "No output yet."}
            </pre>
          </div>
        </div>
      </details>
    </li>
  );
}

function SchedulesAdminSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border/60 bg-card/40 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
