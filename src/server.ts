import express from "express";
import cors from "cors";
import eventRoutes from "./routes/eventroutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import webhookRoutes from "./routes/webhookroutes.js";
import { startHoldExpirationJob } from "./cron/expireHold.js";
const app = express();


app.use(cors());
app.use(express.json());

app.use("/events", eventRoutes);
app.use("/orders", orderRoutes);
app.use("/webhooks", webhookRoutes);



const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startHoldExpirationJob()
});

