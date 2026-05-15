import { connection } from "next/server";
import type { Session } from "next-auth";
import { Suspense } from "react";
import { auth } from "@/app/(auth)/auth";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type ComposioAdminState,
  getComposioAdminState,
} from "@/lib/ai/composio";

export const metadata = {
  title: "Composio Admin",
};

export default function AdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight">
          Composio integration
        </h1>
        <p className="text-muted-foreground text-sm">
          Per-user view of the current session's Composio state.
        </p>
      </header>
      <Separator />
      <Suspense fallback={<AdminSkeleton />}>
        <AdminContent />
      </Suspense>
    </main>
  );
}

async function AdminContent() {
  await connection();
  const session = (await auth()) as Session | null;
  const state = await getComposioAdminState(
    session?.user?.id,
    session?.user?.type
  );
  return <AdminBody session={session} state={state} />;
}

function AdminSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-6 w-64" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant: "default" | "secondary" | "destructive" | "outline" =
    status === "ACTIVE"
      ? "default"
      : status === "INITIATED" || status === "INITIALIZING"
        ? "secondary"
        : status === "FAILED" || status === "EXPIRED"
          ? "destructive"
          : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border/60 bg-card/40 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}

function AdminBody({
  state,
  session,
}: {
  state: ComposioAdminState;
  session: Session | null;
}) {
  if (!session?.user) {
    return (
      <div className="rounded-md border border-border bg-card/40 p-4 text-sm">
        Not signed in.
      </div>
    );
  }

  if (state.kind === "missing_config") {
    return (
      <div className="flex flex-col gap-3">
        <Row label="User ID" value={session.user.id} />
        <Row label="User type" value={session.user.type} />
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-medium">Composio is not configured.</p>
          <p className="mt-1 text-muted-foreground">
            <code>COMPOSIO_API_KEY</code> is missing from the environment. Add
            it to <code>.env.local</code> and restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  if (state.kind === "guest") {
    return (
      <div className="flex flex-col gap-3">
        <Row label="User ID" value={state.userId} />
        <Row
          label="User type"
          value={<Badge variant="secondary">guest</Badge>}
        />
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium">Composio is disabled for guest users.</p>
          <p className="mt-1 text-muted-foreground">
            Sign in with a regular account to connect third-party toolkits.
            Guest users keep access to local tools only.
          </p>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="flex flex-col gap-3">
        <Row label="User ID" value={state.userId} />
        <Row
          label="User type"
          value={<Badge variant="default">regular</Badge>}
        />
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-medium">Failed to load Composio state.</p>
          <p className="mt-1 break-words text-muted-foreground">
            {state.error}
          </p>
        </div>
      </div>
    );
  }

  const { userId, connectedAccounts, activeToolkits, availableToolkits } =
    state;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <Row label="User ID" value={userId} />
        <Row
          label="User type"
          value={<Badge variant="default">regular</Badge>}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium text-sm">Connected accounts</h2>
        {connectedAccounts.length === 0 ? (
          <div className="rounded-md border border-border bg-card/40 p-3 text-muted-foreground text-sm">
            No connected accounts yet. Ask the chat to connect a toolkit (e.g.
            "Connect my Gmail").
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {connectedAccounts.map((acct) => (
              <li
                className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-card/40 px-3 py-2 text-sm"
                key={acct.id}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{acct.toolkitSlug}</span>
                  <span className="text-muted-foreground text-xs">
                    {acct.id || "—"}
                  </span>
                </div>
                <StatusBadge status={acct.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium text-sm">Active toolkits</h2>
        <div className="flex flex-wrap gap-2">
          {activeToolkits.length === 0 ? (
            <span className="text-muted-foreground text-sm">None</span>
          ) : (
            activeToolkits.map((t) => (
              <Badge key={t} variant="default">
                {t}
              </Badge>
            ))
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium text-sm">Available toolkits</h2>
        <p className="text-muted-foreground text-xs">
          Supported toolkits not yet connected for this user.
        </p>
        <div className="flex flex-wrap gap-2">
          {availableToolkits.length === 0 ? (
            <span className="text-muted-foreground text-sm">
              All supported toolkits are connected.
            </span>
          ) : (
            availableToolkits.map((t) => (
              <Badge key={t} variant="outline">
                {t}
              </Badge>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
