CREATE TABLE IF NOT EXISTS "TelegramTurn" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegramChatId" varchar(64) NOT NULL,
	"role" varchar NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "telegramChatId" varchar(64);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "telegramLinkToken" varchar(16);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "telegramLinkTokenExpiresAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "User" ADD CONSTRAINT "User_telegramChatId_unique" UNIQUE("telegramChatId");--> statement-breakpoint
ALTER TABLE "User" ADD CONSTRAINT "User_telegramLinkToken_unique" UNIQUE("telegramLinkToken");