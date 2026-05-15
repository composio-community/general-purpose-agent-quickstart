import "server-only";

type TelegramApiResponse<T> =
  | { ok: true; result: T }
  | { description?: string; error_code?: number; ok: false };

export type TelegramBotInfo = {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
};

export type TelegramWebhookInfo = {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_error_date?: number;
  max_connections?: number;
  allowed_updates?: string[];
};

type SetWebhookOptions = {
  baseUrl?: string;
  dropPendingUpdates?: boolean;
};

type DeleteWebhookOptions = {
  dropPendingUpdates?: boolean;
};

function getBotToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  }

  return token;
}

function getWebhookSecret() {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("TELEGRAM_WEBHOOK_SECRET is not configured.");
  }

  return secret;
}

export function getAppUrl(fallbackBaseUrl?: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? fallbackBaseUrl;

  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is not configured.");
  }

  return appUrl.replace(/\/+$/, "");
}

function getTelegramApiUrl(method: string) {
  return `https://api.telegram.org/bot${getBotToken()}/${method}`;
}

async function telegramApi<T>(
  method: string,
  body?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(getTelegramApiUrl(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await response.json()) as TelegramApiResponse<T>;

  if (!response.ok || !data.ok) {
    const description =
      "description" in data ? data.description : response.statusText;
    throw new Error(
      `Telegram ${method} failed: ${description ?? "Unknown error"}`
    );
  }

  return data.result;
}

export async function sendTelegramMessage({
  chatId,
  text,
}: {
  chatId: number | string;
  text: string;
}) {
  return await telegramApi("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

export async function getWebhookInfo() {
  return await telegramApi<TelegramWebhookInfo>("getWebhookInfo");
}

export async function setWebhook({
  baseUrl,
  dropPendingUpdates = false,
}: SetWebhookOptions = {}) {
  return await telegramApi<boolean>("setWebhook", {
    url: `${getAppUrl(baseUrl)}/api/telegram-webhook`,
    secret_token: getWebhookSecret(),
    allowed_updates: ["message"],
    drop_pending_updates: dropPendingUpdates,
  });
}

export async function deleteWebhook({
  dropPendingUpdates = false,
}: DeleteWebhookOptions = {}) {
  return await telegramApi<boolean>("deleteWebhook", {
    drop_pending_updates: dropPendingUpdates,
  });
}

export async function getBotInfo() {
  return await telegramApi<TelegramBotInfo>("getMe");
}

export function getTelegramDeepLink({
  botUsername,
  token,
}: {
  botUsername: string;
  token: string;
}) {
  return `https://t.me/${botUsername}?start=${encodeURIComponent(token)}`;
}
