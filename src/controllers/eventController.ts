import { type Request, type Response } from "express";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "../config/db.js"
import { events } from "../models/event.js"
import { holds } from "../models/holds.js";
import { orders } from "../models/orders.js";
import { webhookEvents } from "../models/webhookevent.js";
import { tiers } from "../models/tiers.js";
import { randomUUID } from "crypto";


export const createEvent = async (
  req: Request,
  res: Response
) => {
  try {
    const event = await db.insert(events).values({
      id: "evt_001",
      title: "Anoushka Shankar — Live in Lisbon",
      venue: "Coliseu dos Recreios, Lisboa",
      startsAt: new Date("2026-11-14T20:00:00Z"),
    }).returning();

    await db.insert(tiers).values([
      {
        id: "tier_001_a",
        eventId: "evt_001",
        name: "Front Stalls",
        price: 8500,
        currency: "EUR",
        totalInventory: 50,
      },
      {
        id: "tier_001_b",
        eventId: "evt_001",
        name: "General Standing",
        price: 4500,
        currency: "EUR",
        totalInventory: 200,
      },
      {
        id: "tier_001_c",
        eventId: "evt_001",
        name: "Balcony",
        price: 3000,
        currency: "EUR",
        totalInventory: 100,
      },
    ]);

    return res.status(201).json({
      message: "Event created successfully",
      event: event[0],
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to create event",
    });
  }
};

export const getEvent = async (
  req: Request,
  res: Response
) => {
  try {
    const { event_id } = req.params;
    if (!event_id || Array.isArray(event_id)) {
      return res.status(400).json({
        error: "Invalid event_id",
      });
    }

    const event = await db
      .select()
      .from(events)
      .where(eq(events.id, event_id))
      .limit(1);

    if (event.length === 0) {
      return res.status(404).json({
        error: "Event not found",
      });
    }

    const eventTiers = await db
      .select()
      .from(tiers)
      .where(eq(tiers.eventId, event_id));

    const tiersWithInventory = await Promise.all(
      eventTiers.map(async (tier) => {
        const activeHolds = await db
          .select({
            quantity: sql<number>`COALESCE(SUM(${holds.quantity}), 0)`,
          })
          .from(holds)
          .where(
            and(
              eq(holds.tierId, tier.id),
              eq(holds.status, "active"),
              gt(holds.expiresAt, new Date())
            )
          );

        const paidOrders = await db
          .select({
            quantity: sql<number>`COALESCE(SUM(${orders.quantity}), 0)`,
          })
          .from(orders)
          .where(
            and(
              eq(orders.tierId, tier.id),
              eq(orders.status, "paid")
            )
          );

        const activeHoldQuantity = Number(
          activeHolds[0]?.quantity ?? 0
        );

        const paidOrderQuantity = Number(
          paidOrders[0]?.quantity ?? 0
        );

        const availableInventory =
          tier.totalInventory -
          activeHoldQuantity -
          paidOrderQuantity;

        return {
          ...tier,
          availableInventory,
        };
      })
    );

    return res.status(200).json({
      ...event[0],
      tiers: tiersWithInventory,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

export const createHold = async (
  req: Request,
  res: Response
) => {
  try {
    const { event_id } = req.params;


    const { tier_id, quantity } = req.body;

    // Basic validation
    if (!tier_id || !Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({
        error: "tier_id and a positive integer quantity are required",
      });
    }

    const result = await db.transaction(async (tx) => {


      const tierResult = await tx.execute(sql`
        SELECT *
        FROM tiers
        WHERE id = ${tier_id}
          AND event_id = ${event_id}
        FOR UPDATE
      `);

      if (tierResult.rows.length === 0) {
        throw new Error("TIER_NOT_FOUND");
      }

      const tier = tierResult.rows[0] as {
        id: string;
        total_inventory: number;
      };


      const activeHoldResult = await tx
        .select({
          total: sql<number>`
            COALESCE(SUM(${holds.quantity}), 0)
          `,
        })
        .from(holds)
        .where(
          and(
            eq(holds.tierId, tier_id),
            eq(holds.status, "active"),
            gt(holds.expiresAt, new Date())
          )
        );

      const activeHoldQuantity = Number(
        activeHoldResult[0]?.total ?? 0
      );


      const paidOrderResult = await tx
        .select({
          total: sql<number>`
            COALESCE(SUM(${orders.quantity}), 0)
          `,
        })
        .from(orders)
        .where(
          and(
            eq(orders.tierId, tier_id),
            eq(orders.status, "paid")
          )
        );

      const paidQuantity = Number(
        paidOrderResult[0]?.total ?? 0
      );


      const availableInventory =
        tier.total_inventory -
        activeHoldQuantity -
        paidQuantity;

      if (availableInventory < quantity) {
        throw new Error("INSUFFICIENT_INVENTORY");
      }


      const expiresAt = new Date(
        Date.now() + 10 * 60 * 1000
      );

      const holdId = `hold_${randomUUID()}`;


      const [newHold] = await tx
        .insert(holds)
        .values({
          id: holdId,
          tierId: tier_id,
          quantity,
          expiresAt,
          status: "active",
        })
        .returning();

      return newHold;
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "result might be empty",
      });
    }


    return res.status(201).json({
      hold_id: result.id,
      expires_at: result.expiresAt,
    });

  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "TIER_NOT_FOUND"
    ) {
      return res.status(404).json({
        error: "Tier not found for this event",
      });
    }

    if (
      error instanceof Error &&
      error.message === "INSUFFICIENT_INVENTORY"
    ) {
      return res.status(409).json({
        error: "Insufficient inventory",
      });
    }

    console.error(error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};