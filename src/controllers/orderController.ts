import { type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../config/db.js"
import { holds } from "../models/holds.js";


export const cancelHold = async (
  req: Request,
  res: Response
) => {
  try {
    const { hold_id } = req.params;

    if (!hold_id || Array.isArray(hold_id)) {
      return res.status(400).json({
        error: "Invalid hold_id",
      });
    }

    const [hold] = await db
      .select()
      .from(holds)
      .where(eq(holds.id, hold_id))
      .limit(1);

    if (!hold) {
      return res.status(404).json({
        error: "Hold not found",
      });
    }

    if (hold.status !== "active") {
      return res.status(409).json({
        error: "Hold is already expired or converted",
      });
    }

    const [updatedHold] = await db
      .update(holds)
      .set({
        status: "expired",
      })
      .where(eq(holds.id, hold_id))
      .returning();

    if (!updatedHold) {
      return res.status(404).json({
        success: false,
        message: "Hold could not be updated",
      });
    }


    return res.status(200).json({
      message: "Hold cancelled successfully",
      hold_id: updatedHold.id,
      status: updatedHold.status,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};