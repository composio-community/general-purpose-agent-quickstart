"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type TelegramBotInfo = {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
};

type TelegramWebhookInfo = {
  url: string;
  pending_update_count: number;
  last_error_message?: string;
  allowed_updates?: string[];
  max_connections?: number;
};

type TelegramDebugState = {
  botInfo: TelegramBotInfo;
  webhookInfo: TelegramWebhookInfo;
};

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function TelegramDebugPanel() {
  const [state, setState] = useState<TelegramDebugState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const loadState = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch(`${basePath}/api/telegram/webhook`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Could not load Telegram webhook info.");
        return;
      }

      setState(data as TelegramDebugState);
    } catch (_error) {
      setError("Could not load Telegram webhook info.");
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const mutateWebhook = async (method: "POST" | "DELETE") => {
    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch(`${basePath}/api/telegram/webhook`, {
        method,
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Telegram webhook action failed.");
        return;
      }

      setState(data as TelegramDebugState);
    } catch (_error) {
      setError("Telegram webhook action failed.");
    } finally {
      setIsBusy(false);
    }
  };

  const webhookInfo = state?.webhookInfo;
  const isRegistered = Boolean(webhookInfo?.url);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-md border border-border bg-card/40 p-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-medium text-sm">Webhook controls</h2>
          <p className="text-muted-foreground text-xs">
            Register uses this page's current host and sets{" "}
            <code>/api/telegram-webhook</code> with pending updates dropped.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={isBusy}
            onClick={() => mutateWebhook("POST")}
            type="button"
          >
            Register webhook
          </Button>
          <Button
            disabled={isBusy}
            onClick={() => mutateWebhook("DELETE")}
            type="button"
            variant="outline"
          >
            Delete webhook
          </Button>
          <Button
            disabled={isBusy}
            onClick={loadState}
            type="button"
            variant="ghost"
          >
            Refresh
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Telegram getUpdates/long polling will not work while a webhook is set.
          Delete the webhook first if you switch modes.
        </p>
        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-destructive text-sm">
            {error}
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-card/40 p-4">
        <div className="flex items-center gap-2">
          <h2 className="font-medium text-sm">Bot</h2>
          {state?.botInfo.username ? (
            <Badge variant="outline">@{state.botInfo.username}</Badge>
          ) : null}
        </div>
        {state ? (
          <div className="grid gap-2 text-sm">
            <Row label="ID" value={String(state.botInfo.id)} />
            <Row label="Name" value={state.botInfo.first_name} />
            <Row label="Username" value={state.botInfo.username ?? "unknown"} />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Loading bot info...</p>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-md border border-border bg-card/40 p-4">
        <div className="flex items-center gap-2">
          <h2 className="font-medium text-sm">Webhook</h2>
          <Badge variant={isRegistered ? "default" : "outline"}>
            {isRegistered ? "Registered" : "Not registered"}
          </Badge>
        </div>
        {webhookInfo ? (
          <div className="grid gap-2 text-sm">
            <Row label="URL" value={webhookInfo.url || "none"} />
            <Row
              label="Pending updates"
              value={String(webhookInfo.pending_update_count)}
            />
            <Row
              label="Allowed updates"
              value={webhookInfo.allowed_updates?.join(", ") ?? "default"}
            />
            <Row
              label="Max connections"
              value={String(webhookInfo.max_connections ?? "default")}
            />
            <Row
              label="Last error"
              value={webhookInfo.last_error_message ?? "none"}
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Loading webhook info...
          </p>
        )}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-all text-right font-mono text-xs">{value}</span>
    </div>
  );
}
