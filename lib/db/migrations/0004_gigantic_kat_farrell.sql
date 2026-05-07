CREATE TABLE IF NOT EXISTS "TelegramTurn" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegramChatId" varchar(64) NOT NULL,
	"role" varchar NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
