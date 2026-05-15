import { auth } from "@/app/(auth)/auth";
import { ChatbotError } from "@/lib/errors";
import {
  deleteWebhook,
  getBotInfo,
  getWebhookInfo,
  setWebhook,
} from "@/lib/telegram";

function getRequestBaseUrl(request: Request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:auth").toResponse();
  }

  try {
    const [botInfo, webhookInfo] = await Promise.all([
      getBotInfo(),
      getWebhookInfo(),
    ]);

    return Response.json({ botInfo, webhookInfo });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:auth").toResponse();
  }

  try {
    await setWebhook({
      baseUrl: getRequestBaseUrl(request),
      dropPendingUpdates: true,
    });

    const [botInfo, webhookInfo] = await Promise.all([
      getBotInfo(),
      getWebhookInfo(),
    ]);

    return Response.json({ botInfo, webhookInfo });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:auth").toResponse();
  }

  try {
    await deleteWebhook({ dropPendingUpdates: true });

    const [botInfo, webhookInfo] = await Promise.all([
      getBotInfo(),
      getWebhookInfo(),
    ]);

    return Response.json({ botInfo, webhookInfo });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
