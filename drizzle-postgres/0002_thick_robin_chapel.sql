CREATE TABLE "admin_users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_unique" ON "admin_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "admin_users_active_email_idx" ON "admin_users" USING btree ("active","email");--> statement-breakpoint
INSERT INTO "admin_users"
  ("id", "email", "password_hash", "role", "active", "must_change_password")
VALUES
  (
    '21a1c976-822a-4f62-a3b2-4d3df8a94f31',
    'joaopedrocosta0@gmail.com',
    'scrypt:7a1da1fbda4c0056f38fc4b99e2dad02:20c787876fe68ba1fd818c88b6d90630fa3dba6d76be66c71019b3ec7421ee6cce5d929a7978dd6ea7834ce8a0cec0909033ec7c41278b56c5fce8f44c50e53f',
    'admin',
    true,
    false
  ),
  (
    '3ff896ae-3b9a-48b2-b408-67a967ed7a57',
    'stalinrknupfer@hotmail.com',
    'scrypt:77e4fb248a00d980350e92e7d36d1300:19ef1251f62c2f2af6a8c68ecfe081696cdf570b8a342055ed68725150ff4787d6689a439a762ff5fd4710fb2ef2c68f4dddd33535edb8f88d4a3b918396f0d9',
    'admin',
    true,
    true
  )
ON CONFLICT ("email") DO NOTHING;
