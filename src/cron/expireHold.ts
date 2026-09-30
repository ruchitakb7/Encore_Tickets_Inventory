import cron from "node-cron";
import { and, eq, lte } from "drizzle-orm";

import { db } from "../config/db.js";
import { holds } from "../models/holds.js";

export const startHoldExpirationJob = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      const expiredHolds = await db
        .update(holds)
        .set({
          status: "expired",
        })
        .where(
          and(
            eq(holds.status, "active"),
            lte(holds.expiresAt, now)
          )
        )
        .returning({
          id: holds.id,
        });

     
    } catch (error) {
      console.error("Hold expiration job failed:", error);
    }
  });
};