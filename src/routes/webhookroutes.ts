import { Router } from "express";
import { handlePaymentWebhook } from "../controllers/webhookcontroller.js";

const router = Router();

router.post("/payments", handlePaymentWebhook);

export default router;