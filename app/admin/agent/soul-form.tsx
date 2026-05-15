"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AgentSoulFormProps = {
  defaultSoul: string;
  initialSoul: string | null;
};

export function AgentSoulForm({
  defaultSoul,
  initialSoul,
}: AgentSoulFormProps) {
  const [soul, setSoul] = useState(initialSoul ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const saveSoul = async (nextSoul: string | null) => {
    setIsSaving(true);
    setStatus(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/agent/soul`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ soul: nextSoul }),
        }
      );

      if (!response.ok) {
        setStatus("Could not save agent identity.");
        return;
      }

      const data = (await response.json()) as { soul: string | null };
      setSoul(data.soul ?? "");
      setStatus(data.soul ? "Saved." : "Reset to default.");
    } catch (_error) {
      setStatus("Could not save agent identity.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-md border border-border bg-card/40 p-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-medium text-sm">Saved soul</h2>
          <p className="text-muted-foreground text-xs">
            Leave blank and reset to use the default identity.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="agent-soul">Agent soul</Label>
          <Textarea
            className="min-h-64 font-mono text-sm"
            id="agent-soul"
            onChange={(event) => setSoul(event.target.value)}
            placeholder={defaultSoul}
            value={soul}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={isSaving}
            onClick={async () => {
              await saveSoul(soul);
            }}
            type="button"
          >
            Save
          </Button>
          <Button
            disabled={isSaving}
            onClick={async () => {
              await saveSoul(null);
            }}
            type="button"
            variant="outline"
          >
            Reset to default
          </Button>
          {status ? (
            <span className="text-muted-foreground text-sm">{status}</span>
          ) : null}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium text-sm">Default soul preview</h2>
        <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-4 text-muted-foreground text-sm">
          {defaultSoul}
        </pre>
      </section>
    </div>
  );
}
