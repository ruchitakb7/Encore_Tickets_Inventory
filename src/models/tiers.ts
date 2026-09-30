import {
  pgTable,
  varchar,
  integer,
  index,
} from "drizzle-orm/pg-core";

import { events } from "./event.js";

export const tiers = pgTable(
  "tiers",
  {
    id: varchar("id", { length: 100 }).primaryKey(),

    eventId: varchar("event_id", { length: 100 })
      .notNull()
      .references(() => events.id, {
        onDelete: "cascade",
      }),

    name: varchar("name", { length: 100 }).notNull(),

    price: integer("price").notNull(),

    currency: varchar("currency", { length: 3 }).notNull(),

    totalInventory: integer("total_inventory").notNull(),
  },
  (table) => ({
    eventIdIdx: index("tiers_event_id_idx").on(table.eventId),
  }),
);