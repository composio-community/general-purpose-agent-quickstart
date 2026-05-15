import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { getUserSoul, updateUserSoul } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

const patchSoulSchema = z.object({
  soul: z.string().nullable(),
});

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:auth").toResponse();
  }

  if (session.user.type === "guest") {
    return new ChatbotError("forbidden:auth").toResponse();
  }

  const soul = await getUserSoul({ userId: session.user.id });

  return Response.json({ soul });
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:auth").toResponse();
  }

  if (session.user.type === "guest") {
    return new ChatbotError("forbidden:auth").toResponse();
  }

  let soul: string | null;

  try {
    const body = await request.json();
    const parsedBody = patchSoulSchema.parse(body);
    soul = parsedBody.soul?.trim() || null;
  } catch (_error) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const updatedSoul = await updateUserSoul({
    userId: session.user.id,
    soul,
  });

  return Response.json({ soul: updatedSoul });
}
