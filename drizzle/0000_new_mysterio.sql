CREATE TABLE IF NOT EXISTS `booking_blocks` (
	`booking_id` text NOT NULL,
	`date` text NOT NULL,
	`minute` integer NOT NULL,
	PRIMARY KEY(`booking_id`, `date`, `minute`),
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `booking_slots` (
	`date` text NOT NULL,
	`minute` integer NOT NULL,
	`manual` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`date`, `minute`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`request_key` text NOT NULL,
	`date` text NOT NULL,
	`minute` integer NOT NULL,
	`kind` text NOT NULL,
	`radius` integer NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`notification` text DEFAULT 'pending' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `bookings_request_key_unique` ON `bookings` (`request_key`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS booking_blocks_day ON booking_blocks(date, minute);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS bookings_day ON bookings(date, active, minute);
