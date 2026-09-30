import {
  pgTable,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

import { tiers } from "./tiers.js";
import { holdStatusEnum } from "./enums.js";

export const holds = pgTable(
  "holds",
  {
    id: varchar("id", { length: 100 }).primaryKey(),

    tierId: varchar("tier_id", { length: 100 })
      .notNull()
      .references(() => tiers.id, {
        onDelete: "cascade",
      }),

    quantity: integer("quantity").notNull(),

    expiresAt: timestamp("expires_at", {
      withTimezone: true,
    }).notNull(),

    status: holdStatusEnum("status")
      .notNull()
      .default("active"),
  },
  (table) => ({
    tierIdIdx: index("holds_tier_id_idx").on(table.tierId),

    statusExpiresAtIdx: index(
      "holds_status_expires_at_idx",
    ).on(table.status, table.expiresAt),
  }),
);