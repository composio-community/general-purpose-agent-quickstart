import "server-only";

import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
import type { ToolSet } from "ai";

export const SUPPORTED_TOOLKITS = [
  "gmail",
  "github",
  "slack",
  "notion",
  "googlecalendar",
] as const;

export type SupportedToolkit = (typeof SUPPORTED_TOOLKITS)[number];

export type ComposioAdminState =
  | { kind: "missing_config" }
  | { kind: "guest"; userId: string }
  | {
      kind: "ready";
      userId: string;
      userType: "regular";
      connectedAccounts: {
        id: string;
        toolkitSlug: string;
        status: string;
        createdAt?: string;
      }[];
      activeToolkits: string[];
      availableToolkits: SupportedToolkit[];
    }
  | { kind: "error"; userId: string; error: string };

export function isComposioConfigured(): boolean {
  return Boolean(process.env.COMPOSIO_API_KEY);
}

export type ComposioClient = Composio<VercelProvider>;

export function getComposioClient(): ComposioClient | null {
  if (!isComposioConfigured()) {
    return null;
  }
  try {
    return new Composio({
      apiKey: process.env.COMPOSIO_API_KEY,
      provider: new VercelProvider(),
    });
  } catch (error) {
    console.error("[composio] failed to construct client:", error);
    return null;
  }
}

/**
 * Returns Vercel AI SDK tools for the given user via the Composio Tool Router
 * session API (`composio.create(userId).tools()`). The returned toolset is the
 * Composio meta-tool surface — COMPOSIO_SEARCH_TOOLS, COMPOSIO_MANAGE_CONNECTIONS,
 * COMPOSIO_MULTI_EXECUTE_TOOL, etc. — which dynamically discovers per-toolkit
 * tools and mints authentication links inline when a connection is missing.
 *
 * Never throws: on any error it logs and returns an empty toolset so the chat
 * can continue with local tools only.
 */
export async function getComposioToolsForUser(
  userId: string
): Promise<ToolSet> {
  const composio = getComposioClient();
  if (!composio) {
    return {};
  }

  try {
    const session = await composio.create(userId);
    const tools = (await session.tools()) as unknown as ToolSet;
    return tools;
  } catch (error) {
    console.error("[composio] getComposioToolsForUser failed:", error);
    return {};
  }
}

/**
 * Composio generates tool call IDs that may include characters outside the
 * `^[a-zA-Z0-9_-]+$` pattern that some providers (notably Anthropic) require.
 * Sanitize them before sending message history back to the model.
 */
const TOOL_ID_INVALID_CHARS = /[^a-zA-Z0-9_-]/g;

export function sanitizeToolCallId(id: string): string {
  return id.replace(TOOL_ID_INVALID_CHARS, "_");
}

export async function getComposioAdminState(
  userId: string | undefined,
  userType: "guest" | "regular" | undefined
): Promise<ComposioAdminState> {
  if (!isComposioConfigured()) {
    return { kind: "missing_config" };
  }
  if (!userId) {
    return { kind: "missing_config" };
  }
  if (userType === "guest") {
    return { kind: "guest", userId };
  }

  const composio = getComposioClient();
  if (!composio) {
    return { kind: "missing_config" };
  }

  try {
    const result = await composio.connectedAccounts.list({
      userIds: [userId],
    });

    const rawItems =
      (
        result as {
          items?: {
            id?: string;
            nanoid?: string;
            status?: string;
            createdAt?: string;
            created_at?: string;
            toolkit?: { slug?: string };
          }[];
        }
      ).items ?? [];

    const connectedAccounts = rawItems.map((a) => ({
      id: a.id ?? a.nanoid ?? "",
      toolkitSlug: a.toolkit?.slug ?? "unknown",
      status: a.status ?? "UNKNOWN",
      createdAt: a.createdAt ?? a.created_at,
    }));

    const activeToolkits = Array.from(
      new Set(
        connectedAccounts
          .filter((a) => a.status === "ACTIVE")
          .map((a) => a.toolkitSlug)
      )
    );

    const availableToolkits = SUPPORTED_TOOLKITS.filter(
      (t) => !activeToolkits.includes(t)
    );

    return {
      kind: "ready",
      userId,
      userType: "regular",
      connectedAccounts,
      activeToolkits,
      availableToolkits,
    };
  } catch (error) {
    return {
      kind: "error",
      userId,
      error: error instanceof Error ? error.message : "Unknown Composio error.",
    };
  }
}
