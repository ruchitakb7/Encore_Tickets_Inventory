import { type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../config/db.js";
import { webhookEvents } from "../models/webhookevent.js"
import { holds } from "../models/holds.js";
import { orders } from "../models/orders.js";



export const handlePaymentWebhook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const {
      event_id,
      type,
      order_id,
      hold_id,
      tier_id,
      quantity,
      amount_total,
      amount_refunded,
      currency,
    } = req.body;


    if (
      typeof event_id !== "string" ||
      typeof type !== "string" ||
      typeof order_id !== "string" ||
      typeof currency !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook payload",
      });
    }

    if (type !== "order.paid" && type !== "order.refunded") {
      return res.status(400).json({
        success: false,
        message: `Unsupported webhook type: ${type}`,
      });
    }



    const existingWebhook = await db
      .select({
        id: webhookEvents.id,
      })
      .from(webhookEvents)
      .where(eq(webhookEvents.id, event_id))
      .limit(1);

    if (existingWebhook.length > 0) {
      return res.status(200).json({
        success: true,
        message: "Webhook already processed",
        event_id,
      });
    }



    if (type === "order.refunded") {

      if (
        !Number.isInteger(amount_refunded) ||
        amount_refunded < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid order.refunded payload",
        });
      }

      const [existingOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, order_id))
        .limit(1);


      if (!existingOrder) {
        return res.status(404).json({
          success: false,
          message: "Order not found. Refund will be retried.",
        });
      }

      if (existingOrder.status === "refunded") {
        return res.status(200).json({
          success: true,
          message: "Order is already refunded",
          order_id,
        });
      }


      const result = await db.transaction(async (tx) => {
        const [updatedOrder] = await tx
          .update(orders)
          .set({
            status: "refunded",
          })
          .where(eq(orders.id, order_id))
          .returning();

        if (!updatedOrder) {
          throw new Error("ORDER_REFUND_FAILED");
        }

        await tx.insert(webhookEvents).values({
          id: event_id,
          eventType: type,
          payload: req.body,
          processedAt: new Date(),
        });

        return updatedOrder;
      });

      return res.status(200).json({
        success: true,
        message: "Order refunded successfully",
        data: {
          order_id: result.id,
          status: result.status,
        },
      });
    }


    if (
      typeof hold_id !== "string" ||
      typeof tier_id !== "string" ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      !Number.isInteger(amount_total) ||
      amount_total < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid order.paid payload",
      });
    }

    const result = await db.transaction(async (tx) => {

      const [hold] = await tx
        .select()
        .from(holds)
        .where(
          and(
            eq(holds.id, hold_id),
            eq(holds.tierId, tier_id)
          )
        )
        .limit(1);

      if (!hold) {
        throw new Error("HOLD_NOT_FOUND");
      }


      if (hold.status !== "active") {
        throw new Error("HOLD_NOT_ACTIVE");
      }

      if (hold.quantity !== quantity) {
        throw new Error("QUANTITY_MISMATCH");
      }


      if (hold.expiresAt <= new Date()) {
        throw new Error("HOLD_EXPIRED");
      }

      await tx.insert(webhookEvents).values({
        id: event_id,
        eventType: type,
        payload: req.body,
        processedAt: new Date(),
      });


      const [order] = await tx
        .insert(orders)
        .values({
          id: order_id,
          tierId: tier_id,
          quantity,
          status: "paid",
        })
        .returning();

      if (!order) {
        throw new Error("ORDER_CREATION_FAILED");
      }


      const [updatedHold] = await tx
        .update(holds)
        .set({
          status: "converted",
        })
        .where(
          and(
            eq(holds.id, hold_id),
            eq(holds.status, "active")
          )
        )
        .returning();

      if (!updatedHold) {
        throw new Error("HOLD_CONVERSION_FAILED");
      }

      return {
        order,
        hold: updatedHold,
      };
    });



    return res.status(200).json({
      success: true,
      message: "Payment processed successfully",
      data: {
        order_id: result.order.id,
        hold_id: result.hold.id,
        status: result.order.status,
      },
    });
  } catch (error) {
    console.error("Payment webhook error:", error);

    if (error instanceof Error) {
      switch (error.message) {
        case "HOLD_NOT_FOUND":
          return res.status(404).json({
            success: false,
            message: "Hold not found",
          });

        case "HOLD_NOT_ACTIVE":
          return res.status(409).json({
            success: false,
            message: "Hold is no longer active",
          });

        case "HOLD_EXPIRED":
          return res.status(409).json({
            success: false,
            message: "Hold has expired",
          });

        case "QUANTITY_MISMATCH":
          return res.status(400).json({
            success: false,
            message: "Payment quantity does not match hold quantity",
          });

        case "HOLD_CONVERSION_FAILED":
          return res.status(409).json({
            success: false,
            message: "Unable to convert hold",
          });

        case "ORDER_REFUND_FAILED":
          return res.status(409).json({
            success: false,
            message: "Unable to refund order",
          });
      }
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};