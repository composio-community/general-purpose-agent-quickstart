import { auth } from "@/app/(auth)/auth";
import { getTelegramLinkStatus } from "@/lib/db/queries";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { telegramChatId } = await getTelegramLinkStatus({
    userId: session.user.id,
  });

  return Response.json({
    linked: telegramChatId !== null,
    telegramChatId,
  });
}
