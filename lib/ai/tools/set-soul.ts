import { tool } from "ai";
import { z } from "zod";
import { updateUserSoul } from "@/lib/db/queries";

type SetSoulProps = {
  userId: string;
};

export const setSoul = ({ userId }: SetSoulProps) =>
  tool({
    description:
      "Save the user's persistent agent identity, including the agent's name, voice, principles, working style, and boundaries.",
    inputSchema: z.object({
      soul: z
        .string()
        .trim()
        .min(20)
        .max(4000)
        .describe("The complete agent soul markdown to save."),
    }),
    execute: async ({ soul }) => {
      const savedSoul = await updateUserSoul({ userId, soul });

      return {
        saved: true,
        soul: savedSoul,
      };
    },
  });
