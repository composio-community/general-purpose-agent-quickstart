import { auth } from "@/app/(auth)/auth";
import { createTelegramLinkToken } from "@/lib/db/queries";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.type === "guest") {
    return new Response("Unauthorized", { status: 401 });
  }

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  if (!botUsername) {
    return Response.json(
      { error: "TELEGRAM_BOT_USERNAME not configured" },
      { status: 503 }
    );
  }

  const token = await createTelegramLinkToken({ userId: session.user.id });

  return Response.json({
    token,
    botUsername,
    deepLink: `https://t.me/${botUsername}?start=${token}`,
    expiresInMinutes: 10,
  });
}
