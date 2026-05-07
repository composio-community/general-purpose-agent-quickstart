import { auth } from "@/app/(auth)/auth";
import { unlinkTelegram } from "@/lib/db/queries";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  await unlinkTelegram({ userId: session.user.id });
  return Response.json({ ok: true });
}
