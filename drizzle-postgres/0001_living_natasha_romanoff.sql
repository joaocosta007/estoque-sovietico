ALTER TABLE "sales" ADD COLUMN "cancelled_at" text;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "cancel_reason" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "cancelled_by" text DEFAULT '' NOT NULL;