CREATE TABLE `user_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`language` text NOT NULL DEFAULT ('pt-BR'),
	`theme` text NOT NULL DEFAULT ('light'),
	`currency` text NOT NULL DEFAULT ('BRL'),
	`date_format` text NOT NULL DEFAULT ('DD/MM/YYYY'),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `categories` ADD `user_id` int NOT NULL;