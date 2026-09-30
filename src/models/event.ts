import {
  pgTable,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";

export const events = pgTable("events", {
  id: varchar("id", { length: 100 }).primaryKey(),

  title: varchar("title", { length: 255 }).notNull(),

  venue: varchar("venue", { length: 255 }).notNull(),

  startsAt: timestamp("starts_at", {
    withTimezone: true,
  }).notNull(),
});