CREATE TABLE IF NOT EXISTS "CronJob" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"cronExpression" varchar(64) NOT NULL,
	"timezone" varchar(64) DEFAULT 'UTC' NOT NULL,
	"prompt" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"nextRunAt" timestamp with time zone NOT NULL,
	"lastRunAt" timestamp with time zone,
	"lastError" text,
	"lastOutput" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "CronJob" ADD CONSTRAINT "CronJob_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
