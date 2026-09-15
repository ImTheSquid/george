CREATE TABLE `invite_use` (
	`code` text NOT NULL,
	`user_id` text NOT NULL,
	`used_at` text NOT NULL,
	FOREIGN KEY (`code`) REFERENCES `invite`(`code`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `invite` ADD `max_uses` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `invite` ADD `uses` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `invite` ADD `revoked_at` text;