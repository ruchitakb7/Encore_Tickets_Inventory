import {
  pgTable,
  varchar,
  integer,
  index,
} from "drizzle-orm/pg-core";

import { tiers } from "./tiers.js";
import { orderStatusEnum } from "./enums.js";

export const orders = pgTable(
  "orders",
  {
    id: varchar("id", { length: 100 }).primaryKey(),

    tierId: varchar("tier_id", { length: 100 })
      .notNull()
      .references(() => tiers.id, {
        onDelete: "restrict",
      }),

    quantity: integer("quantity").notNull(),

    status: orderStatusEnum("status").notNull(),
  },
  (table) => ({
    tierIdIdx: index("orders_tier_id_idx").on(table.tierId),

    statusIdx: index("orders_status_idx").on(table.status),
  }),
);