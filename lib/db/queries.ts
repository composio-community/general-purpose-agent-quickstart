import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  lte,
  type SQL,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ArtifactKind } from "@/components/chat/artifact";
import type { VisibilityType } from "@/components/chat/visibility-selector";
import { ChatbotError } from "../errors";
import { generateUUID } from "../utils";
import {
  type Chat,
  type CronJob,
  type CronJobInsert,
  chat,
  cronJob,
  type DBMessage,
  document,
  message,
  type Suggestion,
  stream,
  suggestion,
  type TelegramTurn,
  type TelegramTurnInsert,
  telegramTurn,
  type User,
  user,
  vote,
} from "./schema";
import { generateHashedPassword } from "./utils";

const client = postgres(process.env.POSTGRES_URL ?? "");
const db = drizzle(client);

export async function getUser(email: string): Promise<User[]> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get user by email"
    );
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to create user");
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to create guest user"
    );
  }
}

export async function getUserSoul({ userId }: { userId: string }) {
  try {
    const [selectedUser] = await db
      .select({ soul: user.soul })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    return selectedUser?.soul ?? null;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to get user soul");
  }
}

export async function updateUserSoul({
  userId,
  soul,
}: {
  userId: string;
  soul: string | null;
}) {
  try {
    const normalizedSoul = soul?.trim() || null;

    const [updatedUser] = await db
      .update(user)
      .set({ soul: normalizedSoul, updatedAt: new Date() })
      .where(eq(user.id, userId))
      .returning({ soul: user.soul });

    return updatedUser?.soul ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update user soul"
    );
  }
}

export async function getUserByTelegramChatId({
  telegramChatId,
}: {
  telegramChatId: string;
}): Promise<User | null> {
  try {
    const [selectedUser] = await db
      .select()
      .from(user)
      .where(eq(user.telegramChatId, telegramChatId))
      .limit(1);

    return selectedUser ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get user by Telegram chat id"
    );
  }
}

export async function getTelegramStatusForUser({ userId }: { userId: string }) {
  try {
    const [selectedUser] = await db
      .select({ telegramChatId: user.telegramChatId })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    return {
      linked: Boolean(selectedUser?.telegramChatId),
      telegramChatId: selectedUser?.telegramChatId ?? undefined,
    };
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get Telegram link status"
    );
  }
}

export async function createTelegramLinkToken({
  userId,
  token,
  expiresAt,
}: {
  userId: string;
  token: string;
  expiresAt: Date;
}) {
  try {
    const [updatedUser] = await db
      .update(user)
      .set({
        telegramLinkToken: token,
        telegramLinkTokenExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId))
      .returning({
        telegramLinkToken: user.telegramLinkToken,
        telegramLinkTokenExpiresAt: user.telegramLinkTokenExpiresAt,
      });

    return updatedUser;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to create Telegram link token"
    );
  }
}

export async function linkTelegramChatByToken({
  token,
  telegramChatId,
}: {
  token: string;
  telegramChatId: string;
}): Promise<User | null> {
  try {
    return await db.transaction(async (tx) => {
      const [selectedUser] = await tx
        .select({ id: user.id })
        .from(user)
        .where(
          and(
            eq(user.telegramLinkToken, token),
            gt(user.telegramLinkTokenExpiresAt, new Date())
          )
        )
        .limit(1);

      if (!selectedUser) {
        return null;
      }

      await tx
        .update(user)
        .set({ telegramChatId: null, updatedAt: new Date() })
        .where(eq(user.telegramChatId, telegramChatId));

      const [linkedUser] = await tx
        .update(user)
        .set({
          telegramChatId,
          telegramLinkToken: null,
          telegramLinkTokenExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(user.id, selectedUser.id))
        .returning();

      return linkedUser ?? null;
    });
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to link Telegram chat"
    );
  }
}

export async function unlinkTelegramForUser({ userId }: { userId: string }) {
  try {
    const [updatedUser] = await db
      .update(user)
      .set({
        telegramChatId: null,
        telegramLinkToken: null,
        telegramLinkTokenExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId))
      .returning({ telegramChatId: user.telegramChatId });

    return updatedUser;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to unlink Telegram chat"
    );
  }
}

export async function getTelegramTurnsByChatId({
  telegramChatId,
  limit,
}: {
  telegramChatId: string;
  limit: number;
}): Promise<TelegramTurn[]> {
  try {
    const turns = await db
      .select()
      .from(telegramTurn)
      .where(eq(telegramTurn.telegramChatId, telegramChatId))
      .orderBy(desc(telegramTurn.createdAt))
      .limit(limit);

    return turns.reverse();
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get Telegram turns"
    );
  }
}

export async function saveTelegramTurns({
  turns,
}: {
  turns: TelegramTurnInsert[];
}) {
  try {
    if (turns.length === 0) {
      return null;
    }

    return await db.insert(telegramTurn).values(turns);
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to save Telegram turns"
    );
  }
}

export async function createCronJob({
  userId,
  cronExpression,
  timezone,
  prompt,
  nextRunAt,
}: {
  userId: string;
  cronExpression: string;
  timezone: string;
  prompt: string;
  nextRunAt: Date;
}): Promise<CronJob> {
  try {
    const [createdJob] = await db
      .insert(cronJob)
      .values({
        userId,
        cronExpression,
        timezone,
        prompt,
        nextRunAt,
      })
      .returning();

    return createdJob;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to create cron job");
  }
}

export async function getDueCronJobs(): Promise<CronJob[]> {
  try {
    return await db
      .select()
      .from(cronJob)
      .where(and(eq(cronJob.enabled, true), lte(cronJob.nextRunAt, new Date())))
      .orderBy(asc(cronJob.nextRunAt));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get due cron jobs"
    );
  }
}

export async function getCronJobById({
  id,
}: {
  id: string;
}): Promise<CronJob | null> {
  try {
    const [selectedJob] = await db
      .select()
      .from(cronJob)
      .where(eq(cronJob.id, id))
      .limit(1);

    return selectedJob ?? null;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to get cron job");
  }
}

export async function updateCronJobAfterRun({
  id,
  lastRunAt,
  lastError,
  lastOutput,
  nextRunAt,
}: {
  id: string;
  lastRunAt: Date;
  lastError: string | null;
  lastOutput: string | null;
  nextRunAt: Date;
}): Promise<CronJob | null> {
  try {
    const [updatedJob] = await db
      .update(cronJob)
      .set({
        lastRunAt,
        lastError,
        lastOutput,
        nextRunAt,
      } satisfies Partial<CronJobInsert>)
      .where(eq(cronJob.id, id))
      .returning();

    return updatedJob ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update cron job after run"
    );
  }
}

export async function getCronJobsByUserId({
  userId,
}: {
  userId: string;
}): Promise<CronJob[]> {
  try {
    return await db
      .select()
      .from(cronJob)
      .where(eq(cronJob.userId, userId))
      .orderBy(asc(cronJob.nextRunAt));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get cron jobs by user id"
    );
  }
}

export async function deleteCronJob({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<CronJob | null> {
  try {
    const [deletedJob] = await db
      .delete(cronJob)
      .where(and(eq(cronJob.id, id), eq(cronJob.userId, userId)))
      .returning();

    return deletedJob ?? null;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to delete cron job");
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to save chat");
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete chat by id"
    );
  }
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
  try {
    const userChats = await db
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.userId, userId));

    if (userChats.length === 0) {
      return { deletedCount: 0 };
    }

    const chatIds = userChats.map((c) => c.id);

    await db.delete(vote).where(inArray(vote.chatId, chatIds));
    await db.delete(message).where(inArray(message.chatId, chatIds));
    await db.delete(stream).where(inArray(stream.chatId, chatIds));

    const deletedChats = await db
      .delete(chat)
      .where(eq(chat.userId, userId))
      .returning();

    return { deletedCount: deletedChats.length };
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete all chats by user id"
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<unknown>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id)
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Chat[] = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatbotError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatbotError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get chats by user id"
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    if (!selectedChat) {
      return null;
    }

    return selectedChat;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to get chat by id");
  }
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  try {
    return await db.insert(message).values(messages);
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to save messages");
  }
}

export async function updateMessage({
  id,
  parts,
}: {
  id: string;
  parts: DBMessage["parts"];
}) {
  try {
    return await db.update(message).set({ parts }).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to update message");
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get messages by chat id"
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to vote message");
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get votes by chat id"
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to save document");
  }
}

export async function updateDocumentContent({
  id,
  content,
}: {
  id: string;
  content: string;
}) {
  try {
    const docs = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt))
      .limit(1);

    const latest = docs[0];
    if (!latest) {
      throw new ChatbotError("not_found:database", "Document not found");
    }

    return await db
      .update(document)
      .set({ content })
      .where(and(eq(document.id, id), eq(document.createdAt, latest.createdAt)))
      .returning();
  } catch (_error) {
    if (_error instanceof ChatbotError) {
      throw _error;
    }
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update document content"
    );
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get documents by id"
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get document by id"
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp)
        )
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete documents by id after timestamp"
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to save suggestions"
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(eq(suggestion.documentId, documentId));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get suggestions by document id"
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get message by id"
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
      );

    const messageIds = messagesToDelete.map(
      (currentMessage) => currentMessage.id
    );

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds))
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds))
        );
    }
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete messages by chat id after timestamp"
    );
  }
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update chat visibility by id"
    );
  }
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  try {
    return await db.update(chat).set({ title }).where(eq(chat.id, chatId));
  } catch (_error) {
    return;
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const cutoffTime = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, cutoffTime),
          eq(message.role, "user")
        )
      )
      .execute();

    return stats?.count ?? 0;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get message count by user id"
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to create stream id"
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get stream ids by chat id"
    );
  }
}
