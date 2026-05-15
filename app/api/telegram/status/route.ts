import { auth } from "@/app/(auth)/auth";
import { getTelegramStatusForUser } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:auth").toResponse();
  }

  if (session.user.type === "guest") {
    return new ChatbotError("forbidden:auth").toResponse();
  }

  return Response.json(
    await getTelegramStatusForUser({ userId: session.user.id })
  );
}
