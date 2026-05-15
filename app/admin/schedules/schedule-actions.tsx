"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type ScheduleActionsProps = {
  id: string;
};

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function ScheduleActions({ id }: ScheduleActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const runNow = async () => {
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`${basePath}/api/schedules/${id}/run`, {
        method: "POST",
      });

      if (!response.ok) {
        setMessage("Run failed.");
        return;
      }

      setMessage("Ran schedule.");
      router.refresh();
    } catch (_error) {
      setMessage("Run failed.");
    } finally {
      setIsBusy(false);
    }
  };

  const deleteSchedule = async () => {
    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch(`${basePath}/api/schedules/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setMessage("Delete failed.");
        return;
      }

      setMessage("Deleted schedule.");
      router.refresh();
    } catch (_error) {
      setMessage("Delete failed.");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex gap-2">
        <Button disabled={isBusy} onClick={runNow} size="sm" type="button">
          Run now
        </Button>
        <Button
          disabled={isBusy}
          onClick={deleteSchedule}
          size="sm"
          type="button"
          variant="outline"
        >
          Delete
        </Button>
      </div>
      {message ? (
        <p className="text-muted-foreground text-xs">{message}</p>
      ) : null}
    </div>
  );
}
