PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_invite` (
	`code` text PRIMARY KEY NOT NULL,
	`created_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_invite`("code", "created_by", "created_at") SELECT "code", "created_by", "created_at" FROM `invite`;--> statement-breakpoint
DROP TABLE `invite`;--> statement-breakpoint
ALTER TABLE `__new_invite` RENAME TO `invite`;--> statement-breakpoint
PRAGMA foreign_keys=ON;