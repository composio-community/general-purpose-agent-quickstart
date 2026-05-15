import "server-only";

import { supermemoryTools } from "@supermemory/tools/ai-sdk";
import type { ToolSet } from "ai";

type SupermemoryToolsFactory = (
  apiKey: string,
  options: { containerTags: string[] }
) => Promise<ToolSet> | ToolSet;

export async function getSupermemoryToolsForUser(
  userId: string
): Promise<ToolSet> {
  const apiKey = process.env.SUPERMEMORY_API_KEY;

  if (!apiKey) {
    return {};
  }

  try {
    const createSupermemoryTools =
      supermemoryTools as unknown as SupermemoryToolsFactory;

    return await createSupermemoryTools(apiKey, {
      containerTags: [userId],
    });
  } catch (error) {
    console.error("[supermemory] failed to initialize tools:", error);
    return {};
  }
}
