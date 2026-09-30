import { Router } from "express";
import { cancelHold } from "../controllers/orderController.js";

const router = Router();

router.post("/:hold_id/cancel-hold", cancelHold);

export default router;