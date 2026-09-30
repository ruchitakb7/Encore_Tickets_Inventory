import { pgEnum } from "drizzle-orm/pg-core";

export const holdStatusEnum = pgEnum("hold_status", [
  "active",
  "expired",
  "converted",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "paid",
  "refunded",
  "partially_refunded",
]);