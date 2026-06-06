import "server-only";
import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";

let composioClient: Composio<VercelProvider> | null = null;

export function getComposioClient(): Composio<VercelProvider> | null {
  const apiKey = process.env.COMPOSIO_API_KEY;

  if (!apiKey) {
    return null;
  }

  if (!composioClient) {
    composioClient = new Composio({
      apiKey,
      provider: new VercelProvider(),
    });
  }

  return composioClient;
}
