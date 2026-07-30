CREATE TABLE `sale_guards` (
	`id` text PRIMARY KEY NOT NULL,
	`ok` integer NOT NULL,
	CONSTRAINT "sale_guards_ok" CHECK("sale_guards"."ok" = 1)
);
