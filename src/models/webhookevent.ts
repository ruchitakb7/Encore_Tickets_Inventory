import {
  pgTable,
  varchar,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: varchar("id", { length: 150 }).primaryKey(),

    eventType: varchar("event_type", {
      length: 100,
    }).notNull(),

    payload: jsonb("payload").notNull(),

    processedAt: timestamp("processed_at", {
      withTimezone: true,
    }).notNull(),
  },
  (table) => ({
    eventTypeIdx: index("webhook_events_event_type_idx").on(
      table.eventType,
    ),
  }),
);