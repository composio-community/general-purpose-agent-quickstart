import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { getTelegramLinkStatus } from "@/lib/db/queries";
import { LinkTelegramPanel } from "./link-panel";

function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="h-32 animate-pulse rounded-xl border bg-muted/30" />
    </div>
  );
}

async function TelegramSettingsContent() {
  await connection();
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const isGuest = session.user.type === "guest";
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  const hasBot = Boolean(process.env.TELEGRAM_BOT_TOKEN) && Boolean(botUsername);

  const { telegramChatId } = isGuest
    ? { telegramChatId: null }
    : await getTelegramLinkStatus({ userId: session.user.id });

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Telegram</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Chat with your agent from Telegram. Same tools, same memory.
          </p>
        </div>
        <a
          className="text-muted-foreground text-sm hover:underline"
          href="/admin"
        >
          ← Composio admin
        </a>
      </div>

      {isGuest ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Guest users can't link Telegram. Sign up for a real account first.
        </section>
      ) : !hasBot || !botUsername ? (
        <section className="rounded-xl border p-4 text-sm text-muted-foreground">
          The Telegram bot is not configured on this server. Ask the admin to
          set{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            TELEGRAM_BOT_TOKEN
          </code>{" "}
          and{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            TELEGRAM_BOT_USERNAME
          </code>
          .
        </section>
      ) : (
        <LinkTelegramPanel
          initialLinked={telegramChatId !== null}
          initialChatId={telegramChatId}
          botUsername={botUsername}
        />
      )}
    </main>
  );
}

export default function TelegramSettingsPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl px-6 py-12">
          <div className="mb-8">
            <div className="h-7 w-32 animate-pulse rounded-lg bg-muted/50" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted/30" />
          </div>
          <Skeleton />
        </main>
      }
    >
      <TelegramSettingsContent />
    </Suspense>
  );
}
