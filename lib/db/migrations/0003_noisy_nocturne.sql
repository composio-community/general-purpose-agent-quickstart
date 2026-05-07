ALTER TABLE "User" ADD COLUMN "telegramChatId" varchar(64);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "telegramLinkToken" varchar(32);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "telegramLinkTokenExpiresAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "User" ADD CONSTRAINT "User_telegramChatId_unique" UNIQUE("telegramChatId");--> statement-breakpoint
ALTER TABLE "User" ADD CONSTRAINT "User_telegramLinkToken_unique" UNIQUE("telegramLinkToken");