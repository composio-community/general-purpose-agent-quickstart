import { auth } from "@/app/(auth)/auth";
import { unlinkTelegramForUser } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export async function POST() {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:auth").toResponse();
  }

  if (session.user.type === "guest") {
    return new ChatbotError("forbidden:auth").toResponse();
  }

  await unlinkTelegramForUser({ userId: session.user.id });

  return Response.json({ linked: false });
}
