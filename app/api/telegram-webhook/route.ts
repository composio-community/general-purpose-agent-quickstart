import { timingSafeEqual } from "crypto";
import { after, NextResponse } from "next/server";
import { generateText, stepCountIs, type ToolSet } from "ai";
import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
import { supermemoryTools } from "@supermemory/tools/ai-sdk";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getLanguageModel } from "@/lib/ai/providers";
import {
  getUserByTelegramChatId,
  linkTelegramByToken,
} from "@/lib/db/queries";
import { sendTelegramMessage } from "@/lib/telegram";

export const maxDuration = 60;

interface TelegramMessage {
  message_id: number;
  text?: string;
  chat: { id: number; type: string };
  from?: { id: number; username?: string; first_name?: string };
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Telegram not configured" },
      { status: 503 }
    );
  }

  const incomingSecret =
    request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (
    incomingSecret.length !== secret.length ||
    !timingSafeEqual(Buffer.from(incomingSecret), Buffer.from(secret))
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  if (!message?.text || message.chat.type !== "private") {
    return NextResponse.json({ ok: true });
  }

  const chatId = String(message.chat.id);
  const text = message.text.trim();

  if (text.startsWith("/start")) {
    after(handleStartCommand(chatId, text));
    return NextResponse.json({ ok: true });
  }

  after(handleRegularMessage(chatId, text));
  return NextResponse.json({ ok: true });
}

async function handleStartCommand(
  chatId: string,
  text: string
): Promise<void> {
  const parts = text.split(/\s+/);
  const token = parts[1]?.trim();

  if (!token) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "the web app";
    await sendTelegramMessage(
      chatId,
      `👋 Welcome! To link your account, visit ${appUrl}/admin/telegram and click *Link Telegram*. You'll get a /start command to send back here.`
    );
    return;
  }

  const linkedUser = await linkTelegramByToken({
    token: token.toUpperCase(),
    telegramChatId: chatId,
  });

  if (!linkedUser) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "the web app";
    await sendTelegramMessage(
      chatId,
      `❌ That code is invalid or expired. Generate a new one at ${appUrl}/admin/telegram.`
    );
    return;
  }

  await sendTelegramMessage(
    chatId,
    `✅ Linked! I'm your AI agent. I share your tools (Gmail, Calendar, etc.) and memory across this chat and the web app. Try asking me to fetch your latest emails.`
  );
}

async function handleRegularMessage(
  chatId: string,
  userMessage: string
): Promise<void> {
  const linkedUser = await getUserByTelegramChatId({ telegramChatId: chatId });

  if (!linkedUser) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "the web app";
    await sendTelegramMessage(
      chatId,
      `I don't recognize this chat yet. Link from ${appUrl}/admin/telegram and send me the /start command it gives you.`
    );
    return;
  }

  try {
    const tools: ToolSet = {};

    if (process.env.COMPOSIO_API_KEY) {
      try {
        const composio = new Composio({ provider: new VercelProvider() });
        const session = await composio.create(linkedUser.id);
        const composioTools = (await session.tools()) as unknown as ToolSet;
        Object.assign(tools, composioTools);
      } catch (err) {
        console.error("[telegram] Composio tools failed:", err);
      }
    }

    if (process.env.SUPERMEMORY_API_KEY) {
      try {
        const memoryTools = supermemoryTools(process.env.SUPERMEMORY_API_KEY, {
          containerTags: [linkedUser.id],
        }) as unknown as ToolSet;
        Object.assign(tools, memoryTools);
      } catch (err) {
        console.error("[telegram] Supermemory tools failed:", err);
      }
    }

    const result = await generateText({
      model: getLanguageModel(DEFAULT_CHAT_MODEL),
      system:
        "You are a helpful AI assistant accessible via Telegram. The user is identified across web and Telegram — they have the same connected tools and memory in both places. Be concise — replies should be short enough for a chat message. Use your memory tools to remember important facts and recall them when relevant.",
      messages: [{ role: "user", content: userMessage }],
      tools,
      stopWhen: stepCountIs(8),
    });

    const reply = result.text.trim() || "Done.";
    await sendTelegramMessage(chatId, reply.slice(0, 4096));
  } catch (err) {
    console.error("[telegram] agent error:", err);
    await sendTelegramMessage(
      chatId,
      "Sorry, something went wrong. Check the server logs."
    ).catch(() => undefined);
  }
}
