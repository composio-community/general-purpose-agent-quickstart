import { connection } from "next/server";
import type { Session } from "next-auth";
import { type ReactNode, Suspense } from "react";
import { auth } from "@/app/(auth)/auth";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getTelegramStatusForUser } from "@/lib/db/queries";
import { TelegramLinkCard } from "./telegram-link-card";

export const metadata = {
  title: "Telegram",
};

export default function TelegramAdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight">Telegram</h1>
        <p className="text-muted-foreground text-sm">
          Link your Telegram account to DM the same personal agent.
        </p>
      </header>
      <Separator />
      <Suspense fallback={<TelegramAdminSkeleton />}>
        <TelegramAdminContent />
      </Suspense>
    </main>
  );
}

async function TelegramAdminContent() {
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
          <p className="font-medium">Telegram is disabled for guests.</p>
          <p className="mt-1 text-muted-foreground">
            Sign in with a regular account to link Telegram.
          </p>
        </div>
      </div>
    );
  }

  const status = await getTelegramStatusForUser({ userId: session.user.id });

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <Row label="User ID" value={session.user.id} />
        <Row
          label="User type"
          value={<Badge variant="default">regular</Badge>}
        />
      </section>

      <TelegramLinkCard initialStatus={status} />
    </div>
  );
}

function TelegramAdminSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
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
