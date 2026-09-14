CREATE TABLE `actor` (
	`did` text PRIMARY KEY NOT NULL,
	`handle` text NOT NULL,
	`display_name` text,
	`description` text,
	`website` text,
	`curius_user_link` text,
	`active` integer DEFAULT true NOT NULL,
	`indexed_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `comment` (
	`uri` text PRIMARY KEY NOT NULL,
	`cid` text NOT NULL,
	`did` text NOT NULL,
	`subject_uri` text NOT NULL,
	`text` text NOT NULL,
	`created_at` text NOT NULL,
	`indexed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `comment_subject` ON `comment` (`subject_uri`);--> statement-breakpoint
CREATE TABLE `follow` (
	`uri` text PRIMARY KEY NOT NULL,
	`did` text NOT NULL,
	`subject_did` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `follow_did_subject` ON `follow` (`did`,`subject_did`);--> statement-breakpoint
CREATE INDEX `follow_subject` ON `follow` (`subject_did`);--> statement-breakpoint
CREATE TABLE `highlight` (
	`uri` text PRIMARY KEY NOT NULL,
	`cid` text NOT NULL,
	`did` text NOT NULL,
	`url` text NOT NULL,
	`url_hash` text NOT NULL,
	`link_uri` text,
	`exact` text NOT NULL,
	`prefix` text,
	`suffix` text,
	`start` integer,
	`end` integer,
	`note` text,
	`created_at` text NOT NULL,
	`indexed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `highlight_url_hash` ON `highlight` (`url_hash`);--> statement-breakpoint
CREATE INDEX `highlight_did` ON `highlight` (`did`);--> statement-breakpoint
CREATE INDEX `highlight_created` ON `highlight` (`created_at`);--> statement-breakpoint
CREATE TABLE `kv` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `link` (
	`uri` text PRIMARY KEY NOT NULL,
	`cid` text NOT NULL,
	`did` text NOT NULL,
	`url` text NOT NULL,
	`url_hash` text NOT NULL,
	`title` text,
	`description` text,
	`to_read` integer DEFAULT false NOT NULL,
	`favorite` integer DEFAULT false NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`indexed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `link_did_url` ON `link` (`did`,`url_hash`);--> statement-breakpoint
CREATE INDEX `link_url_hash` ON `link` (`url_hash`);--> statement-breakpoint
CREATE INDEX `link_created` ON `link` (`created_at`);--> statement-breakpoint
CREATE TABLE `oauth_session` (
	`did` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `oauth_state` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`did` text NOT NULL,
	`created_at` text NOT NULL,
	`last_seen_at` text NOT NULL
);
