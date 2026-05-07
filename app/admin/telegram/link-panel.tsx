"use client";

import { useEffect, useRef, useState } from "react";

type LinkResponse = {
  token: string;
  botUsername: string;
  deepLink: string;
  expiresInMinutes: number;
};

export function LinkTelegramPanel({
  initialLinked,
  initialChatId,
  botUsername,
}: {
  initialLinked: boolean;
  initialChatId: string | null;
  botUsername: string;
}) {
  const [linked, setLinked] = useState(initialLinked);
  const [chatId, setChatId] = useState<string | null>(initialChatId);
  const [pending, setPending] = useState(false);
  const [linkData, setLinkData] = useState<LinkResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  const startLinking = async () => {
    setPending(true);
    try {
      const res = await fetch("/api/telegram/link", { method: "POST" });
      if (!res.ok) {
        alert("Failed to generate link token");
        return;
      }
      const data = (await res.json()) as LinkResponse;
      setLinkData(data);

      pollRef.current = setInterval(async () => {
        const statusRes = await fetch("/api/telegram/status");
        if (!statusRes.ok) {
          return;
        }
        const status = (await statusRes.json()) as {
          linked: boolean;
          telegramChatId: string | null;
        };
        if (status.linked) {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setLinked(true);
          setChatId(status.telegramChatId);
          setLinkData(null);
        }
      }, 3000);
    } finally {
      setPending(false);
    }
  };

  const unlink = async () => {
    if (!confirm("Disconnect Telegram from this account?")) {
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/telegram/unlink", { method: "POST" });
      if (!res.ok) {
        alert("Failed to unlink");
        return;
      }
      setLinked(false);
      setChatId(null);
    } finally {
      setPending(false);
    }
  };

  const copyCommand = async () => {
    if (!linkData) {
      return;
    }
    await navigator.clipboard.writeText(`/start ${linkData.token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (linked) {
    return (
      <section className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <span className="size-1.5 rounded-full bg-green-500" />
            Linked
          </span>
          <span className="text-sm">
            Telegram chat <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{chatId}</code> is connected.
          </span>
        </div>
        <p className="mt-3 text-muted-foreground text-sm">
          You can now message{" "}
          <a
            className="font-medium text-primary hover:underline"
            href={`https://t.me/${botUsername}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            @{botUsername}
          </a>{" "}
          and the agent will respond using the same tools and memory as the web
          app.
        </p>
        <button
          className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-destructive text-sm font-medium transition hover:bg-destructive/10 disabled:opacity-50"
          disabled={pending}
          onClick={unlink}
          type="button"
        >
          {pending ? "Unlinking…" : "Unlink"}
        </button>
      </section>
    );
  }

  if (linkData) {
    return (
      <section className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="size-2 animate-pulse rounded-full bg-amber-500" />
          <span>Waiting for you to send the command in Telegram…</span>
        </div>
        <p className="mt-3 text-muted-foreground text-sm">
          Send this command to{" "}
          <a
            className="font-medium text-primary hover:underline"
            href={linkData.deepLink}
            rel="noopener noreferrer"
            target="_blank"
          >
            @{linkData.botUsername}
          </a>{" "}
          (tap to open Telegram with it pre-filled):
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-md border bg-muted p-3">
          <code className="min-w-0 flex-1 truncate font-mono text-sm">
            /start {linkData.token}
          </code>
          <button
            className="shrink-0 rounded-md border bg-background px-2 py-1 text-xs font-medium hover:bg-muted/50"
            onClick={copyCommand}
            type="button"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
        <p className="mt-3 text-muted-foreground text-xs">
          Code expires in {linkData.expiresInMinutes} minutes. This page will
          flip to ✓ Linked automatically once you send it.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-card p-6">
      <h2 className="font-medium text-base">Link your Telegram</h2>
      <p className="mt-1 text-muted-foreground text-sm">
        After linking, messages you send to{" "}
        <a
          className="font-medium text-primary hover:underline"
          href={`https://t.me/${botUsername}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          @{botUsername}
        </a>{" "}
        run the same agent with the same Composio tools and Supermemory store
        as your web chat.
      </p>
      <button
        className="mt-4 rounded-md border bg-primary px-3 py-1.5 text-primary-foreground text-sm font-medium transition hover:bg-primary/90 disabled:opacity-50"
        disabled={pending}
        onClick={startLinking}
        type="button"
      >
        {pending ? "Generating…" : "Link Telegram"}
      </button>
    </section>
  );
}
