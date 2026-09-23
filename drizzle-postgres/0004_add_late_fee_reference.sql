ALTER TABLE "customer_ledger" ADD COLUMN "late_fee_for_id" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "customer_ledger_late_fee_for_unique" ON "customer_ledger" USING btree ("late_fee_for_id");
