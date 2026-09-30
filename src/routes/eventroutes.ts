import { Router } from "express";
import {getEvent,createHold, createEvent} from "../controllers/eventController.js";


const router = Router();

router.post("/", createEvent);

router.get("/:event_id", getEvent);

router.post("/:event_id/holds", createHold);

export default router;