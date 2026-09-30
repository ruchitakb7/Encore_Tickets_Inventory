CREATE TYPE "public"."hold_status" AS ENUM('active', 'expired', 'converted');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('paid', 'refunded', 'partially_refunded');--> statement-breakpoint
CREATE TABLE "events" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"venue" varchar(255) NOT NULL,
	"starts_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holds" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"tier_id" varchar(100) NOT NULL,
	"quantity" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"status" "hold_status" DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"tier_id" varchar(100) NOT NULL,
	"quantity" integer NOT NULL,
	"status" "order_status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tiers" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"event_id" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"price" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"total_inventory" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" varchar(150) PRIMARY KEY NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "holds" ADD CONSTRAINT "holds_tier_id_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."tiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tier_id_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."tiers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "holds_tier_id_idx" ON "holds" USING btree ("tier_id");--> statement-breakpoint
CREATE INDEX "holds_status_expires_at_idx" ON "holds" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "orders_tier_id_idx" ON "orders" USING btree ("tier_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tiers_event_id_idx" ON "tiers" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "webhook_events_event_type_idx" ON "webhook_events" USING btree ("event_type");