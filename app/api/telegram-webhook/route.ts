import { timingSafeEqual } from "node:crypto";
import { generateText, type ModelMessage, stepCountIs } from "ai";
import { after } from "next/server";
import { getComposioToolsForUser } from "@/lib/ai/composio";
import { chatModels, DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import {
  buildSoulPrompt,
  composioPrompt,
  memoryPrompt,
  regularPrompt,
} from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { getSupermemoryToolsForUser } from "@/lib/ai/supermemory";
import { isProductionEnvironment } from "@/lib/constants";
import {
  getTelegramTurnsByChatId,
  getUserByTelegramChatId,
  getUserSoul,
  linkTelegramChatByToken,
  saveTelegramTurns,
} from "@/lib/db/queries";
import { getAppUrl, sendTelegramMessage } from "@/lib/telegram";

export const maxDuration = 60;

type TelegramUpdate = {
  message?: {
    chat: {
      id: number | string;
      type: string;
    };
    text?: string;
  };
};

const TELEGRAM_START_PATTERN = /^\/start(?:@\w+)?(?:\s+(\S+))?/;
const TELEGRAM_BREVITY_RULE =
  "Telegram channel rule: keep replies short, plain-text friendly, and easy to read in a DM. Do not mention streaming, files, voice, or group chat support.";

function isValidTelegramSecret(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const actualSecret = request.headers.get("x-telegram-bot-api-secret-token");

  if (!(expectedSecret && actualSecret)) {
    return false;
  }

  const encoder = new TextEncoder();
  const expectedBytes = encoder.encode(expectedSecret);
  const actualBytes = encoder.encode(actualSecret);

  if (expectedBytes.length !== actualBytes.length) {
    return false;
  }

  return timingSafeEqual(expectedBytes, actualBytes);
}

function getTelegramLinkInstructions() {
  try {
    return `Open ${getAppUrl()}/admin/telegram while signed in, click Link Telegram, then send the generated /start code here.`;
  } catch (_error) {
    return "Open /admin/telegram while signed in, click Link Telegram, then send the generated /start code here.";
  }
}

function buildTelegramSystemPrompt({
  hasComposioTools,
  hasMemoryTools,
  soul,
}: {
  hasComposioTools: boolean;
  hasMemoryTools: boolean;
  soul: string | null;
}) {
  const sections = [buildSoulPrompt(soul), regularPrompt];

  if (hasMemoryTools) {
    sections.push(memoryPrompt);
  }

  if (hasComposioTools) {
    sections.push(composioPrompt);
  }

  sections.push(TELEGRAM_BREVITY_RULE);

  return sections.join("\n\n");
}

async function handleStartCommand({
  telegramChatId,
  token,
}: {
  telegramChatId: string;
  token?: string;
}) {
  if (!token) {
    await sendTelegramMessage({
      chatId: telegramChatId,
      text: getTelegramLinkInstructions(),
    });
    return;
  }

  const linkedUser = await linkTelegramChatByToken({
    token: token.toUpperCase(),
    telegramChatId,
  });

  await sendTelegramMessage({
    chatId: telegramChatId,
    text: linkedUser ? "Linked!" : getTelegramLinkInstructions(),
  });
}

async function dispatchTelegramAgent({
  telegramChatId,
  text,
}: {
  telegramChatId: string;
  text: string;
}) {
  const user = await getUserByTelegramChatId({ telegramChatId });

  if (!user) {
    await sendTelegramMessage({
      chatId: telegramChatId,
      text: getTelegramLinkInstructions(),
    });
    return;
  }

  await saveTelegramTurns({
    turns: [{ telegramChatId, role: "user", content: text }],
  });

  const [turns, soul, composioTools, memoryTools] = await Promise.all([
    getTelegramTurnsByChatId({ telegramChatId, limit: 10 }),
    getUserSoul({ userId: user.id }),
    getComposioToolsForUser(user.id),
    getSupermemoryToolsForUser(user.id),
  ]);

  const modelMessages: ModelMessage[] = turns.map((turn) => ({
    role: turn.role,
    content: turn.content,
  }));
  const modelConfig = chatModels.find(
    (model) => model.id === DEFAULT_CHAT_MODEL
  );
  const hasComposioTools = Object.keys(composioTools).length > 0;
  const hasMemoryTools = Object.keys(memoryTools).length > 0;

  const result = await generateText({
    model: getLanguageModel(DEFAULT_CHAT_MODEL),
    system: buildTelegramSystemPrompt({
      hasComposioTools,
      hasMemoryTools,
      soul,
    }),
    messages: modelMessages,
    stopWhen: stepCountIs(8),
    providerOptions: {
      ...(modelConfig?.gatewayOrder && {
        gateway: { order: modelConfig.gatewayOrder },
      }),
      ...(modelConfig?.reasoningEffort && {
        openai: { reasoningEffort: modelConfig.reasoningEffort },
      }),
    },
    tools: {
      ...composioTools,
      ...memoryTools,
    },
    experimental_telemetry: {
      isEnabled: isProductionEnvironment,
      functionId: "telegram-generate-text",
    },
  });

  await saveTelegramTurns({
    turns: [{ telegramChatId, role: "assistant", content: result.text }],
  });

  await sendTelegramMessage({
    chatId: telegramChatId,
    text: result.text || "Done.",
  });
}

export async function POST(request: Request) {
  if (!isValidTelegramSecret(request)) {
    return Response.json({ ok: false }, { status: 401 });
  }

  let update: TelegramUpdate;

  try {
    update = (await request.json()) as TelegramUpdate;
  } catch (_error) {
    return Response.json({ ok: true });
  }

  const message = update.message;

  if (!message || message.chat.type !== "private") {
    return Response.json({ ok: true });
  }

  const telegramChatId = String(message.chat.id);
  const text = message.text?.trim();

  if (!text) {
    after(async () => {
      await sendTelegramMessage({
        chatId: telegramChatId,
        text: "I can handle text messages only for now.",
      });
    });
    return Response.json({ ok: true });
  }

  const startMatch = text.match(TELEGRAM_START_PATTERN);

  if (startMatch) {
    after(async () => {
      try {
        await handleStartCommand({
          telegramChatId,
          token: startMatch[1]?.trim(),
        });
      } catch (error) {
        console.error("[telegram] failed to handle /start:", error);
      }
    });
    return Response.json({ ok: true });
  }

  after(async () => {
    try {
      await dispatchTelegramAgent({ telegramChatId, text });
    } catch (error) {
      console.error("[telegram] failed to dispatch agent:", error);
      await sendTelegramMessage({
        chatId: telegramChatId,
        text: "Sorry, I hit an error handling that message.",
      });
    }
  });

  return Response.json({ ok: true });
}
