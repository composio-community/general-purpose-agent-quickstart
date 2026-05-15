import { customAlphabet } from "nanoid";
import { auth } from "@/app/(auth)/auth";
import { createTelegramLinkToken } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { getBotInfo, getTelegramDeepLink } from "@/lib/telegram";

const LINK_TOKEN_MINUTES = 10;
const createToken = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export async function POST() {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:auth").toResponse();
  }

  if (session.user.type === "guest") {
    return new ChatbotError("forbidden:auth").toResponse();
  }

  const token = createToken();
  const expiresAt = new Date(Date.now() + LINK_TOKEN_MINUTES * 60 * 1000);

  await createTelegramLinkToken({
    userId: session.user.id,
    token,
    expiresAt,
  });

  const botInfo = await getBotInfo();
  const botUsername = botInfo.username;

  if (!botUsername) {
    return new ChatbotError(
      "bad_request:api",
      "Telegram bot username is missing"
    ).toResponse();
  }

  return Response.json({
    token,
    botUsername,
    deepLink: getTelegramDeepLink({ botUsername, token }),
    expiresInMinutes: LINK_TOKEN_MINUTES,
  });
}
