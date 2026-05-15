import { connection } from "next/server";
import type { Session } from "next-auth";
import { Suspense } from "react";
import { auth } from "@/app/(auth)/auth";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TelegramDebugPanel } from "./telegram-debug-panel";

export const metadata = {
  title: "Telegram Debug",
};

export default function TelegramDebugPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight">
          Telegram debug
        </h1>
        <p className="text-muted-foreground text-sm">
          Inspect the bot and manage the Telegram webhook for this environment.
        </p>
      </header>
      <Separator />
      <Suspense fallback={<TelegramDebugSkeleton />}>
        <TelegramDebugContent />
      </Suspense>
    </main>
  );
}

async function TelegramDebugContent() {
  await connection();
  const session = (await auth()) as Session | null;

  if (!session?.user) {
    return (
      <div className="rounded-md border border-border bg-card/40 p-4 text-sm">
        Not signed in.
      </div>
    );
  }

  return <TelegramDebugPanel />;
}

function TelegramDebugSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
