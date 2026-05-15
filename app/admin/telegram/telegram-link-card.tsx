"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type TelegramStatus = {
  linked: boolean;
  telegramChatId?: string;
};

type TelegramLinkResponse = {
  token: string;
  botUsername: string;
  deepLink: string;
  expiresInMinutes: number;
};

type TelegramLinkCardProps = {
  initialStatus: TelegramStatus;
};

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function TelegramLinkCard({ initialStatus }: TelegramLinkCardProps) {
  const [status, setStatus] = useState(initialStatus);
  const [linkInfo, setLinkInfo] = useState<TelegramLinkResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const refreshStatus = useCallback(async () => {
    const response = await fetch(`${basePath}/api/telegram/status`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const nextStatus = (await response.json()) as TelegramStatus;
    setStatus(nextStatus);

    if (nextStatus.linked) {
      setMessage("Telegram linked.");
    }
  }, []);

  useEffect(() => {
    if (!(linkInfo && !status.linked)) {
      return;
    }

    const intervalId = window.setInterval(() => {
      refreshStatus();
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [linkInfo, refreshStatus, status.linked]);

  const createLink = async () => {
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`${basePath}/api/telegram/link`, {
        method: "POST",
      });

      if (!response.ok) {
        setMessage("Could not create Telegram link.");
        return;
      }

      const data = (await response.json()) as TelegramLinkResponse;
      setLinkInfo(data);
      setMessage("Waiting for Telegram DM...");
      await refreshStatus();
    } catch (_error) {
      setMessage("Could not create Telegram link.");
    } finally {
      setIsBusy(false);
    }
  };

  const unlink = async () => {
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`${basePath}/api/telegram/unlink`, {
        method: "POST",
      });

      if (!response.ok) {
        setMessage("Could not unlink Telegram.");
        return;
      }

      setLinkInfo(null);
      setStatus({ linked: false });
      setMessage("Telegram unlinked.");
    } catch (_error) {
      setMessage("Could not unlink Telegram.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-md border border-border bg-card/40 p-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="font-medium text-sm">Telegram account</h2>
          <Badge variant={status.linked ? "default" : "outline"}>
            {status.linked ? "Linked" : "Not linked"}
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs">
          Private DMs only. Group chats, files, voice, and streaming are not
          enabled in v1.
        </p>
      </div>

      {status.linked ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm">
            <span className="text-muted-foreground">Telegram chat ID: </span>
            <code>{status.telegramChatId}</code>
          </div>
          <Button
            disabled={isBusy}
            onClick={unlink}
            type="button"
            variant="outline"
          >
            Unlink Telegram
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Button disabled={isBusy} onClick={createLink} type="button">
            Link Telegram
          </Button>

          {linkInfo ? (
            <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/30 p-3 text-sm">
              <p>
                Send <code>/start {linkInfo.token}</code> to{" "}
                <code>@{linkInfo.botUsername}</code>.
              </p>
              <p className="text-muted-foreground text-xs">
                This code expires in {linkInfo.expiresInMinutes} minutes.
              </p>
              <a
                className="text-primary text-sm underline underline-offset-4"
                href={linkInfo.deepLink}
                rel="noopener noreferrer"
                target="_blank"
              >
                Open Telegram link
              </a>
            </div>
          ) : null}
        </div>
      )}

      {message ? (
        <p className="text-muted-foreground text-sm">{message}</p>
      ) : null}
    </section>
  );
}
