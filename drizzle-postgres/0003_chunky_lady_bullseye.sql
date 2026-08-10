CREATE TABLE "notification_campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"target_url" text DEFAULT '/catalogo' NOT NULL,
	"audience" text DEFAULT 'all' NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"scheduled_at" text,
	"sent_at" text,
	"created_by" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "notification_campaigns_status_valid" CHECK ("notification_campaigns"."status" IN ('pending', 'scheduled', 'sending', 'sent', 'partial', 'failed', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"subscription_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text DEFAULT '' NOT NULL,
	"sent_at" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"target_url" text DEFAULT '/catalogo' NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"label" text DEFAULT 'CELULAR SEM IDENTIFICAÇÃO' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_campaigns" ADD CONSTRAINT "notification_campaigns_template_id_notification_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_campaign_id_notification_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."notification_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_subscription_id_push_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."push_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_campaigns_due_idx" ON "notification_campaigns" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_campaign_subscription_unique" ON "notification_deliveries" USING btree ("campaign_id","subscription_id");--> statement-breakpoint
CREATE INDEX "notification_deliveries_campaign_idx" ON "notification_deliveries" USING btree ("campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_templates_name_unique" ON "notification_templates" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_unique" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_active_idx" ON "push_subscriptions" USING btree ("active");